-- Add missing avg_total_score column to agent_analytics
-- This aligns with trigger logic that references avg_total_score

ALTER TABLE agent_analytics
ADD COLUMN IF NOT EXISTS avg_total_score DECIMAL(5,2) DEFAULT 0 NOT NULL;


