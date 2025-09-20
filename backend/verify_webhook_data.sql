-- Complete verification of webhook data storage
-- Run this to see what the webhook created

-- 1. Check the main call record
SELECT 
    'CALLS TABLE' as table_name,
    id,
    elevenlabs_conversation_id,
    phone_number,
    duration_seconds,  -- Should be 170
    duration_minutes,  -- Should be 3  
    status,
    call_source,
    created_at
FROM calls 
WHERE elevenlabs_conversation_id = 'conv_5301k5a9gk76end8ayk25n22z97p'
ORDER BY created_at DESC;

-- 2. Check transcript data
SELECT 
    'TRANSCRIPTS TABLE' as table_name,
    t.id,
    t.call_id,
    LEFT(t.full_text, 100) as transcript_preview,
    t.language,
    jsonb_array_length(t.segments) as segment_count, -- Should be 25
    t.created_at
FROM transcripts t
JOIN calls c ON t.call_id = c.id
WHERE c.elevenlabs_conversation_id = 'conv_5301k5a9gk76end8ayk25n22z97p';

-- 3. Check enhanced lead analytics
SELECT 
    'LEAD_ANALYTICS TABLE' as table_name,
    la.id,
    la.call_id,
    la.total_score,           -- Should be 13
    la.lead_status_tag,       -- Should be 'Hot'
    la.company_name,          -- Should be 'sugar cane factory'
    la.extracted_name,        -- Should be 'Sadhant'
    la.extracted_email,       -- Should be 'sadhant@gmail.com'
    la.smart_notification,    -- Should be 'Sadhant booked a meeting'
    la.demo_book_datetime,    -- Should be '2025-09-17T14:00:00+05:30'
    la.cta_pricing_clicked,   -- Should be true
    la.created_at
FROM lead_analytics la
JOIN calls c ON la.call_id = c.id
WHERE c.elevenlabs_conversation_id = 'conv_5301k5a9gk76end8ayk25n22z97p';

-- 4. Check auto-created contacts
SELECT 
    'CONTACTS TABLE' as table_name,
    ct.id,
    ct.name,                  -- Should be 'Sadhant'
    ct.email,                 -- Should be 'sadhant@gmail.com'
    ct.phone_number,          -- Should be '+918979556941'
    ct.company_name,          -- Should be 'sugar cane factory'
    ct.source,
    ct.created_at
FROM contacts ct
WHERE ct.email = 'sadhant@gmail.com' 
   OR ct.phone_number = '+918979556941'
ORDER BY created_at DESC;

-- 5. Check billing transactions
SELECT 
    'BILLING_TRANSACTIONS TABLE' as table_name,
    bt.id,
    bt.credits_deducted,      -- Should be 3
    bt.description,           -- Should mention '2 min 50 sec'
    bt.transaction_type,
    bt.created_at
FROM billing_transactions bt
JOIN calls c ON bt.call_id = c.id
WHERE c.elevenlabs_conversation_id = 'conv_5301k5a9gk76end8ayk25n22z97p';

-- 6. Summary count verification
SELECT 
    'SUMMARY COUNTS' as verification_type,
    (SELECT COUNT(*) FROM calls WHERE elevenlabs_conversation_id = 'conv_5301k5a9gk76end8ayk25n22z97p') as calls_count,
    (SELECT COUNT(*) FROM transcripts t JOIN calls c ON t.call_id = c.id WHERE c.elevenlabs_conversation_id = 'conv_5301k5a9gk76end8ayk25n22z97p') as transcripts_count,
    (SELECT COUNT(*) FROM lead_analytics la JOIN calls c ON la.call_id = c.id WHERE c.elevenlabs_conversation_id = 'conv_5301k5a9gk76end8ayk25n22z97p') as analytics_count,
    (SELECT COUNT(*) FROM billing_transactions bt JOIN calls c ON bt.call_id = c.id WHERE c.elevenlabs_conversation_id = 'conv_5301k5a9gk76end8ayk25n22z97p') as billing_count;

-- All counts should be 1 if webhook processed successfully
