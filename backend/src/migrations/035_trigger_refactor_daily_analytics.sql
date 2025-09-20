-- Migration 035: Trigger refactor to daily analytics only (no background jobs)
-- - Drop legacy nested/notify/cache/KPI triggers
-- - Add minimal deterministic recompute functions
-- - Add minimal AFTER triggers on calls, lead_analytics, agent_analytics (daily only)
-- - Add helpful indexes (IF NOT EXISTS)

BEGIN;

-- 1) DROP LEGACY TRIGGERS (safe if not present)
-- Cache invalidation / notify
DROP TRIGGER IF EXISTS cache_invalidation_users ON users;
DROP TRIGGER IF EXISTS cache_invalidation_agents ON agents;
DROP TRIGGER IF EXISTS cache_invalidation_calls ON calls;
DROP TRIGGER IF EXISTS cache_invalidation_credit_transactions ON credit_transactions;
DROP TRIGGER IF EXISTS cache_invalidation_lead_analytics ON lead_analytics;
DROP TRIGGER IF EXISTS cache_invalidation_agent_analytics ON agent_analytics;

-- Dashboard cache triggers
DROP TRIGGER IF EXISTS trigger_update_dashboard_cache_on_agent_insert ON agent_analytics;
DROP TRIGGER IF EXISTS trigger_update_dashboard_cache_on_agent_update ON agent_analytics;
DROP TRIGGER IF EXISTS trigger_calls_update_analytics_cache ON calls;

-- KPI refresh notify triggers
DROP TRIGGER IF EXISTS trigger_refresh_kpi_on_calls_change ON calls;
DROP TRIGGER IF EXISTS trigger_refresh_kpi_on_lead_analytics_change ON lead_analytics;
DROP TRIGGER IF EXISTS trigger_refresh_kpi_on_agents_change ON agents;
DROP TRIGGER IF EXISTS trigger_refresh_kpi_on_agent_analytics_change ON agent_analytics;

-- Analytics cascade triggers
DROP TRIGGER IF EXISTS trigger_update_user_analytics_from_agent_analytics ON agent_analytics;
DROP TRIGGER IF EXISTS trigger_update_user_analytics_cta_totals ON user_analytics;
DROP TRIGGER IF EXISTS trigger_handle_lead_analytics_cta_update ON lead_analytics;
DROP TRIGGER IF EXISTS trigger_update_agent_analytics_from_lead_cta ON lead_analytics;
-- Note: Some repos use different names for call→agent_analytics; best-effort:
DROP TRIGGER IF EXISTS trigger_update_agent_analytics_from_call ON calls;

-- 1b) DROP LEGACY FUNCTIONS (safe no-ops if missing)
DROP FUNCTION IF EXISTS notify_cache_invalidation();
DROP FUNCTION IF EXISTS trigger_update_call_analytics_cache();
DROP FUNCTION IF EXISTS update_agent_analytics_from_call();
DROP FUNCTION IF EXISTS update_agent_analytics_from_lead_cta();
DROP FUNCTION IF EXISTS handle_lead_analytics_cta_update();
DROP FUNCTION IF EXISTS update_user_analytics_from_agent_analytics();
DROP FUNCTION IF EXISTS update_user_analytics_cta_totals();

-- 2) INDEXES (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_calls_user_agent_created_status
ON calls(user_id, agent_id, created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_lead_analytics_call_user
ON lead_analytics(call_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_analytics_unique_daily
ON agent_analytics(agent_id, date, hour);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_analytics_unique_daily
ON user_analytics(user_id, date, hour);

-- 3) RECOMPUTE FUNCTIONS (DAILY ONLY)

-- 3.1) From calls → daily agent_analytics
CREATE OR REPLACE FUNCTION recompute_agent_daily_from_calls(
  _agent_id UUID,
  _user_id UUID,
  _date DATE
) RETURNS void AS $$
BEGIN
  INSERT INTO agent_analytics AS aa (
    agent_id, user_id, date, hour,
    total_calls, successful_calls, failed_calls,
    total_duration_minutes, avg_duration_minutes, credits_used
  )
  SELECT
    _agent_id,
    _user_id,
    _date,
    NULL,
    COUNT(*) FILTER (WHERE DATE(c.created_at) = _date) AS total_calls,
    COUNT(*) FILTER (WHERE DATE(c.created_at) = _date AND c.status = 'completed') AS successful_calls,
    COUNT(*) FILTER (WHERE DATE(c.created_at) = _date AND c.status = 'failed') AS failed_calls,
    COALESCE(SUM(c.duration_minutes) FILTER (WHERE DATE(c.created_at) = _date), 0) AS total_duration_minutes,
    CASE WHEN COUNT(*) FILTER (WHERE DATE(c.created_at) = _date) > 0
         THEN (COALESCE(SUM(c.duration_minutes) FILTER (WHERE DATE(c.created_at) = _date), 0)::DECIMAL
               / NULLIF(COUNT(*) FILTER (WHERE DATE(c.created_at) = _date), 0))
         ELSE 0 END AS avg_duration_minutes,
    COALESCE(SUM(c.credits_used) FILTER (WHERE DATE(c.created_at) = _date), 0) AS credits_used
  FROM calls c
  WHERE c.agent_id = _agent_id AND c.user_id = _user_id AND DATE(c.created_at) = _date
  GROUP BY _agent_id, _user_id, _date
  ON CONFLICT (agent_id, date, hour)
  DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    successful_calls = EXCLUDED.successful_calls,
    failed_calls = EXCLUDED.failed_calls,
    total_duration_minutes = EXCLUDED.total_duration_minutes,
    avg_duration_minutes = EXCLUDED.avg_duration_minutes,
    credits_used = EXCLUDED.credits_used,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 3.2) From lead_analytics (+calls) → daily agent_analytics
CREATE OR REPLACE FUNCTION recompute_agent_daily_from_leads(
  _call_id UUID
) RETURNS void AS $$
DECLARE
  _agent UUID;
  _user UUID;
  _date DATE;
BEGIN
  SELECT c.agent_id, c.user_id, DATE(c.created_at)
  INTO _agent, _user, _date
  FROM calls c
  WHERE c.id = _call_id;

  IF _agent IS NULL OR _user IS NULL OR _date IS NULL THEN
    RETURN;
  END IF;

  WITH agg AS (
    SELECT 
      _agent AS agent_id,
      _user AS user_id,
      _date AS date,
      COUNT(*) AS leads_generated,
      COUNT(*) FILTER (WHERE l.total_score >= 70) AS qualified_leads,
      COUNT(*) FILTER (WHERE l.cta_pricing_clicked) AS cta_pricing_clicks,
      COUNT(*) FILTER (WHERE l.cta_demo_clicked) AS cta_demo_clicks,
      COUNT(*) FILTER (WHERE l.cta_followup_clicked) AS cta_followup_clicks,
      COUNT(*) FILTER (WHERE l.cta_sample_clicked) AS cta_sample_clicks,
      COUNT(*) FILTER (WHERE l.cta_escalated_to_human) AS cta_human_escalations,
      AVG(l.intent_score) AS avg_intent_score,
      AVG(l.urgency_score) AS avg_urgency_score,
      AVG(l.budget_score) AS avg_budget_score,
      AVG(l.fit_score) AS avg_fit_score,
      AVG(l.engagement_score) AS avg_engagement_score,
      AVG(l.total_score) AS avg_total_score
    FROM lead_analytics l
    JOIN calls c2 ON c2.id = l.call_id
    WHERE c2.agent_id = _agent AND l.user_id = _user AND DATE(c2.created_at) = _date
  )
  INSERT INTO agent_analytics AS aa (
    agent_id, user_id, date, hour,
    leads_generated, qualified_leads,
    cta_pricing_clicks, cta_demo_clicks, cta_followup_clicks, cta_sample_clicks, cta_human_escalations,
    total_cta_interactions, cta_conversion_rate,
    avg_intent_score, avg_urgency_score, avg_budget_score, avg_fit_score, avg_engagement_score, avg_total_score
  )
  SELECT
    agent_id, user_id, date, NULL,
    leads_generated, qualified_leads,
    cta_pricing_clicks, cta_demo_clicks, cta_followup_clicks, cta_sample_clicks, cta_human_escalations,
    (cta_pricing_clicks + cta_demo_clicks + cta_followup_clicks + cta_sample_clicks + cta_human_escalations) AS total_cta_interactions,
    CASE WHEN leads_generated > 0
         THEN ((cta_pricing_clicks + cta_demo_clicks + cta_followup_clicks + cta_sample_clicks + cta_human_escalations)::DECIMAL / leads_generated) * 100
         ELSE 0 END AS cta_conversion_rate,
    avg_intent_score, avg_urgency_score, avg_budget_score, avg_fit_score, avg_engagement_score, avg_total_score
  FROM agg
  ON CONFLICT (agent_id, date, hour)
  DO UPDATE SET
    leads_generated = EXCLUDED.leads_generated,
    qualified_leads = EXCLUDED.qualified_leads,
    cta_pricing_clicks = EXCLUDED.cta_pricing_clicks,
    cta_demo_clicks = EXCLUDED.cta_demo_clicks,
    cta_followup_clicks = EXCLUDED.cta_followup_clicks,
    cta_sample_clicks = EXCLUDED.cta_sample_clicks,
    cta_human_escalations = EXCLUDED.cta_human_escalations,
    total_cta_interactions = EXCLUDED.total_cta_interactions,
    cta_conversion_rate = EXCLUDED.cta_conversion_rate,
    avg_intent_score = EXCLUDED.avg_intent_score,
    avg_urgency_score = EXCLUDED.avg_urgency_score,
    avg_budget_score = EXCLUDED.avg_budget_score,
    avg_fit_score = EXCLUDED.avg_fit_score,
    avg_engagement_score = EXCLUDED.avg_engagement_score,
    avg_total_score = EXCLUDED.avg_total_score,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 3.3) From agent_analytics daily → user_analytics daily
CREATE OR REPLACE FUNCTION recompute_user_daily_from_agent(
  _user_id UUID,
  _date DATE
) RETURNS void AS $$
BEGIN
  INSERT INTO user_analytics AS ua (
    user_id, date, hour,
    total_calls, successful_calls, failed_calls,
    total_duration_minutes, avg_duration_minutes,
    leads_generated, qualified_leads,
    cta_pricing_clicks, cta_demo_clicks, cta_followup_clicks, cta_sample_clicks, cta_human_escalations,
    total_cta_interactions, cta_conversion_rate, credits_used,
    success_rate, answer_rate
  )
  SELECT
    _user_id, _date, NULL,
    COALESCE(SUM(aa.total_calls), 0),
    COALESCE(SUM(aa.successful_calls), 0),
    COALESCE(SUM(aa.failed_calls), 0),
    COALESCE(SUM(aa.total_duration_minutes), 0),
    CASE WHEN SUM(aa.total_calls) > 0 THEN (SUM(aa.total_duration_minutes)::DECIMAL / SUM(aa.total_calls)) ELSE 0 END,
    COALESCE(SUM(aa.leads_generated), 0),
    COALESCE(SUM(aa.qualified_leads), 0),
    COALESCE(SUM(aa.cta_pricing_clicks), 0),
    COALESCE(SUM(aa.cta_demo_clicks), 0),
    COALESCE(SUM(aa.cta_followup_clicks), 0),
    COALESCE(SUM(aa.cta_sample_clicks), 0),
    COALESCE(SUM(aa.cta_human_escalations), 0),
    COALESCE(SUM(aa.total_cta_interactions), 0),
    CASE WHEN SUM(aa.leads_generated) > 0 THEN (SUM(aa.total_cta_interactions)::DECIMAL / SUM(aa.leads_generated) * 100) ELSE 0 END,
    COALESCE(SUM(aa.credits_used), 0),
    CASE WHEN SUM(aa.total_calls) > 0 THEN (SUM(aa.successful_calls)::DECIMAL / SUM(aa.total_calls) * 100) ELSE 0 END AS success_rate,
    CASE WHEN SUM(aa.total_calls) > 0 THEN ((SUM(aa.successful_calls) + SUM(aa.failed_calls))::DECIMAL / SUM(aa.total_calls) * 100) ELSE 0 END AS answer_rate
  FROM agent_analytics aa
  WHERE aa.user_id = _user_id AND aa.date = _date AND aa.hour IS NULL
  GROUP BY _user_id, _date
  ON CONFLICT (user_id, date, hour)
  DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    successful_calls = EXCLUDED.successful_calls,
    failed_calls = EXCLUDED.failed_calls,
    total_duration_minutes = EXCLUDED.total_duration_minutes,
    avg_duration_minutes = EXCLUDED.avg_duration_minutes,
    leads_generated = EXCLUDED.leads_generated,
    qualified_leads = EXCLUDED.qualified_leads,
    cta_pricing_clicks = EXCLUDED.cta_pricing_clicks,
    cta_demo_clicks = EXCLUDED.cta_demo_clicks,
    cta_followup_clicks = EXCLUDED.cta_followup_clicks,
    cta_sample_clicks = EXCLUDED.cta_sample_clicks,
    cta_human_escalations = EXCLUDED.cta_human_escalations,
    total_cta_interactions = EXCLUDED.total_cta_interactions,
    cta_conversion_rate = EXCLUDED.cta_conversion_rate,
    credits_used = EXCLUDED.credits_used,
    success_rate = EXCLUDED.success_rate,
    answer_rate = EXCLUDED.answer_rate,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 4) WRAPPER TRIGGER FUNCTIONS

-- 4.1) calls -> daily
CREATE OR REPLACE FUNCTION trg_calls_daily_analytics()
RETURNS TRIGGER AS $$
DECLARE
  _date DATE;
BEGIN
  _date := DATE(NEW.created_at);
  PERFORM recompute_agent_daily_from_calls(NEW.agent_id, NEW.user_id, _date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2) lead_analytics -> daily (via call_id)
CREATE OR REPLACE FUNCTION trg_leads_daily_analytics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recompute_agent_daily_from_leads(NEW.call_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.3) agent_analytics daily -> user_analytics daily
CREATE OR REPLACE FUNCTION trg_user_daily_rollup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hour IS NULL THEN
    PERFORM recompute_user_daily_from_agent(NEW.user_id, NEW.date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) CREATE TRIGGERS
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
