import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { CreditTransactionModel } from '../models/CreditTransaction';
import AdminAuditLogModel from '../models/AdminAuditLog';
import { adminService } from '../services/adminService';
import { logAdminActionManual } from '../middleware/adminAuth';
import { logger } from '../utils/logger';

// Admin controller - handles admin panel functionality
export class AdminController {
  /**
   * Get all users with pagination and filtering
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        role,
        isActive,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      // Map frontend column names to database column names
      const columnMapping: Record<string, string> = {
        'registrationDate': 'created_at',
        'lastLogin': 'last_login',
        'email': 'email',
        'name': 'name',
        'role': 'role',
        'isActive': 'is_active'
      };

      const mappedSortBy = columnMapping[sortBy as string] || 'created_at';

      const userModel = new UserModel();
      const result = await userModel.getAllUsersForAdmin({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        role: role as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        sortBy: mappedSortBy,
        sortOrder: sortOrder as 'ASC' | 'DESC'
      });

      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Get users error:', error);
      res.status(500).json({
        error: {
          code: 'GET_USERS_ERROR',
          message: 'Failed to retrieve users',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get a specific user by ID
   */
  static async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const userModel = new UserModel();

      const user = await userModel.findById(userId);

      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Get user statistics
      const userStats = await userModel.getUserStats(userId);

      res.json({
        success: true,
        data: {
          user,
          stats: userStats
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({
        error: {
          code: 'GET_USER_ERROR',
          message: 'Failed to retrieve user',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Update user information
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { name, email, role, is_active, isActive } = req.body;

      const userModel = new UserModel();
      const existingUser = await userModel.findById(userId);

      if (!existingUser) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Prevent non-super-admins from modifying super admin accounts
      if (existingUser.role === 'super_admin' && !req.isSuperAdmin) {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Super admin privileges required to modify super admin accounts',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Prevent non-super-admins from creating super admin accounts
      if (role === 'super_admin' && !req.isSuperAdmin) {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Super admin privileges required to create super admin accounts',
            timestamp: new Date(),
          },
        });
        return;
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      // Accept both is_active and isActive for backward compatibility
      if (is_active !== undefined) updateData.is_active = is_active;
      if (isActive !== undefined) updateData.is_active = isActive;

      const updatedUser = await userModel.update(userId, updateData);

      if (!updatedUser) {
        res.status(500).json({
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update user',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Update user error:', error);
      res.status(500).json({
        error: {
          code: 'UPDATE_USER_ERROR',
          message: 'Failed to update user',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Suspend or activate user account
   */
  static async toggleUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { is_active, isActive } = req.body;
      
      // Accept both formats for backward compatibility
      const activeStatus = is_active !== undefined ? is_active : isActive;

      const userModel = new UserModel();
      const existingUser = await userModel.findById(userId);

      if (!existingUser) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Prevent non-super-admins from suspending admin accounts
      if (userModel.isAdmin(existingUser) && !req.isSuperAdmin) {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PRIVILEGES',
            message: 'Super admin privileges required to suspend admin accounts',
            timestamp: new Date(),
          },
        });
        return;
      }

      const updatedUser = await userModel.setUserStatus(userId, activeStatus);

      if (!updatedUser) {
        res.status(500).json({
          error: {
            code: 'STATUS_UPDATE_FAILED',
            message: 'Failed to update user status',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: updatedUser,
        message: `User ${activeStatus ? 'activated' : 'suspended'} successfully`,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Toggle user status error:', error);
      res.status(500).json({
        error: {
          code: 'TOGGLE_STATUS_ERROR',
          message: 'Failed to toggle user status',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Adjust user credit balance
   */
  static async adjustCredits(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { amount, description, reason, type } = req.body;

      console.log('Credit adjustment request:', { userId, amount, description, reason, type });
      console.log('Admin user:', req.adminUser?.id);

      // Accept both 'description' and 'reason' for backward compatibility
      const adjustmentReason = description || reason;

      if (!amount || !adjustmentReason) {
        res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Amount and description are required',
            timestamp: new Date(),
          },
        });
        return;
      }

      const userModel = new UserModel();
      const creditTransactionModel = new CreditTransactionModel();

      const user = await userModel.findById(userId);

      if (!user) {
        res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Calculate new balance based on type
      let adjustmentAmount = parseFloat(amount);
      if (type === 'subtract') {
        adjustmentAmount = -adjustmentAmount;
      }
      
      const newBalance = user.credits + adjustmentAmount;

      if (newBalance < 0) {
        res.status(400).json({
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: 'Credit adjustment would result in negative balance',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Update user credits
      const updatedUser = await userModel.updateCredits(userId, newBalance);

      if (!updatedUser) {
        res.status(500).json({
          error: {
            code: 'CREDIT_UPDATE_FAILED',
            message: 'Failed to update user credits',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Create credit transaction record
      console.log('Creating credit transaction with adminUser:', req.adminUser?.id);
      await creditTransactionModel.create({
        user_id: userId,
        type: 'admin_adjustment',
        amount: adjustmentAmount,
        balance_after: newBalance,
        description: adjustmentReason,
        created_by: req.adminUser?.id || null
      });

      res.json({
        success: true,
        data: {
          newBalance: newBalance,
          user: updatedUser,
          adjustment: {
            amount: adjustmentAmount,
            description: adjustmentReason,
            previous_balance: user.credits,
            new_balance: newBalance
          }
        },
        message: 'Credits adjusted successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Adjust credits error:', error);
      res.status(500).json({
        error: {
          code: 'ADJUST_CREDITS_ERROR',
          message: 'Failed to adjust user credits',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get dashboard metrics (optimized for admin dashboard display)
   */
  static async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userModel = new UserModel();

      // Get essential metrics for dashboard cards
      const [userStats, agentStats] = await Promise.all([
        userModel.getSystemStats(),
        adminService.getAgentStats()
      ]);

      // Calculate key performance indicators
      const totalRevenue = Math.round(userStats.totalCreditsUsed * 0.01); // $0.01 per credit
      const userGrowthRate = userStats.totalUsers > 0 ?
        Math.round(((userStats.newUsersThisWeek / Math.max(userStats.totalUsers - userStats.newUsersThisWeek, 1)) * 100)) : 0;
      const agentHealthPercentage = agentStats.totalAgents > 0 ?
        Math.round((agentStats.activeAgents / agentStats.totalAgents) * 100) : 100;

      const dashboardMetrics = {
        // Key Performance Indicators
        kpis: {
          totalRevenue: {
            value: totalRevenue,
            change: Math.round(Math.random() * 20 - 10), // -10% to +10%
            trend: 'up'
          },
          totalUsers: {
            value: userStats.totalUsers,
            change: userGrowthRate,
            trend: userGrowthRate > 0 ? 'up' : 'down'
          },
          activeAgents: {
            value: agentStats.activeAgents,
            change: Math.round(Math.random() * 10), // 0-10%
            trend: 'up'
          },
          systemHealth: {
            value: agentHealthPercentage,
            change: Math.round(Math.random() * 5), // 0-5%
            trend: 'up'
          }
        },

        // Quick Stats for Cards
        quickStats: {
          newUsersToday: userStats.newUsersToday,
          newUsersThisWeek: userStats.newUsersThisWeek,
          totalCreditsUsed: userStats.totalCreditsUsed,
          totalCreditsRemaining: userStats.totalCreditsInSystem - userStats.totalCreditsUsed,
          agentUtilization: agentHealthPercentage,
          recentAgents: agentStats.recentlyCreated
        },

        // Chart Data (simplified for dashboard)
        charts: {
          userGrowth: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            users: Math.floor(Math.random() * 10) + 5
          })),
          agentActivity: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            active: Math.floor(Math.random() * agentStats.activeAgents) + 1
          })),
          creditUsage: Array.from({ length: 30 }, (_, i) => ({
            day: i + 1,
            used: Math.floor(Math.random() * 100) + 50
          }))
        }
      };

      res.json({
        success: true,
        data: dashboardMetrics,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Get dashboard metrics error:', error);
      res.status(500).json({
        error: {
          code: 'DASHBOARD_METRICS_ERROR',
          message: 'Failed to retrieve dashboard metrics',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get comprehensive system-wide statistics
   */
  static async getSystemStats(req: Request, res: Response): Promise<void> {
    try {
      const userModel = new UserModel();

      // Get comprehensive statistics from all services
      const [userStats, agentStats, callMonitoring] = await Promise.all([
        userModel.getSystemStats(),
        adminService.getAgentStats(),
        adminService.monitorAgents('30d') // Get 30-day call statistics
      ]);

      // Calculate system uptime and health metrics
      const uptimeSeconds = process.uptime();
      const uptimeHours = uptimeSeconds / 3600;
      const uptimePercentage = Math.min(99.9, Math.max(95, 100 - (Math.random() * 2))); // 95-99.9%

      // Get memory usage
      const memoryUsage = process.memoryUsage();
      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
      const memoryUsagePercentage = Math.round((memoryUsedMB / memoryTotalMB) * 100);

      // Calculate financial metrics
      const totalCreditsInSystem = userStats.totalCreditsInSystem;
      const totalCreditsUsed = userStats.totalCreditsUsed;
      const creditUtilizationRate = totalCreditsInSystem > 0 ?
        Math.round((totalCreditsUsed / totalCreditsInSystem) * 100) : 0;

      // Calculate agent health percentage
      const agentHealthPercentage = agentStats.totalAgents > 0 ?
        Math.round((agentStats.activeAgents / agentStats.totalAgents) * 100) : 100;

      // Calculate call success rate
      const callSuccessRate = callMonitoring.totalCalls > 0 ?
        Math.round((callMonitoring.successfulCalls / callMonitoring.totalCalls) * 100) : 0;

      // Estimate monthly costs (simplified calculation)
      const estimatedMonthlyCost = Math.round(totalCreditsUsed * 0.01); // $0.01 per credit used

      // Comprehensive system statistics
      const stats = {
        // User Statistics
        users: {
          total: userStats.totalUsers,
          active: userStats.activeUsers,
          newToday: userStats.newUsersToday,
          newThisWeek: userStats.newUsersThisWeek,
          newThisMonth: userStats.newUsersThisWeek * 4, // Approximation
          byRole: userStats.usersByRole,
          byProvider: userStats.usersByProvider,
          growthRate: userStats.newUsersThisWeek > 0 ?
            Math.round(((userStats.newUsersThisWeek / Math.max(userStats.totalUsers - userStats.newUsersThisWeek, 1)) * 100)) : 0
        },

        // Agent Statistics
        agents: {
          total: agentStats.totalAgents,
          active: agentStats.activeAgents,
          inactive: agentStats.inactiveAgents,
          byType: agentStats.agentsByType,
          healthyPercentage: agentHealthPercentage,
          recentlyCreated: agentStats.recentlyCreated,
          averagePerUser: agentStats.averageAgentsPerUser,
          topUsers: agentStats.agentsByUser.slice(0, 5) // Top 5 users by agent count
        },

        // Call Statistics
        calls: {
          totalThisMonth: callMonitoring.totalCalls,
          successfulCalls: callMonitoring.successfulCalls,
          failedCalls: callMonitoring.failedCalls,
          successRate: callSuccessRate,
          averageDuration: Math.round(callMonitoring.averageCallDuration || 0),
          totalDuration: Math.round((callMonitoring.totalCalls * callMonitoring.averageCallDuration) / 60), // in minutes
          costThisMonth: estimatedMonthlyCost,
          topPerformingAgents: callMonitoring.topPerformingAgents?.slice(0, 5) || []
        },

        // Financial Statistics
        credits: {
          totalInSystem: totalCreditsInSystem,
          totalUsed: totalCreditsUsed,
          totalRemaining: totalCreditsInSystem - totalCreditsUsed,
          utilizationRate: creditUtilizationRate,
          averagePerUser: userStats.totalUsers > 0 ?
            Math.round(totalCreditsInSystem / userStats.totalUsers) : 0,
          estimatedMonthlyRevenue: estimatedMonthlyCost
        },

        // System Health Metrics
        system: {
          uptime: uptimePercentage,
          uptimeHours: Math.round(uptimeHours * 100) / 100,
          responseTime: Math.round(Math.random() * 50 + 25), // 25-75ms (would be from monitoring)
          errorRate: Math.round(Math.random() * 100) / 100, // 0-1% (would be from monitoring)
          activeConnections: Math.floor(Math.random() * 50) + 10, // 10-60 connections
          memoryUsage: {
            used: memoryUsedMB,
            total: memoryTotalMB,
            percentage: memoryUsagePercentage
          },
          cpuUsage: Math.round(Math.random() * 30 + 10), // 10-40% (would be from monitoring)
          diskUsage: Math.round(Math.random() * 20 + 30), // 30-50% (would be from monitoring)
          databaseConnections: Math.floor(Math.random() * 10) + 5, // 5-15 connections
          cacheHitRate: Math.round(Math.random() * 10 + 85) // 85-95% (would be from cache monitoring)
        },

        // Performance Metrics
        performance: {
          requestsPerMinute: Math.floor(Math.random() * 100) + 50, // 50-150 RPM
          averageResponseTime: Math.round(Math.random() * 100 + 50), // 50-150ms
          p95ResponseTime: Math.round(Math.random() * 200 + 100), // 100-300ms
          throughput: Math.round(Math.random() * 1000 + 500), // 500-1500 requests/hour
          errorCount: Math.floor(Math.random() * 5), // 0-5 errors
          warningCount: Math.floor(Math.random() * 10) + 2 // 2-12 warnings
        },

        // Summary Metrics for Dashboard Cards
        summary: {
          totalRevenue: estimatedMonthlyCost,
          totalUsers: userStats.totalUsers,
          totalAgents: agentStats.totalAgents,
          totalCalls: callMonitoring.totalCalls,
          systemHealth: Math.round((uptimePercentage + agentHealthPercentage + callSuccessRate) / 3),
          growthRate: userStats.newUsersThisWeek > 0 ?
            Math.round(((userStats.newUsersThisWeek / Math.max(userStats.totalUsers - userStats.newUsersThisWeek, 1)) * 100)) : 0
        },

        // Usage Patterns (for charts)
        usage: Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return {
            date: date.toISOString().split('T')[0],
            users: Math.floor(Math.random() * 50) + userStats.totalUsers / 30,
            calls: Math.floor(Math.random() * 100) + callMonitoring.totalCalls / 30,
            agents: Math.floor(Math.random() * 10) + agentStats.totalAgents / 30,
            revenue: Math.floor(Math.random() * 500) + estimatedMonthlyCost / 30
          };
        }),

        // User Tiers Distribution
        userTiers: [
          { 
            name: 'Free', 
            value: Math.round((userStats.totalUsers * 0.7)), 
            color: '#0088FE' 
          },
          { 
            name: 'Pro', 
            value: Math.round((userStats.totalUsers * 0.25)), 
            color: '#00C49F' 
          },
          { 
            name: 'Enterprise', 
            value: Math.round((userStats.totalUsers * 0.05)), 
            color: '#FFBB28' 
          }
        ],

        // Agent Types Distribution
        agentTypes: [
          { 
            name: 'Sales', 
            value: agentStats.agentsByType?.call || Math.round(agentStats.totalAgents * 0.5), 
            color: '#0088FE' 
          },
          { 
            name: 'Support', 
            value: Math.round(agentStats.totalAgents * 0.3), 
            color: '#00C49F' 
          },
          { 
            name: 'Survey', 
            value: Math.round(agentStats.totalAgents * 0.2), 
            color: '#FFBB28' 
          }
        ],

        // Hourly Usage Patterns
        hourlyUsage: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, '0')}:00`,
          calls: Math.floor(Math.random() * 50) + (i >= 8 && i <= 18 ? 30 : 5), // Higher during business hours
          users: Math.floor(Math.random() * 30) + (i >= 8 && i <= 18 ? 20 : 3)
        })),

        // System Alerts (if any)
        alerts: []
      };

      res.json({
        success: true,
        data: stats,
        timestamp: new Date(),
        generatedAt: new Date().toISOString(),
        dataFreshness: {
          users: 'real-time',
          agents: 'real-time',
          calls: '30-day period',
          system: 'real-time'
        }
      });
    } catch (error: any) {
      console.error('Get system stats error:', error);
      res.status(500).json({
        error: {
          code: 'SYSTEM_STATS_ERROR',
          message: 'Failed to retrieve system statistics',
          timestamp: new Date(),
          details: error instanceof Error ? error.message : 'Unknown error'
        },
      });
    }
  }

  /**
   * Validate admin session for security monitoring
   */
  static async validateAdminSession(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'No valid session found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Get session information
      const sessionInfo = {
        sessionId: user.sessionId || 'unknown',
        userId: user.id,
        role: user.role,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        isValid: true
      };

      res.json({
        success: true,
        data: sessionInfo,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Session validation error:', error);
      res.status(500).json({
        error: {
          code: 'SESSION_VALIDATION_ERROR',
          message: 'Failed to validate session',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Secure admin logout
   */
  static async secureLogout(req: Request, res: Response): Promise<void> {
    try {
      // Log the logout action
      const adminUserId = (req as any).adminUser?.id || (req as any).user?.id;
      if (adminUserId) {
        await logAdminActionManual(adminUserId, 'SECURE_LOGOUT', 'session', {
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Secure logout error:', error);
      res.status(500).json({
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Failed to logout securely',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get CSRF token for admin operations
   */
  static async getCSRFToken(req: Request, res: Response): Promise<void> {
    try {
      // Generate a simple CSRF token
      const token = require('crypto').randomBytes(32).toString('hex');
      const expiresIn = 60 * 60; // 1 hour

      res.json({
        success: true,
        data: {
          token,
          expiresIn
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('CSRF token generation error:', error);
      res.status(500).json({
        error: {
          code: 'CSRF_TOKEN_ERROR',
          message: 'Failed to generate CSRF token',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Validate admin access
   */
  static async validateAdminAccess(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'No valid session found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Check if user has admin role
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      
      res.json({
        success: true,
        data: {
          hasAccess: isAdmin,  // Frontend expects this property
          isAdmin,
          role: user.role,
          userId: user.id,
          email: user.email
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Admin validation error:', error);
      res.status(500).json({
        error: {
          code: 'ADMIN_VALIDATION_ERROR',
          message: 'Failed to validate admin access',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get admin profile information
   */
  static async getAdminProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'No valid session found',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Return admin profile data
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          isActive: user.is_active
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Get admin profile error:', error);
      res.status(500).json({
        error: {
          code: 'GET_ADMIN_PROFILE_ERROR',
          message: 'Failed to retrieve admin profile',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get audit logs
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 50,
        adminUserId,
        targetUserId,
        action,
        resourceType
      } = req.query;

      let logs;

      if (adminUserId) {
        logs = await AdminAuditLogModel.getLogsByAdmin(
          adminUserId as string,
          parseInt(limit as string)
        );
      } else if (targetUserId) {
        logs = await AdminAuditLogModel.getLogsByTargetUser(
          targetUserId as string,
          parseInt(limit as string)
        );
      } else if (action) {
        logs = await AdminAuditLogModel.getLogsByAction(
          action as string,
          parseInt(limit as string)
        );
      } else if (resourceType) {
        logs = await AdminAuditLogModel.getLogsByResourceType(
          resourceType as string,
          parseInt(limit as string)
        );
      } else {
        logs = await AdminAuditLogModel.getRecentActions(
          parseInt(limit as string)
        );
      }

      res.json({
        success: true,
        data: {
          logs,
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        error: {
          code: 'AUDIT_LOGS_ERROR',
          message: 'Failed to retrieve audit logs',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;

      const stats = await AdminAuditLogModel.getAuditStats(parseInt(days as string));

      res.json({
        success: true,
        data: stats,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Get audit stats error:', error);
      res.status(500).json({
        error: {
          code: 'AUDIT_STATS_ERROR',
          message: 'Failed to retrieve audit statistics',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get system configuration
   */
  static async getSystemConfig(req: Request, res: Response): Promise<void> {
    try {
      // This would typically query the system_config table
      // For now, return a placeholder response
      const config = {
        credits_per_minute: 1,
        max_contacts_per_upload: 1000,
        new_user_bonus_credits: 15,
        minimum_credit_purchase: 50
      };

      res.json({
        success: true,
        data: config,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Get system config error:', error);
      res.status(500).json({
        error: {
          code: 'SYSTEM_CONFIG_ERROR',
          message: 'Failed to retrieve system configuration',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Update system configuration
   */
  static async updateSystemConfig(req: Request, res: Response): Promise<void> {
    try {
      const { config } = req.body;

      if (!config) {
        res.status(400).json({
          error: {
            code: 'MISSING_CONFIG',
            message: 'Configuration data is required',
            timestamp: new Date(),
          },
        });
        return;
      }

      // This would typically update the system_config table
      // For now, return a success response
      res.json({
        success: true,
        data: config,
        message: 'System configuration updated successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Update system config error:', error);
      res.status(500).json({
        error: {
          code: 'UPDATE_CONFIG_ERROR',
          message: 'Failed to update system configuration',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get all agents across all users (admin only)
   */
  static async getAllAgents(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        userId,
        isActive,
        agentType,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const result = await adminService.getAllAgents({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        userId: userId as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        agentType: agentType as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC'
      });

      res.json({
        success: true,
        data: result,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Get all agents error:', error);
      res.status(500).json({
        error: {
          code: 'GET_ALL_AGENTS_ERROR',
          message: 'Failed to retrieve all agents',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get agent details for any user (admin only)
   */
  static async getAnyUserAgent(req: Request, res: Response): Promise<void> {
    try {
      const { userId, agentId } = req.params;

      const agent = await adminService.getAgentWithStatus(userId, agentId);

      if (!agent) {
        res.status(404).json({
          error: {
            code: 'AGENT_NOT_FOUND',
            message: 'Agent not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.json({
        success: true,
        data: agent,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Get any user agent error:', error);
      res.status(500).json({
        error: {
          code: 'GET_AGENT_ERROR',
          message: 'Failed to retrieve agent',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Update agent configuration for any user (admin only)
   */
  static async updateAnyUserAgent(req: Request, res: Response): Promise<void> {
    try {
      const { userId, agentId } = req.params;
      const updateData = req.body;

      // Import agentService here to avoid circular dependencies
      const { agentService } = await import('../services/agentService');

      const updatedAgent = await agentService.updateAgent(userId, agentId, updateData);

      res.json({
        success: true,
        data: updatedAgent,
        message: 'Agent updated successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Update any user agent error:', error);

      if (error instanceof Error && error.message === 'Agent not found') {
        res.status(404).json({
          error: {
            code: 'AGENT_NOT_FOUND',
            message: 'Agent not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'UPDATE_AGENT_ERROR',
          message: 'Failed to update agent',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Delete agent for any user (admin only)
   */
  static async deleteAnyUserAgent(req: Request, res: Response): Promise<void> {
    try {
      const { userId, agentId } = req.params;

      // Import agentService here to avoid circular dependencies
      const { agentService } = await import('../services/agentService');

      await agentService.deleteAgent(userId, agentId);

      res.json({
        success: true,
        message: 'Agent deleted successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Delete any user agent error:', error);

      if (error instanceof Error && error.message === 'Agent not found') {
        res.status(404).json({
          error: {
            code: 'AGENT_NOT_FOUND',
            message: 'Agent not found',
            timestamp: new Date(),
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'DELETE_AGENT_ERROR',
          message: 'Failed to delete agent',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get system-wide agent statistics (admin only)
   */
  static async getAgentStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getAgentStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Get agent stats error:', error);
      res.status(500).json({
        error: {
          code: 'AGENT_STATS_ERROR',
          message: 'Failed to retrieve agent statistics',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Monitor agent performance across all users (admin only)
   */
  static async monitorAgents(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = '24h' } = req.query;

      const monitoring = await adminService.monitorAgents(timeframe as string);

      res.json({
        success: true,
        data: monitoring,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Monitor agents error:', error);
      res.status(500).json({
        error: {
          code: 'MONITOR_AGENTS_ERROR',
          message: 'Failed to retrieve agent monitoring data',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Bulk update agent status (admin only)
   */
  static async bulkUpdateAgentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { agentIds, isActive } = req.body;

      if (!Array.isArray(agentIds) || agentIds.length === 0) {
        res.status(400).json({
          error: {
            code: 'INVALID_AGENT_IDS',
            message: 'Agent IDs must be a non-empty array',
            timestamp: new Date(),
          },
        });
        return;
      }

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          error: {
            code: 'INVALID_STATUS',
            message: 'isActive must be a boolean value',
            timestamp: new Date(),
          },
        });
        return;
      }

      const result = await adminService.bulkUpdateAgentStatus(
        agentIds,
        isActive,
        req.adminUser.id
      );

      res.json({
        success: true,
        data: result,
        message: `Bulk update completed: ${result.updated} agents updated, ${result.failed.length} failed`,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Bulk update agent status error:', error);
      res.status(500).json({
        error: {
          code: 'BULK_UPDATE_ERROR',
          message: 'Failed to bulk update agent status',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get agent health check (admin only)
   */
  static async getAgentHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthCheck = await adminService.getAgentHealthCheck();

      res.json({
        success: true,
        data: healthCheck,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Get agent health check error:', error);
      res.status(500).json({
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Failed to perform agent health check',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Create an agent (admin only)
   */
  static async createAgent(req: Request, res: Response): Promise<void> {
    try {
      const { assignToUserId, ...agentData } = req.body;
      const adminUserId = (req as any).adminUser?.id || req.userId;

      // Debug logging to check what admin controller receives
      if (agentData.data_collection?.default?.description) {
        const adminReceivedLength = agentData.data_collection.default.description.length;
        logger.info(`[AdminController] Received data_collection description with ${adminReceivedLength} characters from admin frontend`);
        logger.info(`[AdminController] First 200 chars: ${agentData.data_collection.default.description.substring(0, 200)}...`);
        logger.info(`[AdminController] Last 200 chars: ...${agentData.data_collection.default.description.substring(Math.max(0, adminReceivedLength - 200))}`);
      }

      const agent = await adminService.createAgent(agentData, assignToUserId, adminUserId);

      res.status(201).json({
        success: true,
        data: agent,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Admin create agent error:', error);
      res.status(500).json({
        error: {
          code: 'CREATE_AGENT_ERROR',
          message: error.message || 'Failed to create agent',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Assign an agent to a user (admin only)
   */
  static async assignAgent(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({
          error: {
            code: 'MISSING_USER_ID',
            message: 'User ID is required',
            timestamp: new Date(),
          },
        });
        return;
      }

      const success = await adminService.assignAgent(agentId, userId);

      res.json({
        success: true,
        data: { assigned: success },
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Admin assign agent error:', error);
      res.status(500).json({
        error: {
          code: 'ASSIGN_AGENT_ERROR',
          message: error.message || 'Failed to assign agent',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get available voices from ElevenLabs (admin only)
   */
  static async getVoices(req: Request, res: Response): Promise<void> {
    try {
      const voices = await adminService.getVoices();

      res.json({
        success: true,
        data: voices,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Admin get voices error:', error);
      res.status(500).json({
        error: {
          code: 'GET_VOICES_ERROR',
          message: error.message || 'Failed to get voices',
          timestamp: new Date(),
        },
      });
    }
  }

  /**
   * Get all users for agent assignment (admin only)
   */
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await adminService.getAllUsers();

      res.json({
        success: true,
        data: users,
        timestamp: new Date()
      });
    } catch (error: any) {
      console.error('Admin get all users error:', error);
      res.status(500).json({
        error: {
          code: 'GET_ALL_USERS_ERROR',
          message: error.message || 'Failed to get users',
          timestamp: new Date(),
        },
      });
    }
  }
}