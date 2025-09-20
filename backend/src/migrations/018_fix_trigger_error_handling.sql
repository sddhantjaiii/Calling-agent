-- Fix KPI update triggers with comprehensive error handling
-- This migration enhances the existing trigger functions with:
-- 1. NULL value validation and graceful handling
-- 2. Transaction safety to prevent trigger failures from breaking operations
-- 3. Comprehensive logging for trigger execution and errors

-- Create a logging table for trigger execution and errors
CREATE TABLE IF NOT EXISTS trigger_execution_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    user_id UUID,
    agent_id UUID,
    execution_status VARCHAR(20) NOT NULL,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for efficient log queries
CREATE INDEX IF NOT EXISTS idx_trigger_execution_log_created_at ON trigger_execution_log(created_at);
CREATE INDEX IF NOT EXISTS idx_trigger_execution_log_status ON trigger_execution_log(execution_status);
CREATE INDEX IF NOT EXISTS idx_trigger_execution_log_trigger_name ON trigger_execution_log(trigger_name);
-
- Enhanced function to update user-level KPIs with comprehensive error handling
CREATE OR REPLACE FUNCTION update_user_kpis_from_agent_analytics()
RETURNS TRIGGER AS $$
DECLARE
    user_exists BOOLEAN;
    start_time TIMESTAMP;
    execution_time INTEGER;
    error_msg TEXT;
BEGIN
    start_time := clock_timestamp();
    
    -- Validate required fields are not NULL
    IF NEW.user_id IS NULL THEN
        error_msg := 'NULL user_id in agent_analytics, skipping KPI update';
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'WARNING', error_msg,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER
        );
        RETURN NEW;
    END IF;
    
    IF NEW.date IS NULL THEN
        error_msg := 'NULL date in agent_analytics for user ' || NEW.user_id || ', skipping KPI update';
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'WARNING', error_msg,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER
        );
        RETURN NEW;
    END IF;
    
    -- Validate user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = NEW.user_id) INTO user_exists;
    IF NOT user_exists THEN
        error_msg := 'User ' || NEW.user_id || ' does not exist, skipping KPI update';
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'WARNING', error_msg,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER
        );
        RETURN NEW;
    END IF;    -
- Perform the KPI update with proper error handling
    BEGIN
        -- Update or insert user-level daily analytics with NULL-safe aggregations
        INSERT INTO user_daily_analytics (
            user_id,
            date,
            total_calls,
            successful_calls,
            failed_calls,
            total_duration_minutes,
            leads_generated,
            qualified_leads,
            credits_used,
            avg_engagement_score,
            avg_intent_score,
            updated_at
        )
        SELECT 
            NEW.user_id,
            NEW.date,
            COALESCE(SUM(COALESCE(aa.total_calls, 0)), 0),
            COALESCE(SUM(COALESCE(aa.successful_calls, 0)), 0),
            COALESCE(SUM(COALESCE(aa.failed_calls, 0)), 0),
            COALESCE(SUM(COALESCE(aa.total_duration_minutes, 0)), 0),
            COALESCE(SUM(COALESCE(aa.leads_generated, 0)), 0),
            COALESCE(SUM(COALESCE(aa.qualified_leads, 0)), 0),
            COALESCE(SUM(COALESCE(aa.credits_used, 0)), 0),
            COALESCE(AVG(NULLIF(aa.avg_engagement_score, 0)), 0),
            COALESCE(AVG(NULLIF(aa.avg_intent_score, 0)), 0),
            CURRENT_TIMESTAMP
        FROM agent_analytics aa
        WHERE aa.user_id = NEW.user_id 
          AND aa.date = NEW.date 
          AND aa.hour IS NULL
        GROUP BY aa.user_id, aa.date
        
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            total_calls = EXCLUDED.total_calls,
            successful_calls = EXCLUDED.successful_calls,
            failed_calls = EXCLUDED.failed_calls,
            total_duration_minutes = EXCLUDED.total_duration_minutes,
            leads_generated = EXCLUDED.leads_generated,
            qualified_leads = EXCLUDED.qualified_leads,
            credits_used = EXCLUDED.credits_used,
            avg_engagement_score = EXCLUDED.avg_engagement_score,
            avg_intent_score = EXCLUDED.avg_intent_score,
            updated_at = CURRENT_TIMESTAMP;

        -- Update user's overall statistics timestamp
        UPDATE users 
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;

        -- Log successful execution
        execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'SUCCESS', 
            'Updated user daily analytics records',
            execution_time
        );

    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the transaction
            error_msg := 'Error updating user KPIs for user ' || NEW.user_id || ': ' || SQLERRM;
            execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
            
            INSERT INTO trigger_execution_log (
                trigger_name, table_name, operation, user_id, agent_id,
                execution_status, error_message, execution_time_ms
            ) VALUES (
                'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP,
                NEW.user_id, NEW.agent_id, 'ERROR', error_msg, execution_time
            );
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;-
- Enhanced function to update dashboard cache with comprehensive error handling
CREATE OR REPLACE FUNCTION update_dashboard_cache_from_agents()
RETURNS TRIGGER AS $$
DECLARE
    user_stats RECORD;
    start_time TIMESTAMP;
    execution_time INTEGER;
    error_msg TEXT;
    user_exists BOOLEAN;
BEGIN
    start_time := clock_timestamp();
    
    -- Validate required fields
    IF NEW.user_id IS NULL THEN
        error_msg := 'NULL user_id in agent_analytics, skipping dashboard cache update';
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_dashboard_cache_from_agents', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'WARNING', error_msg,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER
        );
        RETURN NEW;
    END IF;
    
    -- Validate user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = NEW.user_id) INTO user_exists;
    IF NOT user_exists THEN
        error_msg := 'User ' || NEW.user_id || ' does not exist, skipping dashboard cache update';
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_dashboard_cache_from_agents', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'WARNING', error_msg,
            EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER
        );
        RETURN NEW;
    END IF;  
  BEGIN
        -- Calculate updated user statistics with NULL-safe operations
        SELECT 
            NEW.user_id as user_id,
            COALESCE(SUM(COALESCE(aa.total_calls, 0)), 0) as total_calls,
            COALESCE(SUM(COALESCE(aa.successful_calls, 0)), 0) as successful_calls,
            COALESCE(SUM(COALESCE(aa.leads_generated, 0)), 0) as total_leads,
            COALESCE(SUM(COALESCE(aa.qualified_leads, 0)), 0) as qualified_leads,
            COALESCE(SUM(COALESCE(aa.credits_used, 0)), 0) as credits_used,
            COALESCE(AVG(NULLIF(aa.avg_engagement_score, 0)), 0) as avg_engagement,
            COUNT(DISTINCT aa.agent_id) as active_agents
        INTO user_stats
        FROM agent_analytics aa
        WHERE aa.user_id = NEW.user_id 
          AND aa.date >= CURRENT_DATE - INTERVAL '30 days'
          AND aa.hour IS NULL;

        -- Update dashboard cache table with safe calculations
        INSERT INTO dashboard_cache (
            user_id,
            cache_key,
            cache_data,
            expires_at,
            created_at,
            updated_at
        )
        VALUES (
            NEW.user_id,
            'overview_stats',
            jsonb_build_object(
                'total_calls', COALESCE(user_stats.total_calls, 0),
                'successful_calls', COALESCE(user_stats.successful_calls, 0),
                'success_rate', CASE 
                    WHEN COALESCE(user_stats.total_calls, 0) > 0 
                    THEN ROUND((COALESCE(user_stats.successful_calls, 0)::DECIMAL / user_stats.total_calls * 100), 2)
                    ELSE 0 
                END,
                'total_leads', COALESCE(user_stats.total_leads, 0),
                'qualified_leads', COALESCE(user_stats.qualified_leads, 0),
                'conversion_rate', CASE 
                    WHEN COALESCE(user_stats.total_leads, 0) > 0 
                    THEN ROUND((COALESCE(user_stats.qualified_leads, 0)::DECIMAL / user_stats.total_leads * 100), 2)
                    ELSE 0 
                END,
                'credits_used', COALESCE(user_stats.credits_used, 0),
                'avg_engagement', ROUND(COALESCE(user_stats.avg_engagement, 0), 2),
                'active_agents', COALESCE(user_stats.active_agents, 0),
                'last_updated', EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)
            ),
            CURRENT_TIMESTAMP + INTERVAL '1 hour',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, cache_key)
        DO UPDATE SET
            cache_data = EXCLUDED.cache_data,
            expires_at = EXCLUDED.expires_at,
            updated_at = CURRENT_TIMESTAMP;

        -- Log successful execution
        execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_dashboard_cache_from_agents', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'SUCCESS', 
            'Updated dashboard cache for user',
            execution_time
        );

    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the transaction
            error_msg := 'Error updating dashboard cache for user ' || NEW.user_id || ': ' || SQLERRM;
            execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
            
            INSERT INTO trigger_execution_log (
                trigger_name, table_name, operation, user_id, agent_id,
                execution_status, error_message, execution_time_ms
            ) VALUES (
                'update_dashboard_cache_from_agents', 'agent_analytics', TG_OP,
                NEW.user_id, NEW.agent_id, 'ERROR', error_msg, execution_time
            );
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;-- Re-
create triggers with the enhanced functions
DROP TRIGGER IF EXISTS trigger_update_user_kpis_on_agent_insert ON agent_analytics;
DROP TRIGGER IF EXISTS trigger_update_user_kpis_on_agent_update ON agent_analytics;
DROP TRIGGER IF EXISTS trigger_update_dashboard_cache_on_agent_insert ON agent_analytics;
DROP TRIGGER IF EXISTS trigger_update_dashboard_cache_on_agent_update ON agent_analytics;

-- Create enhanced triggers
CREATE TRIGGER trigger_update_user_kpis_on_agent_insert
    AFTER INSERT ON agent_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_user_kpis_from_agent_analytics();

CREATE TRIGGER trigger_update_user_kpis_on_agent_update
    AFTER UPDATE ON agent_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_user_kpis_from_agent_analytics();

CREATE TRIGGER trigger_update_dashboard_cache_on_agent_insert
    AFTER INSERT ON agent_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_cache_from_agents();

CREATE TRIGGER trigger_update_dashboard_cache_on_agent_update
    AFTER UPDATE ON agent_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_cache_from_agents();

-- Add comments for documentation
COMMENT ON TABLE trigger_execution_log IS 'Logs all trigger executions with performance metrics and error tracking';
COMMENT ON FUNCTION update_user_kpis_from_agent_analytics() IS 'Enhanced trigger function with comprehensive error handling and logging';
COMMENT ON FUNCTION update_dashboard_cache_from_agents() IS 'Enhanced dashboard cache update with NULL-safe operations and error handling';