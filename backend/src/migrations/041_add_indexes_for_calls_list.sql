-- Migration 041: Indexes to speed up calls listing queries

BEGIN;

-- Index to speed up duration sort/filter combined with user_id
CREATE INDEX IF NOT EXISTS idx_calls_user_duration
ON calls(user_id, duration_seconds);

-- Optional: index for phone_number sorts/filters per user
CREATE INDEX IF NOT EXISTS idx_calls_user_phone
ON calls(user_id, phone_number);

-- Speed up EXISTS join checks
CREATE INDEX IF NOT EXISTS idx_transcripts_call_id ON transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_lead_analytics_call_id ON lead_analytics(call_id);

-- Speed up LOWER(name) search filters
CREATE INDEX IF NOT EXISTS idx_contacts_name_lower ON contacts (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_agents_name_lower ON agents (LOWER(name));

COMMIT;
