-- Migration 023: Enhance Lead Analytics for Webhook Data Extraction
-- This migration adds company name, extracted contact info, and dedicated CTA columns
-- to the lead_analytics table for improved webhook processing and analytics

-- Add new columns for enhanced lead data extraction
ALTER TABLE lead_analytics 
ADD COLUMN company_name VARCHAR(255),
ADD COLUMN extracted_name VARCHAR(255),
ADD COLUMN extracted_email VARCHAR(255),
ADD COLUMN cta_pricing_clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN cta_demo_clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN cta_followup_clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN cta_sample_clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN cta_escalated_to_human BOOLEAN DEFAULT FALSE;

-- Create indexes for efficient querying on company name
CREATE INDEX IF NOT EXISTS idx_lead_analytics_company_name 
ON lead_analytics(company_name) 
WHERE company_name IS NOT NULL;

-- Create partial indexes for CTA columns (only index TRUE values for efficiency)
CREATE INDEX IF NOT EXISTS idx_lead_analytics_cta_pricing 
ON lead_analytics(cta_pricing_clicked) 
WHERE cta_pricing_clicked = TRUE;

CREATE INDEX IF NOT EXISTS idx_lead_analytics_cta_demo 
ON lead_analytics(cta_demo_clicked) 
WHERE cta_demo_clicked = TRUE;

CREATE INDEX IF NOT EXISTS idx_lead_analytics_cta_followup 
ON lead_analytics(cta_followup_clicked) 
WHERE cta_followup_clicked = TRUE;

CREATE INDEX IF NOT EXISTS idx_lead_analytics_cta_sample 
ON lead_analytics(cta_sample_clicked) 
WHERE cta_sample_clicked = TRUE;

CREATE INDEX IF NOT EXISTS idx_lead_analytics_cta_escalated 
ON lead_analytics(cta_escalated_to_human) 
WHERE cta_escalated_to_human = TRUE;

-- Create composite index for user-scoped CTA analytics queries
CREATE INDEX IF NOT EXISTS idx_lead_analytics_user_cta_analytics 
ON lead_analytics(user_id, created_at DESC) 
WHERE cta_pricing_clicked = TRUE 
   OR cta_demo_clicked = TRUE 
   OR cta_followup_clicked = TRUE 
   OR cta_sample_clicked = TRUE 
   OR cta_escalated_to_human = TRUE;

-- Migrate existing CTA data from JSONB to dedicated boolean columns
-- This handles various formats that might exist in the cta_interactions JSONB field
UPDATE lead_analytics 
SET 
  cta_pricing_clicked = CASE 
    WHEN cta_interactions->>'cta_pricing_clicked' IN ('Yes', 'true', '1') THEN TRUE
    WHEN cta_interactions->>'cta_pricing_clicked' IN ('No', 'false', '0') THEN FALSE
    ELSE FALSE
  END,
  cta_demo_clicked = CASE 
    WHEN cta_interactions->>'cta_demo_clicked' IN ('Yes', 'true', '1') THEN TRUE
    WHEN cta_interactions->>'cta_demo_clicked' IN ('No', 'false', '0') THEN FALSE
    ELSE FALSE
  END,
  cta_followup_clicked = CASE 
    WHEN cta_interactions->>'cta_followup_clicked' IN ('Yes', 'true', '1') THEN TRUE
    WHEN cta_interactions->>'cta_followup_clicked' IN ('No', 'false', '0') THEN FALSE
    ELSE FALSE
  END,
  cta_sample_clicked = CASE 
    WHEN cta_interactions->>'cta_sample_clicked' IN ('Yes', 'true', '1') THEN TRUE
    WHEN cta_interactions->>'cta_sample_clicked' IN ('No', 'false', '0') THEN FALSE
    ELSE FALSE
  END,
  cta_escalated_to_human = CASE 
    WHEN cta_interactions->>'cta_escalated_to_human' IN ('Yes', 'true', '1') THEN TRUE
    WHEN cta_interactions->>'cta_escalated_to_human' IN ('No', 'false', '0') THEN FALSE
    ELSE FALSE
  END
WHERE cta_interactions IS NOT NULL AND cta_interactions != '{}';

-- Add comments to document the new columns
COMMENT ON COLUMN lead_analytics.company_name IS 
'Company name extracted from webhook data (extraction.company_name)';

COMMENT ON COLUMN lead_analytics.extracted_name IS 
'Contact name extracted from webhook data (extraction.name)';

COMMENT ON COLUMN lead_analytics.extracted_email IS 
'Contact email extracted from webhook data (extraction.email_address)';

COMMENT ON COLUMN lead_analytics.cta_pricing_clicked IS 
'Boolean flag indicating if pricing CTA was clicked during the call';

COMMENT ON COLUMN lead_analytics.cta_demo_clicked IS 
'Boolean flag indicating if demo CTA was clicked during the call';

COMMENT ON COLUMN lead_analytics.cta_followup_clicked IS 
'Boolean flag indicating if follow-up CTA was clicked during the call';

COMMENT ON COLUMN lead_analytics.cta_sample_clicked IS 
'Boolean flag indicating if sample CTA was clicked during the call';

COMMENT ON COLUMN lead_analytics.cta_escalated_to_human IS 
'Boolean flag indicating if the call was escalated to a human agent';

-- Log the migration completion
INSERT INTO system_config (config_key, config_value, description, updated_by)
VALUES (
  'migration_023_completed_at',
  CURRENT_TIMESTAMP::TEXT,
  'Timestamp when migration 023 (enhance lead analytics extraction) was completed',
  NULL
) ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = CURRENT_TIMESTAMP;

-- Verify migration success by checking column existence
DO $$ 
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lead_analytics' AND column_name = 'company_name') THEN
        missing_columns := array_append(missing_columns, 'company_name');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lead_analytics' AND column_name = 'extracted_name') THEN
        missing_columns := array_append(missing_columns, 'extracted_name');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lead_analytics' AND column_name = 'extracted_email') THEN
        missing_columns := array_append(missing_columns, 'extracted_email');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lead_analytics' AND column_name = 'cta_pricing_clicked') THEN
        missing_columns := array_append(missing_columns, 'cta_pricing_clicked');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lead_analytics' AND column_name = 'cta_demo_clicked') THEN
        missing_columns := array_append(missing_columns, 'cta_demo_clicked');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lead_analytics' AND column_name = 'cta_followup_clicked') THEN
        missing_columns := array_append(missing_columns, 'cta_followup_clicked');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lead_analytics' AND column_name = 'cta_sample_clicked') THEN
        missing_columns := array_append(missing_columns, 'cta_sample_clicked');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lead_analytics' AND column_name = 'cta_escalated_to_human') THEN
        missing_columns := array_append(missing_columns, 'cta_escalated_to_human');
    END IF;
    
    -- Report results
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Migration 023 failed: Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'Migration 023 completed successfully: All required columns added to lead_analytics table';
    END IF;
END $$;