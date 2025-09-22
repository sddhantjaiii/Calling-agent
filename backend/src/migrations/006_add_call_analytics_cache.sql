-- Migration to add call analytics cache table for improved performance
-- This table will store pre-calculated analytics data to avoid expensive real-time calculations

-- Call analytics cache table - stores pre-calculated KPIs and metrics
CREATE TABLE call_analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_period DATE NOT NULL, -- The date this analytics data represents
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Call volume metrics
    total_calls INTEGER DEFAULT 0 NOT NULL,
    successful_calls INTEGER DEFAULT 0 NOT NULL,
    failed_calls INTEGER DEFAULT 0 NOT NULL,
    missed_calls INTEGER DEFAULT 0 NOT NULL,
    connection_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- Duration metrics
    total_call_duration INTEGER DEFAULT 0 NOT NULL, -- in minutes
    average_call_duration DECIMAL(8,2) DEFAULT 0 NOT NULL, -- in minutes
    
    -- Lead quality metrics
    hot_leads INTEGER DEFAULT 0 NOT NULL, -- score >= 80
    warm_leads INTEGER DEFAULT 0 NOT NULL, -- score 60-79
    cold_leads INTEGER DEFAULT 0 NOT NULL, -- score 40-59
    unqualified_leads INTEGER DEFAULT 0 NOT NULL, -- score < 40
    total_leads INTEGER DEFAULT 0 NOT NULL,
    average_lead_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    conversion_rate DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- CTA interaction metrics
    pricing_clicks INTEGER DEFAULT 0 NOT NULL,
    demo_requests INTEGER DEFAULT 0 NOT NULL,
    followup_requests INTEGER DEFAULT 0 NOT NULL,
    sample_requests INTEGER DEFAULT 0 NOT NULL,
    human_escalations INTEGER DEFAULT 0 NOT NULL,
    
    -- Intent and budget metrics
    high_intent_leads INTEGER DEFAULT 0 NOT NULL, -- intent_score >= 70
    high_budget_leads INTEGER DEFAULT 0 NOT NULL, -- budget_score >= 70
    urgent_leads INTEGER DEFAULT 0 NOT NULL, -- urgency_score >= 70
    
    -- Source breakdown
    inbound_calls INTEGER DEFAULT 0 NOT NULL,
    outbound_calls INTEGER DEFAULT 0 NOT NULL,
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ensure one record per user per date per period type
    UNIQUE(user_id, date_period, period_type)
);

-- Indexes for performance
CREATE INDEX idx_call_analytics_cache_user_id ON call_analytics_cache(user_id);
CREATE INDEX idx_call_analytics_cache_date_period ON call_analytics_cache(date_period);
CREATE INDEX idx_call_analytics_cache_period_type ON call_analytics_cache(period_type);
CREATE INDEX idx_call_analytics_cache_user_date_period ON call_analytics_cache(user_id, date_period, period_type);
CREATE INDEX idx_call_analytics_cache_calculated_at ON call_analytics_cache(calculated_at);

-- Trigger for updating updated_at timestamp
CREATE TRIGGER update_call_analytics_cache_updated_at 
    BEFORE UPDATE ON call_analytics_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate and cache daily analytics for a user
CREATE OR REPLACE FUNCTION calculate_daily_call_analytics(
    target_user_id UUID,
    target_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID AS $$
DECLARE
    analytics_data RECORD;
BEGIN
    -- Calculate analytics for the target date
    SELECT 
        COUNT(c.id) as total_calls,
        COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as successful_calls,
        COUNT(CASE WHEN c.status = 'failed' THEN 1 END) as failed_calls,
        COUNT(CASE WHEN c.status = 'cancelled' OR c.status IS NULL THEN 1 END) as missed_calls,
        CASE 
            WHEN COUNT(c.id) > 0 
            THEN (COUNT(CASE WHEN c.status = 'completed' THEN 1 END) * 100.0 / COUNT(c.id))
            ELSE 0 
        END as connection_rate,
        COALESCE(SUM(c.duration_minutes), 0) as total_call_duration,
        COALESCE(AVG(CASE WHEN c.status = 'completed' THEN c.duration_minutes END), 0) as average_call_duration,
        COUNT(CASE WHEN la.total_score >= 80 THEN 1 END) as hot_leads,
        COUNT(CASE WHEN la.total_score >= 60 AND la.total_score < 80 THEN 1 END) as warm_leads,
        COUNT(CASE WHEN la.total_score >= 40 AND la.total_score < 60 THEN 1 END) as cold_leads,
        COUNT(CASE WHEN la.total_score < 40 THEN 1 END) as unqualified_leads,
        COUNT(la.id) as total_leads,
        COALESCE(AVG(la.total_score), 0) as average_lead_score,
        CASE 
            WHEN COUNT(c.id) > 0 
            THEN (COUNT(CASE WHEN la.total_score >= 60 THEN 1 END) * 100.0 / COUNT(c.id))
            ELSE 0 
        END as conversion_rate,
        COUNT(CASE WHEN la.cta_interactions->>'pricing_clicked' = 'true' THEN 1 END) as pricing_clicks,
        COUNT(CASE WHEN la.cta_interactions->>'demo_clicked' = 'true' THEN 1 END) as demo_requests,
        COUNT(CASE WHEN la.cta_interactions->>'followup_clicked' = 'true' THEN 1 END) as followup_requests,
        COUNT(CASE WHEN la.cta_interactions->>'sample_clicked' = 'true' THEN 1 END) as sample_requests,
        COUNT(CASE WHEN la.cta_interactions->>'escalated_to_human' = 'true' THEN 1 END) as human_escalations,
        COUNT(CASE WHEN la.intent_score >= 70 THEN 1 END) as high_intent_leads,
        COUNT(CASE WHEN la.budget_score >= 70 THEN 1 END) as high_budget_leads,
        COUNT(CASE WHEN la.urgency_score >= 70 THEN 1 END) as urgent_leads,
        0 as inbound_calls, -- Currently all calls are outbound
        COUNT(c.id) as outbound_calls
    INTO analytics_data
    FROM calls c
    LEFT JOIN lead_analytics la ON c.id = la.call_id
    WHERE c.user_id = target_user_id 
        AND DATE(c.created_at) = target_date;

    -- Insert or update the cache record
    INSERT INTO call_analytics_cache (
        user_id, date_period, period_type,
        total_calls, successful_calls, failed_calls, not_connected, connection_rate,
        total_call_duration, average_call_duration,
        hot_leads, warm_leads, cold_leads, unqualified_leads, total_leads, 
        average_lead_score, conversion_rate,
        pricing_clicks, demo_requests, followup_requests, sample_requests, human_escalations,
        high_intent_leads, high_budget_leads, urgent_leads,
        inbound_calls, outbound_calls,
        calculated_at
    ) VALUES (
        target_user_id, target_date, 'daily',
        analytics_data.total_calls, analytics_data.successful_calls, 
        analytics_data.failed_calls, analytics_data.not_connected, analytics_data.connection_rate,
        analytics_data.total_call_duration, analytics_data.average_call_duration,
        analytics_data.hot_leads, analytics_data.warm_leads, 
        analytics_data.cold_leads, analytics_data.unqualified_leads, analytics_data.total_leads,
        analytics_data.average_lead_score, analytics_data.conversion_rate,
        analytics_data.pricing_clicks, analytics_data.demo_requests, 
        analytics_data.followup_requests, analytics_data.sample_requests, analytics_data.human_escalations,
        analytics_data.high_intent_leads, analytics_data.high_budget_leads, analytics_data.urgent_leads,
        analytics_data.inbound_calls, analytics_data.outbound_calls,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id, date_period, period_type)
    DO UPDATE SET
        total_calls = EXCLUDED.total_calls,
        successful_calls = EXCLUDED.successful_calls,
        failed_calls = EXCLUDED.failed_calls,
        not_connected = EXCLUDED.not_connected,
        connection_rate = EXCLUDED.connection_rate,
        total_call_duration = EXCLUDED.total_call_duration,
        average_call_duration = EXCLUDED.average_call_duration,
        hot_leads = EXCLUDED.hot_leads,
        warm_leads = EXCLUDED.warm_leads,
        cold_leads = EXCLUDED.cold_leads,
        unqualified_leads = EXCLUDED.unqualified_leads,
        total_leads = EXCLUDED.total_leads,
        average_lead_score = EXCLUDED.average_lead_score,
        conversion_rate = EXCLUDED.conversion_rate,
        pricing_clicks = EXCLUDED.pricing_clicks,
        demo_requests = EXCLUDED.demo_requests,
        followup_requests = EXCLUDED.followup_requests,
        sample_requests = EXCLUDED.sample_requests,
        human_escalations = EXCLUDED.human_escalations,
        high_intent_leads = EXCLUDED.high_intent_leads,
        high_budget_leads = EXCLUDED.high_budget_leads,
        urgent_leads = EXCLUDED.urgent_leads,
        inbound_calls = EXCLUDED.inbound_calls,
        outbound_calls = EXCLUDED.outbound_calls,
        calculated_at = EXCLUDED.calculated_at,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update analytics cache when calls are completed
CREATE OR REPLACE FUNCTION trigger_update_call_analytics_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics for the date when the call was created
    PERFORM calculate_daily_call_analytics(NEW.user_id, DATE(NEW.created_at));
    
    -- If the call was updated (status changed), also update today's analytics
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        PERFORM calculate_daily_call_analytics(NEW.user_id, CURRENT_DATE);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update analytics cache when calls are inserted or updated
CREATE TRIGGER trigger_calls_update_analytics_cache
    AFTER INSERT OR UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_call_analytics_cache();

-- Function to batch calculate analytics for all users for a specific date
CREATE OR REPLACE FUNCTION batch_calculate_call_analytics(
    target_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    processed_count INTEGER := 0;
BEGIN
    -- Calculate analytics for all active users
    FOR user_record IN 
        SELECT DISTINCT u.id 
        FROM users u 
        WHERE u.is_active = true
    LOOP
        PERFORM calculate_daily_call_analytics(user_record.id, target_date);
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for easy access to recent analytics
CREATE VIEW recent_call_analytics AS
SELECT 
    cac.*,
    u.email as user_email,
    u.name as user_name
FROM call_analytics_cache cac
JOIN users u ON cac.user_id = u.id
WHERE cac.date_period >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY cac.user_id, cac.date_period DESC;