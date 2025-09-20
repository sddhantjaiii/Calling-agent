-- Add admin role support to users table
-- This migration adds role-based access control for admin functionality

-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user' NOT NULL 
CHECK (role IN ('user', 'admin', 'super_admin'));

-- Create index for role-based queries
CREATE INDEX idx_users_role ON users(role);

-- Create admin audit log table for tracking admin actions
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}' NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for audit log
CREATE INDEX idx_admin_audit_log_admin_user_id ON admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_resource_type ON admin_audit_log(resource_type);
CREATE INDEX idx_admin_audit_log_target_user_id ON admin_audit_log(target_user_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at);

-- Update the user_stats view to include role information
DROP VIEW IF EXISTS user_stats;
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.credits,
    u.is_active,
    u.role,
    u.created_at,
    COUNT(DISTINCT a.id) as agent_count,
    COUNT(DISTINCT c.id) as call_count,
    COUNT(DISTINCT ct.id) as contact_count,
    COALESCE(SUM(CASE WHEN c.status = 'completed' THEN c.credits_used ELSE 0 END), 0) as total_credits_used
FROM users u
LEFT JOIN agents a ON u.id = a.user_id AND a.is_active = true
LEFT JOIN calls c ON u.id = c.user_id
LEFT JOIN contacts ct ON u.id = ct.user_id
GROUP BY u.id, u.email, u.name, u.credits, u.is_active, u.role, u.created_at;

-- Insert a default super admin user (this should be updated with real admin credentials)
-- Note: This is a placeholder - in production, admin users should be created through proper channels
INSERT INTO users (email, name, role, credits, is_active, auth_provider) 
VALUES ('admin@example.com', 'System Administrator', 'super_admin', 1000, true, 'email')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';