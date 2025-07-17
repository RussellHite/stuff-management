-- Safely fix RLS policies by dropping all existing ones first

-- First, drop ALL existing policies on organizations
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', pol.policyname);
    END LOOP;
END $$;

-- Now create fresh policies that allow onboarding
CREATE POLICY "allow_authenticated_insert" ON organizations
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "allow_authenticated_select" ON organizations
    FOR SELECT 
    USING (
        auth.uid() IS NOT NULL AND (
            -- User is a member
            EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = organizations.id
                AND om.user_id = auth.uid()
            )
            -- Or it's a new org being created (no members yet)
            OR NOT EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = organizations.id
            )
        )
    );

CREATE POLICY "allow_admin_update" ON organizations
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = organizations.id
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
        )
    );

-- Fix organization_members policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organization_members' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', pol.policyname);
    END LOOP;
END $$;

-- Create fresh organization_members policies
CREATE POLICY "allow_self_insert" ON organization_members
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_member_select" ON organization_members
    FOR SELECT 
    USING (
        auth.uid() IN (
            SELECT user_id FROM organization_members
            WHERE organization_id = organization_members.organization_id
        )
    );

CREATE POLICY "allow_admin_insert" ON organization_members
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members existing
            WHERE existing.organization_id = organization_members.organization_id
            AND existing.user_id = auth.uid()
            AND existing.role = 'admin'
        )
    );

-- Test that policies are working
DO $$
BEGIN
    RAISE NOTICE 'Organizations policies: %', 
        (SELECT count(*) FROM pg_policies WHERE tablename = 'organizations');
    RAISE NOTICE 'Organization_members policies: %', 
        (SELECT count(*) FROM pg_policies WHERE tablename = 'organization_members');
END $$;