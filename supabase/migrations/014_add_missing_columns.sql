-- Simple migration to add missing columns for onboarding
-- Run this directly in Supabase SQL Editor

-- Add onboarding_completed to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add type column to organizations table (if enum exists)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'company';

-- Update type column to use enum if it exists
DO $$ 
BEGIN
    -- Try to use the enum type if it exists
    ALTER TABLE organizations ALTER COLUMN type TYPE organization_type USING type::organization_type;
EXCEPTION
    WHEN OTHERS THEN
        -- If enum doesn't exist, just keep it as VARCHAR
        NULL;
END $$;

-- Ensure user_profiles table exists
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure organization_members table exists
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES user_profiles(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    UNIQUE(user_id, organization_id)
);

-- Simple onboarding_progress table
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    completed_steps INTEGER[] DEFAULT '{}',
    household_name TEXT,
    rooms_data JSONB DEFAULT '[]',
    first_container_data JSONB,
    first_item_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on new tables
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies (ignore if they exist)
DO $$ 
BEGIN
    -- Basic select policy for onboarding_progress
    CREATE POLICY "Users can view own onboarding progress" ON onboarding_progress
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    -- Basic insert policy for onboarding_progress
    CREATE POLICY "Users can insert own onboarding progress" ON onboarding_progress
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    -- Basic update policy for onboarding_progress
    CREATE POLICY "Users can update own onboarding progress" ON onboarding_progress
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;