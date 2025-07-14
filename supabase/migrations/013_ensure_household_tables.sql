-- This migration ensures all required household tables exist
-- Run this if you're getting "relation does not exist" errors

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create family_role type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE family_role AS ENUM ('household_admin', 'family_member', 'kids_limited');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create item_type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('consumable', 'non_consumable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create photo_type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE photo_type AS ENUM ('main', 'detail', 'condition', 'receipt');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create quality_rating if it doesn't exist
DO $$ BEGIN
    CREATE TYPE quality_rating AS ENUM ('excellent', 'good', 'fair', 'poor', 'needs_repair');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure household_locations table exists
CREATE TABLE IF NOT EXISTS household_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    room_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_primary_storage BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure consumables table exists
CREATE TABLE IF NOT EXISTS consumables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES household_locations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    description TEXT,
    barcode VARCHAR(50),
    category VARCHAR(100),
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER,
    unit VARCHAR(50),
    expiry_tracking BOOLEAN DEFAULT FALSE,
    photos JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure non_consumables table exists  
CREATE TABLE IF NOT EXISTS non_consumables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES household_locations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    purchase_date DATE,
    purchase_location VARCHAR(255),
    warranty_end_date DATE,
    manual_url TEXT,
    photos JSONB DEFAULT '[]',
    quality_rating quality_rating DEFAULT 'good',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure shopping_lists table exists
CREATE TABLE IF NOT EXISTS shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    created_by UUID REFERENCES user_profiles(id),
    assigned_to UUID REFERENCES user_profiles(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure shopping_list_items table exists
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    consumable_id UUID REFERENCES consumables(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit VARCHAR(50),
    notes TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure family_activity_log table exists
CREATE TABLE IF NOT EXISTS family_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    entity_name VARCHAR(255),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_household_locations_org_id ON household_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_consumables_org_id ON consumables(organization_id);
CREATE INDEX IF NOT EXISTS idx_consumables_location_id ON consumables(location_id);
CREATE INDEX IF NOT EXISTS idx_non_consumables_org_id ON non_consumables(organization_id);
CREATE INDEX IF NOT EXISTS idx_non_consumables_location_id ON non_consumables(location_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_org_id ON shopping_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_family_activity_log_org_id ON family_activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_family_activity_log_user_id ON family_activity_log(user_id);

-- Enable RLS on all tables
ALTER TABLE household_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_activity_log ENABLE ROW LEVEL SECURITY;

-- Add any missing columns that other migrations expect
ALTER TABLE household_locations 
ADD COLUMN IF NOT EXISTS default_containers_created BOOLEAN DEFAULT FALSE;