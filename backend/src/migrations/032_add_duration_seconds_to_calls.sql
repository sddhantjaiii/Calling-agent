-- Migration: Add duration_seconds column to calls table for precise duration tracking
-- This allows us to store exact duration while keeping duration_minutes for billing

-- Add duration_seconds column to store exact call duration
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- Create index for performance on duration queries
CREATE INDEX IF NOT EXISTS idx_calls_duration_seconds ON calls(duration_seconds);

-- Update existing records to populate duration_seconds from duration_minutes
-- Assuming existing duration_minutes was rounded, we'll use it as best estimate
UPDATE calls 
SET duration_seconds = duration_minutes * 60 
WHERE duration_seconds = 0 AND duration_minutes IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN calls.duration_seconds IS 'Exact call duration in seconds for precise display';
COMMENT ON COLUMN calls.duration_minutes IS 'Call duration rounded up to next minute for billing purposes';
