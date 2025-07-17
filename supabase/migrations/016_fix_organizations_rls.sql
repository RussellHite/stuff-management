-- Fix RLS policies for organizations table to allow household creation

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- Create more permissive policies for organizations
CREATE POLICY "Enable read access for authenticated users" ON organizations
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            -- Users can see organizations they belong to
            EXISTS (
                SELECT 1 FROM organization_members
                WHERE organization_members.organization_id = organizations.id
                AND organization_members.user_id = auth.uid()
            )
            OR
            -- During onboarding, users can see orgs they're creating
            auth.uid() IN (
                SELECT user_id FROM organization_members 
                WHERE organization_id = organizations.id
            )
        )
    );

-- Allow authenticated users to create organizations
CREATE POLICY "Enable insert for authenticated users" ON organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update organizations they're admin of
CREATE POLICY "Enable update for organization admins" ON organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role = 'admin'
        )
    );

-- Fix organization_members policies to allow initial member creation
DROP POLICY IF EXISTS "Users can insert organization members" ON organization_members;

CREATE POLICY "Enable insert for organization creation" ON organization_members
    FOR INSERT WITH CHECK (
        -- Allow users to add themselves as members during org creation
        auth.uid() = user_id
        OR
        -- Allow admins to add members
        EXISTS (
            SELECT 1 FROM organization_members existing
            WHERE existing.organization_id = organization_members.organization_id
            AND existing.user_id = auth.uid()
            AND existing.role = 'admin'
        )
    );