-- Fix analytics functions to remove ROUND function issues

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS trigger_calls_update_analytics_cache ON calls;
DROP FUNCTION IF EXISTS trigger_update_call_analytics_cache();
DROP FUNCTION IF EXISTS calculate_daily_call_analytics(UUID, DATE);
DROP FUNCTION IF EXISTS batch_calculate_call_analytics(DATE);

-- Recreate the calculate_daily_call_analytics function without ROUND issues
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
        total_calls, successful_calls, failed_calls, missed_calls, connection_rate,
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
        analytics_data.failed_calls, analytics_data.missed_calls, analytics_data.connection_rate,
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
        missed_calls = EXCLUDED.missed_calls,
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