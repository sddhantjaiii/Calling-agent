-- Migration: Add additional profile fields to users table
-- Date: 2025-08-29
-- Description: Adds optional profile fields (company, website, location, bio, phone) to support extended user profiles

-- Add new profile columns to users table
ALTER TABLE users 
ADD COLUMN company VARCHAR(255),
ADD COLUMN website VARCHAR(500),
ADD COLUMN location VARCHAR(255),
ADD COLUMN bio TEXT,
ADD COLUMN phone VARCHAR(50);

-- Add constraints for data validation
-- Website URL validation (basic check for http/https)
ALTER TABLE users 
ADD CONSTRAINT check_website_format 
CHECK (website IS NULL OR website ~ '^https?://.*');

-- Phone number validation (basic format check - allows various international formats)
ALTER TABLE users 
ADD CONSTRAINT check_phone_format 
CHECK (phone IS NULL OR phone ~ '^[\+]?[0-9\s\-\(\)]{7,20}$');

-- Bio length constraint (reasonable limit for bio text)
ALTER TABLE users 
ADD CONSTRAINT check_bio_length 
CHECK (bio IS NULL OR LENGTH(bio) <= 1000);

-- Company name length constraint
ALTER TABLE users 
ADD CONSTRAINT check_company_length 
CHECK (company IS NULL OR LENGTH(company) <= 255);

-- Location length constraint
ALTER TABLE users 
ADD CONSTRAINT check_location_length 
CHECK (location IS NULL OR LENGTH(location) <= 255);

-- Create indexes for potential search functionality
CREATE INDEX idx_users_company ON users(company) WHERE company IS NOT NULL;
CREATE INDEX idx_users_location ON users(location) WHERE location IS NOT NULL;

-- Update the updated_at trigger to include new columns
-- (This ensures updated_at is modified when profile fields change)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();