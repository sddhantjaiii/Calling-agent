-- Migration 037: Backfill last 30 days daily analytics (agents and users)
-- This uses set-based UPSERTs to recompute daily rows without relying on procedural loops.

BEGIN;

-- 1) Backfill agent_analytics daily from calls (last 30 days)
INSERT INTO agent_analytics AS aa (
  agent_id, user_id, date, hour,
  total_calls, successful_calls, failed_calls,
  total_duration_minutes, avg_duration_minutes, credits_used,
  updated_at
)
SELECT
  c.agent_id,
  c.user_id,
  DATE(c.created_at) AS date,
  NULL AS hour,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE c.status = 'completed') AS successful_calls,
  COUNT(*) FILTER (WHERE c.status = 'failed') AS failed_calls,
  COALESCE(SUM(c.duration_minutes), 0) AS total_duration_minutes,
  CASE WHEN COUNT(*) > 0 THEN (COALESCE(SUM(c.duration_minutes), 0)::DECIMAL / COUNT(*)) ELSE 0 END AS avg_duration_minutes,
  COALESCE(SUM(c.credits_used), 0) AS credits_used,
  CURRENT_TIMESTAMP
FROM calls c
WHERE DATE(c.created_at) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.agent_id, c.user_id, DATE(c.created_at)
ON CONFLICT (agent_id, date, hour)
DO UPDATE SET
  total_calls = EXCLUDED.total_calls,
  successful_calls = EXCLUDED.successful_calls,
  failed_calls = EXCLUDED.failed_calls,
  total_duration_minutes = EXCLUDED.total_duration_minutes,
  avg_duration_minutes = EXCLUDED.avg_duration_minutes,
  credits_used = EXCLUDED.credits_used,
  updated_at = CURRENT_TIMESTAMP;

-- 2) Backfill agent_analytics daily from lead_analytics (CTA + scores) (last 30 days)
WITH lead_daily AS (
  SELECT 
    c.agent_id,
    l.user_id,
    DATE(c.created_at) AS date,
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
  JOIN calls c ON c.id = l.call_id
  WHERE DATE(c.created_at) >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY c.agent_id, l.user_id, DATE(c.created_at)
)
INSERT INTO agent_analytics AS aa (
  agent_id, user_id, date, hour,
  leads_generated, qualified_leads,
  cta_pricing_clicks, cta_demo_clicks, cta_followup_clicks, cta_sample_clicks, cta_human_escalations,
  total_cta_interactions, cta_conversion_rate,
  avg_intent_score, avg_urgency_score, avg_budget_score, avg_fit_score, avg_engagement_score, avg_total_score,
  updated_at
)
SELECT
  ld.agent_id, ld.user_id, ld.date, NULL,
  ld.leads_generated, ld.qualified_leads,
  ld.cta_pricing_clicks, ld.cta_demo_clicks, ld.cta_followup_clicks, ld.cta_sample_clicks, ld.cta_human_escalations,
  (ld.cta_pricing_clicks + ld.cta_demo_clicks + ld.cta_followup_clicks + ld.cta_sample_clicks + ld.cta_human_escalations) AS total_cta_interactions,
  CASE WHEN ld.leads_generated > 0 THEN ((ld.cta_pricing_clicks + ld.cta_demo_clicks + ld.cta_followup_clicks + ld.cta_sample_clicks + ld.cta_human_escalations)::DECIMAL / ld.leads_generated) * 100 ELSE 0 END AS cta_conversion_rate,
  ld.avg_intent_score, ld.avg_urgency_score, ld.avg_budget_score, ld.avg_fit_score, ld.avg_engagement_score, ld.avg_total_score,
  CURRENT_TIMESTAMP
FROM lead_daily ld
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

-- 3) Backfill user_analytics daily from agent_analytics daily (last 30 days)
INSERT INTO user_analytics AS ua (
  user_id, date, hour,
  total_calls, successful_calls, failed_calls,
  total_duration_minutes, avg_duration_minutes,
  leads_generated, qualified_leads,
  cta_pricing_clicks, cta_demo_clicks, cta_followup_clicks, cta_sample_clicks, cta_human_escalations,
  total_cta_interactions, cta_conversion_rate, credits_used,
  success_rate, answer_rate,
  updated_at
)
SELECT
  aa.user_id,
  aa.date,
  NULL AS hour,
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
  CASE WHEN SUM(aa.total_calls) > 0 THEN ((SUM(aa.successful_calls) + SUM(aa.failed_calls))::DECIMAL / SUM(aa.total_calls) * 100) ELSE 0 END AS answer_rate,
  CURRENT_TIMESTAMP
FROM agent_analytics aa
WHERE aa.hour IS NULL
  AND aa.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY aa.user_id, aa.date
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

COMMIT;
