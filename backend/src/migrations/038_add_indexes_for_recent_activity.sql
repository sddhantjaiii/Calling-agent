-- Migration 038: Add indexes for recent activity and daily rollups

BEGIN;

-- Improve recent activity queries (WHERE user_id = ? ORDER BY created_at DESC LIMIT 5)
CREATE INDEX IF NOT EXISTS idx_calls_recent_activity
ON calls(user_id, created_at DESC);

-- Speed up user daily rollups (agent_analytics aggregated by user_id, date, hour=NULL)
CREATE INDEX IF NOT EXISTS idx_agent_analytics_user_date_hour
ON agent_analytics(user_id, date, hour);

COMMIT;
