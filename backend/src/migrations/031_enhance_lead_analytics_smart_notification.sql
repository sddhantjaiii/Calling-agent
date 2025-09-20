-- Migration 031: Enhance Lead Analytics for Smart Notification and Meeting Booking
-- Add smart notification and demo booking columns to lead_analytics table

-- Add new columns for enhanced lead analytics
ALTER TABLE lead_analytics 
ADD COLUMN smart_notification VARCHAR(255),
ADD COLUMN demo_book_datetime TIMESTAMP WITH TIME ZONE;

-- Create index for smart notifications (for filtering/searching)
CREATE INDEX IF NOT EXISTS idx_lead_analytics_smart_notification 
ON lead_analytics(smart_notification) 
WHERE smart_notification IS NOT NULL;

-- Create index for demo bookings (for scheduling queries)
CREATE INDEX IF NOT EXISTS idx_lead_analytics_demo_booking 
ON lead_analytics(demo_book_datetime) 
WHERE demo_book_datetime IS NOT NULL;

-- Update trigger function to handle new columns in analytics calculations
-- This ensures the trigger system properly processes the new fields
CREATE OR REPLACE FUNCTION update_agent_scores_from_lead_analytics_enhanced()
RETURNS TRIGGER AS $$
BEGIN
    -- Update agent analytics with enhanced lead data including smart notifications
    INSERT INTO agent_analytics (
        agent_id, user_id, date, hour,
        total_calls, successful_calls, failed_calls,
        total_duration_minutes, avg_duration_minutes,
        leads_generated, qualified_leads,
        cta_pricing_clicks, cta_demo_clicks, cta_followup_clicks, 
        cta_sample_clicks, cta_human_escalations,
        total_cta_interactions, cta_conversion_rate,
        conversion_rate, credits_used,
        avg_intent_score, avg_urgency_score, avg_budget_score,
        avg_fit_score, avg_engagement_score, avg_total_score,
        created_at, updated_at
    )
    SELECT 
        c.agent_id,
        c.user_id,
        DATE(c.created_at),
        EXTRACT(HOUR FROM c.created_at)::INTEGER,
        1 as total_calls,
        CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END as successful_calls,
        CASE WHEN c.status = 'failed' THEN 1 ELSE 0 END as failed_calls,
        COALESCE(c.duration_minutes, 0) as total_duration_minutes,
        COALESCE(c.duration_minutes, 0)::DECIMAL as avg_duration_minutes,
        1 as leads_generated,
        CASE WHEN NEW.total_score >= 60 THEN 1 ELSE 0 END as qualified_leads,
        CASE WHEN NEW.cta_pricing_clicked THEN 1 ELSE 0 END as cta_pricing_clicks,
        CASE WHEN NEW.cta_demo_clicked THEN 1 ELSE 0 END as cta_demo_clicks,
        CASE WHEN NEW.cta_followup_clicked THEN 1 ELSE 0 END as cta_followup_clicks,
        CASE WHEN NEW.cta_sample_clicked THEN 1 ELSE 0 END as cta_sample_clicks,
        CASE WHEN NEW.cta_escalated_to_human THEN 1 ELSE 0 END as cta_human_escalations,
        (CASE WHEN NEW.cta_pricing_clicked THEN 1 ELSE 0 END +
         CASE WHEN NEW.cta_demo_clicked THEN 1 ELSE 0 END +
         CASE WHEN NEW.cta_followup_clicked THEN 1 ELSE 0 END +
         CASE WHEN NEW.cta_sample_clicked THEN 1 ELSE 0 END +
         CASE WHEN NEW.cta_escalated_to_human THEN 1 ELSE 0 END) as total_cta_interactions,
        CASE WHEN (NEW.cta_pricing_clicked OR NEW.cta_demo_clicked OR NEW.cta_followup_clicked OR 
                   NEW.cta_sample_clicked OR NEW.cta_escalated_to_human) THEN 100.0 ELSE 0.0 END as cta_conversion_rate,
        CASE WHEN NEW.total_score >= 60 THEN 100.0 ELSE 0.0 END as conversion_rate,
        COALESCE(c.credits_used, 0) as credits_used,
        COALESCE(NEW.intent_score, 0) as avg_intent_score,
        COALESCE(NEW.urgency_score, 0) as avg_urgency_score,
        COALESCE(NEW.budget_score, 0) as avg_budget_score,
        COALESCE(NEW.fit_score, 0) as avg_fit_score,
        COALESCE(NEW.engagement_score, 0) as avg_engagement_score,
        COALESCE(NEW.total_score, 0) as avg_total_score,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM calls c
    WHERE c.id = NEW.call_id
    ON CONFLICT (agent_id, date, hour)
    DO UPDATE SET
        leads_generated = agent_analytics.leads_generated + 1,
        qualified_leads = agent_analytics.qualified_leads + EXCLUDED.qualified_leads,
        cta_pricing_clicks = agent_analytics.cta_pricing_clicks + EXCLUDED.cta_pricing_clicks,
        cta_demo_clicks = agent_analytics.cta_demo_clicks + EXCLUDED.cta_demo_clicks,
        cta_followup_clicks = agent_analytics.cta_followup_clicks + EXCLUDED.cta_followup_clicks,
        cta_sample_clicks = agent_analytics.cta_sample_clicks + EXCLUDED.cta_sample_clicks,
        cta_human_escalations = agent_analytics.cta_human_escalations + EXCLUDED.cta_human_escalations,
        total_cta_interactions = agent_analytics.total_cta_interactions + EXCLUDED.total_cta_interactions,
        cta_conversion_rate = CASE 
            WHEN agent_analytics.leads_generated + 1 > 0 
            THEN ((agent_analytics.cta_pricing_clicks + EXCLUDED.cta_pricing_clicks + 
                   agent_analytics.cta_demo_clicks + EXCLUDED.cta_demo_clicks + 
                   agent_analytics.cta_followup_clicks + EXCLUDED.cta_followup_clicks + 
                   agent_analytics.cta_sample_clicks + EXCLUDED.cta_sample_clicks + 
                   agent_analytics.cta_human_escalations + EXCLUDED.cta_human_escalations) * 100.0) 
                 / (agent_analytics.leads_generated + 1)
            ELSE 0.0 
        END,
        conversion_rate = CASE 
            WHEN agent_analytics.leads_generated + 1 > 0 
            THEN ((agent_analytics.qualified_leads + EXCLUDED.qualified_leads) * 100.0) / (agent_analytics.leads_generated + 1)
            ELSE 0.0 
        END,
        avg_intent_score = ((agent_analytics.avg_intent_score * agent_analytics.leads_generated) + EXCLUDED.avg_intent_score) / (agent_analytics.leads_generated + 1),
        avg_urgency_score = ((agent_analytics.avg_urgency_score * agent_analytics.leads_generated) + EXCLUDED.avg_urgency_score) / (agent_analytics.leads_generated + 1),
        avg_budget_score = ((agent_analytics.avg_budget_score * agent_analytics.leads_generated) + EXCLUDED.avg_budget_score) / (agent_analytics.leads_generated + 1),
        avg_fit_score = ((agent_analytics.avg_fit_score * agent_analytics.leads_generated) + EXCLUDED.avg_fit_score) / (agent_analytics.leads_generated + 1),
        avg_engagement_score = ((agent_analytics.avg_engagement_score * agent_analytics.leads_generated) + EXCLUDED.avg_engagement_score) / (agent_analytics.leads_generated + 1),
        avg_total_score = ((agent_analytics.avg_total_score * agent_analytics.leads_generated) + EXCLUDED.avg_total_score) / (agent_analytics.leads_generated + 1),
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger to use the enhanced function
DROP TRIGGER IF EXISTS trigger_update_agent_scores_from_lead_analytics ON lead_analytics;
CREATE TRIGGER trigger_update_agent_scores_from_lead_analytics
    AFTER INSERT ON lead_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_scores_from_lead_analytics_enhanced();

-- Add comment for documentation
COMMENT ON COLUMN lead_analytics.smart_notification IS 'Short 4-5 word summary of user interaction for notifications';
COMMENT ON COLUMN lead_analytics.demo_book_datetime IS 'Timezone-aware datetime when demo/meeting was scheduled';
