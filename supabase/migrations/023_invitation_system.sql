-- Invitation System Migration
-- Migration 023: Add invitation system for organization member management

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES auth.users(id),
    
    -- Invitation metadata
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
    permissions JSONB DEFAULT '{}',
    personal_message TEXT,
    
    -- Tracking fields
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resent_count INTEGER DEFAULT 0,
    last_resent_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure one pending invitation per email per organization
    UNIQUE(organization_id, email, status)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_organization_id ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON invitations(created_by);

-- Create API keys table for organization-level API access
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL, -- First few chars for identification
    name VARCHAR(100),
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    rate_limit_per_hour INTEGER DEFAULT 1000
);

-- Create indexes for API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Create admin activity log for audit trail
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- 'organization', 'user', 'invitation', etc.
    target_id UUID,
    organization_id UUID REFERENCES organizations(id),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for activity log
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_user_id ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action ON admin_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_target_type ON admin_activity_log(target_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_organization_id ON admin_activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at);

-- Add missing columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'free' CHECK (plan_type IN ('free', 'premium', 'enterprise'));

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 5;

-- Update existing organizations to have proper max_members
UPDATE organizations SET max_members = 5 WHERE max_members IS NULL;

-- Create RLS policies for invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations for organizations they're members of
CREATE POLICY "Members can view organization invitations" ON invitations
    FOR SELECT
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'manager')
        )
    );

-- Policy: Admins and managers can create invitations
CREATE POLICY "Admin and Manager can create invitations" ON invitations
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'manager')
        )
        AND created_by = auth.uid()
    );

-- Policy: Admins and managers can update invitations
CREATE POLICY "Admin and Manager can update invitations" ON invitations
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'manager')
        )
    );

-- Policy: Admins and managers can delete invitations
CREATE POLICY "Admin and Manager can delete invitations" ON invitations
    FOR DELETE
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'manager')
        )
    );

-- Create RLS policies for API keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can manage API keys
CREATE POLICY "Admin can manage API keys" ON api_keys
    FOR ALL
    USING (
        organization_id IN (
            SELECT om.organization_id 
            FROM organization_members om 
            WHERE om.user_id = auth.uid()
            AND om.role = 'admin'
        )
    );

-- Create RLS policies for admin activity log
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Application admins can view all activity
CREATE POLICY "Application admins can view all activity" ON admin_activity_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND is_application_admin = TRUE
        )
    );

-- Policy: Users can view their own activity
CREATE POLICY "Users can view own activity" ON admin_activity_log
    FOR SELECT
    USING (admin_user_id = auth.uid());

-- Policy: Only authenticated users can create activity logs
CREATE POLICY "Authenticated users can create activity logs" ON admin_activity_log
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Function to automatically expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
    UPDATE invitations 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old activity logs (optional)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
    DELETE FROM admin_activity_log 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set invitation token
CREATE OR REPLACE FUNCTION set_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.token IS NULL OR NEW.token = '' THEN
        NEW.token := generate_invitation_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invitation_token_trigger
    BEFORE INSERT ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION set_invitation_token();

-- Add organization member count constraint
CREATE OR REPLACE FUNCTION check_organization_member_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Get current member count and max allowed
    SELECT 
        COUNT(om.id),
        o.max_members
    INTO current_count, max_allowed
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.organization_id = NEW.organization_id
    GROUP BY o.max_members;
    
    -- Check if adding this member would exceed the limit
    IF current_count >= max_allowed THEN
        RAISE EXCEPTION 'Organization has reached maximum member limit of %', max_allowed;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_member_limit_trigger
    BEFORE INSERT ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION check_organization_member_limit();

-- Create invitation acceptance function
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT, accepting_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    result JSONB;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM invitations 
    WHERE token = invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if user already exists in organization
    IF EXISTS (
        SELECT 1 FROM organization_members 
        WHERE user_id = accepting_user_id 
        AND organization_id = invitation_record.organization_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this organization');
    END IF;
    
    -- Add user to organization
    INSERT INTO organization_members (
        user_id,
        organization_id,
        role,
        permissions,
        joined_at
    ) VALUES (
        accepting_user_id,
        invitation_record.organization_id,
        invitation_record.role,
        invitation_record.permissions,
        NOW()
    );
    
    -- Update invitation status
    UPDATE invitations 
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        accepted_by = accepting_user_id
    WHERE id = invitation_record.id;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'organization_id', invitation_record.organization_id,
        'role', invitation_record.role
    );
END;
$$ LANGUAGE plpgsql;

-- Update organization analytics when members are added/removed
CREATE OR REPLACE FUNCTION update_organization_member_analytics()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
    member_count INTEGER;
BEGIN
    -- Get organization ID from the operation
    IF TG_OP = 'DELETE' THEN
        org_id := OLD.organization_id;
    ELSE
        org_id := NEW.organization_id;
    END IF;
    
    -- Get current member count
    SELECT COUNT(*) INTO member_count
    FROM organization_members
    WHERE organization_id = org_id;
    
    -- Update analytics
    INSERT INTO organization_analytics (organization_id, total_members, active_members)
    VALUES (org_id, member_count, member_count)
    ON CONFLICT (organization_id, date) 
    DO UPDATE SET 
        total_members = EXCLUDED.total_members,
        active_members = EXCLUDED.active_members,
        updated_at = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_member_analytics_trigger
    AFTER INSERT OR UPDATE OR DELETE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_member_analytics();