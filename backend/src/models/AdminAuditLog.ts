import BaseModel, { BaseModelInterface } from './BaseModel';

export interface AdminAuditLogInterface extends BaseModelInterface {
  id: string;
  admin_user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  target_user_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export class AdminAuditLogModel extends BaseModel<AdminAuditLogInterface> {
  constructor() {
    super('admin_audit_log');
  }

  /**
   * Log an admin action
   */
  async logAction(logData: {
    admin_user_id: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    target_user_id?: string;
    details?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<AdminAuditLogInterface> {
    return await this.create({
      ...logData,
      details: logData.details || {}
    });
  }

  /**
   * Get audit logs for a specific admin user
   */
  async getLogsByAdmin(adminUserId: string, limit: number = 100): Promise<AdminAuditLogInterface[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE admin_user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    const result = await this.query(query, [adminUserId, limit]);
    return result.rows;
  }

  /**
   * Get audit logs for a specific target user
   */
  async getLogsByTargetUser(targetUserId: string, limit: number = 100): Promise<AdminAuditLogInterface[]> {
    const query = `
      SELECT al.*, u.email as admin_email, u.name as admin_name
      FROM ${this.tableName} al
      JOIN users u ON al.admin_user_id = u.id
      WHERE al.target_user_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2
    `;
    
    const result = await this.query(query, [targetUserId, limit]);
    return result.rows;
  }

  /**
   * Get recent admin actions across the system
   */
  async getRecentActions(limit: number = 50): Promise<AdminAuditLogInterface[]> {
    const query = `
      SELECT al.*, u.email as admin_email, u.name as admin_name,
             tu.email as target_email, tu.name as target_name
      FROM ${this.tableName} al
      JOIN users u ON al.admin_user_id = u.id
      LEFT JOIN users tu ON al.target_user_id = tu.id
      ORDER BY al.created_at DESC
      LIMIT $1
    `;
    
    const result = await this.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get audit logs by action type
   */
  async getLogsByAction(action: string, limit: number = 100): Promise<AdminAuditLogInterface[]> {
    const query = `
      SELECT al.*, u.email as admin_email, u.name as admin_name
      FROM ${this.tableName} al
      JOIN users u ON al.admin_user_id = u.id
      WHERE al.action = $1
      ORDER BY al.created_at DESC
      LIMIT $2
    `;
    
    const result = await this.query(query, [action, limit]);
    return result.rows;
  }

  /**
   * Get audit logs by resource type
   */
  async getLogsByResourceType(resourceType: string, limit: number = 100): Promise<AdminAuditLogInterface[]> {
    const query = `
      SELECT al.*, u.email as admin_email, u.name as admin_name
      FROM ${this.tableName} al
      JOIN users u ON al.admin_user_id = u.id
      WHERE al.resource_type = $1
      ORDER BY al.created_at DESC
      LIMIT $2
    `;
    
    const result = await this.query(query, [resourceType, limit]);
    return result.rows;
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(days: number = 30): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByAdmin: Record<string, number>;
    actionsByDay: Array<{ date: string; count: number }>;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_actions,
        json_object_agg(action, action_count) as actions_by_type,
        json_object_agg(admin_email, admin_count) as actions_by_admin
      FROM (
        SELECT 
          al.action,
          u.email as admin_email,
          COUNT(*) as action_count,
          COUNT(*) as admin_count
        FROM ${this.tableName} al
        JOIN users u ON al.admin_user_id = u.id
        WHERE al.created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY al.action, u.email
      ) stats
    `;

    const dailyQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM ${this.tableName}
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const [statsResult, dailyResult] = await Promise.all([
      this.query(statsQuery),
      this.query(dailyQuery)
    ]);

    const stats = statsResult.rows[0] || {
      total_actions: 0,
      actions_by_type: {},
      actions_by_admin: {}
    };

    return {
      totalActions: parseInt(stats.total_actions),
      actionsByType: stats.actions_by_type || {},
      actionsByAdmin: stats.actions_by_admin || {},
      actionsByDay: dailyResult.rows
    };
  }
}

export default new AdminAuditLogModel();