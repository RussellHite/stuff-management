-- Fix infinite recursion in RLS policies

-- Drop all policies again to start fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    -- Drop organizations policies
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', pol.policyname);
    END LOOP;
    
    -- Drop organization_members policies
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organization_members' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', pol.policyname);
    END LOOP;
END $$;

-- Create simple, non-recursive policies for organizations
CREATE POLICY "organizations_insert_policy" ON organizations
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "organizations_select_policy" ON organizations
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "organizations_update_policy" ON organizations
    FOR UPDATE 
    USING (auth.uid() IS NOT NULL);

-- Create simple, non-recursive policies for organization_members
CREATE POLICY "org_members_insert_policy" ON organization_members
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "org_members_select_policy" ON organization_members
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "org_members_update_policy" ON organization_members
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Also ensure user_profiles can be created
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "profiles_insert_policy" ON user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select_policy" ON user_profiles
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_policy" ON user_profiles
    FOR UPDATE 
    USING (auth.uid() = id);