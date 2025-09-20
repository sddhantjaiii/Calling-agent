-- Migration: Optimize session queries
-- This migration adds composite indexes to improve session validation performance

-- Drop existing indexes if they exist to recreate them optimally
DROP INDEX IF EXISTS idx_user_sessions_token_hash;
DROP INDEX IF EXISTS idx_user_sessions_active;

-- Create optimized composite index for token validation queries
-- This covers the exact query: WHERE token_hash = $1 AND is_active = true AND expires_at > NOW()
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_validation 
ON user_sessions(token_hash, is_active, expires_at) 
WHERE is_active = true;

-- Create optimized composite index for refresh token validation
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_validation 
ON user_sessions(refresh_token_hash, is_active, refresh_expires_at) 
WHERE is_active = true;

-- Create index for user session cleanup
CREATE INDEX IF NOT EXISTS idx_user_sessions_cleanup 
ON user_sessions(expires_at, is_active) 
WHERE is_active = true;

-- Add partial index for active sessions only (more efficient)
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_only 
ON user_sessions(user_id, created_at) 
WHERE is_active = true;

-- Update table statistics for better query planning
ANALYZE user_sessions;