import BaseModel, { BaseModelInterface } from './BaseModel';

export interface UserInterface extends BaseModelInterface {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  credits: number;
  is_active: boolean;
  auth_provider: 'email' | 'google' | 'linkedin' | 'github';
  role: 'user' | 'admin' | 'super_admin';
  email_verified: boolean;
  email_verification_sent_at?: Date;
  last_login?: Date | null;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;
  email_verification_token?: string | null;
  created_at: Date;
  updated_at: Date;
  // Additional profile fields
  company?: string | null;
  website?: string | null;
  location?: string | null;
  bio?: string | null;
  phone?: string | null;
}

export class UserModel extends BaseModel<UserInterface> {
  constructor() {
    super('users');
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserInterface | null> {
    return await this.findOne({ email });
  }



  /**
   * Create a new user with default credits
   */
  async createUser(userData: {
    email: string;
    name: string;
    auth_provider?: 'email' | 'google' | 'linkedin' | 'github';
    role?: 'user' | 'admin' | 'super_admin';
  }): Promise<UserInterface> {
    const newUser = await this.create({
      ...userData,
      credits: 15, // Default free credits for new users
      is_active: true,
      auth_provider: userData.auth_provider || 'email',
      role: userData.role || 'user',
      email_verified: false, // New users need to verify email
      email_verification_sent_at: undefined
    });

    return newUser;
  }

  /**
   * Mark email as verified
   */
  async markEmailVerified(userId: string): Promise<UserInterface | null> {
    return await this.update(userId, { 
      email_verified: true,
      email_verification_sent_at: undefined
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<UserInterface | null> {
    return await this.update(userId, { 
      last_login: new Date()
    });
  }

  /**
   * Update email verification sent timestamp
   */
  async updateEmailVerificationSent(userId: string): Promise<UserInterface | null> {
    return await this.update(userId, { 
      email_verification_sent_at: new Date()
    });
  }

  /**
   * Find users who need email verification reminders
   */
  async getUsersNeedingVerificationReminder(hoursThreshold: number = 24): Promise<UserInterface[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE email_verified = false 
        AND is_active = true
        AND email_verification_sent_at IS NOT NULL
        AND email_verification_sent_at < NOW() - INTERVAL '${hoursThreshold} hours'
      ORDER BY created_at ASC
    `;
    
    const result = await this.query(query);
    return result.rows;
  }

  /**
   * Update user credits
   */
  async updateCredits(userId: string, newCredits: number): Promise<UserInterface | null> {
    if (newCredits < 0) {
      throw new Error('Credits cannot be negative');
    }

    return await this.update(userId, { credits: newCredits });
  }

  /**
   * Deduct credits from user account
   */
  async deductCredits(userId: string, amount: number): Promise<UserInterface | null> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.credits < amount) {
      throw new Error('Insufficient credits');
    }

    const newCredits = user.credits - amount;
    return await this.updateCredits(userId, newCredits);
  }

  /**
   * Add credits to user account
   */
  async addCredits(userId: string, amount: number): Promise<UserInterface | null> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const newCredits = user.credits + amount;
    return await this.updateCredits(userId, newCredits);
  }

  /**
   * Get users with low credits (for notifications)
   */
  async getUsersWithLowCredits(threshold: number = 5): Promise<UserInterface[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE credits <= $1 AND is_active = true
      ORDER BY credits ASC
    `;
    
    const result = await this.query(query, [threshold]);
    return result.rows;
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    user: UserInterface;
    totalCalls: number;
    totalCreditsUsed: number;
    agentCount: number;
    contactCount: number;
  }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const statsQuery = `
      SELECT 
        COUNT(DISTINCT c.id) as total_calls,
        COALESCE(SUM(c.credits_used), 0) as total_credits_used,
        COUNT(DISTINCT a.id) as agent_count,
        COUNT(DISTINCT ct.id) as contact_count
      FROM users u
      LEFT JOIN calls c ON u.id = c.user_id
      LEFT JOIN agents a ON u.id = a.user_id AND a.is_active = true
      LEFT JOIN contacts ct ON u.id = ct.user_id
      WHERE u.id = $1
      GROUP BY u.id
    `;

    const result = await this.query(statsQuery, [userId]);
    const stats = result.rows[0] || {
      total_calls: 0,
      total_credits_used: 0,
      agent_count: 0,
      contact_count: 0
    };

    return {
      user,
      totalCalls: parseInt(stats.total_calls),
      totalCreditsUsed: parseInt(stats.total_credits_used),
      agentCount: parseInt(stats.agent_count),
      contactCount: parseInt(stats.contact_count)
    };
  }

  /**
   * Suspend or activate user account
   */
  async setUserStatus(userId: string, isActive: boolean): Promise<UserInterface | null> {
    return await this.update(userId, { is_active: isActive });
  }

  /**
   * Check if user has admin privileges
   */
  isAdmin(user: UserInterface): boolean {
    return user.role === 'admin' || user.role === 'super_admin';
  }

  /**
   * Check if user has super admin privileges
   */
  isSuperAdmin(user: UserInterface): boolean {
    return user.role === 'super_admin';
  }

  /**
   * Get all admin users
   */
  async getAdminUsers(): Promise<UserInterface[]> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE role IN ('admin', 'super_admin')
      ORDER BY role DESC, created_at ASC
    `;
    
    const result = await this.query(query);
    return result.rows;
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, role: 'user' | 'admin' | 'super_admin'): Promise<UserInterface | null> {
    return await this.update(userId, { role });
  }

  /**
   * Get all users with pagination and filtering (admin only)
   */
  async getAllUsersForAdmin(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}): Promise<{
    users: UserInterface[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 50,
      search,
      role,
      isActive,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (search) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      conditions.push(`u.is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${this.tableName} u
      ${whereClause}
    `;

    // Data query with aggregated statistics
    const dataQuery = `
      SELECT 
        u.*,
        COUNT(DISTINCT a.id) as agentCount,
        COUNT(DISTINCT c.id) as callCount,
        COALESCE(SUM(CASE WHEN c.status = 'completed' THEN c.credits_used ELSE 0 END), 0) as creditsUsed
      FROM ${this.tableName} u
      LEFT JOIN agents a ON u.id = a.user_id AND a.is_active = true
      LEFT JOIN calls c ON u.id = c.user_id
      ${whereClause}
      GROUP BY u.id, u.email, u.name, u.credits, u.is_active, u.role, u.auth_provider, 
               u.email_verified, u.email_verification_sent_at, u.last_login, 
               u.password_hash, u.password_reset_token, u.password_reset_expires, u.email_verification_token,
               u.created_at, u.updated_at, u.company, u.website, u.location, u.bio, u.phone
      ORDER BY u.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      this.query(countQuery, params.slice(0, -2)),
      this.query(dataQuery, params)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Convert string numbers to integers and ensure proper field names
    const users = dataResult.rows.map((row: any) => ({
      ...row,
      agentCount: parseInt(row.agentcount) || 0,
      callCount: parseInt(row.callcount) || 0,
      creditsUsed: parseInt(row.creditsused) || 0
    }));

    return {
      users,
      total,
      page,
      limit,
      totalPages
    };
  }

  /**
   * Get system-wide user statistics (admin only)
   */
  async getSystemStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    totalCreditsInSystem: number;
    totalCreditsUsed: number;
    usersByRole: Record<string, number>;
    usersByProvider: Record<string, number>;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_users_today,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_this_week,
        SUM(credits) as total_credits_in_system,
        json_object_agg(role, role_count) as users_by_role,
        json_object_agg(auth_provider, provider_count) as users_by_provider
      FROM (
        SELECT 
          is_active,
          created_at,
          credits,
          role,
          auth_provider,
          COUNT(*) OVER (PARTITION BY role) as role_count,
          COUNT(*) OVER (PARTITION BY auth_provider) as provider_count
        FROM ${this.tableName}
      ) stats
    `;

    const creditsUsedQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_credits_used
      FROM credit_transactions
      WHERE type = 'usage'
    `;

    const [statsResult, creditsResult] = await Promise.all([
      this.query(statsQuery),
      this.query(creditsUsedQuery)
    ]);

    const stats = statsResult.rows[0];

    return {
      totalUsers: parseInt(stats.total_users),
      activeUsers: parseInt(stats.active_users),
      newUsersToday: parseInt(stats.new_users_today),
      newUsersThisWeek: parseInt(stats.new_users_this_week),
      totalCreditsInSystem: parseInt(stats.total_credits_in_system || 0),
      totalCreditsUsed: parseInt(creditsResult.rows[0].total_credits_used),
      usersByRole: stats.users_by_role || {},
      usersByProvider: stats.users_by_provider || {}
    };
  }

  /**
   * Set password reset token and expiry (hashed token stored)
   */
  async setPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<UserInterface | null> {
    return await this.update(userId, {
      password_reset_token: tokenHash,
      password_reset_expires: expiresAt,
    });
  }

  /**
   * Find user by password reset token hash
   */
  async findByPasswordResetToken(tokenHash: string): Promise<UserInterface | null> {
    return await this.findOne({ password_reset_token: tokenHash } as Partial<UserInterface>);
  }

  /**
   * Clear password reset token and expiry after use
   */
  async clearPasswordResetToken(userId: string): Promise<UserInterface | null> {
    return await this.update(userId, {
      password_reset_token: null,
      password_reset_expires: null,
    });
  }
}

export default new UserModel();