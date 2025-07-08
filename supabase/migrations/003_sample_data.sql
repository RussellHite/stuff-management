-- Sample data for testing
-- Note: This should be run after creating a test user through Supabase Auth

-- Insert sample organizations
INSERT INTO organizations (id, name, slug, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Acme Corporation', 'acme-corp', 'A leading technology company specializing in innovative solutions'),
    ('550e8400-e29b-41d4-a716-446655440001', 'Global Logistics Inc', 'global-logistics', 'International logistics and supply chain management');

-- Insert sample categories
INSERT INTO categories (id, organization_id, name, description, color) VALUES
    ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Electronics', 'Electronic devices and components', '#3B82F6'),
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Office Supplies', 'General office supplies and stationery', '#10B981'),
    ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Hardware', 'Computer hardware and accessories', '#F59E0B'),
    ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Packaging', 'Packaging materials and supplies', '#8B5CF6');

-- Insert sample locations
INSERT INTO locations (id, organization_id, name, type, address, city, state, country, postal_code) VALUES
    ('770e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Main Warehouse', 'warehouse', '123 Industrial Blvd', 'New York', 'NY', 'USA', '10001'),
    ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Retail Store - Downtown', 'store', '456 Main St', 'New York', 'NY', 'USA', '10002'),
    ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Distribution Center', 'warehouse', '789 Logistics Way', 'Los Angeles', 'CA', 'USA', '90210'),
    ('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Office Storage', 'office', '321 Corporate Dr', 'New York', 'NY', 'USA', '10003');

-- Insert sample products
INSERT INTO products (id, organization_id, sku, name, description, category_id, brand, unit_of_measure, cost_price, selling_price, min_stock_level, reorder_point, qr_code) VALUES
    ('880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'LAPTOP-001', 'MacBook Pro 16"', 'Apple MacBook Pro 16-inch with M2 chip', '660e8400-e29b-41d4-a716-446655440000', 'Apple', 'pcs', 2000.00, 2499.00, 5, 10, 'QR_LAPTOP_001'),
    ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'MOUSE-001', 'Wireless Mouse', 'Logitech MX Master 3 Wireless Mouse', '660e8400-e29b-41d4-a716-446655440000', 'Logitech', 'pcs', 80.00, 99.99, 20, 30, 'QR_MOUSE_001'),
    ('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'PAPER-001', 'A4 Copy Paper', 'Premium A4 copy paper, 500 sheets', '660e8400-e29b-41d4-a716-446655440001', 'Office Depot', 'pack', 8.00, 12.99, 50, 100, 'QR_PAPER_001'),
    ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'KEYBOARD-001', 'Mechanical Keyboard', 'Cherry MX Blue Mechanical Keyboard', '660e8400-e29b-41d4-a716-446655440002', 'Cherry', 'pcs', 120.00, 149.99, 10, 20, 'QR_KEYBOARD_001'),
    ('880e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'BOX-001', 'Shipping Box Medium', 'Corrugated shipping box 12x8x6 inches', '660e8400-e29b-41d4-a716-446655440003', 'BoxCorp', 'pcs', 1.50, 2.99, 100, 200, 'QR_BOX_001');

-- Insert sample inventory (initial stock)
INSERT INTO inventory (organization_id, product_id, location_id, quantity) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440000', 25),
    ('550e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440001', 5),
    ('550e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440000', 100),
    ('550e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 15),
    ('550e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440003', 500),
    ('550e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440000', 30),
    ('550e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', 1000);

-- Function to create sample transactions (run this after creating a test user)
CREATE OR REPLACE FUNCTION create_sample_transactions(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Sample inventory transactions
    INSERT INTO inventory_transactions (
        organization_id, product_id, location_id, type, quantity, 
        quantity_before, quantity_after, cost_per_unit, total_cost,
        reference_number, notes, created_by
    ) VALUES
    (
        '550e8400-e29b-41d4-a716-446655440000',
        '880e8400-e29b-41d4-a716-446655440000',
        '770e8400-e29b-41d4-a716-446655440000',
        'in',
        25,
        0,
        25,
        2000.00,
        50000.00,
        'PO-2024-001',
        'Initial stock receipt',
        user_uuid
    ),
    (
        '550e8400-e29b-41d4-a716-446655440000',
        '880e8400-e29b-41d4-a716-446655440001',
        '770e8400-e29b-41d4-a716-446655440000',
        'in',
        100,
        0,
        100,
        80.00,
        8000.00,
        'PO-2024-002',
        'Mouse inventory restocking',
        user_uuid
    ),
    (
        '550e8400-e29b-41d4-a716-446655440000',
        '880e8400-e29b-41d4-a716-446655440000',
        '770e8400-e29b-41d4-a716-446655440000',
        'out',
        5,
        25,
        20,
        2000.00,
        10000.00,
        'SO-2024-001',
        'Sale to customer',
        user_uuid
    );
END;
$$ LANGUAGE plpgsql;

-- Instructions for setting up sample data:
-- 1. Create a test user through Supabase Auth
-- 2. Add the user to organizations by running:
--    INSERT INTO organization_members (user_id, organization_id, role) VALUES 
--    ('your-user-id', '550e8400-e29b-41d4-a716-446655440000', 'admin');
-- 3. Run: SELECT create_sample_transactions('your-user-id');