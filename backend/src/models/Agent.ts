import BaseModel, { BaseModelInterface } from './BaseModel';

export interface AgentInterface extends BaseModelInterface {
  id: string;
  user_id: string;
  elevenlabs_agent_id: string;
  name: string;
  agent_type: 'call' | 'chat';
  description?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class AgentModel extends BaseModel<AgentInterface> {
  constructor() {
    super('agents');
  }

  /**
   * Find agents by user ID
   */
  async findByUserId(userId: string, activeOnly: boolean = false): Promise<AgentInterface[]> {
    const criteria: Partial<AgentInterface> = { user_id: userId };
    if (activeOnly) {
      criteria.is_active = true;
    }
    
    return await this.findBy(criteria);
  }

  /**
   * Find agent by ElevenLabs agent ID
   */
  async findByElevenLabsId(elevenLabsAgentId: string): Promise<AgentInterface | null> {
    return await this.findOne({ elevenlabs_agent_id: elevenLabsAgentId });
  }

  /**
   * Create a new agent
   */
  async createAgent(agentData: {
    user_id: string;
    elevenlabs_agent_id: string;
    name: string;
    agent_type?: 'call' | 'chat';
    description?: string;
  }): Promise<AgentInterface> {
    // Check if agent with this ElevenLabs ID already exists for this user
    const existing = await this.findOne({
      user_id: agentData.user_id,
      elevenlabs_agent_id: agentData.elevenlabs_agent_id
    });

    if (existing) {
      throw new Error('Agent with this ElevenLabs ID already exists for this user');
    }

    return await this.create({
      ...agentData,
      agent_type: agentData.agent_type || 'call',
      description: agentData.description || '',
      is_active: true
    });
  }

  /**
   * Update agent status
   */
  async setAgentStatus(agentId: string, isActive: boolean): Promise<AgentInterface | null> {
    return await this.update(agentId, { is_active: isActive });
  }

  /**
   * Get agent with call statistics
   */
  async getAgentWithStats(agentId: string): Promise<{
    agent: AgentInterface;
    totalCalls: number;
    completedCalls: number;
    totalMinutes: number;
    averageCallDuration: number;
  } | null> {
    const agent = await this.findById(agentId);
    if (!agent) {
      return null;
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
        COALESCE(SUM(duration_minutes), 0) as total_minutes,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN duration_minutes END), 0) as avg_duration
      FROM calls
      WHERE agent_id = $1
    `;

    const result = await this.query(statsQuery, [agentId]);
    const stats = result.rows[0];

    return {
      agent,
      totalCalls: parseInt(stats.total_calls),
      completedCalls: parseInt(stats.completed_calls),
      totalMinutes: parseInt(stats.total_minutes),
      averageCallDuration: parseFloat(stats.avg_duration) || 0
    };
  }

  /**
   * Get agents by type for a user
   */
  async getAgentsByType(userId: string, agentType: 'call' | 'chat'): Promise<AgentInterface[]> {
    return await this.findBy({
      user_id: userId,
      agent_type: agentType,
      is_active: true
    });
  }

  /**
   * Delete agent (soft delete by setting inactive)
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    const updated = await this.update(agentId, { is_active: false });
    return updated !== null;
  }

  /**
   * Get all agents for admin panel
   */
  async getAllAgentsForAdmin(limit?: number, offset?: number): Promise<{
    agents: (AgentInterface & { user_email: string; user_name: string })[];
    total: number;
  }> {
    let query = `
      SELECT 
        a.*,
        u.email as user_email,
        u.name as user_name
      FROM agents a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `;

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    if (offset) {
      query += ` OFFSET ${offset}`;
    }

    const result = await this.query(query);
    const countResult = await this.query('SELECT COUNT(*) as total FROM agents');

    return {
      agents: result.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  /**
   * Verify agent ownership
   */
  async verifyOwnership(agentId: string, userId: string): Promise<boolean> {
    const agent = await this.findOne({ id: agentId, user_id: userId });
    return agent !== null;
  }
}

export default new AgentModel();