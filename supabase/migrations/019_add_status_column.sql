-- Add missing status column to organization_members

ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'organization_members' 
ORDER BY column_name;