-- Row Level Security policies for household inventory system

-- Enable RLS on all new tables
ALTER TABLE household_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_location_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_activity_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is in household (organization)
CREATE OR REPLACE FUNCTION user_in_household(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members 
        WHERE user_id = auth.uid() 
        AND organization_id = org_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check family role permissions
CREATE OR REPLACE FUNCTION user_has_family_role_in_household(org_uuid UUID, required_role family_role)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
    role_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    -- Get user's role in the household
    SELECT om.role INTO user_role_val
    FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.organization_id = org_uuid;
    
    IF user_role_val IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Map old roles to new family roles and set hierarchy
    -- household_admin=3, family_member=2, kids_limited=1
    role_hierarchy := CASE user_role_val
        WHEN 'admin' THEN 3 -- household_admin
        WHEN 'manager' THEN 2 -- family_member  
        WHEN 'employee' THEN 2 -- family_member
        WHEN 'viewer' THEN 1 -- kids_limited
        ELSE 0
    END;
    
    required_hierarchy := CASE required_role
        WHEN 'household_admin' THEN 3
        WHEN 'family_member' THEN 2
        WHEN 'kids_limited' THEN 1
        ELSE 0
    END;
    
    RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Household locations policies
CREATE POLICY "Family members can view household locations" ON household_locations
    FOR SELECT USING (user_in_household(organization_id));

CREATE POLICY "Family members can manage household locations" ON household_locations
    FOR ALL USING (
        user_has_family_role_in_household(organization_id, 'family_member')
    );

-- Location tags policies
CREATE POLICY "Family members can view location tags" ON location_tags
    FOR SELECT USING (user_in_household(organization_id));

CREATE POLICY "Family members can manage location tags" ON location_tags
    FOR ALL USING (
        user_has_family_role_in_household(organization_id, 'family_member')
    );

-- Consumables policies
CREATE POLICY "Family members can view consumables" ON consumables
    FOR SELECT USING (user_in_household(organization_id));

CREATE POLICY "Family members can manage consumables" ON consumables
    FOR ALL USING (
        user_has_family_role_in_household(organization_id, 'family_member')
    );

-- Non-consumables policies
CREATE POLICY "Family members can view non-consumables" ON non_consumables
    FOR SELECT USING (user_in_household(organization_id));

CREATE POLICY "Family members can manage non-consumables" ON non_consumables
    FOR ALL USING (
        user_has_family_role_in_household(organization_id, 'family_member')
    );

-- Condition logs policies
CREATE POLICY "Family members can view condition logs" ON condition_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM non_consumables nc 
            WHERE nc.id = condition_logs.non_consumable_id 
            AND user_in_household(nc.organization_id)
        )
    );

CREATE POLICY "Family members can add condition logs" ON condition_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM non_consumables nc 
            WHERE nc.id = condition_logs.non_consumable_id 
            AND user_has_family_role_in_household(nc.organization_id, 'family_member')
        ) AND logged_by = auth.uid()
    );

-- Item photos policies
CREATE POLICY "Family members can view item photos" ON item_photos
    FOR SELECT USING (
        (item_type = 'consumable' AND EXISTS (
            SELECT 1 FROM consumables c 
            WHERE c.id = item_photos.item_id 
            AND user_in_household(c.organization_id)
        )) OR
        (item_type = 'non_consumable' AND EXISTS (
            SELECT 1 FROM non_consumables nc 
            WHERE nc.id = item_photos.item_id 
            AND user_in_household(nc.organization_id)
        ))
    );

CREATE POLICY "Family members can manage item photos" ON item_photos
    FOR ALL USING (
        (item_type = 'consumable' AND EXISTS (
            SELECT 1 FROM consumables c 
            WHERE c.id = item_photos.item_id 
            AND user_has_family_role_in_household(c.organization_id, 'family_member')
        )) OR
        (item_type = 'non_consumable' AND EXISTS (
            SELECT 1 FROM non_consumables nc 
            WHERE nc.id = item_photos.item_id 
            AND user_has_family_role_in_household(nc.organization_id, 'family_member')
        ))
    );

-- Item location tags policies
CREATE POLICY "Family members can view item tags" ON item_location_tags
    FOR SELECT USING (
        (item_type = 'consumable' AND EXISTS (
            SELECT 1 FROM consumables c 
            WHERE c.id = item_location_tags.item_id 
            AND user_in_household(c.organization_id)
        )) OR
        (item_type = 'non_consumable' AND EXISTS (
            SELECT 1 FROM non_consumables nc 
            WHERE nc.id = item_location_tags.item_id 
            AND user_in_household(nc.organization_id)
        ))
    );

CREATE POLICY "Family members can manage item tags" ON item_location_tags
    FOR ALL USING (
        (item_type = 'consumable' AND EXISTS (
            SELECT 1 FROM consumables c 
            WHERE c.id = item_location_tags.item_id 
            AND user_has_family_role_in_household(c.organization_id, 'family_member')
        )) OR
        (item_type = 'non_consumable' AND EXISTS (
            SELECT 1 FROM non_consumables nc 
            WHERE nc.id = item_location_tags.item_id 
            AND user_has_family_role_in_household(nc.organization_id, 'family_member')
        ))
    );

-- Shopping lists policies
CREATE POLICY "Family members can view shopping lists" ON shopping_lists
    FOR SELECT USING (user_in_household(organization_id));

CREATE POLICY "Family members can manage shopping lists" ON shopping_lists
    FOR ALL USING (
        user_has_family_role_in_household(organization_id, 'family_member')
    );

-- Shopping list items policies
CREATE POLICY "Family members can view shopping list items" ON shopping_list_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shopping_lists sl 
            WHERE sl.id = shopping_list_items.shopping_list_id 
            AND user_in_household(sl.organization_id)
        )
    );

CREATE POLICY "Family members can manage shopping list items" ON shopping_list_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM shopping_lists sl 
            WHERE sl.id = shopping_list_items.shopping_list_id 
            AND user_has_family_role_in_household(sl.organization_id, 'family_member')
        )
    );

-- Family activity log policies
CREATE POLICY "Family members can view family activity" ON family_activity_log
    FOR SELECT USING (user_in_household(organization_id));

CREATE POLICY "Family members can log activities" ON family_activity_log
    FOR INSERT WITH CHECK (
        user_in_household(organization_id) AND user_id = auth.uid()
    );

-- Update organization_members role mapping for family context
-- Add constraint to map existing roles to family roles
-- This allows gradual migration without breaking existing data
CREATE OR REPLACE VIEW family_members AS
SELECT 
    om.*,
    CASE om.role
        WHEN 'admin' THEN 'household_admin'::TEXT
        WHEN 'manager' THEN 'family_member'::TEXT  
        WHEN 'employee' THEN 'family_member'::TEXT
        WHEN 'viewer' THEN 'kids_limited'::TEXT
        ELSE 'family_member'::TEXT
    END as family_role,
    up.first_name,
    up.last_name,
    up.email,
    up.avatar_url,
    o.name as household_name
FROM organization_members om
JOIN user_profiles up ON om.user_id = up.id
JOIN organizations o ON om.organization_id = o.id;