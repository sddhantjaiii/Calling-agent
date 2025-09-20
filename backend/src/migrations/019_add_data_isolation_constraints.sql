-- Migration to add database constraints for data isolation
-- This ensures cross-user data access is impossible at the database level

-- Step 1: Create unique constraints to support foreign key references
-- Create unique constraint on agents(id, user_id)
ALTER TABLE agents 
DROP CONSTRAINT IF EXISTS uk_agents_id_user_id;

ALTER TABLE agents 
ADD CONSTRAINT uk_agents_id_user_id 
UNIQUE (id, user_id);

-- Create unique constraint on calls(id, user_id)
ALTER TABLE calls 
DROP CONSTRAINT IF EXISTS uk_calls_id_user_id;

ALTER TABLE calls 
ADD CONSTRAINT uk_calls_id_user_id 
UNIQUE (id, user_id);

-- Step 2: Add user_id columns to tables that need them
-- Add user_id column to lead_analytics if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lead_analytics' AND column_name = 'user_id') THEN
        ALTER TABLE lead_analytics ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
        
        -- Populate user_id from calls table for existing records
        UPDATE lead_analytics 
        SET user_id = c.user_id 
        FROM calls c 
        WHERE lead_analytics.call_id = c.id;
        
        -- Make user_id NOT NULL after populating
        ALTER TABLE lead_analytics ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- Add user_id column to transcripts if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transcripts' AND column_name = 'user_id') THEN
        ALTER TABLE transcripts ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
        
        -- Populate user_id from calls table for existing records
        UPDATE transcripts 
        SET user_id = c.user_id 
        FROM calls c 
        WHERE transcripts.call_id = c.id;
        
        -- Make user_id NOT NULL after populating
        ALTER TABLE transcripts ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- Step 3: Add foreign key constraints for data isolation
-- Add constraint to ensure calls.user_id matches agents.user_id
ALTER TABLE calls 
DROP CONSTRAINT IF EXISTS fk_calls_agent_user_consistency;

ALTER TABLE calls 
ADD CONSTRAINT fk_calls_agent_user_consistency 
FOREIGN KEY (agent_id, user_id) 
REFERENCES agents(id, user_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Add constraint to ensure lead_analytics.user_id matches calls.user_id
ALTER TABLE lead_analytics 
DROP CONSTRAINT IF EXISTS fk_lead_analytics_call_user_consistency;

ALTER TABLE lead_analytics 
ADD CONSTRAINT fk_lead_analytics_call_user_consistency 
FOREIGN KEY (call_id, user_id) 
REFERENCES calls(id, user_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Add constraint to ensure transcripts.user_id matches calls.user_id
ALTER TABLE transcripts 
DROP CONSTRAINT IF EXISTS fk_transcripts_call_user_consistency;

ALTER TABLE transcripts 
ADD CONSTRAINT fk_transcripts_call_user_consistency 
FOREIGN KEY (call_id, user_id) 
REFERENCES calls(id, user_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Add constraint to ensure agent_call_outcomes.user_id matches both agent and call user_id
ALTER TABLE agent_call_outcomes 
DROP CONSTRAINT IF EXISTS fk_agent_call_outcomes_agent_user_consistency;

ALTER TABLE agent_call_outcomes 
ADD CONSTRAINT fk_agent_call_outcomes_agent_user_consistency 
FOREIGN KEY (agent_id, user_id) 
REFERENCES agents(id, user_id) 
DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE agent_call_outcomes 
DROP CONSTRAINT IF EXISTS fk_agent_call_outcomes_call_user_consistency;

ALTER TABLE agent_call_outcomes 
ADD CONSTRAINT fk_agent_call_outcomes_call_user_consistency 
FOREIGN KEY (call_id, user_id) 
REFERENCES calls(id, user_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Step 4: Add indexes for performance
-- Add indexes for the new user_id columns
CREATE INDEX IF NOT EXISTS idx_lead_analytics_user_id ON lead_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON transcripts(user_id);

-- Add composite indexes for efficient user-scoped queries
CREATE INDEX IF NOT EXISTS idx_lead_analytics_user_call ON lead_analytics(user_id, call_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_user_call ON transcripts(user_id, call_id);
CREATE INDEX IF NOT EXISTS idx_agent_call_outcomes_user_agent ON agent_call_outcomes(user_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_call_outcomes_user_call ON agent_call_outcomes(user_id, call_id);

-- Step 5: Create utility functions for data validation
-- Create a function to validate user_id consistency across related tables
CREATE OR REPLACE FUNCTION validate_user_data_consistency()
RETURNS TABLE(
    table_name TEXT,
    inconsistent_records BIGINT,
    details TEXT
) AS $$
BEGIN
    -- Check calls vs agents user_id consistency
    RETURN QUERY
    SELECT 
        'calls_agents_mismatch'::TEXT,
        COUNT(*)::BIGINT,
        'Calls with agent_id that belongs to different user'::TEXT
    FROM calls c
    JOIN agents a ON c.agent_id = a.id
    WHERE c.user_id != a.user_id;
    
    -- Check lead_analytics vs calls user_id consistency
    RETURN QUERY
    SELECT 
        'lead_analytics_calls_mismatch'::TEXT,
        COUNT(*)::BIGINT,
        'Lead analytics with call_id that belongs to different user'::TEXT
    FROM lead_analytics la
    JOIN calls c ON la.call_id = c.id
    WHERE la.user_id != c.user_id;
    
    -- Check transcripts vs calls user_id consistency
    RETURN QUERY
    SELECT 
        'transcripts_calls_mismatch'::TEXT,
        COUNT(*)::BIGINT,
        'Transcripts with call_id that belongs to different user'::TEXT
    FROM transcripts t
    JOIN calls c ON t.call_id = c.id
    WHERE t.user_id != c.user_id;
    
    -- Check agent_call_outcomes consistency
    RETURN QUERY
    SELECT 
        'agent_call_outcomes_mismatch'::TEXT,
        COUNT(*)::BIGINT,
        'Agent call outcomes with mismatched user_id'::TEXT
    FROM agent_call_outcomes aco
    JOIN calls c ON aco.call_id = c.id
    JOIN agents a ON aco.agent_id = a.id
    WHERE aco.user_id != c.user_id OR aco.user_id != a.user_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to audit data isolation
CREATE OR REPLACE FUNCTION audit_data_isolation(target_user_id UUID)
RETURNS TABLE(
    audit_type TEXT,
    potential_leak BOOLEAN,
    record_count BIGINT,
    details TEXT
) AS $$
BEGIN
    -- Audit calls access
    RETURN QUERY
    SELECT 
        'calls_access'::TEXT,
        COUNT(*) > 0,
        COUNT(*)::BIGINT,
        'Calls accessible to user that should not be'::TEXT
    FROM calls c
    WHERE c.user_id != target_user_id
    AND EXISTS (
        SELECT 1 FROM agents a 
        WHERE a.id = c.agent_id 
        AND a.user_id = target_user_id
    );
    
    -- Audit lead_analytics access
    RETURN QUERY
    SELECT 
        'lead_analytics_access'::TEXT,
        COUNT(*) > 0,
        COUNT(*)::BIGINT,
        'Lead analytics accessible to user that should not be'::TEXT
    FROM lead_analytics la
    JOIN calls c ON la.call_id = c.id
    WHERE c.user_id != target_user_id
    AND la.user_id = target_user_id;
    
    -- Audit agent_analytics access
    RETURN QUERY
    SELECT 
        'agent_analytics_access'::TEXT,
        COUNT(*) > 0,
        COUNT(*)::BIGINT,
        'Agent analytics accessible to user that should not be'::TEXT
    FROM agent_analytics aa
    JOIN agents a ON aa.agent_id = a.id
    WHERE a.user_id != target_user_id
    AND aa.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add comments to document the constraints
COMMENT ON CONSTRAINT fk_calls_agent_user_consistency ON calls IS 
'Ensures calls can only be associated with agents from the same user, preventing cross-user data contamination';

COMMENT ON CONSTRAINT fk_lead_analytics_call_user_consistency ON lead_analytics IS 
'Ensures lead analytics can only reference calls from the same user';

COMMENT ON CONSTRAINT fk_transcripts_call_user_consistency ON transcripts IS 
'Ensures transcripts can only reference calls from the same user';

COMMENT ON CONSTRAINT fk_agent_call_outcomes_agent_user_consistency ON agent_call_outcomes IS 
'Ensures agent call outcomes can only reference agents from the same user';

COMMENT ON CONSTRAINT fk_agent_call_outcomes_call_user_consistency ON agent_call_outcomes IS 
'Ensures agent call outcomes can only reference calls from the same user';