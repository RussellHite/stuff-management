-- Create onboarding progress tracking table
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

-- Add onboarding_completed flag to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add default_containers_created flag to household_locations table
ALTER TABLE household_locations 
ADD COLUMN IF NOT EXISTS default_containers_created BOOLEAN DEFAULT FALSE;

-- Create RLS policies for onboarding_progress
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own onboarding progress
CREATE POLICY "Users can view own onboarding progress" ON onboarding_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding progress" ON onboarding_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress" ON onboarding_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own onboarding progress" ON onboarding_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger for onboarding_progress
CREATE OR REPLACE FUNCTION update_onboarding_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_progress_updated_at();

-- Create function to clean up completed onboarding progress (optional)
CREATE OR REPLACE FUNCTION cleanup_completed_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- When an organization is marked as onboarding_completed,
  -- optionally clean up the onboarding_progress table
  IF NEW.onboarding_completed = TRUE AND OLD.onboarding_completed = FALSE THEN
    DELETE FROM onboarding_progress 
    WHERE household_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_onboarding_on_completion
  AFTER UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_completed_onboarding();

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_household_id ON onboarding_progress(household_id);
CREATE INDEX IF NOT EXISTS idx_organizations_onboarding_completed ON organizations(onboarding_completed);