-- Migration to implement custom authentication system
-- This migration removes Stack Auth dependencies and adds password-based authentication

-- Add password field to users table
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

-- Add password reset fields
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP WITH TIME ZONE;

-- Add email verification token field
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);

-- Remove stack_auth_user_id column as we're moving to custom auth
ALTER TABLE users DROP COLUMN IF EXISTS stack_auth_user_id;

-- Update auth_provider to include more options
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_provider_check;
ALTER TABLE users ADD CONSTRAINT users_auth_provider_check 
  CHECK (auth_provider IN ('email', 'google', 'linkedin', 'github'));

-- Add role column if it doesn't exist (from previous migration)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user' NOT NULL 
      CHECK (role IN ('user', 'admin', 'super_admin'));
  END IF;
END $$;

-- Create sessions table for managing user sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Create indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);

-- Create password reset attempts table for security
CREATE TABLE IF NOT EXISTS password_reset_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    success BOOLEAN DEFAULT false NOT NULL
);

-- Create index for password reset attempts
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email ON password_reset_attempts(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_ip ON password_reset_attempts(ip_address, attempted_at);

-- Create login attempts table for security monitoring
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    success BOOLEAN DEFAULT false NOT NULL,
    failure_reason VARCHAR(100)
);

-- Create indexes for login attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success, attempted_at);

-- Update system configuration for custom auth
INSERT INTO system_config (config_key, config_value, description) VALUES
('session_duration_hours', '24', 'Number of hours a user session remains valid'),
('max_login_attempts', '5', 'Maximum failed login attempts before account lockout'),
('lockout_duration_minutes', '30', 'Duration of account lockout after max failed attempts'),
('password_min_length', '6', 'Minimum password length requirement'),
('require_email_verification', 'true', 'Whether new users must verify their email'),
('password_reset_token_expiry_hours', '1', 'Hours until password reset token expires')
ON CONFLICT (config_key) DO NOTHING;

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old login attempts (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM login_attempts 
    WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old password reset attempts (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_password_reset_attempts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_reset_attempts 
    WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update last_used_at on session access
CREATE OR REPLACE FUNCTION update_session_last_used()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_sessions_last_used 
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW 
    EXECUTE FUNCTION update_session_last_used();

-- Create view for active user sessions
CREATE OR REPLACE VIEW active_user_sessions AS
SELECT 
    s.id,
    s.user_id,
    u.email,
    u.name,
    s.created_at,
    s.last_used_at,
    s.expires_at,
    s.ip_address,
    s.user_agent
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = true 
  AND s.expires_at > CURRENT_TIMESTAMP;

-- Create view for user login statistics
CREATE OR REPLACE VIEW user_login_stats AS
SELECT 
    u.id,
    u.email,
    u.name,
    COUNT(la.id) as total_attempts,
    COUNT(CASE WHEN la.success = true THEN 1 END) as successful_logins,
    COUNT(CASE WHEN la.success = false THEN 1 END) as failed_attempts,
    MAX(CASE WHEN la.success = true THEN la.attempted_at END) as last_successful_login,
    MAX(CASE WHEN la.success = false THEN la.attempted_at END) as last_failed_attempt
FROM users u
LEFT JOIN login_attempts la ON u.email = la.email
GROUP BY u.id, u.email, u.name;

-- Update the user_stats view to include new auth fields
DROP VIEW IF EXISTS user_stats;
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.credits,
    u.is_active,
    u.email_verified,
    u.role,
    u.auth_provider,
    u.created_at,
    COUNT(DISTINCT a.id) as agent_count,
    COUNT(DISTINCT c.id) as call_count,
    COUNT(DISTINCT ct.id) as contact_count,
    COALESCE(SUM(CASE WHEN c.status = 'completed' THEN c.credits_used ELSE 0 END), 0) as total_credits_used,
    COUNT(DISTINCT s.id) as active_sessions
FROM users u
LEFT JOIN agents a ON u.id = a.user_id AND a.is_active = true
LEFT JOIN calls c ON u.id = c.user_id
LEFT JOIN contacts ct ON u.id = ct.user_id
LEFT JOIN user_sessions s ON u.id = s.user_id AND s.is_active = true AND s.expires_at > CURRENT_TIMESTAMP
GROUP BY u.id, u.email, u.name, u.credits, u.is_active, u.email_verified, u.role, u.auth_provider, u.created_at;