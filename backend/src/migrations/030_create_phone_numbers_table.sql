-- Migration: Create phone_numbers table for batch call functionality
-- This migration creates the phone_numbers table to manage phone numbers for batch calling

-- Create phone_numbers table
CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    elevenlabs_phone_number_id VARCHAR(255) NOT NULL UNIQUE,
    assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_phone_numbers_assigned_to_user_id ON phone_numbers(assigned_to_user_id);
CREATE INDEX idx_phone_numbers_created_by_admin_id ON phone_numbers(created_by_admin_id);
CREATE INDEX idx_phone_numbers_elevenlabs_id ON phone_numbers(elevenlabs_phone_number_id);
CREATE INDEX idx_phone_numbers_active ON phone_numbers(is_active);

-- Add constraint to ensure phone numbers are unique per active state
CREATE UNIQUE INDEX idx_phone_numbers_unique_active 
ON phone_numbers(phone_number) 
WHERE is_active = true;

-- Add data isolation constraint (phone numbers can only be assigned to users, not other admins)
ALTER TABLE phone_numbers 
ADD CONSTRAINT fk_phone_numbers_user_isolation 
FOREIGN KEY (assigned_to_user_id) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_phone_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_phone_numbers_updated_at
    BEFORE UPDATE ON phone_numbers
    FOR EACH ROW
    EXECUTE FUNCTION update_phone_numbers_updated_at();

-- Add comments to document the table and columns
COMMENT ON TABLE phone_numbers IS 'Manages phone numbers for batch calling functionality with ElevenLabs integration';
COMMENT ON COLUMN phone_numbers.id IS 'Primary key UUID';
COMMENT ON COLUMN phone_numbers.name IS 'Friendly name for the phone number to help admins remember its purpose';
COMMENT ON COLUMN phone_numbers.phone_number IS 'The actual phone number in standard format';
COMMENT ON COLUMN phone_numbers.elevenlabs_phone_id IS 'ElevenLabs phone number identifier (e.g., phnum_4401k48bf215e3pv2m8nsfnc25s9)';
COMMENT ON COLUMN phone_numbers.assigned_to_user_id IS 'User this phone number is assigned to (NULL means unassigned)';
COMMENT ON COLUMN phone_numbers.created_by_admin_id IS 'Admin who created this phone number entry';
COMMENT ON COLUMN phone_numbers.is_active IS 'Whether this phone number is active and available for use';
