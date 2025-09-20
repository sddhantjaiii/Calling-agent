-- Add trigger to update agent_analytics CTA metrics from lead_analytics
-- This migration creates a trigger that automatically updates agent analytics
-- with CTA metrics whenever lead analytics data is inserted or updated

-- Create or replace function to update agent analytics from lead analytics CTA data
CREATE OR REPLACE FUNCTION update_agent_analytics_from_lead_cta()
RETURNS TRIGGER AS $$
DECLARE
    call_record RECORD;
    analytics_date DATE;
    analytics_hour INTEGER;
BEGIN
    -- Get call information to determine agent_id and user_id
    SELECT c.agent_id, c.user_id, c.created_at
    INTO call_record
    FROM calls c
    WHERE c.id = NEW.call_id;
    
    -- Skip if call not found
    IF call_record IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Determine date and hour for analytics aggregation
    analytics_date := DATE(call_record.created_at);
    analytics_hour := EXTRACT(hour FROM call_record.created_at);
    
    -- Update hourly agent analytics with CTA metrics
    INSERT INTO agent_analytics (
        agent_id, user_id, date, hour,
        total_calls, successful_calls, leads_generated,
        cta_pricing_clicks, cta_demo_clicks, cta_followup_clicks,
        cta_sample_clicks, cta_human_escalations
    )
    VALUES (
        call_record.agent_id, call_record.user_id, analytics_date, analytics_hour,
        0, 0, 1, -- This is a lead analytics record, so count as 1 lead generated
        CASE WHEN NEW.cta_pricing_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_demo_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_followup_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_sample_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_escalated_to_human THEN 1 ELSE 0 END
    )
    ON CONFLICT (agent_id, date, hour)
    DO UPDATE SET
        leads_generated = agent_analytics.leads_generated + 1,
        cta_pricing_clicks = agent_analytics.cta_pricing_clicks + 
            CASE WHEN NEW.cta_pricing_clicked THEN 1 ELSE 0 END,
        cta_demo_clicks = agent_analytics.cta_demo_clicks + 
            CASE WHEN NEW.cta_demo_clicked THEN 1 ELSE 0 END,
        cta_followup_clicks = agent_analytics.cta_followup_clicks + 
            CASE WHEN NEW.cta_followup_clicked THEN 1 ELSE 0 END,
        cta_sample_clicks = agent_analytics.cta_sample_clicks + 
            CASE WHEN NEW.cta_sample_clicked THEN 1 ELSE 0 END,
        cta_human_escalations = agent_analytics.cta_human_escalations + 
            CASE WHEN NEW.cta_escalated_to_human THEN 1 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Update daily agent analytics with CTA metrics (hour = NULL for daily aggregates)
    INSERT INTO agent_analytics (
        agent_id, user_id, date, hour,
        total_calls, successful_calls, leads_generated,
        cta_pricing_clicks, cta_demo_clicks, cta_followup_clicks,
        cta_sample_clicks, cta_human_escalations
    )
    VALUES (
        call_record.agent_id, call_record.user_id, analytics_date, NULL,
        0, 0, 1, -- This is a lead analytics record, so count as 1 lead generated
        CASE WHEN NEW.cta_pricing_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_demo_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_followup_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_sample_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_escalated_to_human THEN 1 ELSE 0 END
    )
    ON CONFLICT (agent_id, date, hour)
    DO UPDATE SET
        leads_generated = agent_analytics.leads_generated + 1,
        cta_pricing_clicks = agent_analytics.cta_pricing_clicks + 
            CASE WHEN NEW.cta_pricing_clicked THEN 1 ELSE 0 END,
        cta_demo_clicks = agent_analytics.cta_demo_clicks + 
            CASE WHEN NEW.cta_demo_clicked THEN 1 ELSE 0 END,
        cta_followup_clicks = agent_analytics.cta_followup_clicks + 
            CASE WHEN NEW.cta_followup_clicked THEN 1 ELSE 0 END,
        cta_sample_clicks = agent_analytics.cta_sample_clicks + 
            CASE WHEN NEW.cta_sample_clicked THEN 1 ELSE 0 END,
        cta_human_escalations = agent_analytics.cta_human_escalations + 
            CASE WHEN NEW.cta_escalated_to_human THEN 1 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update agent analytics when lead analytics CTA data is inserted
CREATE TRIGGER trigger_update_agent_analytics_from_lead_cta
    AFTER INSERT ON lead_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_analytics_from_lead_cta();

-- Create trigger to handle updates to lead analytics CTA data
-- Note: This handles the case where CTA data might be updated after initial insert
CREATE OR REPLACE FUNCTION handle_lead_analytics_cta_update()
RETURNS TRIGGER AS $$
DECLARE
    call_record RECORD;
    analytics_date DATE;
    analytics_hour INTEGER;
    pricing_diff INTEGER;
    demo_diff INTEGER;
    followup_diff INTEGER;
    sample_diff INTEGER;
    human_diff INTEGER;
BEGIN
    -- Get call information
    SELECT c.agent_id, c.user_id, c.created_at
    INTO call_record
    FROM calls c
    WHERE c.id = NEW.call_id;
    
    -- Skip if call not found
    IF call_record IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calculate differences in CTA interactions
    pricing_diff := CASE WHEN NEW.cta_pricing_clicked THEN 1 ELSE 0 END - 
                   CASE WHEN OLD.cta_pricing_clicked THEN 1 ELSE 0 END;
    demo_diff := CASE WHEN NEW.cta_demo_clicked THEN 1 ELSE 0 END - 
                CASE WHEN OLD.cta_demo_clicked THEN 1 ELSE 0 END;
    followup_diff := CASE WHEN NEW.cta_followup_clicked THEN 1 ELSE 0 END - 
                    CASE WHEN OLD.cta_followup_clicked THEN 1 ELSE 0 END;
    sample_diff := CASE WHEN NEW.cta_sample_clicked THEN 1 ELSE 0 END - 
                  CASE WHEN OLD.cta_sample_clicked THEN 1 ELSE 0 END;
    human_diff := CASE WHEN NEW.cta_escalated_to_human THEN 1 ELSE 0 END - 
                 CASE WHEN OLD.cta_escalated_to_human THEN 1 ELSE 0 END;
    
    -- Only update if there are actual changes
    IF pricing_diff != 0 OR demo_diff != 0 OR followup_diff != 0 OR sample_diff != 0 OR human_diff != 0 THEN
        analytics_date := DATE(call_record.created_at);
        analytics_hour := EXTRACT(hour FROM call_record.created_at);
        
        -- Update hourly analytics
        UPDATE agent_analytics 
        SET 
            cta_pricing_clicks = cta_pricing_clicks + pricing_diff,
            cta_demo_clicks = cta_demo_clicks + demo_diff,
            cta_followup_clicks = cta_followup_clicks + followup_diff,
            cta_sample_clicks = cta_sample_clicks + sample_diff,
            cta_human_escalations = cta_human_escalations + human_diff,
            updated_at = CURRENT_TIMESTAMP
        WHERE agent_id = call_record.agent_id 
          AND date = analytics_date 
          AND hour = analytics_hour;
        
        -- Update daily analytics
        UPDATE agent_analytics 
        SET 
            cta_pricing_clicks = cta_pricing_clicks + pricing_diff,
            cta_demo_clicks = cta_demo_clicks + demo_diff,
            cta_followup_clicks = cta_followup_clicks + followup_diff,
            cta_sample_clicks = cta_sample_clicks + sample_diff,
            cta_human_escalations = cta_human_escalations + human_diff,
            updated_at = CURRENT_TIMESTAMP
        WHERE agent_id = call_record.agent_id 
          AND date = analytics_date 
          AND hour IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updates
CREATE TRIGGER trigger_handle_lead_analytics_cta_update
    AFTER UPDATE ON lead_analytics
    FOR EACH ROW
    EXECUTE FUNCTION handle_lead_analytics_cta_update();

-- Add comments to document the triggers
COMMENT ON FUNCTION update_agent_analytics_from_lead_cta() IS 
'Trigger function that updates agent_analytics CTA metrics when new lead_analytics records are inserted';

COMMENT ON FUNCTION handle_lead_analytics_cta_update() IS 
'Trigger function that updates agent_analytics CTA metrics when lead_analytics CTA data is modified';

-- Log the migration completion
INSERT INTO system_config (config_key, config_value, description, updated_by)
VALUES (
  'migration_025_completed_at',
  CURRENT_TIMESTAMP::TEXT,
  'Timestamp when migration 025 (add lead to agent analytics CTA trigger) was completed',
  NULL
) ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = CURRENT_TIMESTAMP;

-- Verify trigger creation
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    -- Check if triggers were created
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name IN (
        'trigger_update_agent_analytics_from_lead_cta',
        'trigger_handle_lead_analytics_cta_update'
    );
    
    IF trigger_count = 2 THEN
        RAISE NOTICE 'Migration 025 completed successfully: CTA triggers created for agent_analytics updates';
    ELSE
        RAISE EXCEPTION 'Migration 025 failed: Expected 2 triggers, found %', trigger_count;
    END IF;
END $$;