-- Add Application Admin System
-- Migration 020: Admin functionality and analytics

-- Add application admin field to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_application_admin BOOLEAN DEFAULT FALSE;

-- Create application_admins table for admin-specific metadata
CREATE TABLE IF NOT EXISTS application_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_level VARCHAR(20) DEFAULT 'admin' CHECK (admin_level IN ('super_admin', 'admin', 'support')),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    UNIQUE(user_id)
);

-- Create organization analytics table for household-level summaries
CREATE TABLE IF NOT EXISTS organization_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- User activity metrics
    total_members INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,
    new_members_today INTEGER DEFAULT 0,
    
    -- Inventory metrics
    total_consumables INTEGER DEFAULT 0,
    total_non_consumables INTEGER DEFAULT 0,
    items_added_today INTEGER DEFAULT 0,
    items_updated_today INTEGER DEFAULT 0,
    
    -- Shopping metrics
    shopping_lists_count INTEGER DEFAULT 0,
    shopping_items_count INTEGER DEFAULT 0,
    items_purchased_today INTEGER DEFAULT 0,
    
    -- Location metrics
    total_locations INTEGER DEFAULT 0,
    total_containers INTEGER DEFAULT 0,
    
    -- Storage usage
    storage_photos_count INTEGER DEFAULT 0,
    storage_size_bytes BIGINT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, date)
);

-- Create application usage stats table for system-wide metrics
CREATE TABLE IF NOT EXISTS application_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Organization metrics
    total_organizations INTEGER DEFAULT 0,
    active_organizations INTEGER DEFAULT 0,
    new_organizations_today INTEGER DEFAULT 0,
    
    -- User metrics
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users_today INTEGER DEFAULT 0,
    
    -- System metrics
    total_items INTEGER DEFAULT 0,
    total_locations INTEGER DEFAULT 0,
    total_containers INTEGER DEFAULT 0,
    total_photos INTEGER DEFAULT 0,
    
    -- Activity metrics
    items_created_today INTEGER DEFAULT 0,
    photos_uploaded_today INTEGER DEFAULT 0,
    searches_today INTEGER DEFAULT 0,
    logins_today INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date)
);

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'user', 'organization', 'system', etc.
    target_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_admins_user_id ON application_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_application_admins_admin_level ON application_admins(admin_level);
CREATE INDEX IF NOT EXISTS idx_application_admins_is_active ON application_admins(is_active);

CREATE INDEX IF NOT EXISTS idx_organization_analytics_org_id ON organization_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_analytics_date ON organization_analytics(date);
CREATE INDEX IF NOT EXISTS idx_organization_analytics_org_date ON organization_analytics(organization_id, date);

CREATE INDEX IF NOT EXISTS idx_application_usage_stats_date ON application_usage_stats(date);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_user ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action ON admin_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_target ON admin_activity_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at);

-- Enable RLS on admin tables
ALTER TABLE application_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for application_admins
-- Only admins can see admin records
CREATE POLICY "application_admins_select_policy" ON application_admins
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_application_admin = TRUE
        )
    );

CREATE POLICY "application_admins_insert_policy" ON application_admins
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_application_admin = TRUE
        )
    );

CREATE POLICY "application_admins_update_policy" ON application_admins
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_application_admin = TRUE
        )
    );

-- Create RLS policies for organization_analytics
-- Only admins can see analytics
CREATE POLICY "organization_analytics_select_policy" ON organization_analytics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_application_admin = TRUE
        )
    );

CREATE POLICY "organization_analytics_insert_policy" ON organization_analytics
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_application_admin = TRUE
        )
    );

-- Create RLS policies for application_usage_stats
-- Only admins can see usage stats
CREATE POLICY "application_usage_stats_select_policy" ON application_usage_stats
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_application_admin = TRUE
        )
    );

-- Create RLS policies for admin_activity_log
-- Only admins can see activity logs
CREATE POLICY "admin_activity_log_select_policy" ON admin_activity_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_application_admin = TRUE
        )
    );

CREATE POLICY "admin_activity_log_insert_policy" ON admin_activity_log
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_application_admin = TRUE
        )
    );

-- Create function to update organization analytics
CREATE OR REPLACE FUNCTION update_organization_analytics(org_id UUID)
RETURNS VOID AS $$
DECLARE
    today DATE := CURRENT_DATE;
BEGIN
    INSERT INTO organization_analytics (
        organization_id,
        date,
        total_members,
        total_consumables,
        total_non_consumables,
        total_locations,
        total_containers
    )
    SELECT 
        org_id,
        today,
        (SELECT COUNT(*) FROM organization_members WHERE organization_id = org_id),
        (SELECT COUNT(*) FROM consumables WHERE organization_id = org_id AND is_active = TRUE),
        (SELECT COUNT(*) FROM non_consumables WHERE organization_id = org_id AND is_active = TRUE),
        (SELECT COUNT(*) FROM household_locations WHERE organization_id = org_id),
        (SELECT COUNT(*) FROM storage_containers WHERE location_id IN (
            SELECT id FROM household_locations WHERE organization_id = org_id
        ) AND is_active = TRUE)
    ON CONFLICT (organization_id, date) 
    DO UPDATE SET
        total_members = EXCLUDED.total_members,
        total_consumables = EXCLUDED.total_consumables,
        total_non_consumables = EXCLUDED.total_non_consumables,
        total_locations = EXCLUDED.total_locations,
        total_containers = EXCLUDED.total_containers,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to update application usage stats
CREATE OR REPLACE FUNCTION update_application_usage_stats()
RETURNS VOID AS $$
DECLARE
    today DATE := CURRENT_DATE;
BEGIN
    INSERT INTO application_usage_stats (
        date,
        total_organizations,
        total_users,
        total_items,
        total_locations,
        total_containers
    )
    SELECT 
        today,
        (SELECT COUNT(*) FROM organizations),
        (SELECT COUNT(*) FROM user_profiles),
        (SELECT COUNT(*) FROM consumables WHERE is_active = TRUE) + 
        (SELECT COUNT(*) FROM non_consumables WHERE is_active = TRUE),
        (SELECT COUNT(*) FROM household_locations),
        (SELECT COUNT(*) FROM storage_containers WHERE is_active = TRUE)
    ON CONFLICT (date) 
    DO UPDATE SET
        total_organizations = EXCLUDED.total_organizations,
        total_users = EXCLUDED.total_users,
        total_items = EXCLUDED.total_items,
        total_locations = EXCLUDED.total_locations,
        total_containers = EXCLUDED.total_containers;
END;
$$ LANGUAGE plpgsql;

-- Add comment describing the migration
COMMENT ON TABLE application_admins IS 'Stores application-level admin users with permissions and metadata';
COMMENT ON TABLE organization_analytics IS 'Daily analytics data for each organization/household';
COMMENT ON TABLE application_usage_stats IS 'Daily application-wide usage statistics';
COMMENT ON TABLE admin_activity_log IS 'Audit log for admin actions';