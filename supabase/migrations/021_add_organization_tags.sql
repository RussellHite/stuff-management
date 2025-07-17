-- Add Organization Tags System
-- Migration 021: Add tags field to organizations table

-- Add tags JSONB field to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '{}';

-- Create index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_organizations_tags ON organizations USING GIN (tags);

-- Create function to add tag to organization
CREATE OR REPLACE FUNCTION add_organization_tag(org_id UUID, tag_category TEXT, tag_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE organizations 
    SET tags = COALESCE(tags, '{}') || jsonb_build_object(tag_category, tag_value)
    WHERE id = org_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to remove tag from organization
CREATE OR REPLACE FUNCTION remove_organization_tag(org_id UUID, tag_category TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE organizations 
    SET tags = tags - tag_category
    WHERE id = org_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to get organizations by tag
CREATE OR REPLACE FUNCTION get_organizations_by_tag(tag_category TEXT, tag_value TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    description TEXT,
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.slug,
        o.description,
        o.tags,
        o.created_at
    FROM organizations o
    WHERE o.tags ->> tag_category = tag_value;
END;
$$ LANGUAGE plpgsql;

-- Add some example tags for existing organizations
-- Note: This is optional and can be run manually

-- Example tag categories:
-- Account Status: free_user, subscribed_user, trial_user, suspended_user
-- Testing: test_account, beta_tester, production_user
-- Program: early_adopter, referral_user, invited_user  
-- Support: priority_support, standard_support

-- Add comments for documentation
COMMENT ON COLUMN organizations.tags IS 'JSONB field for flexible organization tagging system. Example: {"account_status": "subscribed_user", "testing": "beta_tester"}';
COMMENT ON FUNCTION add_organization_tag(UUID, TEXT, TEXT) IS 'Adds or updates a tag for an organization';
COMMENT ON FUNCTION remove_organization_tag(UUID, TEXT) IS 'Removes a tag category from an organization';
COMMENT ON FUNCTION get_organizations_by_tag(TEXT, TEXT) IS 'Returns organizations that have a specific tag value';