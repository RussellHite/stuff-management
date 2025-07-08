-- Remove cost tracking fields from shopping list items
-- Per user request, we don't want to track cost information

ALTER TABLE shopping_list_items 
DROP COLUMN IF EXISTS estimated_cost,
DROP COLUMN IF EXISTS actual_cost;