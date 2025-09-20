-- Fix cache invalidation trigger for users table
-- The trigger is trying to access NEW.user_id which doesn't exist in users table

-- Drop all existing triggers first
DROP TRIGGER IF EXISTS dashboard_cache_invalidation_trigger ON users;
DROP TRIGGER IF EXISTS trigger_users_cache_invalidation ON users;
DROP TRIGGER IF EXISTS trigger_agents_cache_invalidation ON agents;
DROP TRIGGER IF EXISTS trigger_calls_cache_invalidation ON calls;
DROP TRIGGER IF EXISTS trigger_lead_analytics_cache_invalidation ON lead_analytics;
DROP TRIGGER IF EXISTS trigger_agent_analytics_cache_invalidation ON agent_analytics;

-- Now drop the function
DROP FUNCTION IF EXISTS notify_dashboard_cache_invalidation() CASCADE;

-- Create a new, more robust cache invalidation function
CREATE OR REPLACE FUNCTION notify_dashboard_cache_invalidation()
RETURNS TRIGGER AS $$
BEGIN
    -- Determine the user_id based on the table and operation
    DECLARE
        user_id_value UUID;
        record_id_value UUID;
    BEGIN
        -- Handle different tables appropriately
        IF TG_TABLE_NAME = 'users' THEN
            user_id_value := COALESCE(NEW.id, OLD.id);
            record_id_value := COALESCE(NEW.id, OLD.id);
        ELSIF TG_TABLE_NAME = 'agents' THEN
            user_id_value := COALESCE(NEW.user_id, OLD.user_id);
            record_id_value := COALESCE(NEW.id, OLD.id);
        ELSIF TG_TABLE_NAME = 'calls' THEN
            user_id_value := COALESCE(NEW.user_id, OLD.user_id);
            record_id_value := COALESCE(NEW.id, OLD.id);
        ELSIF TG_TABLE_NAME = 'credit_transactions' THEN
            user_id_value := COALESCE(NEW.user_id, OLD.user_id);
            record_id_value := COALESCE(NEW.id, OLD.id);
        ELSE
            -- Default fallback
            user_id_value := COALESCE(NEW.id, OLD.id);
            record_id_value := COALESCE(NEW.id, OLD.id);
        END IF;

        -- Send the notification
        PERFORM pg_notify('cache_invalidation', json_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'user_id', user_id_value,
            'record_id', record_id_value,
            'timestamp', extract(epoch from now())
        )::text);

        -- Return appropriate record
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers for all relevant tables
CREATE TRIGGER dashboard_cache_invalidation_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_cache_invalidation();

CREATE TRIGGER dashboard_cache_invalidation_trigger
    AFTER INSERT OR UPDATE OR DELETE ON agents
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_cache_invalidation();

CREATE TRIGGER dashboard_cache_invalidation_trigger
    AFTER INSERT OR UPDATE OR DELETE ON calls
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_cache_invalidation();

CREATE TRIGGER dashboard_cache_invalidation_trigger
    AFTER INSERT OR UPDATE OR DELETE ON credit_transactions
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_cache_invalidation();

-- Add comment for documentation
COMMENT ON FUNCTION notify_dashboard_cache_invalidation() IS 'Sends cache invalidation notifications for dashboard data changes';