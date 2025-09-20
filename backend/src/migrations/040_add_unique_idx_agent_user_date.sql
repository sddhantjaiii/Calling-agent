BEGIN;

-- Support ON CONFLICT (agent_id, user_id, date) in agent_analytics triggers
-- This ensures a single daily row per agent/user/date
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_analytics_unique_agent_user_date
ON agent_analytics(agent_id, user_id, date);

COMMIT;


