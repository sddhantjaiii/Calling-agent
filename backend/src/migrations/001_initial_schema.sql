-- Initial database schema for AI Calling Agent SaaS platform
-- This migration creates all the core tables needed for the application

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores user account information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits INTEGER DEFAULT 15 NOT NULL CHECK (credits >= 0),
    is_active BOOLEAN DEFAULT true NOT NULL,
    auth_provider VARCHAR(50) DEFAULT 'email' NOT NULL CHECK (auth_provider IN ('email', 'google', 'linkedin')),
    stack_auth_user_id VARCHAR(255) UNIQUE,
    email_verified BOOLEAN DEFAULT false NOT NULL,
    email_verification_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Agents table - stores agent associations with ElevenLabs
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    elevenlabs_agent_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(50) DEFAULT 'call' NOT NULL CHECK (agent_type IN ('call', 'chat')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, elevenlabs_agent_id)
);

-- Contacts table - stores user contact lists
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    company VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, phone_number)
);

-- Calls table - stores call records from ElevenLabs webhooks
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    elevenlabs_conversation_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    duration_minutes INTEGER DEFAULT 0 NOT NULL CHECK (duration_minutes >= 0),
    credits_used INTEGER DEFAULT 0 NOT NULL CHECK (credits_used >= 0),
    status VARCHAR(50) DEFAULT 'in_progress' NOT NULL CHECK (status IN ('completed', 'failed', 'in_progress', 'cancelled')),
    recording_url TEXT,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Transcripts table - stores call transcripts
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    speaker_segments JSONB DEFAULT '[]' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Lead analytics table - stores lead scoring data from ElevenLabs
CREATE TABLE lead_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    intent_level VARCHAR(50),
    intent_score INTEGER CHECK (intent_score >= 0 AND intent_score <= 100),
    urgency_level VARCHAR(50),
    urgency_score INTEGER CHECK (urgency_score >= 0 AND urgency_score <= 100),
    budget_constraint VARCHAR(50),
    budget_score INTEGER CHECK (budget_score >= 0 AND budget_score <= 100),
    fit_alignment VARCHAR(50),
    fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
    engagement_health VARCHAR(50),
    engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
    total_score INTEGER CHECK (total_score >= 0 AND total_score <= 100),
    lead_status_tag VARCHAR(100),
    reasoning JSONB DEFAULT '{}' NOT NULL,
    cta_interactions JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Credit transactions table - tracks all credit movements
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'admin_adjustment', 'refund')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
    description TEXT NOT NULL,
    stripe_payment_id VARCHAR(255),
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- For admin adjustments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- System configuration table - stores admin-configurable settings
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT false NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance optimization

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stack_auth_user_id ON users(stack_auth_user_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Agents table indexes
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_elevenlabs_agent_id ON agents(elevenlabs_agent_id);
CREATE INDEX idx_agents_user_id_active ON agents(user_id, is_active);

-- Contacts table indexes
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX idx_contacts_user_id_phone ON contacts(user_id, phone_number);

-- Calls table indexes
CREATE INDEX idx_calls_agent_id ON calls(agent_id);
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_contact_id ON calls(contact_id);
CREATE INDEX idx_calls_elevenlabs_conversation_id ON calls(elevenlabs_conversation_id);
CREATE INDEX idx_calls_phone_number ON calls(phone_number);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_calls_user_id_created_at ON calls(user_id, created_at);

-- Transcripts table indexes
CREATE INDEX idx_transcripts_call_id ON transcripts(call_id);

-- Lead analytics table indexes
CREATE INDEX idx_lead_analytics_call_id ON lead_analytics(call_id);
CREATE INDEX idx_lead_analytics_total_score ON lead_analytics(total_score);
CREATE INDEX idx_lead_analytics_lead_status_tag ON lead_analytics(lead_status_tag);

-- Credit transactions table indexes
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_user_id_created_at ON credit_transactions(user_id, created_at);
CREATE INDEX idx_credit_transactions_stripe_payment_id ON credit_transactions(stripe_payment_id);

-- System config table indexes
CREATE INDEX idx_system_config_config_key ON system_config(config_key);

-- Create triggers for updating updated_at timestamps

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system configuration values
INSERT INTO system_config (config_key, config_value, description) VALUES
('credits_per_minute', '1', 'Number of credits charged per minute of call time'),
('max_contacts_per_upload', '1000', 'Maximum number of contacts allowed in bulk upload'),
('new_user_bonus_credits', '15', 'Number of free credits given to new users'),
('minimum_credit_purchase', '50', 'Minimum number of credits that can be purchased at once');

-- Create a view for user statistics (useful for admin panel)
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.credits,
    u.is_active,
    u.created_at,
    COUNT(DISTINCT a.id) as agent_count,
    COUNT(DISTINCT c.id) as call_count,
    COUNT(DISTINCT ct.id) as contact_count,
    COALESCE(SUM(CASE WHEN c.status = 'completed' THEN c.credits_used ELSE 0 END), 0) as total_credits_used
FROM users u
LEFT JOIN agents a ON u.id = a.user_id AND a.is_active = true
LEFT JOIN calls c ON u.id = c.user_id
LEFT JOIN contacts ct ON u.id = ct.user_id
GROUP BY u.id, u.email, u.name, u.credits, u.is_active, u.created_at;