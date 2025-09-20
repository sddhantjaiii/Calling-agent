-- Add CTA metric columns to agent_analytics table
-- This migration adds individual CTA tracking columns for better analytics performance

-- Add CTA metric columns to agent_analytics table
ALTER TABLE agent_analytics 
ADD COLUMN cta_pricing_clicks INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN cta_demo_clicks INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN cta_followup_clicks INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN cta_sample_clicks INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN cta_human_escalations INTEGER DEFAULT 0 NOT NULL;

-- Add computed CTA metrics columns for rates and totals
ALTER TABLE agent_analytics
ADD COLUMN total_cta_interactions INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN cta_conversion_rate DECIMAL(5,2) DEFAULT 0 NOT NULL; -- Percentage of calls with any CTA interaction

-- Create indexes for efficient CTA analytics queries
CREATE INDEX idx_agent_analytics_cta_pricing ON agent_analytics(cta_pricing_clicks) WHERE cta_pricing_clicks > 0;
CREATE INDEX idx_agent_analytics_cta_demo ON agent_analytics(cta_demo_clicks) WHERE cta_demo_clicks > 0;
CREATE INDEX idx_agent_analytics_cta_followup ON agent_analytics(cta_followup_clicks) WHERE cta_followup_clicks > 0;
CREATE INDEX idx_agent_analytics_cta_sample ON agent_analytics(cta_sample_clicks) WHERE cta_sample_clicks > 0;
CREATE INDEX idx_agent_analytics_cta_human ON agent_analytics(cta_human_escalations) WHERE cta_human_escalations > 0;
CREATE INDEX idx_agent_analytics_total_cta ON agent_analytics(total_cta_interactions) WHERE total_cta_interactions > 0;

-- Create composite indexes for common CTA analytics queries
CREATE INDEX idx_agent_analytics_agent_date_cta ON agent_analytics(agent_id, date, total_cta_interactions);
CREATE INDEX idx_agent_analytics_user_date_cta ON agent_analytics(user_id, date, total_cta_interactions);

-- Update the agent_performance_summary view to include CTA metrics
DROP VIEW IF EXISTS agent_performance_summary;

CREATE VIEW agent_performance_summary AS
SELECT 
    a.id as agent_id,
    a.name as agent_name,
    a.user_id,
    
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
    COALESCE(total.cta_human_escalations, 0) as total_human_escalations

FROM agents a
LEFT JOIN (
    SELECT 
        agent_id,
        SUM(total_calls) as total_calls,
        SUM(successful_calls) as successful_calls,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(successful_calls)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as success_rate,
        SUM(leads_generated) as leads_generated,
        SUM(total_cta_interactions) as total_cta_interactions,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(total_cta_interactions)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as cta_conversion_rate
    FROM agent_analytics 
    WHERE date = CURRENT_DATE AND hour IS NULL
    GROUP BY agent_id
) today ON a.id = today.agent_id
LEFT JOIN (
    SELECT 
        agent_id,
        SUM(total_calls) as total_calls,
        SUM(successful_calls) as successful_calls,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(successful_calls)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as success_rate,
        SUM(leads_generated) as leads_generated,
        CASE WHEN SUM(leads_generated) > 0 THEN (SUM(qualified_leads)::DECIMAL / SUM(leads_generated) * 100) ELSE 0 END as conversion_rate,
        SUM(total_cta_interactions) as total_cta_interactions,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(total_cta_interactions)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as cta_conversion_rate
    FROM agent_analytics 
    WHERE date >= DATE_TRUNC('month', CURRENT_DATE) AND hour IS NULL
    GROUP BY agent_id
) month ON a.id = month.agent_id
LEFT JOIN (
    SELECT 
        agent_id,
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
    FROM agent_analytics 
    WHERE hour IS NULL
    GROUP BY agent_id
) total ON a.id = total.agent_id
WHERE a.is_active = true;

-- Create a function to update CTA totals when individual CTA columns are updated
CREATE OR REPLACE FUNCTION update_agent_analytics_cta_totals()
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
        NEW.cta_conversion_rate = (NEW.total_cta_interactions::DECIMAL / NEW.total_calls * 100);
    ELSE
        NEW.cta_conversion_rate = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update CTA totals
CREATE TRIGGER trigger_update_agent_analytics_cta_totals
    BEFORE INSERT OR UPDATE ON agent_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_analytics_cta_totals();

-- Add comments to document the new columns
COMMENT ON COLUMN agent_analytics.cta_pricing_clicks IS 'Number of pricing CTA interactions for this agent in the time period';
COMMENT ON COLUMN agent_analytics.cta_demo_clicks IS 'Number of demo request CTA interactions for this agent in the time period';
COMMENT ON COLUMN agent_analytics.cta_followup_clicks IS 'Number of follow-up CTA interactions for this agent in the time period';
COMMENT ON COLUMN agent_analytics.cta_sample_clicks IS 'Number of sample request CTA interactions for this agent in the time period';
COMMENT ON COLUMN agent_analytics.cta_human_escalations IS 'Number of human escalation CTA interactions for this agent in the time period';
COMMENT ON COLUMN agent_analytics.total_cta_interactions IS 'Total number of CTA interactions (automatically calculated)';
COMMENT ON COLUMN agent_analytics.cta_conversion_rate IS 'Percentage of calls that resulted in any CTA interaction (automatically calculated)';