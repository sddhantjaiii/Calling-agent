-- Script to check what data exists in the database
-- Run this to see what webhook data was stored

-- Check calls table (main table)
SELECT 
    id,
    agent_id,
    elevenlabs_conversation_id,
    phone_number,
    duration_seconds,  -- New field
    duration_minutes,  -- For billing
    status,
    call_source,
    caller_name,
    caller_email,
    created_at,
    completed_at
FROM calls 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if we have any calls with our test conversation ID
SELECT * FROM calls 
WHERE elevenlabs_conversation_id = 'conv_5301k5a9gk76end8ayk25n22z97p';

-- Check transcripts
SELECT 
    id,
    call_id,
    full_text,
    language,
    created_at,
    LENGTH(full_text) as text_length
FROM transcripts 
ORDER BY created_at DESC 
LIMIT 3;

-- Check lead analytics (enhanced data)
SELECT 
    id,
    call_id,
    total_score,
    lead_status_tag,
    intent_level,
    company_name,
    extracted_name,
    extracted_email,
    smart_notification,  -- New field
    demo_book_datetime,  -- New field
    cta_pricing_clicked,
    created_at
FROM lead_analytics 
ORDER BY created_at DESC 
LIMIT 3;

-- Check contacts (auto-created)
SELECT 
    id,
    user_id,
    name,
    email,
    phone_number,
    company_name,
    created_at
FROM contacts 
ORDER BY created_at DESC 
LIMIT 3;

-- Check billing transactions
SELECT 
    id,
    user_id,
    credits_deducted,
    description,
    call_id,
    created_at
FROM billing_transactions 
ORDER BY created_at DESC 
LIMIT 3;

-- Summary counts
SELECT 
    (SELECT COUNT(*) FROM calls) as total_calls,
    (SELECT COUNT(*) FROM transcripts) as total_transcripts,
    (SELECT COUNT(*) FROM lead_analytics) as total_analytics,
    (SELECT COUNT(*) FROM contacts) as total_contacts,
    (SELECT COUNT(*) FROM billing_transactions) as total_billing_records;
