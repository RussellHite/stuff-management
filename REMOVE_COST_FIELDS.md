# Remove Cost Fields from Shopping Lists

Run this SQL in your Supabase SQL Editor to remove the cost tracking fields:

```sql
-- Remove cost tracking fields from shopping list items
-- Per user request, we don't want to track cost information

ALTER TABLE shopping_list_items 
DROP COLUMN IF EXISTS estimated_cost,
DROP COLUMN IF EXISTS actual_cost;
```

## What Changed

1. **Removed from Shopping Lists:**
   - Estimated cost input field
   - Actual cost tracking
   - Cost totals display
   - Dollar sign icons

2. **UI is now cleaner:**
   - Shopping list focuses on items and quantities
   - No financial tracking
   - Simpler add/edit forms

The shopping list now focuses purely on what to buy, not how much it costs.