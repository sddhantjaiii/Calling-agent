-- Fix numeric overflow in agent analytics CTA totals function
-- This migration fixes the DECIMAL(5,2) overflow issue in agent CTA conversion rate calculations

-- Update the agent analytics CTA totals function to prevent numeric overflow
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
    -- Limit to 999.99 to prevent DECIMAL(5,2) overflow
    IF NEW.total_calls > 0 THEN
        NEW.cta_conversion_rate = LEAST(999.99, (NEW.total_cta_interactions::DECIMAL / NEW.total_calls * 100));
    ELSE
        NEW.cta_conversion_rate = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log the migration completion
INSERT INTO system_config (config_key, config_value, description, updated_by)
VALUES (
  'migration_028_completed_at',
  CURRENT_TIMESTAMP::TEXT,
  'Timestamp when migration 028 (fix agent analytics CTA overflow) was completed',
  NULL
) ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = CURRENT_TIMESTAMP;

-- Verify function update
DO $$
BEGIN
    -- Check if function exists
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'update_agent_analytics_cta_totals' 
        AND routine_type = 'FUNCTION'
    ) THEN
        RAISE NOTICE 'Migration 028 completed successfully: agent_analytics_cta_totals function updated with overflow protection';
    ELSE
        RAISE EXCEPTION 'Migration 028 failed: update_agent_analytics_cta_totals function not found';
    END IF;
END $$;