-- Debug script to check customer-to-calls data flow
-- Run this in your database to verify data connections

-- 1. Check customer data
SELECT 
    id, name, phone, email, conversion_date, 
    customer_reference_number
FROM customers 
WHERE id = 'ad1f4e20-865c-4d05-a761-0ad77bf56083';

-- 2. Check if there are calls for this phone number
SELECT 
    id, phone_number, created_at, duration_minutes, status
FROM calls 
WHERE user_id = '789895c8-4bd6-43e9-bfea-a4171ec47197'
    AND phone_number = '+918979556941'
ORDER BY created_at DESC;

-- 3. Check lead analytics for these calls
SELECT 
    la.call_id, la.company_name, la.intent_level, 
    la.engagement_health, la.lead_status_tag, la.total_score,
    c.phone_number, c.created_at
FROM lead_analytics la
JOIN calls c ON la.call_id = c.id
WHERE c.user_id = '789895c8-4bd6-43e9-bfea-a4171ec47197'
    AND c.phone_number = '+918979556941'
ORDER BY c.created_at DESC;

-- 4. Check for any phone number format variations
SELECT DISTINCT phone_number, COUNT(*) as call_count
FROM calls 
WHERE user_id = '789895c8-4bd6-43e9-bfea-a4171ec47197'
    AND phone_number LIKE '%556941%'
GROUP BY phone_number;

-- 5. Full timeline query (what the API should return)
SELECT 
    c.id,
    c.created_at as interaction_date,
    c.duration_minutes,
    c.status as call_status,
    a.name as agent_name,
    'call' as interaction_type,
    la.lead_status_tag,
    la.intent_level,
    la.engagement_health,
    la.budget_constraint,
    la.urgency_level,
    la.fit_alignment,
    la.total_score,
    la.company_name
FROM calls c
LEFT JOIN agents a ON c.agent_id = a.id
LEFT JOIN lead_analytics la ON c.id = la.call_id
WHERE c.user_id = '789895c8-4bd6-43e9-bfea-a4171ec47197'
    AND c.phone_number = '+918979556941'
ORDER BY c.created_at DESC;
