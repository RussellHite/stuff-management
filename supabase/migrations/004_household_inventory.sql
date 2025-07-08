-- Household Inventory Migration
-- This adapts the existing multi-tenant system for home inventory management

-- Update existing types for household context
CREATE TYPE family_role AS ENUM ('household_admin', 'family_member', 'kids_limited');
CREATE TYPE item_type AS ENUM ('consumable', 'non_consumable');
CREATE TYPE photo_type AS ENUM ('main', 'detail', 'condition', 'receipt');
CREATE TYPE quality_rating AS ENUM ('excellent', 'good', 'fair', 'poor', 'needs_repair');

-- Locations table for rooms/areas in the house
CREATE TABLE household_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    room_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_primary_storage BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location tags for organizing spaces (e.g., "storage", "pantry", "garage")
CREATE TABLE location_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES household_locations(id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consumables table for items that get used up (food, toiletries, cleaning supplies)
CREATE TABLE consumables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    size_quantity VARCHAR(50), -- e.g., "16 oz", "2 liter", "pack of 12"
    current_quantity INTEGER NOT NULL DEFAULT 0,
    reorder_threshold INTEGER DEFAULT 1,
    reorder_info TEXT, -- Store name, URL, notes about where to buy
    cost_per_unit DECIMAL(10,2),
    primary_location_id UUID REFERENCES household_locations(id),
    qr_code TEXT,
    barcode VARCHAR(100),
    expiration_date DATE,
    purchase_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Non-consumables table for items that don't get used up (appliances, furniture, tools)
CREATE TABLE non_consumables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    warranty_expiration DATE,
    primary_location_id UUID REFERENCES household_locations(id),
    current_quality_rating quality_rating DEFAULT 'good',
    qr_code TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Condition logs for tracking non-consumable item condition over time
CREATE TABLE condition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    non_consumable_id UUID NOT NULL REFERENCES non_consumables(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    quality_rating quality_rating NOT NULL,
    maintenance_performed TEXT,
    cost_of_maintenance DECIMAL(10,2),
    logged_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photos for items (receipts, condition photos, etc.)
CREATE TABLE item_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL,
    item_type item_type NOT NULL,
    photo_url TEXT NOT NULL,
    caption VARCHAR(255),
    photo_type photo_type DEFAULT 'main',
    uploaded_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags for items (cross-references both consumables and non-consumables)
CREATE TABLE item_location_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL,
    item_type item_type NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping lists for household items
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Shopping List',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping list items
CREATE TABLE shopping_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    is_purchased BOOLEAN DEFAULT FALSE,
    purchased_by UUID REFERENCES user_profiles(id),
    purchased_at TIMESTAMP WITH TIME ZONE,
    -- Optional reference to existing consumable for reordering
    consumable_id UUID REFERENCES consumables(id),
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family activity log for tracking who did what
CREATE TABLE family_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    activity_type VARCHAR(50) NOT NULL, -- 'added_item', 'updated_quantity', 'purchased_item', etc.
    description TEXT NOT NULL,
    item_id UUID, -- Optional reference to item involved
    item_type item_type, -- Type of item if item_id is provided
    metadata JSONB DEFAULT '{}', -- Additional data about the activity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_household_locations_org_id ON household_locations(organization_id);
CREATE INDEX idx_location_tags_location_id ON location_tags(location_id);
CREATE INDEX idx_location_tags_org_id ON location_tags(organization_id);
CREATE INDEX idx_consumables_org_id ON consumables(organization_id);
CREATE INDEX idx_consumables_location_id ON consumables(primary_location_id);
CREATE INDEX idx_consumables_reorder ON consumables(organization_id, current_quantity, reorder_threshold) WHERE current_quantity <= reorder_threshold;
CREATE INDEX idx_non_consumables_org_id ON non_consumables(organization_id);
CREATE INDEX idx_non_consumables_location_id ON non_consumables(primary_location_id);
CREATE INDEX idx_condition_logs_item_id ON condition_logs(non_consumable_id);
CREATE INDEX idx_item_photos_item ON item_photos(item_id, item_type);
CREATE INDEX idx_item_tags_item ON item_location_tags(item_id, item_type);
CREATE INDEX idx_shopping_lists_org_id ON shopping_lists(organization_id);
CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_family_activity_org_id ON family_activity_log(organization_id);
CREATE INDEX idx_family_activity_user_id ON family_activity_log(user_id);
CREATE INDEX idx_family_activity_created_at ON family_activity_log(created_at);

-- Create updated_at triggers for new tables
CREATE TRIGGER update_household_locations_updated_at BEFORE UPDATE ON household_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consumables_updated_at BEFORE UPDATE ON consumables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_non_consumables_updated_at BEFORE UPDATE ON non_consumables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_list_items_updated_at BEFORE UPDATE ON shopping_list_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically add items to shopping list when they're low
CREATE OR REPLACE FUNCTION check_and_add_to_shopping_list()
RETURNS TRIGGER AS $$
DECLARE
    default_list_id UUID;
BEGIN
    -- Check if quantity dropped to or below reorder threshold
    IF NEW.current_quantity <= NEW.reorder_threshold AND 
       (OLD.current_quantity IS NULL OR OLD.current_quantity > NEW.reorder_threshold) THEN
        
        -- Get or create default shopping list for the organization
        SELECT id INTO default_list_id 
        FROM shopping_lists 
        WHERE organization_id = NEW.organization_id 
        AND name = 'Auto-Reorder List' 
        AND is_active = TRUE
        LIMIT 1;
        
        IF default_list_id IS NULL THEN
            INSERT INTO shopping_lists (organization_id, name, description, created_by)
            VALUES (NEW.organization_id, 'Auto-Reorder List', 'Automatically generated reorder items', NEW.created_by)
            RETURNING id INTO default_list_id;
        END IF;
        
        -- Add item to shopping list if not already there
        INSERT INTO shopping_list_items (
            shopping_list_id, 
            item_name, 
            quantity, 
            notes, 
            consumable_id,
            created_by
        )
        SELECT 
            default_list_id,
            NEW.name,
            (NEW.reorder_threshold * 2), -- Suggest buying double the threshold
            COALESCE('Auto-added: ' || NEW.reorder_info, 'Auto-added when low'),
            NEW.id,
            NEW.created_by
        WHERE NOT EXISTS (
            SELECT 1 FROM shopping_list_items 
            WHERE shopping_list_id = default_list_id 
            AND consumable_id = NEW.id 
            AND is_purchased = FALSE
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add low items to shopping list
CREATE TRIGGER auto_reorder_trigger
    AFTER UPDATE OF current_quantity ON consumables
    FOR EACH ROW EXECUTE FUNCTION check_and_add_to_shopping_list();

-- Function to log family activities
CREATE OR REPLACE FUNCTION log_family_activity(
    org_id UUID,
    user_id UUID,
    activity_type TEXT,
    description TEXT,
    item_id UUID DEFAULT NULL,
    item_type item_type DEFAULT NULL,
    metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO family_activity_log (
        organization_id,
        user_id,
        activity_type,
        description,
        item_id,
        item_type,
        metadata
    ) VALUES (
        org_id,
        user_id,
        activity_type,
        description,
        item_id,
        item_type,
        metadata
    );
END;
$$ LANGUAGE plpgsql;