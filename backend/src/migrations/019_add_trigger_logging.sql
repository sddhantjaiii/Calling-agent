-- Add trigger execution logging table
-- This is a follow-up to migration 018 to ensure logging functionality is available

-- Create a logging table for trigger execution and errors
CREATE TABLE IF NOT EXISTS trigger_execution_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL,
    user_id UUID,
    agent_id UUID,
    execution_status VARCHAR(20) NOT NULL,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for efficient log queries
CREATE INDEX IF NOT EXISTS idx_trigger_execution_log_created_at ON trigger_execution_log(created_at);
CREATE INDEX IF NOT EXISTS idx_trigger_execution_log_status ON trigger_execution_log(execution_status);
CREATE INDEX IF NOT EXISTS idx_trigger_execution_log_trigger_name ON trigger_execution_log(trigger_name);

-- Add comment for documentation
COMMENT ON TABLE trigger_execution_log IS 'Logs all trigger executions with performance metrics and error tracking';