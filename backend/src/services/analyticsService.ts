import LeadAnalytics, { LeadAnalyticsInterface, CreateLeadAnalyticsData } from '../models/LeadAnalytics';

import { logger } from '../utils/logger';

export interface LeadAnalyticsData {
  intent_level: string;
  intent_score: number;
  urgency_level: string;
  urgency_score: number;
  budget_constraint: string;
  budget_score: number;
  fit_alignment: string;
  fit_score: number;
  engagement_health: string;
  engagement_score: number;
  total_score: number;
  lead_status_tag: string;
  reasoning: {
    intent: string;
    urgency: string;
    budget: string;
    fit: string;
    engagement: string;
    cta_behavior: string;
  };
  cta_interactions: {
    pricing_clicked: boolean;
    demo_clicked: boolean;
    followup_clicked: boolean;
    sample_clicked: boolean;
    escalated_to_human: boolean;
  };
  sentiment_analysis?: {
    overall_sentiment: 'positive' | 'neutral' | 'negative';
    sentiment_score: number;
    emotional_indicators: string[];
  };
  conversation_quality?: {
    clarity_score: number;
    engagement_score: number;
    completion_rate: number;
  };
}

export interface DashboardMetrics {
  total_calls: number;
  completed_calls: number;
  success_rate: number;
  average_lead_score: number;
  high_quality_leads: number;
  total_call_duration: number;
  conversion_metrics: {
    hot_leads: number;
    warm_leads: number;
    cold_leads: number;
  };
  cta_performance: {
    pricing_clicks: number;
    demo_requests: number;
    followup_requests: number;
    sample_requests: number;
    human_escalations: number;
  };
}

export interface CallVolumeData {
  date: string;
  calls: number;
  completed: number;
  success_rate: number;
}

export interface LeadScoreDistribution {
  score_range: string;
  count: number;
  percentage: number;
}

export class AnalyticsService {
  /**
   * Process enhanced lead analytics directly from new ElevenLabs analysis structure
   * Handles the JSON string parsing and creates complete analytics record
   */
  async processEnhancedLeadAnalyticsFromWebhook(
    callId: string,
    userId: string,
    analysisData: any
  ): Promise<LeadAnalyticsInterface | null> {
    try {
      if (!analysisData?.value) {
        logger.debug('No analysis data found for enhanced processing');
        return null;
      }

      // Parse the JSON string in the value field
      let parsedAnalytics;
      try {
        // Handle both string and object formats
        if (typeof analysisData.value === 'string') {
          // Replace Python-style quotes with proper JSON
          const jsonStr = analysisData.value.replace(/'/g, '"').replace(/False/g, 'false').replace(/True/g, 'true');
          parsedAnalytics = JSON.parse(jsonStr);
        } else {
          parsedAnalytics = analysisData.value;
        }
      } catch (parseError) {
        logger.warn('Failed to parse enhanced analysis value as JSON', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          call_id: callId
        });
        return null;
      }

      logger.info(`Processing enhanced lead analytics for call ${callId}`, {
        total_score: parsedAnalytics.total_score,
        lead_status: parsedAnalytics.lead_status_tag,
        smart_notification: parsedAnalytics.extraction?.smartnotification,
        demo_book_datetime: parsedAnalytics.demo_book_datetime
      });

      // Check if analytics already exist to prevent duplicates
      const existingAnalytics = await LeadAnalytics.findByCallId(callId);
      
      if (existingAnalytics) {
        logger.info(`Lead analytics already exist for call ${callId}, updating with enhanced data`);
        // Update existing record with enhanced data
        await this.updateAnalyticsWithEnhancedData(existingAnalytics.id, parsedAnalytics);
        return existingAnalytics;
      }

      // Create comprehensive analytics record with enhanced data
      const analyticsRecord = await LeadAnalytics.createAnalytics({
        call_id: callId,
        user_id: userId,
        intent_level: parsedAnalytics.intent_level || 'Low',
        intent_score: parsedAnalytics.intent_score || 0,
        urgency_level: parsedAnalytics.urgency_level || 'Low',
        urgency_score: parsedAnalytics.urgency_score || 0,
        budget_constraint: parsedAnalytics.budget_constraint || 'Maybe',
        budget_score: parsedAnalytics.budget_score || 0,
        fit_alignment: parsedAnalytics.fit_alignment || 'Low',
        fit_score: parsedAnalytics.fit_score || 0,
        engagement_health: parsedAnalytics.engagement_health || 'Low',
        engagement_score: parsedAnalytics.engagement_score || 0,
        total_score: parsedAnalytics.total_score || 0,
        lead_status_tag: parsedAnalytics.lead_status_tag || 'Cold',
        reasoning: parsedAnalytics.reasoning || {},
        cta_interactions: {
          pricing_clicked: parsedAnalytics.cta_pricing_clicked === 'Yes',
          demo_clicked: parsedAnalytics.cta_demo_clicked === 'Yes',
          followup_clicked: parsedAnalytics.cta_followup_clicked === 'Yes',
          sample_clicked: parsedAnalytics.cta_sample_clicked === 'Yes',
          escalated_to_human: parsedAnalytics.cta_escalated_to_human === 'Yes'
        },
        // Enhanced data fields
        company_name: parsedAnalytics.extraction?.company_name || null,
        extracted_name: parsedAnalytics.extraction?.name || null,
        extracted_email: parsedAnalytics.extraction?.email_address || null,
        cta_pricing_clicked: parsedAnalytics.cta_pricing_clicked === 'Yes',
        cta_demo_clicked: parsedAnalytics.cta_demo_clicked === 'Yes',
        cta_followup_clicked: parsedAnalytics.cta_followup_clicked === 'Yes',
        cta_sample_clicked: parsedAnalytics.cta_sample_clicked === 'Yes',
        cta_escalated_to_human: parsedAnalytics.cta_escalated_to_human === 'Yes',
        smart_notification: parsedAnalytics.extraction?.smartnotification || null,
        demo_book_datetime: parsedAnalytics.demo_book_datetime || null
      });

      logger.info(`Successfully processed enhanced lead analytics for call ${callId}`, {
        analytics_id: analyticsRecord.id,
        total_score: analyticsRecord.total_score,
        lead_status: analyticsRecord.lead_status_tag,
        smart_notification: analyticsRecord.smart_notification,
        demo_scheduled: !!analyticsRecord.demo_book_datetime
      });

      return analyticsRecord;
    } catch (error) {
      logger.error(`Error processing enhanced lead analytics for call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Update existing analytics record with enhanced data
   */
  private async updateAnalyticsWithEnhancedData(analyticsId: string, parsedAnalytics: any): Promise<void> {
    try {
      const database = (await import('../config/database')).default;
      
      const query = `
        UPDATE lead_analytics 
        SET 
          company_name = COALESCE($2, company_name),
          extracted_name = COALESCE($3, extracted_name),
          extracted_email = COALESCE($4, extracted_email),
          cta_pricing_clicked = COALESCE($5, cta_pricing_clicked),
          cta_demo_clicked = COALESCE($6, cta_demo_clicked),
          cta_followup_clicked = COALESCE($7, cta_followup_clicked),
          cta_sample_clicked = COALESCE($8, cta_sample_clicked),
          cta_escalated_to_human = COALESCE($9, cta_escalated_to_human),
          smart_notification = COALESCE($10, smart_notification),
          demo_book_datetime = COALESCE($11, demo_book_datetime),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const values = [
        analyticsId,
        parsedAnalytics.extraction?.company_name || null,
        parsedAnalytics.extraction?.name || null,
        parsedAnalytics.extraction?.email_address || null,
        parsedAnalytics.cta_pricing_clicked === 'Yes',
        parsedAnalytics.cta_demo_clicked === 'Yes',
        parsedAnalytics.cta_followup_clicked === 'Yes',
        parsedAnalytics.cta_sample_clicked === 'Yes',
        parsedAnalytics.cta_escalated_to_human === 'Yes',
        parsedAnalytics.extraction?.smartnotification || null,
        parsedAnalytics.demo_book_datetime || null
      ];

      await database.query(query, values);
      
      logger.debug('Updated existing analytics record with enhanced data', {
        analytics_id: analyticsId
      });
    } catch (error) {
      logger.error('Error updating analytics with enhanced data:', error);
      throw error;
    }
  }

  /**
   * Process lead analytics data from ElevenLabs webhook (legacy method)
   * Requirements: 5.1, 5.2, 5.3
   */
  async processLeadAnalyticsFromWebhook(
    callId: string,
    analyticsData: LeadAnalyticsData
  ): Promise<LeadAnalyticsInterface | null> {
    try {
      logger.info(`Processing lead analytics for call ${callId}`, {
        total_score: analyticsData.total_score,
        lead_status: analyticsData.lead_status_tag
      });

      // Validate analytics data structure
      if (!this.validateAnalyticsData(analyticsData)) {
        logger.error(`Invalid analytics data structure for call ${callId}`);
        return null;
      }

      // Check if analytics already exist to prevent duplicates
      const existingAnalytics = await LeadAnalytics.findByCallId(callId);
      
      if (existingAnalytics) {
        logger.info(`Lead analytics already exist for call ${callId}, skipping`);
        return existingAnalytics;
      }

      // Create analytics record
      const analyticsRecord = await LeadAnalytics.createAnalytics({
        call_id: callId,
        intent_level: analyticsData.intent_level,
        intent_score: analyticsData.intent_score,
        urgency_level: analyticsData.urgency_level,
        urgency_score: analyticsData.urgency_score,
        budget_constraint: analyticsData.budget_constraint,
        budget_score: analyticsData.budget_score,
        fit_alignment: analyticsData.fit_alignment,
        fit_score: analyticsData.fit_score,
        engagement_health: analyticsData.engagement_health,
        engagement_score: analyticsData.engagement_score,
        total_score: analyticsData.total_score,
        lead_status_tag: analyticsData.lead_status_tag,
        reasoning: analyticsData.reasoning,
        cta_interactions: analyticsData.cta_interactions,
      });

      logger.info(`Successfully processed lead analytics for call ${callId}`, {
        analytics_id: analyticsRecord.id,
        total_score: analyticsRecord.total_score,
        lead_status: analyticsRecord.lead_status_tag
      });

      return analyticsRecord;
    } catch (error) {
      logger.error(`Error processing lead analytics for call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Get lead analytics with display formatting and reasoning
   * Requirements: 5.3
   */
  async getLeadAnalyticsWithReasoning(callId: string): Promise<any> {
    try {
      const analytics = await LeadAnalytics.findByCallId(callId);
      
      if (!analytics) {
        return null;
      }

      // Format analytics for display with enhanced reasoning
      return {
        id: analytics.id,
        call_id: analytics.call_id,
        scores: {
          intent: {
            level: analytics.intent_level,
            score: analytics.intent_score,
            reasoning: analytics.reasoning.intent
          },
          urgency: {
            level: analytics.urgency_level,
            score: analytics.urgency_score,
            reasoning: analytics.reasoning.urgency
          },
          budget: {
            constraint: analytics.budget_constraint,
            score: analytics.budget_score,
            reasoning: analytics.reasoning.budget
          },
          fit: {
            alignment: analytics.fit_alignment,
            score: analytics.fit_score,
            reasoning: analytics.reasoning.fit
          },
          engagement: {
            health: analytics.engagement_health,
            score: analytics.engagement_score,
            reasoning: analytics.reasoning.engagement
          }
        },
        overall: {
          total_score: analytics.total_score,
          lead_status_tag: this.calculateLeadStatusTag(analytics.total_score),
        },
        interactions: {
          cta_summary: this.formatCTAInteractions(analytics.cta_interactions),
          cta_behavior_reasoning: analytics.reasoning.cta_behavior,
          engagement_indicators: this.getEngagementIndicators(analytics.cta_interactions)
        },
        recommendations: this.generateRecommendations(analytics),
        created_at: analytics.created_at
      };
    } catch (error) {
      logger.error(`Error getting lead analytics for call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Get analytics for multiple calls with filtering
   */
  async getLeadAnalyticsList(
    userId: string,
    filters: {
      minScore?: number;
      maxScore?: number;
      leadStatus?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ analytics: any[]; total: number }> {
    try {
      let query = `
        SELECT la.*, c.phone_number, c.created_at as call_date, c.duration_minutes
        FROM lead_analytics la
        JOIN calls c ON la.call_id = c.id
        WHERE c.user_id = $1
      `;
      const params: any[] = [userId];
      let paramIndex = 2;

      // Apply filters
      if (filters.minScore !== undefined) {
        query += ` AND la.total_score >= $${paramIndex}`;
        params.push(filters.minScore);
        paramIndex++;
      }

      if (filters.maxScore !== undefined) {
        query += ` AND la.total_score <= $${paramIndex}`;
        params.push(filters.maxScore);
        paramIndex++;
      }

      if (filters.leadStatus) {
        query += ` AND la.lead_status_tag = $${paramIndex}`;
        params.push(filters.leadStatus);
        paramIndex++;
      }

      if (filters.dateFrom) {
        query += ` AND c.created_at >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        query += ` AND c.created_at <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace('SELECT la.*, c.phone_number, c.created_at as call_date, c.duration_minutes', 'SELECT COUNT(*)');
      const countResult = await LeadAnalytics.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add ordering and pagination
      query += ` ORDER BY c.created_at DESC`;
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
        paramIndex++;
      }

      const result = await LeadAnalytics.query(query, params);
      
      // Format results for display
      const analytics = result.rows.map((row: any) => ({
        id: row.id,
        call_id: row.call_id,
        phone_number: row.phone_number,
        call_date: row.call_date,
        duration_minutes: row.duration_minutes,
        total_score: row.total_score,
        lead_status_tag: this.calculateLeadStatusTag(row.total_score),
        company_name: row.company_name,
        extracted_name: row.extracted_name,
        extracted_email: row.extracted_email,
        scores: {
          intent: { level: row.intent_level, score: row.intent_score },
          urgency: { level: row.urgency_level, score: row.urgency_score },
          budget: { constraint: row.budget_constraint, score: row.budget_score },
          fit: { alignment: row.fit_alignment, score: row.fit_score },
          engagement: { health: row.engagement_health, score: row.engagement_score }
        },
        cta_summary: this.formatCTAInteractionsFromColumns(row),
        created_at: row.created_at
      }));

      return { analytics, total };
    } catch (error) {
      logger.error(`Error getting lead analytics list for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Validate analytics data structure
   */
  private validateAnalyticsData(data: LeadAnalyticsData): boolean {
    const requiredFields = [
      'intent_level', 'intent_score', 'urgency_level', 'urgency_score',
      'budget_constraint', 'budget_score', 'fit_alignment', 'fit_score',
      'engagement_health', 'engagement_score', 'total_score', 'lead_status_tag',
      'reasoning', 'cta_interactions'
    ];

    for (const field of requiredFields) {
      if (!(field in data) || data[field as keyof LeadAnalyticsData] === undefined) {
        logger.error(`Missing required field in analytics data: ${field}`);
        return false;
      }
    }

    // Validate score ranges
    const scores = [
      data.intent_score, data.urgency_score, data.budget_score,
      data.fit_score, data.engagement_score, data.total_score
    ];

    for (const score of scores) {
      if (typeof score !== 'number' || score < 0 || score > 100) {
        logger.error(`Invalid score value: ${score}. Scores must be numbers between 0-100`);
        return false;
      }
    }

    // Validate reasoning structure
    const reasoningFields = ['intent', 'urgency', 'budget', 'fit', 'engagement', 'cta_behavior'];
    for (const field of reasoningFields) {
      if (!(field in data.reasoning) || typeof data.reasoning[field as keyof typeof data.reasoning] !== 'string') {
        logger.error(`Missing or invalid reasoning field: ${field}`);
        return false;
      }
    }

    // Validate CTA interactions structure
    const ctaFields = ['pricing_clicked', 'demo_clicked', 'followup_clicked', 'sample_clicked', 'escalated_to_human'];
    for (const field of ctaFields) {
      if (!(field in data.cta_interactions) || typeof data.cta_interactions[field as keyof typeof data.cta_interactions] !== 'boolean') {
        logger.error(`Missing or invalid CTA interaction field: ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate lead status tag based on total score
   */
  private calculateLeadStatusTag(totalScore: number): string {
    if (totalScore >= 12) return 'Hot';
    if (totalScore >= 9) return 'Warm';
    return 'Cold';
  }

  /**
   * Format CTA interactions for display (legacy JSONB format)
   */
  private formatCTAInteractions(interactions: any): string[] {
    const actions: string[] = [];
    
    if (interactions.pricing_clicked) actions.push('Viewed Pricing');
    if (interactions.demo_clicked) actions.push('Requested Demo');
    if (interactions.followup_clicked) actions.push('Requested Follow-up');
    if (interactions.sample_clicked) actions.push('Requested Sample');
    if (interactions.escalated_to_human) actions.push('Escalated to Human');
    
    return actions.length > 0 ? actions : ['No CTA Interactions'];
  }

  /**
   * Format CTA interactions from boolean columns for display
   */
  private formatCTAInteractionsFromColumns(row: any): string[] {
    const actions: string[] = [];
    
    if (row.cta_pricing_clicked) actions.push('Viewed Pricing');
    if (row.cta_demo_clicked) actions.push('Requested Demo');
    if (row.cta_followup_clicked) actions.push('Requested Follow-up');
    if (row.cta_sample_clicked) actions.push('Requested Sample');
    if (row.cta_escalated_to_human) actions.push('Escalated to Human');
    
    return actions.length > 0 ? actions : ['No CTA Interactions'];
  }

  /**
   * Get engagement indicators based on CTA interactions (supports both JSONB and boolean columns)
   */
  private getEngagementIndicators(interactions: any): string[] {
    const indicators: string[] = [];
    
    // Support both JSONB format and direct boolean values
    const pricingClicked = interactions.pricing_clicked || interactions.cta_pricing_clicked;
    const demoClicked = interactions.demo_clicked || interactions.cta_demo_clicked;
    const followupClicked = interactions.followup_clicked || interactions.cta_followup_clicked;
    const sampleClicked = interactions.sample_clicked || interactions.cta_sample_clicked;
    const escalatedToHuman = interactions.escalated_to_human || interactions.cta_escalated_to_human;
    
    const totalInteractions = [pricingClicked, demoClicked, followupClicked, sampleClicked, escalatedToHuman].filter(Boolean).length;
    
    if (totalInteractions >= 3) {
      indicators.push('Highly Engaged');
    } else if (totalInteractions >= 2) {
      indicators.push('Moderately Engaged');
    } else if (totalInteractions >= 1) {
      indicators.push('Minimally Engaged');
    } else {
      indicators.push('Low Engagement');
    }

    if (escalatedToHuman) {
      indicators.push('Requires Human Touch');
    }

    if (demoClicked || sampleClicked) {
      indicators.push('Product Interest');
    }

    return indicators;
  }

  /**
   * Generate recommendations based on analytics
   */
  private generateRecommendations(analytics: LeadAnalyticsInterface): string[] {
    const recommendations: string[] = [];

    // Score-based recommendations
    if (analytics.total_score >= 80) {
      recommendations.push('High-priority lead - Contact immediately');
      recommendations.push('Consider direct sales outreach');
    } else if (analytics.total_score >= 60) {
      recommendations.push('Warm lead - Follow up within 24 hours');
      recommendations.push('Send targeted product information');
    } else if (analytics.total_score >= 40) {
      recommendations.push('Nurture lead with educational content');
      recommendations.push('Schedule follow-up in 1-2 weeks');
    } else {
      recommendations.push('Add to long-term nurture campaign');
      recommendations.push('Focus on value proposition education');
    }

    // Urgency-based recommendations
    if (analytics.urgency_score >= 80) {
      recommendations.push('Time-sensitive opportunity - Act quickly');
    } else if (analytics.urgency_score <= 30) {
      recommendations.push('Long sales cycle expected - Plan accordingly');
    }

    // Budget-based recommendations
    if (analytics.budget_score >= 70) {
      recommendations.push('Budget confirmed - Present pricing options');
    } else if (analytics.budget_score <= 40) {
      recommendations.push('Budget concerns - Focus on ROI and value');
    }

    // CTA-based recommendations (support both JSONB and boolean columns)
    const interactions = analytics.cta_interactions;
    const demoClicked = interactions.demo_clicked || analytics.cta_demo_clicked;
    const pricingClicked = interactions.pricing_clicked || analytics.cta_pricing_clicked;
    const escalatedToHuman = interactions.escalated_to_human || analytics.cta_escalated_to_human;
    
    if (demoClicked) {
      recommendations.push('Demo requested - Schedule technical presentation');
    }
    if (pricingClicked) {
      recommendations.push('Pricing interest shown - Prepare custom quote');
    }
    if (escalatedToHuman) {
      recommendations.push('Human escalation requested - Assign to sales rep');
    }

    return recommendations;
  }

  /**
   * Get dashboard metrics for analytics overview
   * Requirements: 5.4, 5.5
   */
  async getDashboardMetrics(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<DashboardMetrics> {
    try {
      let query = `
        SELECT 
          COUNT(c.id) as total_calls,
          COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_calls,
          COALESCE(AVG(CASE WHEN la.total_score IS NOT NULL THEN la.total_score END), 0) as avg_lead_score,
          COUNT(CASE WHEN la.total_score >= 80 THEN 1 END) as hot_leads,
          COUNT(CASE WHEN la.total_score >= 60 AND la.total_score < 80 THEN 1 END) as warm_leads,
          COUNT(CASE WHEN la.total_score < 60 THEN 1 END) as cold_leads,
          COALESCE(SUM(c.duration_minutes), 0) as total_duration,
          COUNT(CASE WHEN la.cta_pricing_clicked = true THEN 1 END) as pricing_clicks,
          COUNT(CASE WHEN la.cta_demo_clicked = true THEN 1 END) as demo_requests,
          COUNT(CASE WHEN la.cta_followup_clicked = true THEN 1 END) as followup_requests,
          COUNT(CASE WHEN la.cta_sample_clicked = true THEN 1 END) as sample_requests,
          COUNT(CASE WHEN la.cta_escalated_to_human = true THEN 1 END) as human_escalations,
          COUNT(CASE WHEN la.company_name IS NOT NULL THEN 1 END) as leads_with_company
        FROM calls c
        LEFT JOIN lead_analytics la ON c.id = la.call_id
        WHERE c.user_id = $1
      `;

      const params: any[] = [userId];
      let paramIndex = 2;

      if (dateFrom) {
        query += ` AND c.created_at >= $${paramIndex}`;
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        query += ` AND c.created_at <= $${paramIndex}`;
        params.push(dateTo);
        paramIndex++;
      }

      const result = await LeadAnalytics.query(query, params);
      const stats = result.rows[0];

      const totalCalls = parseInt(stats.total_calls) || 0;
      const completedCalls = parseInt(stats.completed_calls) || 0;
      const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
      const highQualityLeads = parseInt(stats.hot_leads) + parseInt(stats.warm_leads);

      return {
        total_calls: totalCalls,
        completed_calls: completedCalls,
        success_rate: Math.round(successRate * 100) / 100,
        average_lead_score: Math.round((parseFloat(stats.avg_lead_score) || 0) * 100) / 100,
        high_quality_leads: highQualityLeads,
        total_call_duration: parseInt(stats.total_duration) || 0,
        conversion_metrics: {
          hot_leads: parseInt(stats.hot_leads) || 0,
          warm_leads: parseInt(stats.warm_leads) || 0,
          cold_leads: parseInt(stats.cold_leads) || 0
        },
        cta_performance: {
          pricing_clicks: parseInt(stats.pricing_clicks) || 0,
          demo_requests: parseInt(stats.demo_requests) || 0,
          followup_requests: parseInt(stats.followup_requests) || 0,
          sample_requests: parseInt(stats.sample_requests) || 0,
          human_escalations: parseInt(stats.human_escalations) || 0
        }
      };
    } catch (error) {
      logger.error(`Error getting dashboard metrics for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get call volume data for charts
   * Requirements: 5.4, 5.5
   */
  async getCallVolumeData(
    userId: string,
    dateFrom: Date,
    dateTo: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<CallVolumeData[]> {
    try {
      let dateFormat: string;
      let dateInterval: string;

      switch (groupBy) {
        case 'week':
          dateFormat = 'YYYY-"W"WW';
          dateInterval = '1 week';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          dateInterval = '1 month';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
          dateInterval = '1 day';
      }

      const query = `
        WITH date_series AS (
          SELECT generate_series(
            date_trunc('${groupBy}', $2::timestamp),
            date_trunc('${groupBy}', $3::timestamp),
            interval '${dateInterval}'
          ) AS date
        ),
        call_stats AS (
          SELECT 
            date_trunc('${groupBy}', c.created_at) as call_date,
            COUNT(*) as total_calls,
            COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_calls
          FROM calls c
          WHERE c.user_id = $1 
            AND c.created_at >= $2 
            AND c.created_at <= $3
          GROUP BY date_trunc('${groupBy}', c.created_at)
        )
        SELECT 
          to_char(ds.date, '${dateFormat}') as date,
          COALESCE(cs.total_calls, 0) as calls,
          COALESCE(cs.completed_calls, 0) as completed,
          CASE 
            WHEN COALESCE(cs.total_calls, 0) > 0 
            THEN ROUND((COALESCE(cs.completed_calls, 0)::float / cs.total_calls) * 100, 2)
            ELSE 0 
          END as success_rate
        FROM date_series ds
        LEFT JOIN call_stats cs ON ds.date = cs.call_date
        ORDER BY ds.date
      `;

      const result = await LeadAnalytics.query(query, [userId, dateFrom, dateTo]);

      return result.rows.map((row: any) => ({
        date: row.date,
        calls: parseInt(row.calls),
        completed: parseInt(row.completed),
        success_rate: parseFloat(row.success_rate)
      }));
    } catch (error) {
      logger.error(`Error getting call volume data for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get lead score trends over time
   * Requirements: 5.5
   */
  async getLeadScoreTrends(
    userId: string,
    dateFrom: Date,
    dateTo: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{
    date: string;
    average_score: number;
    hot_leads: number;
    warm_leads: number;
    cold_leads: number;
  }>> {
    try {
      let dateFormat: string;
      let dateInterval: string;

      switch (groupBy) {
        case 'week':
          dateFormat = 'YYYY-"W"WW';
          dateInterval = '1 week';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          dateInterval = '1 month';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
          dateInterval = '1 day';
      }

      const query = `
        WITH date_series AS (
          SELECT generate_series(
            date_trunc('${groupBy}', $2::timestamp),
            date_trunc('${groupBy}', $3::timestamp),
            interval '${dateInterval}'
          ) AS date
        ),
        analytics_stats AS (
          SELECT 
            date_trunc('${groupBy}', c.created_at) as analytics_date,
            AVG(la.total_score) as avg_score,
            COUNT(CASE WHEN la.total_score >= 80 THEN 1 END) as hot_leads,
            COUNT(CASE WHEN la.total_score >= 60 AND la.total_score < 80 THEN 1 END) as warm_leads,
            COUNT(CASE WHEN la.total_score < 60 THEN 1 END) as cold_leads
          FROM calls c
          JOIN lead_analytics la ON c.id = la.call_id
          WHERE c.user_id = $1 
            AND c.created_at >= $2 
            AND c.created_at <= $3
          GROUP BY date_trunc('${groupBy}', c.created_at)
        )
        SELECT 
          to_char(ds.date, '${dateFormat}') as date,
          COALESCE(ROUND(as_stats.avg_score, 2), 0) as average_score,
          COALESCE(as_stats.hot_leads, 0) as hot_leads,
          COALESCE(as_stats.warm_leads, 0) as warm_leads,
          COALESCE(as_stats.cold_leads, 0) as cold_leads
        FROM date_series ds
        LEFT JOIN analytics_stats as_stats ON ds.date = as_stats.analytics_date
        ORDER BY ds.date
      `;

      const result = await LeadAnalytics.query(query, [userId, dateFrom, dateTo]);

      return result.rows.map((row: any) => ({
        date: row.date,
        average_score: parseFloat(row.average_score),
        hot_leads: parseInt(row.hot_leads),
        warm_leads: parseInt(row.warm_leads),
        cold_leads: parseInt(row.cold_leads)
      }));
    } catch (error) {
      logger.error(`Error getting lead score trends for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get CTA performance trends
   * Requirements: 5.5
   */
  async getCTAPerformanceTrends(
    userId: string,
    dateFrom: Date,
    dateTo: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{
    date: string;
    pricing_clicks: number;
    demo_requests: number;
    followup_requests: number;
    sample_requests: number;
    human_escalations: number;
    total_interactions: number;
  }>> {
    try {
      let dateFormat: string;
      let dateInterval: string;

      switch (groupBy) {
        case 'week':
          dateFormat = 'YYYY-"W"WW';
          dateInterval = '1 week';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          dateInterval = '1 month';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
          dateInterval = '1 day';
      }

      const query = `
        WITH date_series AS (
          SELECT generate_series(
            date_trunc('${groupBy}', $2::timestamp),
            date_trunc('${groupBy}', $3::timestamp),
            interval '${dateInterval}'
          ) AS date
        ),
        cta_stats AS (
          SELECT 
            date_trunc('${groupBy}', c.created_at) as cta_date,
            COUNT(CASE WHEN la.cta_pricing_clicked = true THEN 1 END) as pricing_clicks,
            COUNT(CASE WHEN la.cta_demo_clicked = true THEN 1 END) as demo_requests,
            COUNT(CASE WHEN la.cta_followup_clicked = true THEN 1 END) as followup_requests,
            COUNT(CASE WHEN la.cta_sample_clicked = true THEN 1 END) as sample_requests,
            COUNT(CASE WHEN la.cta_escalated_to_human = true THEN 1 END) as human_escalations
          FROM calls c
          JOIN lead_analytics la ON c.id = la.call_id
          WHERE c.user_id = $1 
            AND c.created_at >= $2 
            AND c.created_at <= $3
          GROUP BY date_trunc('${groupBy}', c.created_at)
        )
        SELECT 
          to_char(ds.date, '${dateFormat}') as date,
          COALESCE(cs.pricing_clicks, 0) as pricing_clicks,
          COALESCE(cs.demo_requests, 0) as demo_requests,
          COALESCE(cs.followup_requests, 0) as followup_requests,
          COALESCE(cs.sample_requests, 0) as sample_requests,
          COALESCE(cs.human_escalations, 0) as human_escalations,
          COALESCE(cs.pricing_clicks, 0) + COALESCE(cs.demo_requests, 0) + 
          COALESCE(cs.followup_requests, 0) + COALESCE(cs.sample_requests, 0) + 
          COALESCE(cs.human_escalations, 0) as total_interactions
        FROM date_series ds
        LEFT JOIN cta_stats cs ON ds.date = cs.cta_date
        ORDER BY ds.date
      `;

      const result = await LeadAnalytics.query(query, [userId, dateFrom, dateTo]);

      return result.rows.map((row: any) => ({
        date: row.date,
        pricing_clicks: parseInt(row.pricing_clicks),
        demo_requests: parseInt(row.demo_requests),
        followup_requests: parseInt(row.followup_requests),
        sample_requests: parseInt(row.sample_requests),
        human_escalations: parseInt(row.human_escalations),
        total_interactions: parseInt(row.total_interactions)
      }));
    } catch (error) {
      logger.error(`Error getting CTA performance trends for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get top performing agents by lead quality
   * Requirements: 5.4
   */
  async getTopPerformingAgents(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 10
  ): Promise<Array<{
    agent_id: string;
    agent_name: string;
    total_calls: number;
    completed_calls: number;
    success_rate: number;
    average_lead_score: number;
    hot_leads: number;
    total_duration: number;
  }>> {
    try {
      let query = `
        SELECT 
          a.id as agent_id,
          a.name as agent_name,
          COUNT(c.id) as total_calls,
          COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_calls,
          CASE 
            WHEN COUNT(c.id) > 0 
            THEN ROUND((COUNT(CASE WHEN c.status = 'completed' THEN 1 END)::float / COUNT(c.id)) * 100, 2)
            ELSE 0 
          END as success_rate,
          COALESCE(AVG(CASE WHEN la.total_score IS NOT NULL THEN la.total_score END), 0) as avg_lead_score,
          COUNT(CASE WHEN la.total_score >= 80 THEN 1 END) as hot_leads,
          COALESCE(SUM(c.duration_minutes), 0) as total_duration
        FROM agents a
        LEFT JOIN calls c ON a.id = c.agent_id
        LEFT JOIN lead_analytics la ON c.id = la.call_id
        WHERE a.user_id = $1 AND a.is_active = true
      `;

      const params: any[] = [userId];
      let paramIndex = 2;

      if (dateFrom) {
        query += ` AND c.created_at >= $${paramIndex}`;
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        query += ` AND c.created_at <= $${paramIndex}`;
        params.push(dateTo);
        paramIndex++;
      }

      query += `
        GROUP BY a.id, a.name
        HAVING COUNT(c.id) > 0
        ORDER BY avg_lead_score DESC, success_rate DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);

      const result = await LeadAnalytics.query(query, params);

      return result.rows.map((row: any) => ({
        agent_id: row.agent_id,
        agent_name: row.agent_name,
        total_calls: parseInt(row.total_calls),
        completed_calls: parseInt(row.completed_calls),
        success_rate: parseFloat(row.success_rate),
        average_lead_score: Math.round(parseFloat(row.avg_lead_score) * 100) / 100,
        hot_leads: parseInt(row.hot_leads),
        total_duration: parseInt(row.total_duration)
      }));
    } catch (error) {
      logger.error(`Error getting top performing agents for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get enhanced CTA metrics with improved analytics using dedicated boolean columns
   * Requirements: US-2.1
   */
  async getEnhancedCTAMetrics(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    pricing_clicks: number;
    demo_requests: number;
    followup_requests: number;
    sample_requests: number;
    human_escalations: number;
    total_leads: number;
    leads_with_company: number;
    conversion_rates: {
      pricing_rate: number;
      demo_rate: number;
      followup_rate: number;
      sample_rate: number;
      escalation_rate: number;
    };
  }> {
    try {
      let query = `
        SELECT 
          COUNT(CASE WHEN la.cta_pricing_clicked = true THEN 1 END) as pricing_clicks,
          COUNT(CASE WHEN la.cta_demo_clicked = true THEN 1 END) as demo_requests,
          COUNT(CASE WHEN la.cta_followup_clicked = true THEN 1 END) as followup_requests,
          COUNT(CASE WHEN la.cta_sample_clicked = true THEN 1 END) as sample_requests,
          COUNT(CASE WHEN la.cta_escalated_to_human = true THEN 1 END) as human_escalations,
          COUNT(*) as total_leads,
          COUNT(CASE WHEN la.company_name IS NOT NULL THEN 1 END) as leads_with_company
        FROM lead_analytics la
        JOIN calls c ON la.call_id = c.id
        WHERE c.user_id = $1
      `;

      const params: any[] = [userId];
      let paramIndex = 2;

      if (dateFrom) {
        query += ` AND c.created_at >= $${paramIndex}`;
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        query += ` AND c.created_at <= $${paramIndex}`;
        params.push(dateTo);
        paramIndex++;
      }

      const result = await LeadAnalytics.query(query, params);
      const stats = result.rows[0];

      const totalLeads = parseInt(stats.total_leads) || 0;
      const pricingClicks = parseInt(stats.pricing_clicks) || 0;
      const demoRequests = parseInt(stats.demo_requests) || 0;
      const followupRequests = parseInt(stats.followup_requests) || 0;
      const sampleRequests = parseInt(stats.sample_requests) || 0;
      const humanEscalations = parseInt(stats.human_escalations) || 0;

      return {
        pricing_clicks: pricingClicks,
        demo_requests: demoRequests,
        followup_requests: followupRequests,
        sample_requests: sampleRequests,
        human_escalations: humanEscalations,
        total_leads: totalLeads,
        leads_with_company: parseInt(stats.leads_with_company) || 0,
        conversion_rates: {
          pricing_rate: totalLeads > 0 ? Math.round((pricingClicks / totalLeads) * 10000) / 100 : 0,
          demo_rate: totalLeads > 0 ? Math.round((demoRequests / totalLeads) * 10000) / 100 : 0,
          followup_rate: totalLeads > 0 ? Math.round((followupRequests / totalLeads) * 10000) / 100 : 0,
          sample_rate: totalLeads > 0 ? Math.round((sampleRequests / totalLeads) * 10000) / 100 : 0,
          escalation_rate: totalLeads > 0 ? Math.round((humanEscalations / totalLeads) * 10000) / 100 : 0
        }
      };
    } catch (error) {
      logger.error(`Error getting enhanced CTA metrics for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get company-based lead breakdown for improved lead analysis
   * Requirements: US-2.1
   */
  async getCompanyLeadBreakdown(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 20
  ): Promise<Array<{
    company_name: string;
    lead_count: number;
    avg_score: number;
    demo_requests: number;
    pricing_clicks: number;
    total_cta_interactions: number;
    conversion_rate: number;
  }>> {
    try {
      let query = `
        SELECT 
          la.company_name,
          COUNT(*) as lead_count,
          ROUND(AVG(la.total_score), 2) as avg_score,
          COUNT(CASE WHEN la.cta_demo_clicked = true THEN 1 END) as demo_requests,
          COUNT(CASE WHEN la.cta_pricing_clicked = true THEN 1 END) as pricing_clicks,
          COUNT(CASE WHEN (la.cta_pricing_clicked = true OR la.cta_demo_clicked = true OR 
                          la.cta_followup_clicked = true OR la.cta_sample_clicked = true OR 
                          la.cta_escalated_to_human = true) THEN 1 END) as total_cta_interactions
        FROM lead_analytics la
        JOIN calls c ON la.call_id = c.id
        WHERE c.user_id = $1 
          AND la.company_name IS NOT NULL 
          AND la.company_name != ''
      `;

      const params: any[] = [userId];
      let paramIndex = 2;

      if (dateFrom) {
        query += ` AND c.created_at >= $${paramIndex}`;
        params.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        query += ` AND c.created_at <= $${paramIndex}`;
        params.push(dateTo);
        paramIndex++;
      }

      query += `
        GROUP BY la.company_name
        HAVING COUNT(*) > 0
        ORDER BY lead_count DESC, avg_score DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);

      const result = await LeadAnalytics.query(query, params);

      return result.rows.map((row: any) => {
        const leadCount = parseInt(row.lead_count);
        const totalCtaInteractions = parseInt(row.total_cta_interactions);
        
        return {
          company_name: row.company_name,
          lead_count: leadCount,
          avg_score: parseFloat(row.avg_score) || 0,
          demo_requests: parseInt(row.demo_requests) || 0,
          pricing_clicks: parseInt(row.pricing_clicks) || 0,
          total_cta_interactions: totalCtaInteractions,
          conversion_rate: leadCount > 0 ? Math.round((totalCtaInteractions / leadCount) * 10000) / 100 : 0
        };
      });
    } catch (error) {
      logger.error(`Error getting company lead breakdown for user ${userId}:`, error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();