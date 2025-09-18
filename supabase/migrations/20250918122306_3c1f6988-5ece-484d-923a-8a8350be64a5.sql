-- Check if prateek@lilypad.co.in user exists and has proper role
-- First, let's see what users exist in profiles
SELECT p.email, p.user_id, ur.role 
FROM profiles p 
LEFT JOIN user_roles ur ON p.user_id = ur.user_id 
WHERE p.email = 'prateek@lilypad.co.in';

-- If the user exists but doesn't have super_admin role, we'll fix it
-- Insert or update the role for prateek@lilypad.co.in
INSERT INTO user_roles (user_id, role)
SELECT p.user_id, 'super_admin'::app_role
FROM profiles p 
WHERE p.email = 'prateek@lilypad.co.in'
ON CONFLICT (user_id, role) 
DO NOTHING;

-- Also ensure the user has a profile if it's missing
-- This query will show us what we have after the changes
SELECT p.email, p.user_id, ur.role 
FROM profiles p 
LEFT JOIN user_roles ur ON p.user_id = ur.user_id 
WHERE p.email = 'prateek@lilypad.co.in';