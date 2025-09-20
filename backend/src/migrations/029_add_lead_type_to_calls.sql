-- Migration: Add lead_type column to calls table
-- This migration adds a lead_type column to track whether calls are inbound or outbound

-- Add lead_type column to calls table
ALTER TABLE calls 
ADD COLUMN lead_type VARCHAR(20) DEFAULT 'outbound' CHECK (lead_type IN ('inbound', 'outbound'));

-- Create index for better query performance
CREATE INDEX idx_calls_lead_type ON calls(lead_type);

-- Update existing calls to outbound by default
UPDATE calls 
SET lead_type = 'outbound';

-- Add comment to document the column
COMMENT ON COLUMN calls.lead_type IS 'Type of lead: inbound (phone calls) or outbound (internet/proactive calls)';