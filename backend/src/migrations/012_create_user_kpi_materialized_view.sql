-- Migration: Create materialized view for user KPI summary
-- This migration creates a materialized view with pre-calculated KPIs for all users
-- Requirements: 1.3, 4.2, 4.5

-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS user_kpi_summary;

-- Create materialized view for user KPI summary with 30-day rolling metrics
CREATE MATERIALIZED VIEW user_kpi_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.credits,
    u.is_active,
    u.created_at as user_created_at,
    
    -- Call metrics (last 30 days)
    COALESCE(call_stats.total_calls_30d, 0) as total_calls_30d,
    COALESCE(call_stats.successful_calls_30d, 0) as successful_calls_30d,
    COALESCE(call_stats.failed_calls_30d, 0) as failed_calls_30d,
    COALESCE(call_stats.success_rate_30d, 0) as success_rate_30d,
    COALESCE(call_stats.total_duration_30d, 0) as total_duration_30d,
    COALESCE(call_stats.avg_duration_30d, 0) as avg_duration_30d,
    COALESCE(call_stats.total_credits_used_30d, 0) as total_credits_used_30d,
    
    -- Lead metrics (last 30 days)
    COALESCE(lead_stats.total_leads_30d, 0) as total_leads_30d,
    COALESCE(lead_stats.qualified_leads_30d, 0) as qualified_leads_30d,
    COALESCE(lead_stats.conversion_rate_30d, 0) as conversion_rate_30d,
    COALESCE(lead_stats.avg_lead_score_30d, 0) as avg_lead_score_30d,
    COALESCE(lead_stats.avg_intent_score_30d, 0) as avg_intent_score_30d,
    COALESCE(lead_stats.avg_engagement_score_30d, 0) as avg_engagement_score_30d,
    
    -- Agent metrics (current)
    COALESCE(agent_stats.total_agents, 0) as total_agents,
    COALESCE(agent_stats.active_agents, 0) as active_agents,
    COALESCE(agent_stats.draft_agents, 0) as draft_agents,
    
    -- Agent performance metrics (last 30 days)
    COALESCE(agent_perf.avg_conversations_per_hour_30d, 0) as avg_conversations_per_hour_30d,
    COALESCE(agent_perf.best_performing_agent_id, NULL) as best_performing_agent_id,
    COALESCE(agent_perf.best_performing_agent_name, NULL) as best_performing_agent_name,
    COALESCE(agent_perf.best_agent_success_rate, 0) as best_agent_success_rate,
    
    -- Recent activity metrics (last 7 days)
    COALESCE(recent_stats.calls_last_7d, 0) as calls_last_7d,
    COALESCE(recent_stats.leads_last_7d, 0) as leads_last_7d,
    COALESCE(recent_stats.credits_used_last_7d, 0) as credits_used_last_7d,
    
    -- All-time metrics
    COALESCE(lifetime_stats.total_calls_lifetime, 0) as total_calls_lifetime,
    COALESCE(lifetime_stats.total_leads_lifetime, 0) as total_leads_lifetime,
    COALESCE(lifetime_stats.total_credits_used_lifetime, 0) as total_credits_used_lifetime,
    
    -- Cache metadata
    CURRENT_TIMESTAMP as calculated_at,
    CURRENT_TIMESTAMP + INTERVAL '1 hour' as expires_at
    
FROM users u

-- Call statistics for last 30 days
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_calls_30d,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_calls_30d,
        COUNT(CASE WHEN status IN ('failed', 'cancelled') THEN 1 END) as failed_calls_30d,
        CASE 
            WHEN COUNT(*) > 0 
            THEN ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*))::NUMERIC, 2)
            ELSE 0 
        END as success_rate_30d,
        COALESCE(SUM(duration_minutes), 0) as total_duration_30d,
        COALESCE(ROUND(AVG(duration_minutes)::NUMERIC, 2), 0) as avg_duration_30d,
        COALESCE(SUM(credits_used), 0) as total_credits_used_30d
    FROM calls 
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY user_id
) call_stats ON u.id = call_stats.user_id

-- Lead statistics for last 30 days
LEFT JOIN (
    SELECT 
        c.user_id,
        COUNT(la.id) as total_leads_30d,
        COUNT(CASE WHEN la.total_score >= 70 THEN 1 END) as qualified_leads_30d,
        CASE 
            WHEN COUNT(la.id) > 0 
            THEN ROUND((COUNT(CASE WHEN la.total_score >= 70 THEN 1 END) * 100.0 / COUNT(la.id))::NUMERIC, 2)
            ELSE 0 
        END as conversion_rate_30d,
        COALESCE(ROUND(AVG(la.total_score)::NUMERIC, 2), 0) as avg_lead_score_30d,
        COALESCE(ROUND(AVG(la.intent_score)::NUMERIC, 2), 0) as avg_intent_score_30d,
        COALESCE(ROUND(AVG(la.engagement_score)::NUMERIC, 2), 0) as avg_engagement_score_30d
    FROM calls c
    INNER JOIN lead_analytics la ON c.id = la.call_id
    WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY c.user_id
) lead_stats ON u.id = lead_stats.user_id

-- Agent statistics (current)
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_agents,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_agents,
        COUNT(CASE WHEN is_active = false THEN 1 END) as draft_agents
    FROM agents
    GROUP BY user_id
) agent_stats ON u.id = agent_stats.user_id

-- Agent performance metrics (last 30 days)
LEFT JOIN (
    SELECT 
        aa.user_id,
        -- Calculate average conversations per hour across all agents
        COALESCE(ROUND(AVG(
            CASE 
                WHEN aa.hour IS NOT NULL AND aa.total_calls > 0 
                THEN aa.total_calls 
                ELSE 0 
            END
        )::NUMERIC, 2), 0) as avg_conversations_per_hour_30d,
        
        -- Find best performing agent by success rate
        (SELECT a.id 
         FROM agents a 
         INNER JOIN agent_analytics aa2 ON a.id = aa2.agent_id 
         WHERE aa2.user_id = aa.user_id 
           AND aa2.date >= CURRENT_DATE - INTERVAL '30 days'
           AND aa2.hour IS NULL
           AND aa2.total_calls > 0
         GROUP BY a.id, a.name
         ORDER BY (SUM(aa2.successful_calls)::DECIMAL / SUM(aa2.total_calls)) DESC, SUM(aa2.total_calls) DESC
         LIMIT 1
        ) as best_performing_agent_id,
        
        (SELECT a.name 
         FROM agents a 
         INNER JOIN agent_analytics aa2 ON a.id = aa2.agent_id 
         WHERE aa2.user_id = aa.user_id 
           AND aa2.date >= CURRENT_DATE - INTERVAL '30 days'
           AND aa2.hour IS NULL
           AND aa2.total_calls > 0
         GROUP BY a.id, a.name
         ORDER BY (SUM(aa2.successful_calls)::DECIMAL / SUM(aa2.total_calls)) DESC, SUM(aa2.total_calls) DESC
         LIMIT 1
        ) as best_performing_agent_name,
        
        (SELECT ROUND((SUM(aa2.successful_calls)::DECIMAL / SUM(aa2.total_calls) * 100)::NUMERIC, 2)
         FROM agents a 
         INNER JOIN agent_analytics aa2 ON a.id = aa2.agent_id 
         WHERE aa2.user_id = aa.user_id 
           AND aa2.date >= CURRENT_DATE - INTERVAL '30 days'
           AND aa2.hour IS NULL
           AND aa2.total_calls > 0
         GROUP BY a.id
         ORDER BY (SUM(aa2.successful_calls)::DECIMAL / SUM(aa2.total_calls)) DESC, SUM(aa2.total_calls) DESC
         LIMIT 1
        ) as best_agent_success_rate
        
    FROM agent_analytics aa
    WHERE aa.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY aa.user_id
) agent_perf ON u.id = agent_perf.user_id

-- Recent activity statistics (last 7 days)
LEFT JOIN (
    SELECT 
        c.user_id,
        COUNT(c.id) as calls_last_7d,
        COUNT(la.id) as leads_last_7d,
        COALESCE(SUM(c.credits_used), 0) as credits_used_last_7d
    FROM calls c
    LEFT JOIN lead_analytics la ON c.id = la.call_id
    WHERE c.created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY c.user_id
) recent_stats ON u.id = recent_stats.user_id

-- Lifetime statistics
LEFT JOIN (
    SELECT 
        c.user_id,
        COUNT(c.id) as total_calls_lifetime,
        COUNT(la.id) as total_leads_lifetime,
        COALESCE(SUM(c.credits_used), 0) as total_credits_used_lifetime
    FROM calls c
    LEFT JOIN lead_analytics la ON c.id = la.call_id
    GROUP BY c.user_id
) lifetime_stats ON u.id = lifetime_stats.user_id

WHERE u.is_active = true;

-- Create unique index on user_id for fast lookups
CREATE UNIQUE INDEX idx_user_kpi_summary_user_id ON user_kpi_summary(user_id);

-- Create additional indexes for common query patterns
CREATE INDEX idx_user_kpi_summary_calculated_at ON user_kpi_summary(calculated_at DESC);
CREATE INDEX idx_user_kpi_summary_expires_at ON user_kpi_summary(expires_at);
CREATE INDEX idx_user_kpi_summary_active_users ON user_kpi_summary(is_active, calculated_at DESC);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_user_kpi_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_kpi_summary;
END;
$$ LANGUAGE plpgsql;

-- Create function to refresh materialized view for specific user
CREATE OR REPLACE FUNCTION refresh_user_kpi_summary_for_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
    -- For now, refresh the entire view since PostgreSQL doesn't support partial refresh
    -- In a production environment, consider using a table instead of materialized view
    -- for more granular updates
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_kpi_summary;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to automatically refresh materialized view when underlying data changes
CREATE OR REPLACE FUNCTION trigger_refresh_user_kpi_summary()
RETURNS TRIGGER AS $$
DECLARE
    refresh_needed BOOLEAN := false;
BEGIN
    -- Check if the change affects KPI calculations
    IF TG_TABLE_NAME = 'calls' THEN
        -- Refresh if call status changes to completed or if it's a new completed call
        IF (NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed')) OR
           (OLD IS NOT NULL AND OLD.status = 'completed' AND NEW.status != 'completed') THEN
            refresh_needed := true;
        END IF;
    ELSIF TG_TABLE_NAME = 'lead_analytics' THEN
        -- Always refresh for new lead analytics
        refresh_needed := true;
    ELSIF TG_TABLE_NAME = 'agents' THEN
        -- Refresh if agent active status changes
        IF (OLD IS NULL OR OLD.is_active != NEW.is_active) THEN
            refresh_needed := true;
        END IF;
    ELSIF TG_TABLE_NAME = 'agent_analytics' THEN
        -- Refresh for new or updated agent analytics (daily aggregates only)
        IF NEW.hour IS NULL THEN
            refresh_needed := true;
        END IF;
    END IF;
    
    -- Schedule refresh in background (using pg_notify for external processing)
    IF refresh_needed THEN
        PERFORM pg_notify('refresh_user_kpi_summary', 
            json_build_object(
                'user_id', COALESCE(NEW.user_id, OLD.user_id),
                'table', TG_TABLE_NAME,
                'timestamp', EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)
            )::text
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers on relevant tables to refresh materialized view
-- Note: These triggers use pg_notify to avoid blocking operations
-- The actual refresh should be handled by a background process

CREATE TRIGGER trigger_refresh_kpi_on_calls_change
    AFTER INSERT OR UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_user_kpi_summary();

CREATE TRIGGER trigger_refresh_kpi_on_lead_analytics_change
    AFTER INSERT OR UPDATE ON lead_analytics
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_user_kpi_summary();

CREATE TRIGGER trigger_refresh_kpi_on_agents_change
    AFTER INSERT OR UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_user_kpi_summary();

CREATE TRIGGER trigger_refresh_kpi_on_agent_analytics_change
    AFTER INSERT OR UPDATE ON agent_analytics
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_user_kpi_summary();

-- Create a scheduled refresh function (to be called by cron or background job)
CREATE OR REPLACE FUNCTION scheduled_refresh_user_kpi_summary()
RETURNS void AS $$
BEGIN
    -- Refresh materialized view
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_kpi_summary;
    
    -- Log the refresh
    INSERT INTO system_config (config_key, config_value, description, updated_at)
    VALUES (
        'last_kpi_refresh', 
        EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::text,
        'Timestamp of last user KPI summary refresh',
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (config_key)
    DO UPDATE SET
        config_value = EXCLUDED.config_value,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Add configuration for refresh intervals
INSERT INTO system_config (config_key, config_value, description) VALUES
('kpi_refresh_interval_minutes', '15', 'Interval in minutes for refreshing user KPI summary materialized view')
ON CONFLICT (config_key) DO NOTHING;

-- Initial refresh of the materialized view
SELECT refresh_user_kpi_summary();

-- Update table statistics
ANALYZE user_kpi_summary;

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW user_kpi_summary IS 'Pre-calculated KPI summary for all users with 30-day rolling metrics for dashboard performance optimization';
COMMENT ON INDEX idx_user_kpi_summary_user_id IS 'Primary lookup index for user KPI summary by user_id';
COMMENT ON FUNCTION refresh_user_kpi_summary() IS 'Refreshes the user KPI summary materialized view';
COMMENT ON FUNCTION trigger_refresh_user_kpi_summary() IS 'Trigger function to notify when KPI refresh is needed';
COMMENT ON FUNCTION scheduled_refresh_user_kpi_summary() IS 'Scheduled function to refresh KPI summary and log the operation';