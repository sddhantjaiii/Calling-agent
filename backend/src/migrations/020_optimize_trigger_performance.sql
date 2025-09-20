-- Optimize trigger performance with conditional logic and bulk update handling
-- This migration enhances trigger performance by:
-- 1. Adding conditional logic to skip unnecessary trigger executions
-- 2. Implementing efficient bulk update handling for large data changes
-- 3. Optimizing query performance with better indexing
-- 4. Adding performance monitoring and alerting

-- Create performance monitoring table for trigger metrics
CREATE TABLE IF NOT EXISTS trigger_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    avg_execution_time_ms DECIMAL(10,2) NOT NULL,
    max_execution_time_ms INTEGER NOT NULL,
    min_execution_time_ms INTEGER NOT NULL,
    execution_count INTEGER NOT NULL,
    error_count INTEGER NOT NULL,
    last_execution TIMESTAMP WITH TIME ZONE NOT NULL,
    date_bucket DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(trigger_name, table_name, operation, date_bucket)
);

-- Create indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_trigger_performance_metrics_date ON trigger_performance_metrics(date_bucket);
CREATE INDEX IF NOT EXISTS idx_trigger_performance_metrics_trigger ON trigger_performance_metrics(trigger_name);
CREATE INDEX IF NOT EXISTS idx_trigger_performance_metrics_avg_time ON trigger_performance_metrics(avg_execution_time_ms);

-- Create a function to update performance metrics
CREATE OR REPLACE FUNCTION update_trigger_performance_metrics(
    p_trigger_name VARCHAR(100),
    p_table_name VARCHAR(100),
    p_operation VARCHAR(20),
    p_execution_time_ms INTEGER,
    p_status VARCHAR(20)
)
RETURNS void AS $
DECLARE
    current_date DATE := CURRENT_DATE;
    is_error BOOLEAN := (p_status = 'ERROR');
BEGIN
    INSERT INTO trigger_performance_metrics (
        trigger_name,
        table_name,
        operation,
        avg_execution_time_ms,
        max_execution_time_ms,
        min_execution_time_ms,
        execution_count,
        error_count,
        last_execution,
        date_bucket
    )
    VALUES (
        p_trigger_name,
        p_table_name,
        p_operation,
        p_execution_time_ms,
        p_execution_time_ms,
        p_execution_time_ms,
        1,
        CASE WHEN is_error THEN 1 ELSE 0 END,
        CURRENT_TIMESTAMP,
        current_date
    )
    ON CONFLICT (trigger_name, table_name, operation, date_bucket)
    DO UPDATE SET
        avg_execution_time_ms = (
            (trigger_performance_metrics.avg_execution_time_ms * trigger_performance_metrics.execution_count + p_execution_time_ms) / 
            (trigger_performance_metrics.execution_count + 1)
        ),
        max_execution_time_ms = GREATEST(trigger_performance_metrics.max_execution_time_ms, p_execution_time_ms),
        min_execution_time_ms = LEAST(trigger_performance_metrics.min_execution_time_ms, p_execution_time_ms),
        execution_count = trigger_performance_metrics.execution_count + 1,
        error_count = trigger_performance_metrics.error_count + CASE WHEN is_error THEN 1 ELSE 0 END,
        last_execution = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;
END;
$ LANGUAGE plpgsql;

-- Optimized function to update user-level KPIs with performance improvements
CREATE OR REPLACE FUNCTION update_user_kpis_from_agent_analytics()
RETURNS TRIGGER AS $
DECLARE
    user_exists BOOLEAN;
    start_time TIMESTAMP;
    execution_time INTEGER;
    error_msg TEXT;
    should_skip BOOLEAN := FALSE;
    old_total_calls INTEGER := 0;
    new_total_calls INTEGER := 0;
BEGIN
    start_time := clock_timestamp();
    
    -- Performance optimization: Skip if this is an UPDATE with no meaningful changes
    IF TG_OP = 'UPDATE' THEN
        -- Check if any KPI-relevant fields actually changed
        IF (OLD.total_calls = NEW.total_calls OR (OLD.total_calls IS NULL AND NEW.total_calls IS NULL)) AND
           (OLD.successful_calls = NEW.successful_calls OR (OLD.successful_calls IS NULL AND NEW.successful_calls IS NULL)) AND
           (OLD.failed_calls = NEW.failed_calls OR (OLD.failed_calls IS NULL AND NEW.failed_calls IS NULL)) AND
           (OLD.leads_generated = NEW.leads_generated OR (OLD.leads_generated IS NULL AND NEW.leads_generated IS NULL)) AND
           (OLD.qualified_leads = NEW.qualified_leads OR (OLD.qualified_leads IS NULL AND NEW.qualified_leads IS NULL)) AND
           (OLD.credits_used = NEW.credits_used OR (OLD.credits_used IS NULL AND NEW.credits_used IS NULL)) THEN
            should_skip := TRUE;
        END IF;
    END IF;
    
    -- Skip execution if no meaningful changes detected
    IF should_skip THEN
        execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
        PERFORM update_trigger_performance_metrics(
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP, execution_time, 'SKIPPED'
        );
        RETURN NEW;
    END IF;
    
    -- Validate required fields are not NULL
    IF NEW.user_id IS NULL THEN
        error_msg := 'NULL user_id in agent_analytics, skipping KPI update';
        execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'WARNING', error_msg, execution_time
        );
        PERFORM update_trigger_performance_metrics(
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP, execution_time, 'WARNING'
        );
        RETURN NEW;
    END IF;
    
    IF NEW.date IS NULL THEN
        error_msg := 'NULL date in agent_analytics for user ' || NEW.user_id || ', skipping KPI update';
        execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'WARNING', error_msg, execution_time
        );
        PERFORM update_trigger_performance_metrics(
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP, execution_time, 'WARNING'
        );
        RETURN NEW;
    END IF;
    
    -- Performance optimization: Check if user exists with a more efficient query
    SELECT EXISTS(SELECT 1 FROM users WHERE id = NEW.user_id LIMIT 1) INTO user_exists;
    IF NOT user_exists THEN
        error_msg := 'User ' || NEW.user_id || ' does not exist, skipping KPI update';
        execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'WARNING', error_msg, execution_time
        );
        PERFORM update_trigger_performance_metrics(
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP, execution_time, 'WARNING'
        );
        RETURN NEW;
    END IF;
    
    -- Perform the KPI update with optimized query
    BEGIN
        -- Use a more efficient aggregation query with proper indexes
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

        -- Only update users table if there was a meaningful change
        IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.total_calls != OLD.total_calls) THEN
            UPDATE users 
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.user_id;
        END IF;

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
        
        PERFORM update_trigger_performance_metrics(
            'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP, execution_time, 'SUCCESS'
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
            
            PERFORM update_trigger_performance_metrics(
                'update_user_kpis_from_agent_analytics', 'agent_analytics', TG_OP, execution_time, 'ERROR'
            );
    END;

    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Optimized function to update dashboard cache with performance improvements
CREATE OR REPLACE FUNCTION update_dashboard_cache_from_agents()
RETURNS TRIGGER AS $
DECLARE
    user_stats RECORD;
    start_time TIMESTAMP;
    execution_time INTEGER;
    error_msg TEXT;
    user_exists BOOLEAN;
    should_skip BOOLEAN := FALSE;
    cache_exists BOOLEAN;
    last_cache_update TIMESTAMP;
BEGIN
    start_time := clock_timestamp();
    
    -- Performance optimization: Skip if this is an UPDATE with no meaningful changes
    IF TG_OP = 'UPDATE' THEN
        -- Check if any cache-relevant fields actually changed
        IF (OLD.total_calls = NEW.total_calls OR (OLD.total_calls IS NULL AND NEW.total_calls IS NULL)) AND
           (OLD.successful_calls = NEW.successful_calls OR (OLD.successful_calls IS NULL AND NEW.successful_calls IS NULL)) AND
           (OLD.leads_generated = NEW.leads_generated OR (OLD.leads_generated IS NULL AND NEW.leads_generated IS NULL)) AND
           (OLD.qualified_leads = NEW.qualified_leads OR (OLD.qualified_leads IS NULL AND NEW.qualified_leads IS NULL)) THEN
            should_skip := TRUE;
        END IF;
    END IF;
    
    -- Performance optimization: Rate limit cache updates (max once per minute per user)
    IF NOT should_skip THEN
        SELECT 
            EXISTS(SELECT 1 FROM dashboard_cache WHERE user_id = NEW.user_id AND cache_key = 'overview_stats'),
            COALESCE(MAX(updated_at), '1970-01-01'::timestamp)
        INTO cache_exists, last_cache_update
        FROM dashboard_cache 
        WHERE user_id = NEW.user_id AND cache_key = 'overview_stats';
        
        -- Skip if cache was updated less than 1 minute ago (unless it's a new record)
        IF cache_exists AND last_cache_update > (CURRENT_TIMESTAMP - INTERVAL '1 minute') THEN
            should_skip := TRUE;
        END IF;
    END IF;
    
    -- Skip execution if no meaningful changes detected or rate limited
    IF should_skip THEN
        execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
        PERFORM update_trigger_performance_metrics(
            'update_dashboard_cache_from_agents', 'agent_analytics', TG_OP, execution_time, 'SKIPPED'
        );
        RETURN NEW;
    END IF;
    
    -- Validate required fields
    IF NEW.user_id IS NULL THEN
        error_msg := 'NULL user_id in agent_analytics, skipping dashboard cache update';
        execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_dashboard_cache_from_agents', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'WARNING', error_msg, execution_time
        );
        PERFORM update_trigger_performance_metrics(
            'update_dashboard_cache_from_agents', 'agent_analytics', TG_OP, execution_time, 'WARNING'
        );
        RETURN NEW;
    END IF;
    
    -- Validate user exists with efficient query
    SELECT EXISTS(SELECT 1 FROM users WHERE id = NEW.user_id LIMIT 1) INTO user_exists;
    IF NOT user_exists THEN
        error_msg := 'User ' || NEW.user_id || ' does not exist, skipping dashboard cache update';
        execution_time := EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, user_id, agent_id,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            'update_dashboard_cache_from_agents', 'agent_analytics', TG_OP,
            NEW.user_id, NEW.agent_id, 'WARNING', error_msg, execution_time
        );
        PERFORM update_trigger_performance_metrics(
            'update_dashboard_cache_from_agents', 'agent_analytics', TG_OP, execution_time, 'WARNING'
        );
        RETURN NEW;
    END IF;
    
    BEGIN
        -- Calculate updated user statistics with optimized query using indexes
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
        
        PERFORM update_trigger_performance_metrics(
            'update_dashboard_cache_from_agents', 'agent_analytics', TG_OP, execution_time, 'SUCCESS'
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
            
            PERFORM update_trigger_performance_metrics(
                'update_dashboard_cache_from_agents', 'agent_analytics', TG_OP, execution_time, 'ERROR'
            );
    END;

    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create optimized indexes for better trigger performance
CREATE INDEX IF NOT EXISTS idx_agent_analytics_user_date_hour_optimized 
ON agent_analytics(user_id, date, hour) 
WHERE hour IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_analytics_user_date_recent 
ON agent_analytics(user_id, date) 
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_dashboard_cache_user_key_updated 
ON dashboard_cache(user_id, cache_key, updated_at);

-- Create a function to monitor trigger performance and alert on issues
CREATE OR REPLACE FUNCTION check_trigger_performance_alerts()
RETURNS void AS $
DECLARE
    slow_triggers RECORD;
    error_triggers RECORD;
    alert_threshold_ms INTEGER := 100; -- Alert if average execution time > 100ms
    error_threshold_pct DECIMAL := 5.0; -- Alert if error rate > 5%
BEGIN
    -- Check for slow triggers
    FOR slow_triggers IN
        SELECT 
            trigger_name,
            table_name,
            operation,
            avg_execution_time_ms,
            execution_count,
            date_bucket
        FROM trigger_performance_metrics
        WHERE date_bucket = CURRENT_DATE
          AND avg_execution_time_ms > alert_threshold_ms
          AND execution_count >= 10 -- Only alert if we have enough samples
    LOOP
        -- Log performance alert
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            slow_triggers.trigger_name, slow_triggers.table_name, slow_triggers.operation,
            'PERFORMANCE_ALERT', 
            'Trigger average execution time (' || slow_triggers.avg_execution_time_ms || 'ms) exceeds threshold (' || alert_threshold_ms || 'ms)',
            slow_triggers.avg_execution_time_ms::INTEGER
        );
    END LOOP;
    
    -- Check for high error rate triggers
    FOR error_triggers IN
        SELECT 
            trigger_name,
            table_name,
            operation,
            error_count,
            execution_count,
            (error_count::DECIMAL / execution_count * 100) as error_rate,
            date_bucket
        FROM trigger_performance_metrics
        WHERE date_bucket = CURRENT_DATE
          AND execution_count >= 10 -- Only alert if we have enough samples
          AND (error_count::DECIMAL / execution_count * 100) > error_threshold_pct
    LOOP
        -- Log error rate alert
        INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation,
            execution_status, error_message, execution_time_ms
        ) VALUES (
            error_triggers.trigger_name, error_triggers.table_name, error_triggers.operation,
            'ERROR_RATE_ALERT', 
            'Trigger error rate (' || ROUND(error_triggers.error_rate, 2) || '%) exceeds threshold (' || error_threshold_pct || '%)',
            0
        );
    END LOOP;
END;
$ LANGUAGE plpgsql;

-- Create a function to clean up old performance metrics (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_trigger_performance_metrics()
RETURNS void AS $
BEGIN
    DELETE FROM trigger_performance_metrics 
    WHERE date_bucket < CURRENT_DATE - INTERVAL '30 days';
    
    DELETE FROM trigger_execution_log 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$ LANGUAGE plpgsql;

-- Re-create triggers with the optimized functions
DROP TRIGGER IF EXISTS trigger_update_user_kpis_on_agent_insert ON agent_analytics;
DROP TRIGGER IF EXISTS trigger_update_user_kpis_on_agent_update ON agent_analytics;
DROP TRIGGER IF EXISTS trigger_update_dashboard_cache_on_agent_insert ON agent_analytics;
DROP TRIGGER IF EXISTS trigger_update_dashboard_cache_on_agent_update ON agent_analytics;

-- Create optimized triggers
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

-- Add updated_at trigger for performance metrics table
CREATE TRIGGER update_trigger_performance_metrics_updated_at 
BEFORE UPDATE ON trigger_performance_metrics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE trigger_performance_metrics IS 'Tracks performance metrics for database triggers with daily aggregation';
COMMENT ON FUNCTION update_trigger_performance_metrics(VARCHAR, VARCHAR, VARCHAR, INTEGER, VARCHAR) IS 'Updates performance metrics for trigger execution monitoring';
COMMENT ON FUNCTION check_trigger_performance_alerts() IS 'Monitors trigger performance and creates alerts for slow or error-prone triggers';
COMMENT ON FUNCTION cleanup_trigger_performance_metrics() IS 'Cleans up old performance metrics and execution logs (keeps last 30 days)';
COMMENT ON FUNCTION update_user_kpis_from_agent_analytics() IS 'Optimized trigger function with conditional logic and performance monitoring';
COMMENT ON FUNCTION update_dashboard_cache_from_agents() IS 'Optimized dashboard cache update with rate limiting and performance monitoring';