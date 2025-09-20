-- Option 2: Use CASCADE to delete all related data (more aggressive)
-- This will delete everything connected to calls

TRUNCATE TABLE calls RESTART IDENTITY CASCADE;

-- Note: This will delete ALL data in:
-- - calls table
-- - transcripts table  
-- - lead_analytics table
-- - billing_transactions table
-- - call_sources table
-- - Any other tables that reference calls
