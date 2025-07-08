-- Sample household inventory data

-- Update the existing organization to be household-focused
UPDATE organizations 
SET 
    name = 'The Smith Household',
    slug = 'smith-family',
    description = 'Family home inventory and management system'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Add household locations (rooms)
INSERT INTO household_locations (id, organization_id, room_name, description, is_primary_storage) VALUES
    ('770e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Kitchen', 'Main kitchen area with pantry', true),
    ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Garage', 'Storage and workshop area', true),
    ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Bathroom - Main', 'Main bathroom with medicine cabinet', false),
    ('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Laundry Room', 'Washer, dryer, and cleaning supplies', true),
    ('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Basement', 'Storage and utility area', true),
    ('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', 'Living Room', 'Main living area', false),
    ('770e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', 'Master Bedroom', 'Main bedroom', false);

-- Add location tags
INSERT INTO location_tags (organization_id, location_id, tag_name, usage_count) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440000', 'pantry', 5),
    ('550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440000', 'refrigerator', 3),
    ('550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440001', 'tools', 8),
    ('550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440001', 'automotive', 4),
    ('550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440002', 'medicine', 6),
    ('550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440003', 'cleaning', 10);

-- Add sample consumables
INSERT INTO consumables (id, organization_id, name, description, brand, size_quantity, current_quantity, reorder_threshold, reorder_info, cost_per_unit, primary_location_id, qr_code, created_by) VALUES
    ('880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Laundry Detergent', 'High-efficiency liquid detergent', 'Tide', '64 fl oz', 2, 1, 'Costco - Aisle 15, or Amazon Subscribe & Save', 12.99, '770e8400-e29b-41d4-a716-446655440003', 'QR_DETERGENT_001', 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Toilet Paper', 'Ultra-soft 2-ply toilet paper', 'Charmin', '12 mega rolls', 8, 3, 'Target or Amazon Subscribe & Save', 16.99, '770e8400-e29b-41d4-a716-446655440002', 'QR_TP_001', 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Olive Oil', 'Extra virgin olive oil', 'Kirkland', '1 liter', 1, 1, 'Costco - usually near pasta aisle', 8.99, '770e8400-e29b-41d4-a716-446655440000', 'QR_OLIVEOIL_001', 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Dishwasher Pods', 'All-in-one dishwasher detergent pods', 'Cascade', '32 count', 15, 5, 'Amazon Subscribe & Save or grocery store', 9.99, '770e8400-e29b-41d4-a716-446655440000', 'QR_DISHPODS_001', 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('880e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Hand Soap', 'Antibacterial hand soap refill', 'Softsoap', '56 fl oz', 3, 2, 'Any grocery store or Amazon', 4.99, '770e8400-e29b-41d4-a716-446655440002', 'QR_HANDSOAP_001', 'a2bb9a55-f334-4050-b4c8-6041f6060ead');

-- Add sample non-consumables
INSERT INTO non_consumables (id, organization_id, name, description, brand, model, serial_number, purchase_date, purchase_price, primary_location_id, current_quality_rating, qr_code, created_by) VALUES
    ('990e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Washing Machine', 'Front-loading washing machine', 'LG', 'WM3900HWA', 'LG123456789', '2023-03-15', 899.99, '770e8400-e29b-41d4-a716-446655440003', 'excellent', 'QR_WASHER_001', 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Refrigerator', 'French door refrigerator with ice maker', 'Samsung', 'RF23M8070SR', 'SAM987654321', '2022-11-20', 1599.99, '770e8400-e29b-41d4-a716-446655440000', 'good', 'QR_FRIDGE_001', 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Drill Set', 'Cordless drill with bit set', 'DeWalt', 'DCD771C2', 'DW555444333', '2023-08-10', 129.99, '770e8400-e29b-41d4-a716-446655440001', 'good', 'QR_DRILL_001', 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('990e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Smart TV', '55-inch 4K Smart TV', 'Sony', 'X90J', 'SONY777888999', '2023-01-05', 1299.99, '770e8400-e29b-41d4-a716-446655440005', 'excellent', 'QR_TV_001', 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('990e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Air Purifier', 'HEPA air purifier for large rooms', 'Honeywell', 'HPA300', 'HON111222333', '2023-06-22', 249.99, '770e8400-e29b-41d4-a716-446655440005', 'good', 'QR_AIRPURE_001', 'a2bb9a55-f334-4050-b4c8-6041f6060ead');

-- Add some condition logs for non-consumables
INSERT INTO condition_logs (non_consumable_id, timestamp, notes, quality_rating, maintenance_performed, logged_by) VALUES
    ('990e8400-e29b-41d4-a716-446655440000', '2024-01-15 10:30:00+00', 'Annual maintenance check - all functions working perfectly', 'excellent', 'Cleaned lint filter and checked hoses', 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('990e8400-e29b-41d4-a716-446655440001', '2024-02-20 14:15:00+00', 'Ice maker making strange noise, but still functional', 'good', 'Cleaned ice maker and water filter', 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('990e8400-e29b-41d4-a716-446655440004', '2024-03-10 09:45:00+00', 'Replaced HEPA filter as scheduled', 'good', 'Replaced HEPA filter and cleaned pre-filter', 'a2bb9a55-f334-4050-b4c8-6041f6060ead');

-- Add item tags
INSERT INTO item_location_tags (item_id, item_type, tag_name) VALUES
    ('880e8400-e29b-41d4-a716-446655440000', 'consumable', 'cleaning'),
    ('880e8400-e29b-41d4-a716-446655440000', 'consumable', 'laundry'),
    ('880e8400-e29b-41d4-a716-446655440001', 'consumable', 'bathroom'),
    ('880e8400-e29b-41d4-a716-446655440001', 'consumable', 'essential'),
    ('880e8400-e29b-41d4-a716-446655440002', 'consumable', 'cooking'),
    ('880e8400-e29b-41d4-a716-446655440002', 'consumable', 'pantry'),
    ('880e8400-e29b-41d4-a716-446655440003', 'consumable', 'kitchen'),
    ('880e8400-e29b-41d4-a716-446655440003', 'consumable', 'cleaning'),
    ('990e8400-e29b-41d4-a716-446655440000', 'non_consumable', 'appliance'),
    ('990e8400-e29b-41d4-a716-446655440000', 'non_consumable', 'warranty'),
    ('990e8400-e29b-41d4-a716-446655440001', 'non_consumable', 'appliance'),
    ('990e8400-e29b-41d4-a716-446655440001', 'non_consumable', 'kitchen'),
    ('990e8400-e29b-41d4-a716-446655440002', 'non_consumable', 'tools'),
    ('990e8400-e29b-41d4-a716-446655440003', 'non_consumable', 'electronics'),
    ('990e8400-e29b-41d4-a716-446655440004', 'non_consumable', 'electronics');

-- Create a default shopping list
INSERT INTO shopping_lists (id, organization_id, name, description, created_by) VALUES
    ('bb0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Weekly Shopping', 'Regular household shopping list', 'a2bb9a55-f334-4050-b4c8-6041f6060ead');

-- Add some shopping list items
INSERT INTO shopping_list_items (shopping_list_id, item_name, quantity, notes, estimated_cost, created_by) VALUES
    ('bb0e8400-e29b-41d4-a716-446655440000', 'Milk', 2, '2% organic milk - 1 gallon each', 7.98, 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('bb0e8400-e29b-41d4-a716-446655440000', 'Bread', 1, 'Whole wheat sandwich bread', 3.49, 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('bb0e8400-e29b-41d4-a716-446655440000', 'Bananas', 1, '1 bunch, not too ripe', 2.99, 'a2bb9a55-f334-4050-b4c8-6041f6060ead'),
    ('bb0e8400-e29b-41d4-a716-446655440000', 'Chicken Breast', 2, '2 lbs boneless skinless', 12.98, 'a2bb9a55-f334-4050-b4c8-6041f6060ead');

-- Add some family activity logs
INSERT INTO family_activity_log (organization_id, user_id, activity_type, description, item_id, item_type, metadata) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'a2bb9a55-f334-4050-b4c8-6041f6060ead', 'added_item', 'Added laundry detergent to household inventory', '880e8400-e29b-41d4-a716-446655440000', 'consumable', '{"location": "Laundry Room"}'),
    ('550e8400-e29b-41d4-a716-446655440000', 'a2bb9a55-f334-4050-b4c8-6041f6060ead', 'updated_quantity', 'Used 1 bottle of olive oil', '880e8400-e29b-41d4-a716-446655440002', 'consumable', '{"previous_quantity": 2, "new_quantity": 1}'),
    ('550e8400-e29b-41d4-a716-446655440000', 'a2bb9a55-f334-4050-b4c8-6041f6060ead', 'maintenance', 'Performed annual maintenance on washing machine', '990e8400-e29b-41d4-a716-446655440000', 'non_consumable', '{"maintenance_type": "annual_check"}'),
    ('550e8400-e29b-41d4-a716-446655440000', 'a2bb9a55-f334-4050-b4c8-6041f6060ead', 'shopping_list', 'Created weekly shopping list', 'bb0e8400-e29b-41d4-a716-446655440000', NULL, '{"list_name": "Weekly Shopping"}')