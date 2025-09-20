-- Option 1: Delete data in proper order (recommended)
-- This maintains referential integrity

-- First, delete from dependent tables
DELETE FROM transcripts WHERE call_id IN (SELECT id FROM calls);
DELETE FROM lead_analytics WHERE call_id IN (SELECT id FROM calls);
DELETE FROM billing_transactions WHERE call_id IN (SELECT id FROM calls);
DELETE FROM call_sources WHERE call_id IN (SELECT id FROM calls);

-- Delete any contact-call relationships
UPDATE contacts SET linked_call_id = NULL WHERE linked_call_id IN (SELECT id FROM calls);

-- Finally, delete from calls table
DELETE FROM calls;

-- Reset auto-increment sequences (optional)
-- ALTER SEQUENCE calls_id_seq RESTART WITH 1;
-- ALTER SEQUENCE transcripts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE lead_analytics_id_seq RESTART WITH 1;
