-- Migration: Add composite indexes for dashboard query optimization
-- This migration creates composite indexes to improve performance of slow dashboard APIs
-- Requirements: 1.3, 4.1, 4.2, 4.4

-- 1. Composite indexes for calls table to optimize dashboard queries

-- Primary composite index for dashboard overview queries (user_id, created_at, status)
-- This optimizes queries that filter by user and status with date ordering
CREATE INDEX IF NOT EXISTS idx_calls_user_created_status 
ON calls(user_id, created_at DESC, status);

-- Composite index for user calls with status filtering (for KPI calculations)
CREATE INDEX IF NOT EXISTS idx_calls_user_status_created 
ON calls(user_id, status, created_at DESC);

-- Partial index for recent successful calls (optimizes success rate calculations)
CREATE INDEX IF NOT EXISTS idx_calls_user_successful_recent 
ON calls(user_id, created_at DESC, duration_minutes, credits_used) 
WHERE status = 'completed';

-- Partial index for recent failed calls (optimizes failure rate calculations)
CREATE INDEX IF NOT EXISTS idx_calls_user_failed_recent 
ON calls(user_id, created_at DESC) 
WHERE status IN ('failed', 'cancelled');

-- 2. Composite indexes for agent_analytics table to optimize agent performance queries

-- Primary composite index for agent analytics (user_id, date, hour)
-- This optimizes queries that aggregate agent performance by user and time period
CREATE INDEX IF NOT EXISTS idx_agent_analytics_user_date_hour 
ON agent_analytics(user_id, date DESC, hour);

-- Composite index for daily agent analytics (excludes hourly data)
CREATE INDEX IF NOT EXISTS idx_agent_analytics_user_date_daily 
ON agent_analytics(user_id, date DESC, agent_id) 
WHERE hour IS NULL;

-- Composite index for agent performance aggregation
CREATE INDEX IF NOT EXISTS idx_agent_analytics_agent_date_performance 
ON agent_analytics(agent_id, date DESC, total_calls, successful_calls, leads_generated) 
WHERE hour IS NULL;

-- Index for recent agent analytics with performance metrics
CREATE INDEX IF NOT EXISTS idx_agent_analytics_recent_performance 
ON agent_analytics(user_id, agent_id, date DESC, success_rate, conversion_rate) 
WHERE hour IS NULL;

-- 3. Composite indexes for lead_analytics table to optimize lead scoring queries

-- Primary composite index for lead analytics score-based filtering
-- This optimizes queries that filter leads by score ranges for dashboard charts
CREATE INDEX IF NOT EXISTS idx_lead_analytics_score_created 
ON lead_analytics(total_score DESC, created_at DESC);

-- Composite index for lead quality distribution queries
CREATE INDEX IF NOT EXISTS idx_lead_analytics_call_score_quality 
ON lead_analytics(call_id, total_score, intent_score, urgency_score, budget_score, fit_score);

-- Partial index for high-quality leads (score >= 70)
CREATE INDEX IF NOT EXISTS idx_lead_analytics_qualified_leads 
ON lead_analytics(call_id, created_at DESC, total_score) 
WHERE total_score >= 70;

-- Partial index for recent lead analytics with engagement data
CREATE INDEX IF NOT EXISTS idx_lead_analytics_recent_engagement 
ON lead_analytics(call_id, created_at DESC, engagement_score, lead_status_tag);

-- 4. Additional composite indexes for dashboard analytics optimization

-- Composite index for calls with lead analytics join optimization
-- This optimizes the common join between calls and lead_analytics tables
CREATE INDEX IF NOT EXISTS idx_calls_lead_analytics_join 
ON calls(id, user_id, created_at DESC, status);

-- Composite index for agent-call relationship with performance data
CREATE INDEX IF NOT EXISTS idx_calls_agent_performance 
ON calls(agent_id, user_id, created_at DESC, status, duration_minutes, credits_used);

-- 5. Indexes for dashboard cache and user analytics optimization

-- Composite index for dashboard cache lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_user_key_expires 
ON dashboard_cache(user_id, cache_key, expires_at DESC);

-- Composite index for user daily analytics aggregation
CREATE INDEX IF NOT EXISTS idx_user_daily_analytics_user_recent 
ON user_daily_analytics(user_id, date DESC, total_calls, successful_calls, leads_generated);

-- 6. Indexes for recent activity queries optimization

-- Partial index for recent calls activity
CREATE INDEX IF NOT EXISTS idx_calls_recent_activity 
ON calls(user_id, created_at DESC, status, phone_number);

-- Partial index for recent agent activity
CREATE INDEX IF NOT EXISTS idx_agent_analytics_recent_activity 
ON agent_analytics(user_id, date DESC, agent_id, total_calls, successful_calls) 
WHERE hour IS NULL;

-- 7. Covering indexes for common dashboard queries

-- Covering index for KPI calculations (includes all needed columns)
CREATE INDEX IF NOT EXISTS idx_calls_kpi_covering 
ON calls(user_id, status, created_at) 
INCLUDE (duration_minutes, credits_used, phone_number);

-- Covering index for lead analytics dashboard queries
CREATE INDEX IF NOT EXISTS idx_lead_analytics_dashboard_covering 
ON lead_analytics(call_id, total_score) 
INCLUDE (intent_score, urgency_score, budget_score, fit_score, engagement_score, created_at);

-- Update table statistics for better query planning
ANALYZE calls;
ANALYZE agent_analytics;
ANALYZE lead_analytics;
ANALYZE dashboard_cache;
ANALYZE user_daily_analytics;

-- Note: Utility functions for monitoring index usage can be added later
-- Focus on creating the essential composite indexes for performance optimization

-- Add comments to document the purpose of each index
COMMENT ON INDEX idx_calls_user_created_status IS 'Optimizes dashboard overview queries filtering by user, status with date ordering';
COMMENT ON INDEX idx_agent_analytics_user_date_hour IS 'Optimizes agent performance queries by user and time period';
COMMENT ON INDEX idx_lead_analytics_score_created IS 'Optimizes lead quality distribution and scoring queries';
COMMENT ON INDEX idx_calls_recent_activity IS 'Optimizes recent activity queries for dashboard';
COMMENT ON INDEX idx_dashboard_cache_user_key_expires IS 'Optimizes dashboard cache lookups with expiration filtering';