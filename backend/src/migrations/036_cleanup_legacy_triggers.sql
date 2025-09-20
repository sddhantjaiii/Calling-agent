-- Migration 036: Cleanup lingering legacy triggers per live CSV
-- Goal: Keep only minimal daily triggers (trg_calls_daily_analytics, trg_leads_daily_analytics, trg_user_daily_rollup)
-- and essential housekeeping (updated_at, session last-used, customer reference). Drop everything else lingering.

BEGIN;

-- Drop legacy analytics triggers still present
DROP TRIGGER IF EXISTS trigger_update_agent_analytics_cta_totals ON agent_analytics;
DROP TRIGGER IF EXISTS trigger_update_agent_scores_from_lead_analytics ON lead_analytics;
DROP TRIGGER IF EXISTS trigger_update_user_kpis_on_agent_insert ON agent_analytics;
DROP TRIGGER IF EXISTS trigger_update_user_kpis_on_agent_update ON agent_analytics;

-- OPTIONAL: If these functions exist but are no longer referenced, drop them
DROP FUNCTION IF EXISTS update_agent_analytics_cta_totals() CASCADE;
DROP FUNCTION IF EXISTS update_agent_scores_from_lead_analytics_enhanced() CASCADE;
DROP FUNCTION IF EXISTS update_user_kpis_from_agent_analytics() CASCADE;

-- Sanity: ensure minimal triggers exist (no-op if already created by 035)
CREATE OR REPLACE FUNCTION trg_calls_daily_analytics()
RETURNS TRIGGER AS $$
DECLARE _date DATE; BEGIN
  _date := DATE(NEW.created_at);
  PERFORM recompute_agent_daily_from_calls(NEW.agent_id, NEW.user_id, _date);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_leads_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recompute_agent_daily_from_leads(NEW.call_id);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_user_daily_rollup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hour IS NULL THEN
    PERFORM recompute_user_daily_from_agent(NEW.user_id, NEW.date);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calls_daily_analytics ON calls;
CREATE TRIGGER trg_calls_daily_analytics
AFTER INSERT OR UPDATE ON calls
FOR EACH ROW EXECUTE FUNCTION trg_calls_daily_analytics();

DROP TRIGGER IF EXISTS trg_leads_daily_analytics ON lead_analytics;
CREATE TRIGGER trg_leads_daily_analytics
AFTER INSERT OR UPDATE ON lead_analytics
FOR EACH ROW EXECUTE FUNCTION trg_leads_daily_analytics();

DROP TRIGGER IF EXISTS trg_user_daily_rollup ON agent_analytics;
CREATE TRIGGER trg_user_daily_rollup
AFTER INSERT OR UPDATE ON agent_analytics
FOR EACH ROW EXECUTE FUNCTION trg_user_daily_rollup();

COMMIT;
