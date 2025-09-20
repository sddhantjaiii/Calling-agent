import BaseModel, { BaseModelInterface } from './BaseModel';

// Lead Analytics model - defines lead scoring data structure
export interface LeadReasoning {
  intent: string;
  urgency: string;
  budget: string;
  fit: string;
  engagement: string;
  cta_behavior: string;
}

export interface CTAInteractions {
  pricing_clicked: boolean;
  demo_clicked: boolean;
  followup_clicked: boolean;
  sample_clicked: boolean;
  escalated_to_human: boolean;
}

export interface LeadAnalyticsInterface extends BaseModelInterface {
  id: string;
  call_id: string;
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
  reasoning: LeadReasoning;
  cta_interactions: CTAInteractions;
  // Enhanced extraction columns
  company_name?: string;
  extracted_name?: string;
  extracted_email?: string;
  // Dedicated CTA boolean columns
  cta_pricing_clicked?: boolean;
  cta_demo_clicked?: boolean;
  cta_followup_clicked?: boolean;
  cta_sample_clicked?: boolean;
  cta_escalated_to_human?: boolean;
  // New enhanced analytics fields
  smart_notification?: string;
  demo_book_datetime?: string;
  created_at: Date;
}

export interface CreateLeadAnalyticsData {
  call_id: string;
  user_id?: string;
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
  reasoning: LeadReasoning;
  cta_interactions: CTAInteractions;
  // Enhanced extraction columns
  company_name?: string;
  extracted_name?: string;
  extracted_email?: string;
  // Dedicated CTA boolean columns
  cta_pricing_clicked?: boolean;
  cta_demo_clicked?: boolean;
  cta_followup_clicked?: boolean;
  cta_sample_clicked?: boolean;
  cta_escalated_to_human?: boolean;
  // New enhanced analytics fields
  smart_notification?: string;
  demo_book_datetime?: string;
}

export class LeadAnalyticsModel extends BaseModel<LeadAnalyticsInterface> {
  constructor() {
    super('lead_analytics');
  }

  /**
   * Find analytics by call ID
   */
  async findByCallId(callId: string): Promise<LeadAnalyticsInterface | null> {
    return await this.findOne({ call_id: callId });
  }

  /**
   * Create new lead analytics
   */
  async createAnalytics(analyticsData: CreateLeadAnalyticsData): Promise<LeadAnalyticsInterface> {
    return await this.create(analyticsData);
  }

  /**
   * Get analytics by score range
   */
  async findByScoreRange(minScore: number, maxScore: number): Promise<LeadAnalyticsInterface[]> {
    const query = `
      SELECT * FROM lead_analytics 
      WHERE total_score >= $1 AND total_score <= $2 
      ORDER BY total_score DESC
    `;
    const result = await this.query(query, [minScore, maxScore]);
    return result.rows;
  }

  /**
   * Get analytics by lead status
   */
  async findByLeadStatus(status: string): Promise<LeadAnalyticsInterface[]> {
    return await this.findBy({ lead_status_tag: status });
  }
}

export default new LeadAnalyticsModel();