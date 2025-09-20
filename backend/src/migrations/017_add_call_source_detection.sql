-- Migration 017: Add call source detection and contact information columns
-- This migration adds call source detection capabilities and contact information storage
-- to support proper channel attribution and contact data handling

-- Add call source column to calls table with enum constraint
ALTER TABLE calls 
ADD COLUMN call_source VARCHAR(20) DEFAULT 'phone' NOT NULL,
ADD COLUMN caller_name VARCHAR(255),
ADD COLUMN caller_email VARCHAR(255);

-- Add constraint to ensure valid call source values
ALTER TABLE calls 
ADD CONSTRAINT chk_call_source 
CHECK (call_source IN ('phone', 'internet', 'unknown'));

-- Create indexes for efficient source-based queries
CREATE INDEX idx_calls_source_user ON calls(call_source, user_id);
CREATE INDEX idx_calls_source_created_at ON calls(call_source, created_at);
CREATE INDEX idx_calls_caller_email ON calls(caller_email) WHERE caller_email IS NOT NULL;
CREATE INDEX idx_calls_caller_name ON calls(caller_name) WHERE caller_name IS NOT NULL;

-- Create composite index for analytics queries by source and user
CREATE INDEX idx_calls_user_source_status_created ON calls(user_id, call_source, status, created_at);

-- Update existing calls to categorize them based on phone_number patterns
-- This logic is based on the original webhook controller implementation
UPDATE calls 
SET call_source = CASE 
    -- Phone calls: have actual phone numbers (not 'internal' or null)
    WHEN phone_number IS NOT NULL 
         AND phone_number != '' 
         AND phone_number != 'internal' 
         AND phone_number ~ '^[\+]?[0-9\-\(\)\s]+$' -- Basic phone number pattern
    THEN 'phone'
    
    -- Internet calls: marked as 'internal' or have web-like indicators
    WHEN phone_number = 'internal' 
         OR phone_number IS NULL 
         OR phone_number = ''
    THEN 'internet'
    
    -- Unknown: anything else that doesn't match clear patterns
    ELSE 'unknown'
END
WHERE call_source = 'phone'; -- Only update records that still have the default value

-- Add comment to document the migration
COMMENT ON COLUMN calls.call_source IS 'Source of the call: phone (traditional phone call), internet (web-based call), or unknown';
COMMENT ON COLUMN calls.caller_name IS 'Name of the caller if available from webhook data';
COMMENT ON COLUMN calls.caller_email IS 'Email of the caller if available from webhook data';

-- Create a function to help with call source detection in future webhook processing
-- This function can be used by the application to determine call source from webhook data
CREATE OR REPLACE FUNCTION determine_call_source(
    caller_id TEXT,
    call_type TEXT DEFAULT NULL
) RETURNS VARCHAR(20) AS $$
BEGIN
    -- Check for actual phone number (not 'internal')
    IF caller_id IS NOT NULL 
       AND caller_id != '' 
       AND caller_id != 'internal' 
       AND caller_id ~ '^[\+]?[0-9\-\(\)\s]+$' THEN
        RETURN 'phone';
    END IF;
    
    -- Check for web/browser calls
    IF call_type IN ('web', 'browser') 
       OR caller_id = 'internal' 
       OR caller_id IS NULL 
       OR caller_id = '' THEN
        RETURN 'internet';
    END IF;
    
    -- Default to unknown for unclear cases
    RETURN 'unknown';
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the function
COMMENT ON FUNCTION determine_call_source(TEXT, TEXT) IS 'Helper function to determine call source from webhook data. Used by application code for consistent call source detection.';

-- Create a view for call source analytics
CREATE VIEW call_source_analytics AS
SELECT 
    c.user_id,
    c.call_source,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_calls,
    COUNT(CASE WHEN c.status = 'failed' THEN 1 END) as failed_calls,
    AVG(c.duration_minutes) as avg_duration_minutes,
    SUM(c.credits_used) as total_credits_used,
    MIN(c.created_at) as first_call_date,
    MAX(c.created_at) as last_call_date
FROM calls c
GROUP BY c.user_id, c.call_source;

-- Add comment to document the view
COMMENT ON VIEW call_source_analytics IS 'Aggregated analytics by call source for efficient reporting and dashboard queries';

-- Update the existing user_stats view to include call source breakdown
DROP VIEW IF EXISTS user_stats;
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.credits,
    u.is_active,
    u.created_at,
    COUNT(DISTINCT a.id) as agent_count,
    COUNT(DISTINCT c.id) as call_count,
    COUNT(DISTINCT ct.id) as contact_count,
    COALESCE(SUM(CASE WHEN c.status = 'completed' THEN c.credits_used ELSE 0 END), 0) as total_credits_used,
    -- Add call source breakdown
    COUNT(CASE WHEN c.call_source = 'phone' THEN 1 END) as phone_calls,
    COUNT(CASE WHEN c.call_source = 'internet' THEN 1 END) as internet_calls,
    COUNT(CASE WHEN c.call_source = 'unknown' THEN 1 END) as unknown_calls
FROM users u
LEFT JOIN agents a ON u.id = a.user_id AND a.is_active = true
LEFT JOIN calls c ON u.id = c.user_id
LEFT JOIN contacts ct ON u.id = ct.user_id
GROUP BY u.id, u.email, u.name, u.credits, u.is_active, u.created_at;

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 017 completed successfully:';
    RAISE NOTICE '- Added call_source column with constraint';
    RAISE NOTICE '- Added caller_name and caller_email columns';
    RAISE NOTICE '- Created indexes for efficient source-based queries';
    RAISE NOTICE '- Categorized existing calls based on phone_number patterns';
    RAISE NOTICE '- Created helper function determine_call_source()';
    RAISE NOTICE '- Created call_source_analytics view';
    RAISE NOTICE '- Updated user_stats view with call source breakdown';
END;
$$;