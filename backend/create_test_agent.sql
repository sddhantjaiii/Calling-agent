-- Create the missing agent record from the JSON file data
-- This allows the webhook to process successfully

-- First check if a user exists, if not create one
DO $$ 
DECLARE 
    test_user_id UUID;
BEGIN
    -- Check if we have any users
    SELECT id INTO test_user_id FROM users LIMIT 1;
    
    -- If no users exist, create a test user
    IF test_user_id IS NULL THEN
        INSERT INTO users (
            id,
            email,
            password_hash,
            credits,
            name,
            created_at,
            updated_at
        ) VALUES (
            '789895c8-4bd6-43e9-bfea-a4171ec47197',
            'test@example.com',
            '$2b$10$dummy.hash.for.testing.purposes.only',
            1000,
            'Test User',
            NOW(),
            NOW()
        ) ON CONFLICT (id) DO NOTHING;
        
        test_user_id := '789895c8-4bd6-43e9-bfea-a4171ec47197';
        RAISE NOTICE 'Created test user with ID: %', test_user_id;
    ELSE
        RAISE NOTICE 'Using existing user with ID: %', test_user_id;
    END IF;

    -- Create the agent from the JSON file
    INSERT INTO agents (
        id,
        user_id,
        elevenlabs_agent_id,
        name,
        description,
        voice_id,
        prompt,
        created_at,
        updated_at
    ) VALUES (
        '6f837f12-3757-4e40-be7e-cf610dc25b3e',
        test_user_id,
        'agent_7401k33y6q7jemzrt7s56stxaf7m',  -- From your JSON file
        'Sugar Cane Factory Sales Agent',
        'AI agent for handling sugar cane factory inquiries and demo bookings',
        'voice_default',
        'You are a helpful sales agent for SniperThink, specializing in helping sugar cane factories and agricultural businesses.',
        NOW(),
        NOW()
    ) ON CONFLICT (elevenlabs_agent_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        updated_at = NOW();

    RAISE NOTICE 'Created/Updated agent: agent_7401k33y6q7jemzrt7s56stxaf7m';
END $$;

-- Verify the agent was created
SELECT 
    'AGENT CREATED' as status,
    id,
    user_id,
    elevenlabs_agent_id,
    name
FROM agents 
WHERE elevenlabs_agent_id = 'agent_7401k33y6q7jemzrt7s56stxaf7m';
