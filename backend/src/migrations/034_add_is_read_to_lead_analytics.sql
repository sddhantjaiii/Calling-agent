-- Migration 034: Add is_read column to lead_analytics for notification tracking
-- Add is_read column to track notification read status

-- Add is_read column with default false
ALTER TABLE lead_analytics 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Create index for efficient querying of unread notifications
CREATE INDEX IF NOT EXISTS idx_lead_analytics_is_read 
ON lead_analytics(is_read) 
WHERE is_read = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN lead_analytics.is_read IS 'Tracks whether the smart notification has been read by the user';
