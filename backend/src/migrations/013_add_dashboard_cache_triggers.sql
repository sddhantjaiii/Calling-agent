-- Migration: Add database triggers for automatic dashboard cache invalidation
-- Requirements: 6.2 - Add automatic cache invalidation when user data changes

-- Function to notify cache invalidation
CREATE OR REPLACE FUNCTION notify_dashboard_cache_invalidation()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify the application about cache invalidation
    -- The application will listen for these notifications and invalidate caches accordingly
    
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM pg_notify('cache_invalidation', json_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'user_id', COALESCE(NEW.user_id, NEW.id),
            'record_id', COALESCE(NEW.id, NEW.agent_id),
            'timestamp', extract(epoch from now())
        )::text);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM pg_notify('cache_invalidation', json_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'user_id', COALESCE(OLD.user_id, OLD.id),
            'record_id', COALESCE(OLD.id, OLD.agent_id),
            'timestamp', extract(epoch from now())
        )::text);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for calls table (affects dashboard KPIs and analytics)
DROP TRIGGER IF EXISTS trigger_calls_cache_invalidation ON calls;
CREATE TRIGGER trigger_calls_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION notify_dashboard_cache_invalidation();

-- Trigger for lead_analytics table (affects dashboard analytics and KPIs)
DROP TRIGGER IF EXISTS trigger_lead_analytics_cache_invalidation ON lead_analytics;
CREATE TRIGGER trigger_lead_analytics_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON lead_analytics
    FOR EACH ROW
    EXECUTE FUNCTION notify_dashboard_cache_invalidation();

-- Trigger for agents table (affects dashboard overview)
DROP TRIGGER IF EXISTS trigger_agents_cache_invalidation ON agents;
CREATE TRIGGER trigger_agents_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION notify_dashboard_cache_invalidation();

-- Trigger for users table (affects credits and user data)
DROP TRIGGER IF EXISTS trigger_users_cache_invalidation ON users;
CREATE TRIGGER trigger_users_cache_invalidation
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (OLD.credits IS DISTINCT FROM NEW.credits OR OLD.is_active IS DISTINCT FROM NEW.is_active)
    EXECUTE FUNCTION notify_dashboard_cache_invalidation();

-- Trigger for agent_analytics table (affects dashboard KPIs)
DROP TRIGGER IF EXISTS trigger_agent_analytics_cache_invalidation ON agent_analytics;
CREATE TRIGGER trigger_agent_analytics_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON agent_analytics
    FOR EACH ROW
    EXECUTE FUNCTION notify_dashboard_cache_invalidation();

-- Create index for efficient trigger operations
CREATE INDEX IF NOT EXISTS idx_calls_cache_trigger ON calls(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_analytics_cache_trigger ON lead_analytics(call_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_cache_trigger ON agents(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_cache_trigger ON agent_analytics(user_id, date DESC);

-- Migration completed successfully
-- Note: Migration tracking is handled automatically by the migration runner