-- Add user analytics table and triggers for CTA metrics aggregation
-- This migration creates user-level analytics aggregation including CTA metrics

-- Create user_analytics table for user-level metrics aggregation
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Time period for these metrics
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23), -- NULL for daily aggregates, 0-23 for hourly
    
    -- Call metrics (aggregated from all user's agents)
    total_calls INTEGER DEFAULT 0 NOT NULL,
    successful_calls INTEGER DEFAULT 0 NOT NULL,
    failed_calls INTEGER DEFAULT 0 NOT NULL,
    total_duration_minutes INTEGER DEFAULT 0 NOT NULL,
    avg_duration_minutes DECIMAL(10,2) DEFAULT 0 NOT NULL,
    
    -- Lead metrics
    leads_generated INTEGER DEFAULT 0 NOT NULL,
    qualified_leads INTEGER DEFAULT 0 NOT NULL,
    conversion_rate DECIMAL(5,2) DEFAULT 0 NOT NULL, -- Percentage
    
    -- CTA metrics (aggregated from all user's agents)
    cta_pricing_clicks INTEGER DEFAULT 0 NOT NULL,
    cta_demo_clicks INTEGER DEFAULT 0 NOT NULL,
    cta_followup_clicks INTEGER DEFAULT 0 NOT NULL,
    cta_sample_clicks INTEGER DEFAULT 0 NOT NULL,
    cta_human_escalations INTEGER DEFAULT 0 NOT NULL,
    total_cta_interactions INTEGER DEFAULT 0 NOT NULL,
    cta_conversion_rate DECIMAL(5,2) DEFAULT 0 NOT NULL, -- Percentage of calls with any CTA interaction
    
    -- Engagement metrics (averaged across all user's agents)
    avg_engagement_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    avg_intent_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    avg_urgency_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    avg_budget_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    avg_fit_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- Cost metrics
    credits_used INTEGER DEFAULT 0 NOT NULL,
    cost_per_lead DECIMAL(10,2) DEFAULT 0 NOT NULL,
    
    -- Performance indicators
    success_rate DECIMAL(5,2) DEFAULT 0 NOT NULL, -- Percentage
    answer_rate DECIMAL(5,2) DEFAULT 0 NOT NULL, -- Percentage of calls answered
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ensure unique records per user/date/hour combination
    UNIQUE(user_id, date, hour)
);

-- Create indexes for performance optimization
CREATE INDEX idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX idx_user_analytics_date ON user_analytics(date);
CREATE INDEX idx_user_analytics_user_date ON user_analytics(user_id, date);
CREATE INDEX idx_user_analytics_cta_pricing ON user_analytics(cta_pricing_clicks) WHERE cta_pricing_clicks > 0;
CREATE INDEX idx_user_analytics_cta_demo ON user_analytics(cta_demo_clicks) WHERE cta_demo_clicks > 0;
CREATE INDEX idx_user_analytics_cta_followup ON user_analytics(cta_followup_clicks) WHERE cta_followup_clicks > 0;
CREATE INDEX idx_user_analytics_cta_sample ON user_analytics(cta_sample_clicks) WHERE cta_sample_clicks > 0;
CREATE INDEX idx_user_analytics_cta_human ON user_analytics(cta_human_escalations) WHERE cta_human_escalations > 0;
CREATE INDEX idx_user_analytics_total_cta ON user_analytics(total_cta_interactions) WHERE total_cta_interactions > 0;

-- Create composite indexes for common user analytics queries
CREATE INDEX idx_user_analytics_user_date_cta ON user_analytics(user_id, date, total_cta_interactions);

-- Create trigger for updating updated_at timestamps
CREATE TRIGGER update_user_analytics_updated_at BEFORE UPDATE ON user_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update user analytics CTA totals (similar to agent analytics)
CREATE OR REPLACE FUNCTION update_user_analytics_cta_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total CTA interactions
    NEW.total_cta_interactions = COALESCE(NEW.cta_pricing_clicks, 0) + 
                                COALESCE(NEW.cta_demo_clicks, 0) + 
                                COALESCE(NEW.cta_followup_clicks, 0) + 
                                COALESCE(NEW.cta_sample_clicks, 0) + 
                                COALESCE(NEW.cta_human_escalations, 0);
    
    -- Calculate CTA conversion rate (percentage of calls with any CTA interaction)
    IF NEW.total_calls > 0 THEN
        NEW.cta_conversion_rate = LEAST(999.99, (NEW.total_cta_interactions::DECIMAL / NEW.total_calls * 100));
    ELSE
        NEW.cta_conversion_rate = 0;
    END IF;
    
    -- Calculate other rates
    IF NEW.total_calls > 0 THEN
        NEW.success_rate = LEAST(999.99, (NEW.successful_calls::DECIMAL / NEW.total_calls * 100));
    ELSE
        NEW.success_rate = 0;
    END IF;
    
    IF NEW.leads_generated > 0 THEN
        NEW.conversion_rate = LEAST(999.99, (NEW.qualified_leads::DECIMAL / NEW.leads_generated * 100));
    ELSE
        NEW.conversion_rate = 0;
    END IF;
    
    IF NEW.total_duration_minutes > 0 AND NEW.total_calls > 0 THEN
        NEW.avg_duration_minutes = (NEW.total_duration_minutes::DECIMAL / NEW.total_calls);
    ELSE
        NEW.avg_duration_minutes = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update user analytics totals
CREATE TRIGGER trigger_update_user_analytics_cta_totals
    BEFORE INSERT OR UPDATE ON user_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_user_analytics_cta_totals();

-- Create function to aggregate agent analytics into user analytics
CREATE OR REPLACE FUNCTION update_user_analytics_from_agent_analytics()
RETURNS TRIGGER AS $$
DECLARE
    analytics_date DATE;
    analytics_hour INTEGER;
BEGIN
    -- Determine date and hour for analytics aggregation
    analytics_date := NEW.date;
    analytics_hour := NEW.hour;
    
    -- Update hourly user analytics (when hour is not NULL)
    IF analytics_hour IS NOT NULL THEN
        INSERT INTO user_analytics (
            user_id, date, hour,
            total_calls, successful_calls, failed_calls,
            total_duration_minutes, leads_generated, qualified_leads,
            cta_pricing_clicks, cta_demo_clicks, cta_followup_clicks,
            cta_sample_clicks, cta_human_escalations,
            avg_engagement_score, avg_intent_score, avg_urgency_score,
            avg_budget_score, avg_fit_score, credits_used
        )
        VALUES (
            NEW.user_id, analytics_date, analytics_hour,
            NEW.total_calls, NEW.successful_calls, NEW.failed_calls,
            NEW.total_duration_minutes, NEW.leads_generated, NEW.qualified_leads,
            NEW.cta_pricing_clicks, NEW.cta_demo_clicks, NEW.cta_followup_clicks,
            NEW.cta_sample_clicks, NEW.cta_human_escalations,
            NEW.avg_engagement_score, NEW.avg_intent_score, NEW.avg_urgency_score,
            NEW.avg_budget_score, NEW.avg_fit_score, NEW.credits_used
        )
        ON CONFLICT (user_id, date, hour)
        DO UPDATE SET
            total_calls = user_analytics.total_calls + NEW.total_calls - COALESCE(OLD.total_calls, 0),
            successful_calls = user_analytics.successful_calls + NEW.successful_calls - COALESCE(OLD.successful_calls, 0),
            failed_calls = user_analytics.failed_calls + NEW.failed_calls - COALESCE(OLD.failed_calls, 0),
            total_duration_minutes = user_analytics.total_duration_minutes + NEW.total_duration_minutes - COALESCE(OLD.total_duration_minutes, 0),
            leads_generated = user_analytics.leads_generated + NEW.leads_generated - COALESCE(OLD.leads_generated, 0),
            qualified_leads = user_analytics.qualified_leads + NEW.qualified_leads - COALESCE(OLD.qualified_leads, 0),
            cta_pricing_clicks = user_analytics.cta_pricing_clicks + NEW.cta_pricing_clicks - COALESCE(OLD.cta_pricing_clicks, 0),
            cta_demo_clicks = user_analytics.cta_demo_clicks + NEW.cta_demo_clicks - COALESCE(OLD.cta_demo_clicks, 0),
            cta_followup_clicks = user_analytics.cta_followup_clicks + NEW.cta_followup_clicks - COALESCE(OLD.cta_followup_clicks, 0),
            cta_sample_clicks = user_analytics.cta_sample_clicks + NEW.cta_sample_clicks - COALESCE(OLD.cta_sample_clicks, 0),
            cta_human_escalations = user_analytics.cta_human_escalations + NEW.cta_human_escalations - COALESCE(OLD.cta_human_escalations, 0),
            credits_used = user_analytics.credits_used + NEW.credits_used - COALESCE(OLD.credits_used, 0),
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- Update daily user analytics (aggregate from hourly data)
    INSERT INTO user_analytics (
        user_id, date, hour,
        total_calls, successful_calls, failed_calls,
        total_duration_minutes, leads_generated, qualified_leads,
        cta_pricing_clicks, cta_demo_clicks, cta_followup_clicks,
        cta_sample_clicks, cta_human_escalations,
        avg_engagement_score, avg_intent_score, avg_urgency_score,
        avg_budget_score, avg_fit_score, credits_used
    )
    SELECT 
        NEW.user_id, analytics_date, NULL,
        SUM(total_calls), SUM(successful_calls), SUM(failed_calls),
        SUM(total_duration_minutes), SUM(leads_generated), SUM(qualified_leads),
        SUM(cta_pricing_clicks), SUM(cta_demo_clicks), SUM(cta_followup_clicks),
        SUM(cta_sample_clicks), SUM(cta_human_escalations),
        AVG(avg_engagement_score), AVG(avg_intent_score), AVG(avg_urgency_score),
        AVG(avg_budget_score), AVG(avg_fit_score), SUM(credits_used)
    FROM agent_analytics 
    WHERE user_id = NEW.user_id 
      AND date = analytics_date 
      AND hour IS NULL
    
    ON CONFLICT (user_id, date, hour)
    DO UPDATE SET
        total_calls = EXCLUDED.total_calls,
        successful_calls = EXCLUDED.successful_calls,
        failed_calls = EXCLUDED.failed_calls,
        total_duration_minutes = EXCLUDED.total_duration_minutes,
        leads_generated = EXCLUDED.leads_generated,
        qualified_leads = EXCLUDED.qualified_leads,
        cta_pricing_clicks = EXCLUDED.cta_pricing_clicks,
        cta_demo_clicks = EXCLUDED.cta_demo_clicks,
        cta_followup_clicks = EXCLUDED.cta_followup_clicks,
        cta_sample_clicks = EXCLUDED.cta_sample_clicks,
        cta_human_escalations = EXCLUDED.cta_human_escalations,
        avg_engagement_score = EXCLUDED.avg_engagement_score,
        avg_intent_score = EXCLUDED.avg_intent_score,
        avg_urgency_score = EXCLUDED.avg_urgency_score,
        avg_budget_score = EXCLUDED.avg_budget_score,
        avg_fit_score = EXCLUDED.avg_fit_score,
        credits_used = EXCLUDED.credits_used,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user analytics when agent analytics changes
CREATE TRIGGER trigger_update_user_analytics_from_agent_analytics
    AFTER INSERT OR UPDATE ON agent_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_user_analytics_from_agent_analytics();

-- Create user performance summary view
CREATE VIEW user_performance_summary AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    u.credits,
    
    -- Current day metrics
    COALESCE(today.total_calls, 0) as today_calls,
    COALESCE(today.successful_calls, 0) as today_successful_calls,
    COALESCE(today.success_rate, 0) as today_success_rate,
    COALESCE(today.leads_generated, 0) as today_leads,
    COALESCE(today.total_cta_interactions, 0) as today_cta_interactions,
    COALESCE(today.cta_conversion_rate, 0) as today_cta_conversion_rate,
    
    -- Current month metrics
    COALESCE(month.total_calls, 0) as month_calls,
    COALESCE(month.successful_calls, 0) as month_successful_calls,
    COALESCE(month.success_rate, 0) as month_success_rate,
    COALESCE(month.leads_generated, 0) as month_leads,
    COALESCE(month.conversion_rate, 0) as month_conversion_rate,
    COALESCE(month.total_cta_interactions, 0) as month_cta_interactions,
    COALESCE(month.cta_conversion_rate, 0) as month_cta_conversion_rate,
    
    -- All-time metrics
    COALESCE(total.total_calls, 0) as total_calls,
    COALESCE(total.successful_calls, 0) as total_successful_calls,
    COALESCE(total.success_rate, 0) as total_success_rate,
    COALESCE(total.leads_generated, 0) as total_leads,
    COALESCE(total.avg_duration_minutes, 0) as avg_call_duration,
    COALESCE(total.total_cta_interactions, 0) as total_cta_interactions,
    COALESCE(total.cta_conversion_rate, 0) as total_cta_conversion_rate,
    
    -- CTA breakdown (all-time)
    COALESCE(total.cta_pricing_clicks, 0) as total_pricing_clicks,
    COALESCE(total.cta_demo_clicks, 0) as total_demo_clicks,
    COALESCE(total.cta_followup_clicks, 0) as total_followup_clicks,
    COALESCE(total.cta_sample_clicks, 0) as total_sample_clicks,
    COALESCE(total.cta_human_escalations, 0) as total_human_escalations,
    
    -- Agent count
    COALESCE(agent_count.active_agents, 0) as active_agents

FROM users u
LEFT JOIN (
    SELECT 
        user_id,
        SUM(total_calls) as total_calls,
        SUM(successful_calls) as successful_calls,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(successful_calls)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as success_rate,
        SUM(leads_generated) as leads_generated,
        SUM(total_cta_interactions) as total_cta_interactions,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(total_cta_interactions)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as cta_conversion_rate
    FROM user_analytics 
    WHERE date = CURRENT_DATE AND hour IS NULL
    GROUP BY user_id
) today ON u.id = today.user_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(total_calls) as total_calls,
        SUM(successful_calls) as successful_calls,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(successful_calls)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as success_rate,
        SUM(leads_generated) as leads_generated,
        CASE WHEN SUM(leads_generated) > 0 THEN (SUM(qualified_leads)::DECIMAL / SUM(leads_generated) * 100) ELSE 0 END as conversion_rate,
        SUM(total_cta_interactions) as total_cta_interactions,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(total_cta_interactions)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as cta_conversion_rate
    FROM user_analytics 
    WHERE date >= DATE_TRUNC('month', CURRENT_DATE) AND hour IS NULL
    GROUP BY user_id
) month ON u.id = month.user_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(total_calls) as total_calls,
        SUM(successful_calls) as successful_calls,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(successful_calls)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as success_rate,
        SUM(leads_generated) as leads_generated,
        AVG(avg_duration_minutes) as avg_duration_minutes,
        SUM(total_cta_interactions) as total_cta_interactions,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(total_cta_interactions)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as cta_conversion_rate,
        SUM(cta_pricing_clicks) as cta_pricing_clicks,
        SUM(cta_demo_clicks) as cta_demo_clicks,
        SUM(cta_followup_clicks) as cta_followup_clicks,
        SUM(cta_sample_clicks) as cta_sample_clicks,
        SUM(cta_human_escalations) as cta_human_escalations
    FROM user_analytics 
    WHERE hour IS NULL
    GROUP BY user_id
) total ON u.id = total.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as active_agents
    FROM agents 
    WHERE is_active = true
    GROUP BY user_id
) agent_count ON u.id = agent_count.user_id
WHERE u.is_active = true;

-- Add comments to document the new table and functions
COMMENT ON TABLE user_analytics IS 'User-level analytics aggregated from all agents owned by the user';
COMMENT ON COLUMN user_analytics.cta_pricing_clicks IS 'Total number of pricing CTA interactions across all user agents in the time period';
COMMENT ON COLUMN user_analytics.cta_demo_clicks IS 'Total number of demo request CTA interactions across all user agents in the time period';
COMMENT ON COLUMN user_analytics.cta_followup_clicks IS 'Total number of follow-up CTA interactions across all user agents in the time period';
COMMENT ON COLUMN user_analytics.cta_sample_clicks IS 'Total number of sample request CTA interactions across all user agents in the time period';
COMMENT ON COLUMN user_analytics.cta_human_escalations IS 'Total number of human escalation CTA interactions across all user agents in the time period';
COMMENT ON COLUMN user_analytics.total_cta_interactions IS 'Total number of CTA interactions across all user agents (automatically calculated)';
COMMENT ON COLUMN user_analytics.cta_conversion_rate IS 'Percentage of calls that resulted in any CTA interaction across all user agents (automatically calculated)';

COMMENT ON FUNCTION update_user_analytics_from_agent_analytics() IS 
'Trigger function that aggregates agent_analytics CTA metrics into user_analytics when agent analytics are updated';

COMMENT ON VIEW user_performance_summary IS 
'Summary view of user performance metrics including CTA analytics across all time periods';

-- Log the migration completion
INSERT INTO system_config (config_key, config_value, description, updated_by)
VALUES (
  'migration_026_completed_at',
  CURRENT_TIMESTAMP::TEXT,
  'Timestamp when migration 026 (add user analytics CTA aggregation) was completed',
  NULL
) ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = CURRENT_TIMESTAMP;

-- Verify table and trigger creation
DO $$
DECLARE
    table_count INTEGER;
    trigger_count INTEGER;
    view_count INTEGER;
BEGIN
    -- Check if user_analytics table was created
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name = 'user_analytics' AND table_schema = 'public';
    
    -- Check if our specific triggers were created
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name IN (
        'trigger_update_user_analytics_cta_totals',
        'trigger_update_user_analytics_from_agent_analytics',
        'update_user_analytics_updated_at'
    ) AND event_object_table IN ('user_analytics', 'agent_analytics');
    
    -- Check if view was created
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_name = 'user_performance_summary' AND table_schema = 'public';
    
    IF table_count = 1 AND trigger_count >= 3 AND view_count = 1 THEN
        RAISE NOTICE 'Migration 026 completed successfully: user_analytics table, % triggers, and view created', trigger_count;
    ELSE
        RAISE EXCEPTION 'Migration 026 failed: Expected 1 table, at least 3 triggers, and 1 view. Found: % table, % triggers, % view', 
            table_count, trigger_count, view_count;
    END IF;
END $$;