-- Migration: Add not_connected column to contacts table
-- Purpose: Track not connected calls from Twilio API

-- Add not_connected column to contacts table
ALTER TABLE contacts 
ADD COLUMN not_connected INTEGER DEFAULT 0 NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN contacts.not_connected IS 'Count of not connected calls for this contact (fetched from Twilio API)';

-- Add index for efficient querying of contacts with not connected calls
CREATE INDEX idx_contacts_not_connected ON contacts(not_connected) WHERE not_connected > 0;

-- Create table to track processed Twilio calls to prevent duplicates
CREATE TABLE twilio_processed_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twilio_call_sid VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(50) NOT NULL,
    call_status VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE
);

-- Add indexes for efficient lookups
CREATE INDEX idx_twilio_processed_calls_sid ON twilio_processed_calls(twilio_call_sid);
CREATE INDEX idx_twilio_processed_calls_phone ON twilio_processed_calls(phone_number);
CREATE INDEX idx_twilio_processed_calls_processed_at ON twilio_processed_calls(processed_at);

-- Add comment for documentation
COMMENT ON TABLE twilio_processed_calls IS 'Tracks processed Twilio calls to prevent duplicate counting of not connected calls';