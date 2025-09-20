-- Add agent-specific analytics tables
-- This migration creates tables to store analytics data specific to each agent

-- Agent performance metrics table
CREATE TABLE agent_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Time period for these metrics
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23), -- NULL for daily aggregates, 0-23 for hourly
    
    -- Call metrics
    total_calls INTEGER DEFAULT 0 NOT NULL,
    successful_calls INTEGER DEFAULT 0 NOT NULL,
    failed_calls INTEGER DEFAULT 0 NOT NULL,
    total_duration_minutes INTEGER DEFAULT 0 NOT NULL,
    avg_duration_minutes DECIMAL(10,2) DEFAULT 0 NOT NULL,
    
    -- Lead metrics
    leads_generated INTEGER DEFAULT 0 NOT NULL,
    qualified_leads INTEGER DEFAULT 0 NOT NULL,
    conversion_rate DECIMAL(5,2) DEFAULT 0 NOT NULL, -- Percentage
    
    -- Engagement metrics
    avg_engagement_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    avg_intent_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    avg_urgency_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    avg_budget_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    avg_fit_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    
    -- Cost metrics
    credits_used INTEGER DEFAULT 0 NOT NULL,
    cost_per_lead DECIMAL(10,2) DEFAULT 0 NOT NULL,
    
    -- Performance indicators
    success_rate DECIMAL(5,2) DEFAULT 0 NOT NULL, -- Percentage
    answer_rate DECIMAL(5,2) DEFAULT 0 NOT NULL, -- Percentage of calls answered
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Ensure unique records per agent/date/hour combination
    UNIQUE(agent_id, date, hour)
);

-- Agent call outcomes table (detailed call results)
CREATE TABLE agent_call_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Call outcome details
    outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('completed', 'no_answer', 'busy', 'failed', 'voicemail', 'disconnected')),
    call_quality_score DECIMAL(5,2), -- 1-10 rating
    customer_satisfaction DECIMAL(5,2), -- 1-10 rating if available
    
    -- Lead qualification results
    is_qualified_lead BOOLEAN DEFAULT false,
    lead_temperature VARCHAR(20) CHECK (lead_temperature IN ('hot', 'warm', 'cold', 'not_interested')),
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    
    -- Conversation analysis
    sentiment_score DECIMAL(5,2), -- -1 to 1 (negative to positive)
    key_topics TEXT[], -- Array of topics discussed
    objections_raised TEXT[], -- Array of objections
    next_steps TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Agent performance trends table (for tracking improvements over time)
CREATE TABLE agent_performance_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Trend period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
    
    -- Performance changes (compared to previous period)
    calls_change_percent DECIMAL(5,2) DEFAULT 0,
    success_rate_change_percent DECIMAL(5,2) DEFAULT 0,
    conversion_rate_change_percent DECIMAL(5,2) DEFAULT 0,
    avg_duration_change_percent DECIMAL(5,2) DEFAULT 0,
    cost_efficiency_change_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Ranking among user's agents
    performance_rank INTEGER,
    total_agents_count INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(agent_id, period_start, period_end, period_type)
);

-- Agent goals and targets table
CREATE TABLE agent_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Target period
    target_date DATE NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('daily', 'weekly', 'monthly')),
    
    -- Targets
    target_calls INTEGER,
    target_success_rate DECIMAL(5,2),
    target_leads INTEGER,
    target_conversion_rate DECIMAL(5,2),
    target_cost_per_lead DECIMAL(10,2),
    
    -- Achievement tracking
    achieved_calls INTEGER DEFAULT 0,
    achieved_success_rate DECIMAL(5,2) DEFAULT 0,
    achieved_leads INTEGER DEFAULT 0,
    achieved_conversion_rate DECIMAL(5,2) DEFAULT 0,
    actual_cost_per_lead DECIMAL(10,2) DEFAULT 0,
    
    -- Overall achievement percentage
    achievement_percentage DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(agent_id, target_date, target_type)
);

-- Create indexes for performance optimization
CREATE INDEX idx_agent_analytics_agent_id ON agent_analytics(agent_id);
CREATE INDEX idx_agent_analytics_date ON agent_analytics(date);
CREATE INDEX idx_agent_analytics_agent_date ON agent_analytics(agent_id, date);
CREATE INDEX idx_agent_analytics_user_id ON agent_analytics(user_id);

CREATE INDEX idx_agent_call_outcomes_agent_id ON agent_call_outcomes(agent_id);
CREATE INDEX idx_agent_call_outcomes_call_id ON agent_call_outcomes(call_id);
CREATE INDEX idx_agent_call_outcomes_outcome ON agent_call_outcomes(outcome);
CREATE INDEX idx_agent_call_outcomes_qualified ON agent_call_outcomes(is_qualified_lead);

CREATE INDEX idx_agent_performance_trends_agent_id ON agent_performance_trends(agent_id);
CREATE INDEX idx_agent_performance_trends_period ON agent_performance_trends(period_start, period_end);

CREATE INDEX idx_agent_targets_agent_id ON agent_targets(agent_id);
CREATE INDEX idx_agent_targets_date ON agent_targets(target_date);

-- Create triggers for updating updated_at timestamps
CREATE TRIGGER update_agent_analytics_updated_at BEFORE UPDATE ON agent_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_targets_updated_at BEFORE UPDATE ON agent_targets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for agent performance summary
CREATE VIEW agent_performance_summary AS
SELECT 
    a.id as agent_id,
    a.name as agent_name,
    a.user_id,
    
    -- Current day metrics
    COALESCE(today.total_calls, 0) as today_calls,
    COALESCE(today.successful_calls, 0) as today_successful_calls,
    COALESCE(today.success_rate, 0) as today_success_rate,
    COALESCE(today.leads_generated, 0) as today_leads,
    
    -- Current month metrics
    COALESCE(month.total_calls, 0) as month_calls,
    COALESCE(month.successful_calls, 0) as month_successful_calls,
    COALESCE(month.success_rate, 0) as month_success_rate,
    COALESCE(month.leads_generated, 0) as month_leads,
    COALESCE(month.conversion_rate, 0) as month_conversion_rate,
    
    -- All-time metrics
    COALESCE(total.total_calls, 0) as total_calls,
    COALESCE(total.successful_calls, 0) as total_successful_calls,
    COALESCE(total.success_rate, 0) as total_success_rate,
    COALESCE(total.leads_generated, 0) as total_leads,
    COALESCE(total.avg_duration_minutes, 0) as avg_call_duration

FROM agents a
LEFT JOIN (
    SELECT 
        agent_id,
        SUM(total_calls) as total_calls,
        SUM(successful_calls) as successful_calls,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(successful_calls)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as success_rate,
        SUM(leads_generated) as leads_generated
    FROM agent_analytics 
    WHERE date = CURRENT_DATE AND hour IS NULL
    GROUP BY agent_id
) today ON a.id = today.agent_id
LEFT JOIN (
    SELECT 
        agent_id,
        SUM(total_calls) as total_calls,
        SUM(successful_calls) as successful_calls,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(successful_calls)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as success_rate,
        SUM(leads_generated) as leads_generated,
        CASE WHEN SUM(leads_generated) > 0 THEN (SUM(qualified_leads)::DECIMAL / SUM(leads_generated) * 100) ELSE 0 END as conversion_rate
    FROM agent_analytics 
    WHERE date >= DATE_TRUNC('month', CURRENT_DATE) AND hour IS NULL
    GROUP BY agent_id
) month ON a.id = month.agent_id
LEFT JOIN (
    SELECT 
        agent_id,
        SUM(total_calls) as total_calls,
        SUM(successful_calls) as successful_calls,
        CASE WHEN SUM(total_calls) > 0 THEN (SUM(successful_calls)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as success_rate,
        SUM(leads_generated) as leads_generated,
        AVG(avg_duration_minutes) as avg_duration_minutes
    FROM agent_analytics 
    WHERE hour IS NULL
    GROUP BY agent_id
) total ON a.id = total.agent_id
WHERE a.is_active = true;