CREATE OR REPLACE FUNCTION trg_calls_daily_analytics()
RETURNS TRIGGER AS $$
DECLARE
    call_date DATE;
BEGIN
    IF NEW.status = 'completed' THEN
        call_date := CAST(NEW.created_at AS DATE);

        -- Use UPSERT to avoid duplicate entries
        INSERT INTO agent_analytics (agent_id, user_id, date, total_calls, successful_calls, failed_calls, total_duration_minutes, credits_used)
        VALUES (NEW.agent_id, NEW.user_id, call_date, 1, 1, 0, NEW.duration_minutes, NEW.credits_used)
        ON CONFLICT (agent_id, user_id, date)
        DO UPDATE SET
            total_calls = agent_analytics.total_calls + 1,
            successful_calls = agent_analytics.successful_calls + 1,
            total_duration_minutes = agent_analytics.total_duration_minutes + NEW.duration_minutes,
            credits_used = agent_analytics.credits_used + NEW.credits_used,
            updated_at = NOW();
    END IF;

    IF NEW.status = 'failed' THEN
        call_date := CAST(NEW.created_at AS DATE);

        -- Use UPSERT to avoid duplicate entries
        INSERT INTO agent_analytics (agent_id, user_id, date, total_calls, successful_calls, failed_calls, total_duration_minutes, credits_used)
        VALUES (NEW.agent_id, NEW.user_id, call_date, 1, 0, 1, 0, 0)
        ON CONFLICT (agent_id, user_id, date)
        DO UPDATE SET
            total_calls = agent_analytics.total_calls + 1,
            failed_calls = agent_analytics.failed_calls + 1,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_leads_daily_analytics()
RETURNS TRIGGER AS $$
DECLARE
    call_rec RECORD;
BEGIN
    -- Get the call record associated with the lead analytics
    SELECT * INTO call_rec FROM calls WHERE id = NEW.call_id;

    -- Update agent_analytics with lead and CTA data
    UPDATE agent_analytics
    SET
        leads_generated = agent_analytics.leads_generated + 1,
        qualified_leads = agent_analytics.qualified_leads + (CASE WHEN NEW.total_score >= 70 THEN 1 ELSE 0 END),
        cta_pricing_clicks = agent_analytics.cta_pricing_clicks + (CASE WHEN NEW.cta_pricing_clicked THEN 1 ELSE 0 END),
        cta_demo_clicks = agent_analytics.cta_demo_clicks + (CASE WHEN NEW.cta_demo_clicked THEN 1 ELSE 0 END),
        cta_followup_clicks = agent_analytics.cta_followup_clicks + (CASE WHEN NEW.cta_followup_clicked THEN 1 ELSE 0 END),
        cta_sample_clicks = agent_analytics.cta_sample_clicks + (CASE WHEN NEW.cta_sample_clicked THEN 1 ELSE 0 END),
        cta_human_escalations = agent_analytics.cta_human_escalations + (CASE WHEN NEW.cta_escalated_to_human THEN 1 ELSE 0 END),
        updated_at = NOW()
    WHERE agent_id = call_rec.agent_id
      AND user_id = call_rec.user_id
      AND date = CAST(call_rec.created_at AS DATE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the old triggers first to avoid errors
DROP TRIGGER IF EXISTS trg_calls_daily_analytics ON calls;
DROP TRIGGER IF EXISTS trg_leads_daily_analytics ON lead_analytics;

-- Recreate the triggers to use the updated functions
CREATE TRIGGER trg_calls_daily_analytics
AFTER INSERT OR UPDATE ON calls
FOR EACH ROW
EXECUTE FUNCTION trg_calls_daily_analytics();

CREATE TRIGGER trg_leads_daily_analytics
AFTER INSERT ON lead_analytics
FOR EACH ROW
EXECUTE FUNCTION trg_leads_daily_analytics();
