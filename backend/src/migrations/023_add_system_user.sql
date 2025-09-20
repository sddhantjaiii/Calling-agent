-- Migration: Add system user for unassigned agents
-- This creates a special system user that can be used for agents created by admin that haven't been assigned to specific users yet

-- Insert a system user with a predefined UUID
INSERT INTO users (
    id, 
    email, 
    name, 
    credits, 
    is_active, 
    auth_provider, 
    email_verified, 
    created_at, 
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'system@admin.internal',
    'System User (Unassigned Agents)',
    999999,
    true,
    'email',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;
