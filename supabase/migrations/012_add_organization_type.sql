-- Add type column to organizations table for household support
CREATE TYPE organization_type AS ENUM ('company', 'household', 'team', 'other');

-- Add type column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS type organization_type DEFAULT 'company';

-- Update any existing records that might be households
UPDATE organizations 
SET type = 'household' 
WHERE name ILIKE '%family%' OR name ILIKE '%household%' OR name ILIKE '%home%';

-- Add status column for membership tracking
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Create index for better performance on type queries
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);