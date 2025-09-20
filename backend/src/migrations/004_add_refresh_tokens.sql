-- Migration: Add refresh token support to user_sessions table
-- This migration adds refresh token functionality to support automatic token refresh

-- Add refresh token columns to user_sessions table
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for refresh token functionality
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token_hash ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_expires_at ON user_sessions(refresh_expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_active ON user_sessions(is_active, refresh_expires_at);

-- Update the cleanup function to handle refresh tokens
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE (expires_at < CURRENT_TIMESTAMP AND refresh_expires_at < CURRENT_TIMESTAMP) 
       OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the active_user_sessions view to include refresh token info
DROP VIEW IF EXISTS active_user_sessions;

CREATE VIEW active_user_sessions AS
SELECT 
    s.id,
    s.user_id,
    u.email,
    u.name,
    s.created_at,
    s.last_used_at,
    s.expires_at,
    s.refresh_expires_at,
    s.ip_address,
    s.user_agent
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = true 
  AND (s.expires_at > CURRENT_TIMESTAMP OR s.refresh_expires_at > CURRENT_TIMESTAMP);

-- Add comment for documentation
COMMENT ON COLUMN user_sessions.refresh_token_hash IS 'SHA256 hash of the refresh token for secure storage';
COMMENT ON COLUMN user_sessions.refresh_expires_at IS 'Expiration timestamp for the refresh token (typically 7 days)';