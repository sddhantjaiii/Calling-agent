-- Migration: Create trigger execution log table for data integrity monitoring
-- This table tracks trigger execution status and failures for monitoring purposes

-- Create trigger execution log table
CREATE TABLE IF NOT EXISTS trigger_execution_log (
    id SERIAL PRIMARY KEY,
    trigger_name VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'success',
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_trigger_log_status_time 
ON trigger_execution_log(status, created_at);

CREATE INDEX IF NOT EXISTS idx_trigger_log_trigger_name 
ON trigger_execution_log(trigger_name);

CREATE INDEX IF NOT EXISTS idx_trigger_log_table_name 
ON trigger_execution_log(table_name);

-- Create index for recent failures lookup
CREATE INDEX IF NOT EXISTS idx_trigger_log_recent_failures 
ON trigger_execution_log(status, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE trigger_execution_log IS 'Tracks database trigger execution for data integrity monitoring';
COMMENT ON COLUMN trigger_execution_log.trigger_name IS 'Name of the database trigger';
COMMENT ON COLUMN trigger_execution_log.table_name IS 'Table the trigger operates on';
COMMENT ON COLUMN trigger_execution_log.operation IS 'Database operation (INSERT, UPDATE, DELETE)';
COMMENT ON COLUMN trigger_execution_log.status IS 'Execution status (success, error, warning)';
COMMENT ON COLUMN trigger_execution_log.error_message IS 'Error message if status is error';
COMMENT ON COLUMN trigger_execution_log.execution_time_ms IS 'Trigger execution time in milliseconds';