# Fix Location Delete Issue

The location delete is failing because of foreign key constraints. Items (consumables and non-consumables) that reference the location prevent deletion.

## Quick Fix - Run this SQL in Supabase Dashboard

Go to your Supabase SQL Editor and run:

```sql
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
```

## What This Does

1. **Before**: Locations couldn't be deleted if any items referenced them
2. **After**: When a location is deleted, items that referenced it will have their `primary_location_id` set to NULL

## Alternative Approach

If you prefer not to allow deletion of locations with items, I've already updated the error message to be more descriptive. The error will now show exactly why the deletion failed.

## Testing

After running the SQL:
1. Try deleting a location again
2. Check that any items previously in that location now show no location
3. The items themselves remain in the system, just without a location assignment