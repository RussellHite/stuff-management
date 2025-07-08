-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization memberships
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE(organization_id UUID, role user_role) AS $$
BEGIN
    RETURN QUERY
    SELECT om.organization_id, om.role
    FROM organization_members om
    WHERE om.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has role in organization
CREATE OR REPLACE FUNCTION user_has_role_in_org(user_uuid UUID, org_uuid UUID, required_role user_role)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
    role_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    -- Get user's role in the organization
    SELECT om.role INTO user_role_val
    FROM organization_members om
    WHERE om.user_id = user_uuid AND om.organization_id = org_uuid;
    
    IF user_role_val IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Role hierarchy: admin=4, manager=3, employee=2, viewer=1
    role_hierarchy := CASE user_role_val
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'employee' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    required_hierarchy := CASE required_role
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'employee' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view their organizations" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update their organizations" ON organizations
    FOR UPDATE USING (
        user_has_role_in_org(auth.uid(), id, 'admin')
    );

CREATE POLICY "Admins can insert organizations" ON organizations
    FOR INSERT WITH CHECK (true);

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Members can view profiles in their organizations" ON user_profiles
    FOR SELECT USING (
        id IN (
            SELECT om.user_id
            FROM organization_members om
            WHERE om.organization_id IN (
                SELECT organization_id 
                FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Organization members policies
CREATE POLICY "Members can view organization memberships" ON organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage organization memberships" ON organization_members
    FOR ALL USING (
        user_has_role_in_org(auth.uid(), organization_id, 'admin')
    );

CREATE POLICY "Users can insert their own membership" ON organization_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Locations policies
CREATE POLICY "Members can view locations in their organizations" ON locations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage locations" ON locations
    FOR ALL USING (
        user_has_role_in_org(auth.uid(), organization_id, 'manager')
    );

-- Categories policies
CREATE POLICY "Members can view categories in their organizations" ON categories
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Employees can manage categories" ON categories
    FOR ALL USING (
        user_has_role_in_org(auth.uid(), organization_id, 'employee')
    );

-- Products policies
CREATE POLICY "Members can view products in their organizations" ON products
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Employees can manage products" ON products
    FOR ALL USING (
        user_has_role_in_org(auth.uid(), organization_id, 'employee')
    );

-- Inventory policies
CREATE POLICY "Members can view inventory in their organizations" ON inventory
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Employees can manage inventory" ON inventory
    FOR ALL USING (
        user_has_role_in_org(auth.uid(), organization_id, 'employee')
    );

-- Inventory transactions policies
CREATE POLICY "Members can view transactions in their organizations" ON inventory_transactions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Employees can create transactions" ON inventory_transactions
    FOR INSERT WITH CHECK (
        user_has_role_in_org(auth.uid(), organization_id, 'employee')
        AND created_by = auth.uid()
    );

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update inventory after transactions
CREATE OR REPLACE FUNCTION update_inventory_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update inventory quantity
    INSERT INTO inventory (organization_id, product_id, location_id, quantity)
    VALUES (NEW.organization_id, NEW.product_id, NEW.location_id, NEW.quantity_after)
    ON CONFLICT (product_id, location_id)
    DO UPDATE SET 
        quantity = NEW.quantity_after,
        updated_at = NOW();
    
    -- Update to_location for transfers
    IF NEW.type = 'transfer' AND NEW.to_location_id IS NOT NULL THEN
        INSERT INTO inventory (organization_id, product_id, location_id, quantity)
        VALUES (NEW.organization_id, NEW.product_id, NEW.to_location_id, NEW.quantity)
        ON CONFLICT (product_id, location_id)
        DO UPDATE SET 
            quantity = inventory.quantity + NEW.quantity,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update inventory after transaction
CREATE TRIGGER update_inventory_trigger
    AFTER INSERT ON inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION update_inventory_after_transaction();