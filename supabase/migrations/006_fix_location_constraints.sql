-- Fix Foreign Key Constraints for Location Deletion
-- This migration updates the foreign key constraints to allow location deletion

-- Drop existing foreign key constraints
ALTER TABLE consumables 
DROP CONSTRAINT IF EXISTS consumables_primary_location_id_fkey;

ALTER TABLE non_consumables 
DROP CONSTRAINT IF EXISTS non_consumables_primary_location_id_fkey;

-- Re-add constraints with ON DELETE SET NULL
-- This allows locations to be deleted, setting the reference to NULL
ALTER TABLE consumables 
ADD CONSTRAINT consumables_primary_location_id_fkey 
FOREIGN KEY (primary_location_id) 
REFERENCES household_locations(id) 
ON DELETE SET NULL;

ALTER TABLE non_consumables 
ADD CONSTRAINT non_consumables_primary_location_id_fkey 
FOREIGN KEY (primary_location_id) 
REFERENCES household_locations(id) 
ON DELETE SET NULL;