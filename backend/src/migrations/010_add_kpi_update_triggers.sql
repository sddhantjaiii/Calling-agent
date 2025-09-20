-- Add triggers to update main KPI tables when agent analytics change
-- This ensures the dashboard overview stays in sync with individual agent performance

-- Function to update user-level KPIs when agent analytics change
CREATE OR REPLACE FUNCTION update_user_kpis_from_agent_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert user-level daily analytics
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
        COALESCE(SUM(aa.total_calls), 0),
        COALESCE(SUM(aa.successful_calls), 0),
        COALESCE(SUM(aa.failed_calls), 0),
        COALESCE(SUM(aa.total_duration_minutes), 0),
        COALESCE(SUM(aa.leads_generated), 0),
        COALESCE(SUM(aa.qualified_leads), 0),
        COALESCE(SUM(aa.credits_used), 0),
        COALESCE(AVG(aa.avg_engagement_score), 0),
        COALESCE(AVG(aa.avg_intent_score), 0),
        CURRENT_TIMESTAMP
    FROM agent_analytics aa
    WHERE aa.user_id = NEW.user_id 
      AND aa.date = NEW.date 
      AND aa.hour IS NULL  -- Only daily aggregates
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

    -- Update user's overall statistics
    UPDATE users 
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update dashboard cache when agent analytics change
CREATE OR REPLACE FUNCTION update_dashboard_cache_from_agents()
RETURNS TRIGGER AS $$
DECLARE
    user_stats RECORD;
BEGIN
    -- Calculate updated user statistics
    SELECT 
        NEW.user_id as user_id,
        COALESCE(SUM(aa.total_calls), 0) as total_calls,
        COALESCE(SUM(aa.successful_calls), 0) as successful_calls,
        COALESCE(SUM(aa.leads_generated), 0) as total_leads,
        COALESCE(SUM(aa.qualified_leads), 0) as qualified_leads,
        COALESCE(SUM(aa.credits_used), 0) as credits_used,
        COALESCE(AVG(aa.avg_engagement_score), 0) as avg_engagement,
        COUNT(DISTINCT aa.agent_id) as active_agents
    INTO user_stats
    FROM agent_analytics aa
    WHERE aa.user_id = NEW.user_id 
      AND aa.date >= CURRENT_DATE - INTERVAL '30 days'
      AND aa.hour IS NULL;

    -- Update dashboard cache table
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
            'total_calls', user_stats.total_calls,
            'successful_calls', user_stats.successful_calls,
            'success_rate', CASE 
                WHEN user_stats.total_calls > 0 
                THEN (user_stats.successful_calls::DECIMAL / user_stats.total_calls * 100)
                ELSE 0 
            END,
            'total_leads', user_stats.total_leads,
            'qualified_leads', user_stats.qualified_leads,
            'conversion_rate', CASE 
                WHEN user_stats.total_leads > 0 
                THEN (user_stats.qualified_leads::DECIMAL / user_stats.total_leads * 100)
                ELSE 0 
            END,
            'credits_used', user_stats.credits_used,
            'avg_engagement', user_stats.avg_engagement,
            'active_agents', user_stats.active_agents,
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create user_daily_analytics table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Aggregated metrics from all user's agents
    total_calls INTEGER DEFAULT 0 NOT NULL,
    successful_calls INTEGER DEFAULT 0 NOT NULL,
    failed_calls INTEGER DEFAULT 0 NOT NULL,
    total_duration_minutes INTEGER DEFAULT 0 NOT NULL,
    leads_generated INTEGER DEFAULT 0 NOT NULL,
    qualified_leads INTEGER DEFAULT 0 NOT NULL,
    credits_used INTEGER DEFAULT 0 NOT NULL,
    
    -- Average scores across all agents
    avg_engagement_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    avg_intent_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(user_id, date)
);

-- Create dashboard_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS dashboard_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cache_key VARCHAR(100) NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(user_id, cache_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_daily_analytics_user_date ON user_daily_analytics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_daily_analytics_date ON user_daily_analytics(date);

CREATE INDEX IF NOT EXISTS idx_dashboard_cache_user_key ON dashboard_cache(user_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_expires ON dashboard_cache(expires_at);

-- Create triggers on agent_analytics table
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

-- Create trigger on calls table to update agent analytics when calls complete
CREATE OR REPLACE FUNCTION update_agent_analytics_from_call()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed calls
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Update daily agent analytics
        INSERT INTO agent_analytics (
            agent_id,
            user_id,
            date,
            hour,
            total_calls,
            successful_calls,
            failed_calls,
            total_duration_minutes,
            avg_duration_minutes,
            credits_used
        )
        VALUES (
            NEW.agent_id,
            NEW.user_id,
            DATE(NEW.created_at),
            NULL, -- Daily aggregate
            1,
            CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            COALESCE(NEW.duration_minutes, 0),
            COALESCE(NEW.duration_minutes, 0),
            COALESCE(NEW.credits_used, 0)
        )
        ON CONFLICT (agent_id, date, hour)
        DO UPDATE SET
            total_calls = agent_analytics.total_calls + 1,
            successful_calls = agent_analytics.successful_calls + 
                CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            failed_calls = agent_analytics.failed_calls + 
                CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            total_duration_minutes = agent_analytics.total_duration_minutes + COALESCE(NEW.duration_minutes, 0),
            avg_duration_minutes = (agent_analytics.total_duration_minutes + COALESCE(NEW.duration_minutes, 0))::DECIMAL / 
                (agent_analytics.total_calls + 1),
            credits_used = agent_analytics.credits_used + COALESCE(NEW.credits_used, 0),
            updated_at = CURRENT_TIMESTAMP;

        -- Also update hourly analytics
        INSERT INTO agent_analytics (
            agent_id,
            user_id,
            date,
            hour,
            total_calls,
            successful_calls,
            failed_calls,
            total_duration_minutes,
            avg_duration_minutes,
            credits_used
        )
        VALUES (
            NEW.agent_id,
            NEW.user_id,
            DATE(NEW.created_at),
            EXTRACT(HOUR FROM NEW.created_at),
            1,
            CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            COALESCE(NEW.duration_minutes, 0),
            COALESCE(NEW.duration_minutes, 0),
            COALESCE(NEW.credits_used, 0)
        )
        ON CONFLICT (agent_id, date, hour)
        DO UPDATE SET
            total_calls = agent_analytics.total_calls + 1,
            successful_calls = agent_analytics.successful_calls + 
                CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            failed_calls = agent_analytics.failed_calls + 
                CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            total_duration_minutes = agent_analytics.total_duration_minutes + COALESCE(NEW.duration_minutes, 0),
            avg_duration_minutes = (agent_analytics.total_duration_minutes + COALESCE(NEW.duration_minutes, 0))::DECIMAL / 
                (agent_analytics.total_calls + 1),
            credits_used = agent_analytics.credits_used + COALESCE(NEW.credits_used, 0),
            updated_at = CURRENT_TIMESTAMP;
            
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on calls table
CREATE TRIGGER trigger_update_agent_analytics_from_call
    AFTER INSERT OR UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_analytics_from_call();

-- Create trigger on lead_analytics table to update agent performance scores
CREATE OR REPLACE FUNCTION update_agent_scores_from_lead_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update agent analytics with lead scoring data
    UPDATE agent_analytics 
    SET 
        leads_generated = agent_analytics.leads_generated + 1,
        qualified_leads = agent_analytics.qualified_leads + 
            CASE WHEN NEW.total_score >= 70 THEN 1 ELSE 0 END,
        conversion_rate = CASE 
            WHEN (agent_analytics.leads_generated + 1) > 0 
            THEN ((agent_analytics.qualified_leads + CASE WHEN NEW.total_score >= 70 THEN 1 ELSE 0 END)::DECIMAL / 
                  (agent_analytics.leads_generated + 1) * 100)
            ELSE 0 
        END,
        avg_engagement_score = (
            (agent_analytics.avg_engagement_score * agent_analytics.leads_generated + COALESCE(NEW.engagement_score, 0)) / 
            (agent_analytics.leads_generated + 1)
        ),
        avg_intent_score = (
            (agent_analytics.avg_intent_score * agent_analytics.leads_generated + COALESCE(NEW.intent_score, 0)) / 
            (agent_analytics.leads_generated + 1)
        ),
        avg_urgency_score = (
            (agent_analytics.avg_urgency_score * agent_analytics.leads_generated + COALESCE(NEW.urgency_score, 0)) / 
            (agent_analytics.leads_generated + 1)
        ),
        avg_budget_score = (
            (agent_analytics.avg_budget_score * agent_analytics.leads_generated + COALESCE(NEW.budget_score, 0)) / 
            (agent_analytics.leads_generated + 1)
        ),
        avg_fit_score = (
            (agent_analytics.avg_fit_score * agent_analytics.leads_generated + COALESCE(NEW.fit_score, 0)) / 
            (agent_analytics.leads_generated + 1)
        ),
        updated_at = CURRENT_TIMESTAMP
    FROM calls c
    WHERE c.id = NEW.call_id 
      AND agent_analytics.agent_id = c.agent_id 
      AND agent_analytics.date = DATE(c.created_at)
      AND agent_analytics.hour IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on lead_analytics table
CREATE TRIGGER trigger_update_agent_scores_from_lead_analytics
    AFTER INSERT ON lead_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_scores_from_lead_analytics();

-- Create a cleanup job for expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_dashboard_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM dashboard_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for new tables
CREATE TRIGGER update_user_daily_analytics_updated_at BEFORE UPDATE ON user_daily_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_cache_updated_at BEFORE UPDATE ON dashboard_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();