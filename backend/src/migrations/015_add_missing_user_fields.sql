-- Add missing user fields for admin panel functionality
-- This migration adds fields that the admin panel expects but are missing from the schema

-- Add last_login field to track user login activity
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Create index for last_login for performance
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Update existing users to have a reasonable last_login value (optional)
-- This sets last_login to created_at for existing users who haven't logged in
UPDATE users 
SET last_login = created_at 
WHERE last_login IS NULL AND created_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.last_login IS 'Timestamp of the user''s last successful login';