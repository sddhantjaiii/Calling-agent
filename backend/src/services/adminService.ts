import { AgentModel, AgentInterface } from '../models/Agent';
import Agent from '../models/Agent';

import { elevenlabsService } from './elevenLabsService';
import { logger } from '../utils/logger';

export interface AdminAgentStats {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  agentsByType: {
    call: number;
    chat: number;
  };
  agentsByUser: Array<{
    userId: string;
    userEmail: string;
    userName: string;
    agentCount: number;
  }>;
  recentlyCreated: number;
  averageAgentsPerUser: number;
}

export interface AdminAgentMonitoring {
  timeframe: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageCallDuration: number;
  topPerformingAgents: Array<{
    agentId: string;
    agentName: string;
    userId: string;
    userEmail: string;
    callCount: number;
    successRate: number;
    averageDuration: number;
  }>;
  errorRates: Record<string, number>;
  usageByHour: Array<{
    hour: string;
    callCount: number;
  }>;
}

export interface AdminAgentListItem extends AgentInterface {
  user_email: string;
  user_name: string;
  call_count: number;
  last_call_at?: Date;
  elevenlabs_status?: string;
}

class AdminService {
  /**
   * Get all agents across all users with pagination and filtering
   */
  async getAllAgents(options: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
    isActive?: boolean;
    agentType?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}): Promise<{
    agents: AdminAgentListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 50,
      search,
      userId,
      isActive,
      agentType,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (search) {
      conditions.push(`(a.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (userId) {
      conditions.push(`a.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (isActive !== undefined) {
      conditions.push(`a.is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    if (agentType) {
      conditions.push(`a.agent_type = $${paramIndex}`);
      params.push(agentType);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM agents a
      JOIN users u ON a.user_id = u.id
      ${whereClause}
    `;

    // Data query
    const dataQuery = `
      SELECT 
        a.*,
        u.email as user_email,
        u.name as user_name,
        COUNT(c.id) as call_count,
        MAX(c.created_at) as last_call_at
      FROM agents a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN calls c ON a.id = c.agent_id
      ${whereClause}
      GROUP BY a.id, u.email, u.name
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    try {
      const agentModel = new AgentModel();
      const [countResult, dataResult] = await Promise.all([
        agentModel.query(countQuery, params.slice(0, -2)),
        agentModel.query(dataQuery, params)
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      return {
        agents: dataResult.rows,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error('Failed to get all agents:', error);
      throw new Error(`Failed to get all agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get comprehensive agent statistics for admin dashboard
   */
  async getAgentStats(): Promise<AdminAgentStats> {
    try {
      const agentModel = new AgentModel();
      
      const statsQuery = `
        SELECT 
          COUNT(*) as total_agents,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_agents,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_agents,
          COUNT(CASE WHEN agent_type = 'call' THEN 1 END) as call_agents,
          COUNT(CASE WHEN agent_type = 'chat' THEN 1 END) as chat_agents,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recently_created
        FROM agents
      `;

      const userAgentQuery = `
        SELECT 
          u.id as user_id,
          u.email as user_email,
          u.name as user_name,
          COUNT(a.id) as agent_count
        FROM users u
        LEFT JOIN agents a ON u.id = a.user_id
        GROUP BY u.id, u.email, u.name
        HAVING COUNT(a.id) > 0
        ORDER BY agent_count DESC
        LIMIT 20
      `;

      const totalUsersQuery = `
        SELECT COUNT(DISTINCT user_id) as total_users_with_agents
        FROM agents
      `;

      const [statsResult, userAgentResult, totalUsersResult] = await Promise.all([
        agentModel.query(statsQuery),
        agentModel.query(userAgentQuery),
        agentModel.query(totalUsersQuery)
      ]);

      const stats = statsResult.rows[0];
      const totalUsersWithAgents = parseInt(totalUsersResult.rows[0].total_users_with_agents);
      const averageAgentsPerUser = totalUsersWithAgents > 0 ? 
        parseInt(stats.total_agents) / totalUsersWithAgents : 0;

      return {
        totalAgents: parseInt(stats.total_agents),
        activeAgents: parseInt(stats.active_agents),
        inactiveAgents: parseInt(stats.inactive_agents),
        agentsByType: {
          call: parseInt(stats.call_agents),
          chat: parseInt(stats.chat_agents)
        },
        agentsByUser: userAgentResult.rows.map((row: any) => ({
          userId: row.user_id,
          userEmail: row.user_email,
          userName: row.user_name,
          agentCount: parseInt(row.agent_count)
        })),
        recentlyCreated: parseInt(stats.recently_created),
        averageAgentsPerUser: Math.round(averageAgentsPerUser * 100) / 100
      };
    } catch (error) {
      logger.error('Failed to get agent stats:', error);
      throw new Error(`Failed to get agent stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Monitor agent performance across all users
   */
  async monitorAgents(timeframe: string = '24h'): Promise<AdminAgentMonitoring> {
    try {
      const agentModel = new AgentModel();
      
      // Convert timeframe to SQL interval
      const intervalMap: Record<string, string> = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };
      
      const interval = intervalMap[timeframe] || '24 hours';

      const callStatsQuery = `
        SELECT 
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_calls,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_calls,
          AVG(CASE WHEN status = 'completed' THEN duration_minutes END) as avg_duration
        FROM calls
        WHERE created_at >= NOW() - INTERVAL '${interval}'
      `;

      const topAgentsQuery = `
        SELECT 
          a.id as agent_id,
          a.name as agent_name,
          a.user_id,
          u.email as user_email,
          COUNT(c.id) as call_count,
          COUNT(CASE WHEN c.status = 'completed' THEN 1 END)::float / NULLIF(COUNT(c.id), 0) as success_rate,
          AVG(CASE WHEN c.status = 'completed' THEN c.duration_minutes END) as avg_duration
        FROM agents a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN calls c ON a.id = c.agent_id AND c.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY a.id, a.name, a.user_id, u.email
        HAVING COUNT(c.id) > 0
        ORDER BY call_count DESC
        LIMIT 10
      `;

      const hourlyUsageQuery = `
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as call_count
        FROM calls
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `;

      const [callStatsResult, topAgentsResult, hourlyUsageResult] = await Promise.all([
        agentModel.query(callStatsQuery),
        agentModel.query(topAgentsQuery),
        agentModel.query(hourlyUsageQuery)
      ]);

      const callStats = callStatsResult.rows[0];

      return {
        timeframe,
        totalCalls: parseInt(callStats.total_calls || 0),
        successfulCalls: parseInt(callStats.successful_calls || 0),
        failedCalls: parseInt(callStats.failed_calls || 0),
        averageCallDuration: parseFloat(callStats.avg_duration || 0),
        topPerformingAgents: topAgentsResult.rows.map((row: any) => ({
          agentId: row.agent_id,
          agentName: row.agent_name,
          userId: row.user_id,
          userEmail: row.user_email,
          callCount: parseInt(row.call_count),
          successRate: parseFloat(row.success_rate || 0),
          averageDuration: parseFloat(row.avg_duration || 0)
        })),
        errorRates: {
          // This would be calculated based on error types
          // For now, return empty object
        },
        usageByHour: hourlyUsageResult.rows.map((row: any) => ({
          hour: `${row.hour}:00`,
          callCount: parseInt(row.call_count)
        }))
      };
    } catch (error) {
      logger.error('Failed to monitor agents:', error);
      throw new Error(`Failed to monitor agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get agent with ElevenLabs status for any user
   */
  async getAgentWithStatus(userId: string, agentId: string): Promise<any> {
    try {
      const agentModel = new AgentModel();
      const agent = await agentModel.findOne({ id: agentId, user_id: userId });
      
      if (!agent) {
        return null;
      }

      // Try to get ElevenLabs status
      let elevenlabsStatus = 'unknown';
      let elevenlabsConfig = null;
      
      try {
        elevenlabsConfig = await elevenlabsService.getAgent(agent.elevenlabs_agent_id);
        elevenlabsStatus = 'active';
      } catch (error) {
        logger.warn(`Failed to get ElevenLabs status for agent ${agentId}:`, error);
        elevenlabsStatus = 'error';
      }

      return {
        ...agent,
        elevenlabs_status: elevenlabsStatus,
        elevenlabs_config: elevenlabsConfig
      };
    } catch (error) {
      logger.error(`Failed to get agent with status ${agentId}:`, error);
      throw new Error(`Failed to get agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk update agent status (activate/deactivate multiple agents)
   */
  async bulkUpdateAgentStatus(agentIds: string[], isActive: boolean, adminUserId: string): Promise<{
    updated: number;
    failed: Array<{ agentId: string; error: string }>;
  }> {
    const results = {
      updated: 0,
      failed: [] as Array<{ agentId: string; error: string }>
    };

    const agentModel = new AgentModel();
    for (const agentId of agentIds) {
      try {
        await agentModel.update(agentId, { is_active: isActive });
        results.updated++;
        
        logger.info(`Admin ${adminUserId} ${isActive ? 'activated' : 'deactivated'} agent ${agentId}`);
      } catch (error) {
        results.failed.push({
          agentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        logger.error(`Failed to update agent ${agentId}:`, error);
      }
    }

    return results;
  }

  /**
   * Get system-wide agent health check
   */
  async getAgentHealthCheck(): Promise<{
    totalAgents: number;
    healthyAgents: number;
    unhealthyAgents: number;
    unreachableAgents: number;
    healthDetails: Array<{
      agentId: string;
      agentName: string;
      userId: string;
      status: 'healthy' | 'unhealthy' | 'unreachable';
      lastChecked: Date;
      error?: string;
    }>;
  }> {
    try {
      const agentModel = new AgentModel();
      const agents = await agentModel.findAll();
      const healthDetails = [];
      let healthyCount = 0;
      let unhealthyCount = 0;
      let unreachableCount = 0;

      for (const agent of agents) {
        let status: 'healthy' | 'unhealthy' | 'unreachable' = 'healthy';
        let error: string | undefined;

        try {
          // Try to ping the agent via ElevenLabs API
          await elevenlabsService.getAgent(agent.elevenlabs_agent_id);
          healthyCount++;
        } catch (err) {
          if (err instanceof Error) {
            if (err.message.includes('404') || err.message.includes('not found')) {
              status = 'unreachable';
              unreachableCount++;
              error = 'Agent not found in ElevenLabs';
            } else {
              status = 'unhealthy';
              unhealthyCount++;
              error = err.message;
            }
          } else {
            status = 'unhealthy';
            unhealthyCount++;
            error = 'Unknown error';
          }
        }

        healthDetails.push({
          agentId: agent.id,
          agentName: agent.name,
          userId: agent.user_id,
          status,
          lastChecked: new Date(),
          error
        });
      }

      return {
        totalAgents: agents.length,
        healthyAgents: healthyCount,
        unhealthyAgents: unhealthyCount,
        unreachableAgents: unreachableCount,
        healthDetails
      };
    } catch (error) {
      logger.error('Failed to perform agent health check:', error);
      throw new Error(`Failed to perform health check: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create an agent on behalf of a user (admin only)
   */
  async createAgent(agentData: any, assignToUserId?: string, adminUserId?: string): Promise<any> {
    try {
      const { agentService } = await import('./agentService');
      
      if (assignToUserId) {
        // Create agent for the specified user
        const agent = await agentService.createAgent(assignToUserId, agentData);
        logger.info(`Admin created agent ${agent.id} for user ${assignToUserId}`);
        return agent;
      } else {
        // Create unassigned agent - use admin user ID as the owner for now
        const ownerUserId = adminUserId || process.env.SYSTEM_USER_ID || 'admin-default';
        const agent = await agentService.createAgent(ownerUserId, agentData);
        logger.info(`Admin created unassigned agent ${agent.id} with owner ${ownerUserId}`);
        return agent;
      }
    } catch (error) {
      logger.error('Failed to create agent as admin:', error);
      throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign an existing agent to a different user (admin only)
   */
  async assignAgent(agentId: string, userId: string): Promise<boolean> {
    try {
      const { UserModel } = await import('../models/User');
      const userModel = new UserModel();
      
      // Verify the user exists
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update the agent's user_id
      const agent = await Agent.update(agentId, { user_id: userId });
      if (!agent) {
        throw new Error('Agent not found');
      }

      logger.info(`Admin assigned agent ${agentId} to user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to assign agent:', error);
      throw new Error(`Failed to assign agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available voices from ElevenLabs (admin only)
   */
  async getVoices(): Promise<any[]> {
    try {
      return await elevenlabsService.getVoices();
    } catch (error) {
      logger.error('Failed to get voices as admin:', error);
      throw new Error(`Failed to get voices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all users for agent assignment (admin only)
   */
  async getAllUsers(): Promise<any[]> {
    try {
      const { UserModel } = await import('../models/User');
      const userModel = new UserModel();
      
      const users = await userModel.findAll();

      return users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        is_active: user.is_active,
        created_at: user.created_at
      }));
    } catch (error) {
      logger.error('Failed to get all users:', error);
      throw new Error(`Failed to get users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const adminService = new AdminService();