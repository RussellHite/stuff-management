-- Setup initial admin user
-- Migration 021: Grant admin access to initial user

-- Replace 'your-email@example.com' with your actual email address
UPDATE user_profiles 
SET is_application_admin = TRUE 
WHERE email = 'your-email@example.com';

-- Verify the admin user was set up
SELECT 
    id,
    email,
    is_application_admin,
    first_name,
    last_name
FROM user_profiles 
WHERE is_application_admin = TRUE;

-- Insert admin metadata (optional)
INSERT INTO application_admins (user_id, admin_level, permissions)
SELECT 
    id,
    'super_admin',
    '{"full_access": true}'
FROM user_profiles 
WHERE is_application_admin = TRUE
ON CONFLICT (user_id) DO NOTHING;