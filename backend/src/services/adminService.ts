import { AgentModel, AgentInterface } from '../models/Agent';
import Agent from '../models/Agent';

import { elevenlabsService } from './elevenLabsService';
import { logger } from '../utils/logger';

// Default data collection description for agent creation
const DEFAULT_DATA_COLLECTION_DESCRIPTION = "You are an AI lead evaluation system.   Your job: Analyze the full conversation history (in any language) and return a **single JSON object** with lead evaluation scores, reasoning, and extracted details.    Follow these strict steps:  ---  ### 1. Language Handling - Detect all languages in the conversation.   - If any part is in Hindi, Hinglish, or non-English → internally translate into English before applying rules.   - Use the English-translated text for evaluation.    ---  ### 2. Intent Recognition Intent = Why the lead is speaking with the AI.    - **Low Intent (1 point):**     Exploratory, background info only. No pricing/demo asks. Keywords: \"overview,\" \"high-level,\" \"curious,\" \"What does this do?\"    - **Medium Intent (2 points):**     Evaluating features, costs, integrations. Comparing vendors but not booking demo. Keywords: \"pricing,\" \"API support,\" \"integrates with Salesforce,\" \"limitations,\" \"trial?\"    - **High Intent (3 points):**     Ready for next step: demo, quote, contract, or implementation timeline. Keywords: \"Can I get a demo,\" \"Send me a quote,\" \"We're ready to sign,\" \"Book a call.\"    ---  ### 3. Urgency (How quickly they want problem solved) - **Low (1 point):** Researching/benchmarking, no timeline. Keywords: \"maybe next year,\" \"just exploring,\" \"future project.\"   - **Medium (2 points):** Clear problem, but planning for next month/quarter. Keywords: \"on roadmap,\" \"by Q2,\" \"end of month.\"   - **High (3 points):** Blocking issue, urgent deadlines, or lost revenue. Keywords: \"critical,\" \"urgent,\" \"mission-critical,\" \"blocking launch,\" \"we're losing customers.\"    ---  ### 4. Budget Constraint - **Yes (Constrained, 1 point):** Cost is a blocker. Keywords: \"free version,\" \"too expensive,\" \"not in our budget,\" \"we can't afford.\"   - **Maybe (Not sure, 2 points):** Asked about pricing, but no clear objection/approval. Default if budget not discussed.   - **No (Unconstrained, 3 points):** No cost concerns OR explicitly says budget approved. Keywords: \"fits our budget,\" \"we have funding,\" \"go ahead.\"    ---  ### 5. Fit Alignment - **Low (1 point):** Needs outside SniperThink scope (e.g., influencer marketing, social listening, no-code email builder).   - **Medium (2 points):** Partial overlap with extra needs (CRM integration, email sequences, funnel analytics).   - **High (3 points):** Direct match with SniperThink strengths (AI-driven lead scoring, automated qualification, MQL → SQL conversion).    ---  ### 6. Engagement Health - **Low (1 point):** 1–2 msgs/day, no CTA clicks, >12 hr response gap.   - **Medium (2 points):** 3–4 msgs/day, 1 CTA click, reply in 4–12 hrs.   - **High (3 points):** ≥5 msgs/day, ≥2 CTA clicks, reply <4 hrs, enthusiastic tone.    ---  ### 7. CTA Detection Rules Mark CTA fields as \\\"Yes\\\" or \\\"No\\\".   - **Pricing CTA:** Lead asks cost, budget numbers, or tier comparisons.   - **Demo CTA:** Lead asks for demo, trial, or hands-on test.   - **Follow-Up CTA:** Lead requests reminder, future contact, or materials to review later.   - **Sample CTA:** Lead asks for case study, whitepaper, sandbox account, or recorded session.   - **Escalation CTA:** Lead asks to speak to a human, sales rep, or expresses bot frustration.   - **Website CTA:** Lead requests website link, mentions content found there, or self-browses features/pricing pages.    ---  ### 8. Scoring & Thresholds - **Total Score = sum of Intent + Urgency + Budget + Fit + Engagement**   - Max possible = 15 points.   - Cap **total_score at 9** if: fewer than 3 replies OR no demo/follow-up CTA clicked.    **Lead Status Tag (based on total_score):**   - **Cold:** 5–8 points   - **Warm:** 9–11 points   - **Hot:** 12–15 points    ---  ### 9. Meeting Extraction (updated — timezone-aware) - Locate the `book_meeting` tool call in the conversation. If found, extract the date/time value(s) from that tool call. - Parse the extracted timestamp in a timezone-aware manner:   - If the `book_meeting` payload includes an explicit timezone or timezone offset (e.g., \\\"2025-09-18T11:30:00Z\\\" or \\\"2025-09-18T17:00:00+05:30\\\"), parse accordingly.   - If the `book_meeting` payload gives a local time **without** timezone (e.g., \\\"Sep 18, 2025 5:00 PM\\\"), assume the user's timezone is **Asia/Kolkata (UTC+05:30)** and parse as that local time. - **Output requirement for the JSON field `demo_book_datetime`:**   - Return a single ISO 8601 timestamp **in the user's local timezone with offset**, formatted like `YYYY-MM-DDTHH:MM:SS+05:30` (for Asia/Kolkata). Example: `\\\"2025-09-18T17:00:00+05:30\\\".   - Implementation rules:     - If the tool call provided a timezone-aware timestamp (any zone), convert it to **Asia/Kolkata** and output it with `+05:30` offset.     - If the tool call provided a UTC timestamp (`...Z`), convert it to Asia/Kolkata and output with `+05:30`.     - If the tool call provided a local time with no tz, treat it as Asia/Kolkata and output with `+05:30`. - If **no** `book_meeting` tool call exists or no parsable datetime is present, set `\\\"demo_book_datetime\\\": null`. - Examples:   - Input in tool call: `\\\"2025-09-18T11:30:00Z\\\"` → Output: `\\\"2025-09-18T17:00:00+05:30\\\".   - Input in tool call: `\\\"2025-09-18T17:00:00+05:30\\\"` → Output: `\\\"2025-09-18T17:00:00+05:30\\\".   - Input in tool call: `\\\"Sep 18, 2025 5:00 PM\\\"` (no tz) → treat as Asia/Kolkata → Output: `\\\"2025-09-18T17:00:00+05:30\\\". - Edge cases:   - If multiple `book_meeting` calls exist, use the one from the **most recent** tool call.   - If the timestamp is ambiguous (e.g., only a date, no time), return `null` (do not guess a time). - Do NOT ask clarifying questions; apply the above defaults automatically.   ---  ### 10. Smart Notification - Create a **short 4–5 word summary** of overall user interaction.   - Personalized (use extracted name if available).   - Examples:     - `\\\"Siddhant booked a meeting\\\"`     - `\\\"Shrey asked about pricing\\\"`     - `\\\"Priyanka confused about pricing\\\"`     - `\\\"Raj exploring technical queries\\\"`    ---  ### 11. Output JSON Format Always return this exact structure (no extra fields, no missing fields):  ###12.Rule Critical Reasoning: Be concise (≤10 words per category). Enough to justify score, no fluff. Output: Strict JSON only, ≤900 chars total. No extra text.  {   \\\"intent_level\\\": \\\"Low\\\",   \\\"intent_score\\\": 1,   \\\"urgency_level\\\": \\\"Low\\\",   \\\"urgency_score\\\": 1,   \\\"budget_constraint\\\": \\\"Maybe\\\",   \\\"budget_score\\\": 2,   \\\"fit_alignment\\\": \\\"Medium\\\",   \\\"fit_score\\\": 2,   \\\"engagement_health\\\": \\\"Medium\\\",   \\\"engagement_score\\\": 2,   \\\"cta_pricing_clicked\\\": \\\"No\\\",   \\\"cta_demo_clicked\\\": \\\"No\\\",   \\\"cta_followup_clicked\\\": \\\"No\\\",   \\\"cta_sample_clicked\\\": \\\"No\\\",   \\\"cta_website_clicked\\\": \\\"No\\\",   \\\"cta_escalated_to_human\\\": \\\"No\\\",   \\\"total_score\\\": 7,   \\\"lead_status_tag\\\": \\\"Cold\\\",   \\\"demo_book_datetime\\\": null,   \\\"reasoning\\\": {     \\\"intent\\\": \\\"Reasoning here\\\",     \\\"urgency\\\": \\\"Reasoning here\\\",     \\\"budget\\\": \\\"Reasoning here\\\",     \\\"fit\\\": \\\"Reasoning here\\\",     \\\"engagement\\\": \\\"Reasoning here\\\",     \\\"cta_behavior\\\": \\\"Reasoning here\\\"   },   \\\"extraction\\\": {     \\\"name\\\": null,     \\\"email_address\\\": null,     \\\"company_name\\\": null,     \\\"smartnotification\\\": \\\"Short 4–5 word summary\\\"   } }  ---";

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
          AVG(CASE WHEN status = 'completed' THEN duration_seconds END) / 60.0 as avg_duration
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
          AVG(CASE WHEN c.status = 'completed' THEN c.duration_seconds END) / 60.0 as avg_duration
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
      
      // Ensure data_collection is always included with default values
      if (!agentData.data_collection) {
        agentData.data_collection = {
          default: {
            type: 'string',
            description: DEFAULT_DATA_COLLECTION_DESCRIPTION
          }
        };
      } else if (!agentData.data_collection.default) {
        agentData.data_collection.default = {
          type: 'string',
          description: DEFAULT_DATA_COLLECTION_DESCRIPTION
        };
      } else {
        // Ensure type is set if not provided
        if (!agentData.data_collection.default.type) {
          agentData.data_collection.default.type = 'string';
        }
        // Prefill description if empty or not provided, but respect admin's choice to clear it
        if (agentData.data_collection.default.description === undefined) {
          agentData.data_collection.default.description = DEFAULT_DATA_COLLECTION_DESCRIPTION;
        }
      }
      
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