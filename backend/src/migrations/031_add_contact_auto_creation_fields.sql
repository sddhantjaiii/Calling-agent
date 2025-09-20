-- Migration: Add fields to track auto-created contacts and call links
-- This migration adds fields to support the contact management interface enhancements

-- Add fields to contacts table to track auto-creation and call links
ALTER TABLE contacts 
ADD COLUMN auto_created_from_call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
ADD COLUMN is_auto_created BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN auto_creation_source VARCHAR(50) DEFAULT NULL CHECK (auto_creation_source IN ('webhook', 'manual', NULL));

-- Create index for efficient querying of auto-created contacts
CREATE INDEX idx_contacts_auto_created ON contacts(user_id, is_auto_created) WHERE is_auto_created = TRUE;
CREATE INDEX idx_contacts_auto_created_from_call ON contacts(auto_created_from_call_id) WHERE auto_created_from_call_id IS NOT NULL;

-- Update existing manually created contacts to have proper flags
UPDATE contacts 
SET is_auto_created = FALSE, 
    auto_creation_source = 'manual' 
WHERE is_auto_created IS NULL OR auto_creation_source IS NULL;

-- Add comment to document the new fields
COMMENT ON COLUMN contacts.auto_created_from_call_id IS 'References the call that triggered auto-creation of this contact';
COMMENT ON COLUMN contacts.is_auto_created IS 'Flag indicating if this contact was automatically created from a call';
COMMENT ON COLUMN contacts.auto_creation_source IS 'Source of contact creation: webhook, manual, etc.';