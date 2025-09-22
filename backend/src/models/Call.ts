import BaseModel, { BaseModelInterface } from './BaseModel';

export interface CallInterface extends BaseModelInterface {
  id: string;
  agent_id: string;
  user_id: string;
  contact_id?: string;
  elevenlabs_conversation_id: string;
  phone_number: string;
  call_source?: 'phone' | 'internet' | 'unknown';
  caller_name?: string;
  caller_email?: string;
  duration_seconds: number;  // Exact duration in seconds
  duration_minutes: number;  // Rounded up for billing
  credits_used: number;
  status: 'completed' | 'failed' | 'in_progress' | 'cancelled';
  recording_url?: string;
  metadata: any;
  lead_type?: 'inbound' | 'outbound';
  created_at: Date;
  completed_at?: Date;
}

export class CallModel extends BaseModel<CallInterface> {
  constructor() {
    super('calls');
  }

  /**
   * Find calls by user ID
   */
  async findByUserId(
    userId: string,
    options?: {
      status?: CallInterface['status'];
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<CallInterface[]> {
    let query = `
      SELECT c.*, a.name as agent_name, ct.name as contact_name
      FROM calls c
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      WHERE c.user_id = $1
    `;
    
    const params: any[] = [userId];
    let paramIndex = 2;

    if (options?.status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    if (options?.startDate) {
      query += ` AND c.created_at >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options?.endDate) {
      query += ` AND c.created_at <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    query += ' ORDER BY c.created_at DESC';

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    if (options?.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Find calls by agent ID
   */
  async findByAgentId(agentId: string, limit?: number): Promise<CallInterface[]> {
    return await this.findBy({ agent_id: agentId }, limit);
  }

  /**
   * Find call by ElevenLabs conversation ID
   */
  async findByConversationId(conversationId: string): Promise<CallInterface | null> {
    return await this.findOne({ elevenlabs_conversation_id: conversationId });
  }

  /**
   * Find calls by phone number
   */
  async findByPhoneNumber(phoneNumber: string, userId: string): Promise<CallInterface[]> {
    const query = `
      SELECT c.*, a.name as agent_name, ct.name as contact_name,
             la.*, t.content as transcript_content
      FROM calls c
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN lead_analytics la ON c.id = la.call_id
      LEFT JOIN transcripts t ON c.id = t.call_id
      WHERE c.phone_number = $1 AND c.user_id = $2
      ORDER BY c.created_at DESC
    `;
    
    const result = await this.query(query, [phoneNumber, userId]);
    return result.rows.map((row: any) => this.mapRowWithAnalytics(row));
  }

  /**
   * Find calls by email address
   */
  async findByEmail(email: string, userId: string): Promise<CallInterface[]> {
    const query = `
      SELECT c.*, a.name as agent_name, ct.name as contact_name,
             la.*, t.content as transcript_content
      FROM calls c
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN lead_analytics la ON c.id = la.call_id
      LEFT JOIN transcripts t ON c.id = t.call_id
      WHERE (c.caller_email = $1 OR la.extracted_email = $1) AND c.user_id = $2
      ORDER BY c.created_at DESC
    `;
    
    const result = await this.query(query, [email, userId]);
    return result.rows.map((row: any) => this.mapRowWithAnalytics(row));
  }

  /**
   * Helper method to map database row with analytics data
   */
  private mapRowWithAnalytics(row: any): CallInterface {
    const call = {
      id: row.id,
      agent_id: row.agent_id,
      user_id: row.user_id,
      contact_id: row.contact_id,
      elevenlabs_conversation_id: row.elevenlabs_conversation_id,
      phone_number: row.phone_number,
      call_source: row.call_source,
      caller_name: row.caller_name,
      caller_email: row.caller_email,
      duration_minutes: row.duration_minutes,
      credits_used: row.credits_used,
      status: row.status,
      recording_url: row.recording_url,
      metadata: row.metadata,
      created_at: row.created_at,
      completed_at: row.completed_at,
      agent_name: row.agent_name,
      contact_name: row.contact_name
    } as any;

    // Add lead analytics if present
    if (row.total_score !== null) {
      call.lead_analytics = {
        id: row.lead_analytics_id || row.id,
        call_id: row.id,
        total_score: row.total_score,
        lead_status_tag: row.lead_status_tag,
        intent_score: row.intent_score,
        urgency_score: row.urgency_score,
        budget_score: row.budget_score,
        fit_score: row.fit_score,
        engagement_score: row.engagement_score,
        reasoning: row.reasoning,
        cta_interactions: row.cta_interactions,
        extracted_name: row.extracted_name,
        extracted_email: row.extracted_email,
        company_name: row.company_name,
        call_summary_title: row.call_summary_title,
        cta_demo_clicked: row.cta_demo_clicked,
        created_at: row.lead_analytics_created_at || row.created_at,
        updated_at: row.lead_analytics_updated_at || row.updated_at
      };
    }

    // Add transcript if present
    if (row.transcript_content) {
      call.transcript = {
        content: row.transcript_content
      };
    }

    return call;
  }

  /**
   * Create a new call record
   */
  async createCall(callData: {
    agent_id: string;
    user_id: string;
    contact_id?: string;
    elevenlabs_conversation_id: string;
    phone_number: string;
    call_source?: 'phone' | 'internet' | 'unknown';
    caller_name?: string;
    caller_email?: string;
    duration_seconds?: number;
    duration_minutes?: number;
    credits_used?: number;
    status?: 'completed' | 'failed' | 'in_progress' | 'cancelled';
    metadata?: any;
  }): Promise<CallInterface> {
    const durationSeconds = callData.duration_seconds || 0;
    const durationMinutes = callData.duration_minutes || 0;
    const creditsUsed = callData.credits_used || 0;
    const status = callData.status || 'in_progress';

    const baseCols = `
      agent_id, user_id, contact_id, elevenlabs_conversation_id,
      phone_number, call_source, caller_name, caller_email,
      duration_seconds, duration_minutes, credits_used, status,
      recording_url, metadata, completed_at
    `;

    const baseVals = `
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14,
    `;

    const completeNow = (status === 'completed' || status === 'failed');

    const query = `
      INSERT INTO calls (${baseCols})
      VALUES (
        ${baseVals}
        ${completeNow ? 'CURRENT_TIMESTAMP' : 'NULL'}
      )
      RETURNING *
    `;

    const params = [
      callData.agent_id,
      callData.user_id,
      callData.contact_id ?? null,
      callData.elevenlabs_conversation_id,
      callData.phone_number,
      callData.call_source || 'phone',
      callData.caller_name ?? null,
      callData.caller_email ?? null,
      durationSeconds,
      durationMinutes,
      creditsUsed,
      status,
      null, // recording_url not set at creation
      callData.metadata || {}
    ];

    const result = await this.query(query, params);
    return result.rows[0] as CallInterface;
  }

  /**
   * Complete a call with final data
   */
  async completeCall(
    callId: string,
    data: {
      duration_minutes: number;
      status: 'completed' | 'failed' | 'cancelled';
      recording_url?: string;
      metadata?: any;
    }
  ): Promise<CallInterface | null> {
    const creditsUsed = Math.ceil(data.duration_minutes); // Round up to next minute

    // Use DB-side CURRENT_TIMESTAMP to honor session time zone (IST)
    const query = `
      UPDATE calls
      SET 
        duration_minutes = $2,
        status = $3,
        recording_url = COALESCE($4, recording_url),
        metadata = COALESCE($5, metadata),
        credits_used = $6,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const params = [
      callId,
      data.duration_minutes,
      data.status,
      data.recording_url ?? null,
      data.metadata ?? null,
      creditsUsed
    ];

    const result = await this.query(query, params);
    return result.rows.length ? (result.rows[0] as CallInterface) : null;
  }

  /**
   * Get call statistics for a user
   */
  async getCallStats(userId: string, period?: 'day' | 'week' | 'month'): Promise<{
    totalCalls: number;
    completedCalls: number;
    failedCalls: number;
    notConnectedCalls: number;
    totalMinutes: number;
    totalCreditsUsed: number;
    averageCallDuration: number;
  }> {
    let dateFilter = '';
    if (period) {
      const intervals = {
        day: '1 day',
        week: '7 days',
        month: '30 days'
      };
      dateFilter = `AND created_at >= NOW() - INTERVAL '${intervals[period]}'`;
    }

    const query = `
      SELECT 
        COUNT(c.*) as total_calls,
        COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_calls,
        COUNT(CASE WHEN c.status = 'failed' THEN 1 END) as failed_calls,
        COALESCE(SUM(c.duration_minutes), 0) as total_minutes,
        COALESCE(SUM(c.credits_used), 0) as total_credits_used,
        COALESCE(AVG(CASE WHEN c.status = 'completed' THEN c.duration_seconds END), 0) / 60.0 as avg_duration,
        COALESCE(SUM(ct.not_connected), 0) as not_connected_calls
      FROM calls c
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      WHERE c.user_id = $1 ${dateFilter}
    `;

    const result = await this.query(query, [userId]);
    const stats = result.rows[0];

    return {
      totalCalls: parseInt(stats.total_calls),
      completedCalls: parseInt(stats.completed_calls),
      failedCalls: parseInt(stats.failed_calls),
      notConnectedCalls: parseInt(stats.not_connected_calls),
      totalMinutes: parseInt(stats.total_minutes),
      totalCreditsUsed: parseInt(stats.total_credits_used),
      averageCallDuration: parseFloat(stats.avg_duration) || 0
    };
  }

  /**
   * Get recent calls for dashboard
   */
  async getRecentCalls(userId: string, limit: number = 10): Promise<CallInterface[]> {
    const query = `
      SELECT 
        c.*,
        a.name as agent_name,
        ct.name as contact_name
      FROM calls c
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2
    `;

    const result = await this.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Get calls with lead analytics
   */
  async getCallsWithAnalytics(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      minScore?: number;
      leadStatus?: string;
    }
  ): Promise<(CallInterface & { lead_analytics?: any })[]> {
    let query = `
      SELECT 
        c.*,
        a.name as agent_name,
        ct.name as contact_name,
        la.total_score,
        la.lead_status_tag,
        la.intent_score,
        la.urgency_score,
        la.budget_score,
        la.fit_score,
        la.engagement_score,
        la.reasoning,
        la.cta_interactions
      FROM calls c
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN lead_analytics la ON c.id = la.call_id
      WHERE c.user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (options?.minScore) {
      query += ` AND la.total_score >= $${paramIndex}`;
      params.push(options.minScore);
      paramIndex++;
    }

    if (options?.leadStatus) {
      query += ` AND la.lead_status_tag = $${paramIndex}`;
      params.push(options.leadStatus);
      paramIndex++;
    }

    query += ' ORDER BY c.created_at DESC';

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    if (options?.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Verify call ownership
   */
  async verifyOwnership(callId: string, userId: string): Promise<boolean> {
    const call = await this.findOne({ id: callId, user_id: userId });
    return call !== null;
  }

  /**
   * Get call count by status for admin
   */
  async getCallCountByStatus(): Promise<{ [status: string]: number }> {
    const query = `
      SELECT status, COUNT(*) as count
      FROM calls
      GROUP BY status
    `;

    const result = await this.query(query);
    const counts: { [status: string]: number } = {};
    
    result.rows.forEach((row: any) => {
      counts[row.status] = parseInt(row.count);
    });

    return counts;
  }

  /**
   * Find filtered calls with database-level filtering, searching, sorting, and pagination
   */
  async findFilteredCalls(
    userId: string,
    filters: any = {},
    options: any = {}
  ): Promise<{ calls: any[]; total: number; hasMore: boolean }> {
    try {
      // Build the base query with joins
      let baseQuery = `
        FROM calls c
        LEFT JOIN agents a ON c.agent_id = a.id
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        LEFT JOIN lead_analytics la ON c.id = la.call_id
        WHERE c.user_id = $1
      `;

      const params: any[] = [userId];
      let paramIndex = 2;

      // Apply filters
      if (filters.search && filters.search.trim()) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        baseQuery += ` AND (
          LOWER(COALESCE(ct.name, '')) LIKE $${paramIndex} OR
          LOWER(c.phone_number) LIKE $${paramIndex} OR
          LOWER(COALESCE(a.name, '')) LIKE $${paramIndex}
        )`;
        params.push(searchTerm);
        paramIndex++;
      }

      if (filters.status) {
        baseQuery += ` AND c.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.agentId) {
        baseQuery += ` AND c.agent_id = $${paramIndex}`;
        params.push(filters.agentId);
        paramIndex++;
      }

      if (filters.agentName) {
        baseQuery += ` AND LOWER(a.name) = LOWER($${paramIndex})`;
        params.push(filters.agentName);
        paramIndex++;
      }

      if (filters.phoneNumber) {
        baseQuery += ` AND c.phone_number LIKE $${paramIndex}`;
        params.push(`%${filters.phoneNumber}%`);
        paramIndex++;
      }

      if (filters.contactName) {
        baseQuery += ` AND LOWER(COALESCE(ct.name, '')) LIKE $${paramIndex}`;
        params.push(`%${filters.contactName.toLowerCase()}%`);
        paramIndex++;
      }

      if (filters.startDate) {
        baseQuery += ` AND c.created_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        baseQuery += ` AND c.created_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      if (filters.minDurationSeconds !== undefined) {
        baseQuery += ` AND COALESCE(c.duration_seconds, 0) >= $${paramIndex}`;
        params.push(filters.minDurationSeconds);
        paramIndex++;
      }

      if (filters.maxDurationSeconds !== undefined) {
        baseQuery += ` AND COALESCE(c.duration_seconds, 0) <= $${paramIndex}`;
        params.push(filters.maxDurationSeconds);
        paramIndex++;
      }

      if (filters.hasTranscript !== undefined) {
        if (filters.hasTranscript) {
          baseQuery += ` AND EXISTS (SELECT 1 FROM transcripts t WHERE t.call_id = c.id)`;
        } else {
          baseQuery += ` AND NOT EXISTS (SELECT 1 FROM transcripts t WHERE t.call_id = c.id)`;
        }
      }

      if (filters.hasAnalytics !== undefined) {
        if (filters.hasAnalytics) {
          baseQuery += ` AND la.id IS NOT NULL`;
        } else {
          baseQuery += ` AND la.id IS NULL`;
        }
      }

      if (filters.minScore !== undefined) {
        baseQuery += ` AND COALESCE(la.total_score, 0) >= $${paramIndex}`;
        params.push(filters.minScore);
        paramIndex++;
      }

      if (filters.maxScore !== undefined) {
        baseQuery += ` AND COALESCE(la.total_score, 0) <= $${paramIndex}`;
        params.push(filters.maxScore);
        paramIndex++;
      }

      if (filters.leadStatus) {
        baseQuery += ` AND la.lead_status_tag = $${paramIndex}`;
        params.push(filters.leadStatus);
        paramIndex++;
      }

      if (filters.leadTag) {
        // Handle lead tag filtering based on score ranges
        if (filters.leadTag === 'Hot') {
          baseQuery += ` AND COALESCE(la.total_score, 0) >= 80`;
        } else if (filters.leadTag === 'Warm') {
          baseQuery += ` AND COALESCE(la.total_score, 0) >= 60 AND COALESCE(la.total_score, 0) < 80`;
        } else if (filters.leadTag === 'Cold') {
          baseQuery += ` AND COALESCE(la.total_score, 0) < 60`;
        }
      }

      // Get total count
      const countQuery = `SELECT COUNT(c.id) as total ${baseQuery}`;
      const countResult = await this.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Build the main query with sorting
      let sortClause = 'ORDER BY c.created_at DESC';
      if (options.sortBy) {
        let sortField = options.sortBy;
        if (sortField === 'contact_name') {
          sortField = 'ct.name';
        } else if (sortField === 'total_score') {
          sortField = 'la.total_score';
        } else if (sortField === 'duration_seconds') {
          sortField = 'c.duration_seconds';
        } else if (sortField === 'phone_number') {
          sortField = 'c.phone_number';
        } else {
          sortField = `c.${sortField}`;
        }
        
        const sortOrder = options.sortOrder || 'DESC';
        
        // Handle COALESCE appropriately based on field type
        if (sortField === 'c.created_at') {
          // For timestamp fields, don't use COALESCE with 0
          sortClause = `ORDER BY ${sortField} ${sortOrder}`;
        } else if (sortField === 'ct.name' || sortField === 'c.phone_number') {
          // For text fields, use COALESCE with empty string
          sortClause = `ORDER BY COALESCE(${sortField}, '') ${sortOrder}`;
        } else {
          // For numeric fields, use COALESCE with 0
          sortClause = `ORDER BY COALESCE(${sortField}, 0) ${sortOrder}`;
        }
        
        // Add secondary sort by created_at for consistency
        if (sortField !== 'c.created_at') {
          sortClause += ', c.created_at DESC';
        }
      }

      // Build final query with pagination
      const mainQuery = `
        SELECT 
          c.*,
          a.name as agent_name,
          ct.name as contact_name,
          la.total_score,
          la.intent_level,
          la.urgency_level,
          la.budget_constraint,
          la.fit_alignment,
          la.engagement_health,
          la.lead_status_tag,
          la.cta_interactions,
          EXISTS (SELECT 1 FROM transcripts t WHERE t.call_id = c.id) AS has_transcript
        ${baseQuery}
        ${sortClause}
      `;

      // Add pagination
      const limit = options.limit || 30;
      const offset = options.offset || 0;
      const paginatedQuery = `${mainQuery} LIMIT ${limit} OFFSET ${offset}`;

      const result = await this.query(paginatedQuery, params);
      const hasMore = offset + limit < total;

      return {
        calls: result.rows,
        total,
        hasMore
      };
    } catch (error) {
      console.error('Error in findFilteredCalls:', error);
      throw error;
    }
  }
}

export default new CallModel();