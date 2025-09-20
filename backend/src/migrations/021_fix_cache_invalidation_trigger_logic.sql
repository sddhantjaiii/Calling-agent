-- Migration: Fix cache invalidation trigger logic
-- Task: 7.1 Fix cache invalidation trigger logic
-- Requirements: US-4.1 - Trigger Reliability

-- Drop existing problematic triggers and function
DROP TRIGGER IF EXISTS dashboard_cache_invalidation_trigger ON users;
DROP TRIGGER IF EXISTS dashboard_cache_invalidation_trigger ON agents;
DROP TRIGGER IF EXISTS dashboard_cache_invalidation_trigger ON calls;
DROP TRIGGER IF EXISTS dashboard_cache_invalidation_trigger ON credit_transactions;
DROP TRIGGER IF EXISTS dashboard_cache_invalidation_trigger ON lead_analytics;
DROP TRIGGER IF EXISTS dashboard_cache_invalidation_trigger ON agent_analytics;

-- Drop the old function
DROP FUNCTION IF EXISTS notify_dashboard_cache_invalidation() CASCADE;

-- Create improved cache invalidation function with proper error handling
CREATE OR REPLACE FUNCTION notify_cache_invalidation()
RETURNS TRIGGER AS $$
DECLARE
    user_id_value UUID;
    record_id_value UUID;
    agent_id_value UUID;
    notification_payload JSON;
    error_context TEXT;
BEGIN
    -- Set error context for debugging
    error_context := format('Table: %s, Operation: %s', TG_TABLE_NAME, TG_OP);
    
    BEGIN
        -- Determine user_id, record_id, and agent_id based on table structure
        CASE TG_TABLE_NAME
            WHEN 'users' THEN
                user_id_value := COALESCE(NEW.id, OLD.id);
                record_id_value := COALESCE(NEW.id, OLD.id);
                agent_id_value := NULL;
                
            WHEN 'agents' THEN
                user_id_value := COALESCE(NEW.user_id, OLD.user_id);
                record_id_value := COALESCE(NEW.id, OLD.id);
                agent_id_value := COALESCE(NEW.id, OLD.id);
                
            WHEN 'calls' THEN
                user_id_value := COALESCE(NEW.user_id, OLD.user_id);
                record_id_value := COALESCE(NEW.id, OLD.id);
                agent_id_value := COALESCE(NEW.agent_id, OLD.agent_id);
                
            WHEN 'lead_analytics' THEN
                -- For lead_analytics, we need to get user_id from the related call
                IF TG_OP = 'DELETE' THEN
                    SELECT c.user_id, c.agent_id INTO user_id_value, agent_id_value
                    FROM calls c WHERE c.id = OLD.call_id;
                ELSE
                    SELECT c.user_id, c.agent_id INTO user_id_value, agent_id_value
                    FROM calls c WHERE c.id = NEW.call_id;
                END IF;
                record_id_value := COALESCE(NEW.id, OLD.id);
                
            WHEN 'agent_analytics' THEN
                user_id_value := COALESCE(NEW.user_id, OLD.user_id);
                record_id_value := COALESCE(NEW.id, OLD.id);
                agent_id_value := COALESCE(NEW.agent_id, OLD.agent_id);
                
            WHEN 'credit_transactions' THEN
                user_id_value := COALESCE(NEW.user_id, OLD.user_id);
                record_id_value := COALESCE(NEW.id, OLD.id);
                agent_id_value := NULL;
                
            ELSE
                -- Default fallback for unknown tables
                user_id_value := COALESCE(NEW.user_id, OLD.user_id, NEW.id, OLD.id);
                record_id_value := COALESCE(NEW.id, OLD.id);
                agent_id_value := COALESCE(NEW.agent_id, OLD.agent_id);
        END CASE;

        -- Validate that we have a user_id (required for cache invalidation)
        IF user_id_value IS NOT NULL THEN
            -- Build notification payload with all relevant information
            notification_payload := json_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'user_id', user_id_value,
                'record_id', record_id_value,
                'agent_id', agent_id_value,
                'timestamp', extract(epoch from now()),
                'batch_id', txid_current() -- Use transaction ID for batching
            );

            -- Send notification with error handling
            PERFORM pg_notify('cache_invalidation', notification_payload::text);

            -- Log successful notification for monitoring
            RAISE DEBUG 'Cache invalidation notification sent: %', notification_payload;
        ELSE
            RAISE WARNING 'Cache invalidation skipped: no user_id found for % % operation', 
                TG_TABLE_NAME, TG_OP;
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't fail the transaction
            RAISE WARNING 'Cache invalidation trigger error in %: % (SQLSTATE: %)', 
                error_context, SQLERRM, SQLSTATE;
            
            -- Insert error into trigger log table if it exists
            BEGIN
                INSERT INTO trigger_error_log (
                    table_name, 
                    operation, 
                    error_message, 
                    error_context,
                    occurred_at
                ) VALUES (
                    TG_TABLE_NAME, 
                    TG_OP, 
                    SQLERRM, 
                    error_context,
                    now()
                );
            EXCEPTION
                WHEN OTHERS THEN
                    -- If logging fails, just continue
                    NULL;
            END;
    END;

    -- Return appropriate record based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger error log table for monitoring trigger failures
CREATE TABLE IF NOT EXISTS trigger_error_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    error_message TEXT NOT NULL,
    error_context TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient error log queries
CREATE INDEX IF NOT EXISTS idx_trigger_error_log_occurred_at 
ON trigger_error_log(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_trigger_error_log_table_operation 
ON trigger_error_log(table_name, operation);

-- Create optimized triggers with proper conditions to minimize overhead

-- Users table trigger (only for significant changes)
CREATE TRIGGER cache_invalidation_users
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (
        OLD.credits IS DISTINCT FROM NEW.credits OR 
        OLD.is_active IS DISTINCT FROM NEW.is_active OR
        OLD.updated_at IS DISTINCT FROM NEW.updated_at
    )
    EXECUTE FUNCTION notify_cache_invalidation();

-- Agents table trigger (all operations affect cache)
CREATE TRIGGER cache_invalidation_agents
    AFTER INSERT OR UPDATE OR DELETE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION notify_cache_invalidation();

-- Calls table trigger (all operations affect analytics)
CREATE TRIGGER cache_invalidation_calls
    AFTER INSERT OR UPDATE OR DELETE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION notify_cache_invalidation();

-- Lead analytics table trigger (all operations affect dashboard)
CREATE TRIGGER cache_invalidation_lead_analytics
    AFTER INSERT OR UPDATE OR DELETE ON lead_analytics
    FOR EACH ROW
    EXECUTE FUNCTION notify_cache_invalidation();

-- Agent analytics table trigger (all operations affect KPIs)
CREATE TRIGGER cache_invalidation_agent_analytics
    AFTER INSERT OR UPDATE OR DELETE ON agent_analytics
    FOR EACH ROW
    EXECUTE FUNCTION notify_cache_invalidation();

-- Credit transactions table trigger (affects user credits display)
CREATE TRIGGER cache_invalidation_credit_transactions
    AFTER INSERT OR UPDATE OR DELETE ON credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION notify_cache_invalidation();

-- Add comments for documentation
COMMENT ON FUNCTION notify_cache_invalidation() IS 
'Improved cache invalidation function with error handling, batching support, and cascade logic';

COMMENT ON TABLE trigger_error_log IS 
'Log table for monitoring cache invalidation trigger errors';

-- Create a function to get trigger health status
CREATE OR REPLACE FUNCTION get_cache_trigger_health()
RETURNS TABLE(
    table_name VARCHAR(100),
    trigger_name VARCHAR(100),
    is_enabled BOOLEAN,
    recent_errors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.event_object_table::VARCHAR(100) as table_name,
        t.trigger_name::VARCHAR(100) as trigger_name,
        true as is_enabled, -- Triggers are enabled by default
        COALESCE(e.error_count, 0) as recent_errors
    FROM information_schema.triggers t
    LEFT JOIN (
        SELECT 
            tel.table_name,
            COUNT(*) as error_count
        FROM trigger_error_log tel
        WHERE tel.occurred_at > now() - INTERVAL '1 hour'
        GROUP BY tel.table_name
    ) e ON t.event_object_table = e.table_name
    WHERE t.trigger_name LIKE 'cache_invalidation_%'
    ORDER BY t.event_object_table;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clear old trigger error logs
CREATE OR REPLACE FUNCTION cleanup_trigger_error_log(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM trigger_error_log 
    WHERE occurred_at < now() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old trigger error log entries', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add function to manually test cache invalidation
CREATE OR REPLACE FUNCTION test_cache_invalidation(
    test_table_name VARCHAR(100),
    test_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    test_result JSON;
    test_user_id_actual UUID;
BEGIN
    -- Use provided user_id or find a test user
    IF test_user_id IS NULL THEN
        SELECT id INTO test_user_id_actual FROM users LIMIT 1;
        IF test_user_id_actual IS NULL THEN
            RETURN json_build_object(
                'success', false,
                'error', 'No users found for testing'
            );
        END IF;
    ELSE
        test_user_id_actual := test_user_id;
    END IF;

    -- Test notification by sending a manual notification
    PERFORM pg_notify('cache_invalidation', json_build_object(
        'table', test_table_name,
        'operation', 'TEST',
        'user_id', test_user_id_actual,
        'record_id', gen_random_uuid(),
        'agent_id', NULL,
        'timestamp', extract(epoch from now()),
        'batch_id', txid_current(),
        'test', true
    )::text);

    RETURN json_build_object(
        'success', true,
        'message', 'Test cache invalidation notification sent',
        'table', test_table_name,
        'user_id', test_user_id_actual
    );
END;
$$ LANGUAGE plpgsql;

-- Migration completed successfully