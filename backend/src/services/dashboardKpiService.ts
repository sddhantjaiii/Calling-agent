import database from '../config/database';
import { logger } from '../utils/logger';
import { queryCache, QueryCache } from './queryCache';

export interface UserKPISummary {
  user_id: string;
  email: string;
  name: string;
  credits: number;
  is_active: boolean;
  user_created_at: Date;
  
  // Call metrics (last 30 days)
  total_calls_30d: number;
  successful_calls_30d: number;
  failed_calls_30d: number;
  success_rate_30d: number;
  total_duration_30d: number;
  avg_duration_30d: number;
  total_credits_used_30d: number;
  
  // Lead metrics (last 30 days)
  total_leads_30d: number;
  qualified_leads_30d: number;
  conversion_rate_30d: number;
  avg_lead_score_30d: number;
  avg_intent_score_30d: number;
  avg_engagement_score_30d: number;
  
  // Agent metrics (current)
  total_agents: number;
  active_agents: number;
  draft_agents: number;
  
  // Agent performance metrics (last 30 days)
  avg_conversations_per_hour_30d: number;
  best_performing_agent_id: string | null;
  best_performing_agent_name: string | null;
  best_agent_success_rate: number;
  
  // Recent activity metrics (last 7 days)
  calls_last_7d: number;
  leads_last_7d: number;
  credits_used_last_7d: number;
  
  // All-time metrics
  total_calls_lifetime: number;
  total_leads_lifetime: number;
  total_credits_used_lifetime: number;
  
  // Cache metadata
  calculated_at: Date;
  expires_at: Date;
}

export interface DashboardOverviewData {
  kpis: Array<{
    label: string;
    value: number | string;
    delta?: number;
    percentage?: number;
    compare?: string;
    description: string;
    efficiency?: string;
  }>;
  credits: {
    current: number;
    usedThisMonth: number;
    remaining: number;
  };
  agents: {
    total: number;
    active: number;
    draft: number;
  };
  conversations: {
    total: number;
    thisMonth: number;
    successRate: number;
  };
  leads: {
    total: number;
    qualified: number;
    conversionRate: number;
    withCompany: number; // US-2.1 - Company name data
  };
  // Enhanced CTA metrics (US-2.1)
  ctaMetrics: {
    pricingClicks: number;
    demoRequests: number;
    followupRequests: number;
    sampleRequests: number;
    humanEscalations: number;
  };
  recentActivity: Array<{
    id: number;
    type: string;
    message: string;
    timestamp: string;
    agentName: string;
  }>;
}

export class DashboardKpiService {
  /**
   * Get user KPI summary from materialized view with caching
   * This is the optimized method that uses pre-calculated data with query result caching
   */
  static async getUserKPISummary(userId: string): Promise<UserKPISummary | null> {
    try {
      // Check cache first
      const cacheKey = QueryCache.generateDashboardKey(userId, 'kpi_summary');
      const cachedResult = queryCache.get<UserKPISummary>(cacheKey);
      
      if (cachedResult) {
        logger.debug(`Cache hit for user KPI summary: ${userId}`);
        return cachedResult;
      }

      const query = `
        SELECT * FROM user_kpi_summary 
        WHERE user_id = $1
      `;
      
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        logger.warn(`No KPI summary found for user ${userId}`);
        return null;
      }
      
      const kpiSummary = result.rows[0] as UserKPISummary;
      
      // Cache the result for 10 minutes (shorter than materialized view refresh interval)
      queryCache.set(cacheKey, kpiSummary, 10 * 60 * 1000);
      logger.debug(`Cached user KPI summary for user: ${userId}`);
      
      return kpiSummary;
    } catch (error) {
      logger.error('Error fetching user KPI summary:', error);
      throw error;
    }
  }

  /**
   * Get optimized dashboard overview data using materialized view
   * This replaces the slow dashboard queries with fast materialized view lookups
   */
  static async getOptimizedOverviewData(userId: string): Promise<DashboardOverviewData> {
    try {
      // Get KPI summary from materialized view (fast lookup)
      const kpiSummary = await this.getUserKPISummary(userId);
      
      if (!kpiSummary) {
        // Fallback to empty data if no summary exists
        return this.getEmptyOverviewData();
      }

      // Calculate KPIs from materialized view data
      const kpis = this.buildKPIsFromSummary(kpiSummary);
      
      // Get recent activity (this is still a direct query but limited to 5 rows)
      const recentActivity = await this.getRecentActivity(userId);
      
      return {
        kpis,
        credits: {
          current: kpiSummary.credits,
          usedThisMonth: kpiSummary.total_credits_used_30d,
          remaining: kpiSummary.credits,
        },
        agents: {
          total: kpiSummary.total_agents,
          active: kpiSummary.active_agents,
          draft: kpiSummary.draft_agents,
        },
        conversations: {
          total: kpiSummary.total_calls_30d,
          thisMonth: kpiSummary.total_calls_30d,
          successRate: kpiSummary.success_rate_30d,
        },
        leads: {
          total: kpiSummary.total_leads_30d,
          qualified: kpiSummary.qualified_leads_30d,
          conversionRate: kpiSummary.conversion_rate_30d,
          withCompany: 0, // Will be populated by enhanced metrics in batch version
        },
        ctaMetrics: {
          pricingClicks: 0,
          demoRequests: 0,
          followupRequests: 0,
          sampleRequests: 0,
          humanEscalations: 0,
        },
        recentActivity,
      };
    } catch (error) {
      logger.error('Error getting optimized overview data:', error);
      throw error;
    }
  }

  /**
   * Get optimized dashboard overview data using materialized view with batch queries
   * This version uses batch queries for agent data and optimized recent activity query
   * Requirements: US-2.1 - Enhanced with CTA metrics and company data
   */
  static async getOptimizedOverviewDataWithBatchQueries(userId: string): Promise<DashboardOverviewData> {
    try {
      // Execute all queries in parallel for maximum performance, including enhanced metrics
      const [kpiSummary, recentActivity, enhancedMetrics] = await Promise.all([
        this.getUserKPISummary(userId),
        this.getOptimizedRecentActivity(userId),
        this.getEnhancedLeadMetrics(userId)
      ]);
      
      if (!kpiSummary) {
        // Fallback to empty data if no summary exists
        return this.getEmptyOverviewData();
      }

      // Calculate KPIs from materialized view data
      const kpis = this.buildKPIsFromSummary(kpiSummary);
      
      return {
        kpis,
        credits: {
          current: kpiSummary.credits,
          usedThisMonth: kpiSummary.total_credits_used_30d,
          remaining: kpiSummary.credits,
        },
        agents: {
          total: kpiSummary.total_agents,
          active: kpiSummary.active_agents,
          draft: kpiSummary.draft_agents,
        },
        conversations: {
          total: kpiSummary.total_calls_30d,
          thisMonth: kpiSummary.total_calls_30d,
          successRate: kpiSummary.success_rate_30d,
        },
        leads: {
          total: kpiSummary.total_leads_30d,
          qualified: kpiSummary.qualified_leads_30d,
          conversionRate: kpiSummary.conversion_rate_30d,
          withCompany: enhancedMetrics.leadsWithCompany,
        },
        ctaMetrics: {
          pricingClicks: enhancedMetrics.pricingClicks,
          demoRequests: enhancedMetrics.demoRequests,
          followupRequests: enhancedMetrics.followupRequests,
          sampleRequests: enhancedMetrics.sampleRequests,
          humanEscalations: enhancedMetrics.humanEscalations,
        },
        recentActivity,
      };
    } catch (error) {
      logger.error('Error getting optimized overview data with batch queries:', error);
      throw error;
    }
  }

  /**
   * Build KPI array from materialized view summary data
   */
  private static buildKPIsFromSummary(summary: UserKPISummary) {
    const hasData = summary.total_calls_30d > 0;
    
    if (!hasData) {
      return this.getEmptyKPIs();
    }

    // Safely coerce numeric fields and round as needed
    const avgConvPerHour = Number(summary.avg_conversations_per_hour_30d);
    const avgConvPerHourRounded = Number.isFinite(avgConvPerHour) ? Math.round(avgConvPerHour * 10) / 10 : 0;
    const avgLeadScore = Number(summary.avg_lead_score_30d);
    const avgLeadScoreRounded = Number.isFinite(avgLeadScore) ? Math.round(avgLeadScore * 10) / 10 : 0;

    return [
      {
        label: "Total Unique Leads",
        value: summary.total_leads_30d,
        delta: 0, // TODO: Calculate vs previous period
        compare: "vs last month",
        description: "Total number of new leads captured in the last 30 days.",
      },
      {
        label: "Total Interactions",
        value: summary.total_calls_30d,
        delta: 0, // TODO: Calculate vs previous period
        compare: "vs last month",
        description: "Sum of all call-based interactions across agents in the last 30 days.",
      },
      {
        label: "Leads Converted",
        value: summary.qualified_leads_30d,
        percentage: summary.conversion_rate_30d,
        delta: 0, // TODO: Calculate vs previous period
        compare: "vs last month",
        description: "Number and percentage of leads who became qualified prospects.",
      },
      {
        label: "Avg. Conversations per Hour",
        value: avgConvPerHourRounded,
        delta: 0, // TODO: Calculate vs previous period
        compare: "vs last month",
        description: "Average number of interactions handled per hour by agents.",
        efficiency: avgConvPerHourRounded > 2 ? "high" : "medium",
      },
      {
        label: "Avg. Lead Score",
        value: avgLeadScoreRounded,
        delta: 0, // TODO: Calculate vs previous period
        compare: "vs last month",
        description: "Average lead quality score from AI analysis.",
      },
      {
        label: "Call Success Rate",
        value: `${summary.success_rate_30d}%`,
        delta: 0, // TODO: Calculate vs previous period
        compare: "vs last month",
        description: "Percentage of calls that completed successfully.",
      },
    ];
  }

  /**
   * Get empty KPIs for users with no data
   */
  private static getEmptyKPIs() {
    return [
      {
        label: "Total Unique Leads",
        value: 0,
        delta: 0,
        compare: "vs last month",
        description: "No leads captured yet. Start making calls to see data here.",
      },
      {
        label: "Total Interactions",
        value: 0,
        delta: 0,
        compare: "vs last month",
        description: "No interactions recorded yet. Your agents are ready to start calling.",
      },
      {
        label: "Leads Converted",
        value: 0,
        percentage: 0,
        delta: 0,
        compare: "vs last month",
        description: "No conversions yet. Keep engaging with leads to see results.",
      },
    ];
  }

  /**
   * Get recent activity (still uses direct query but limited)
   */
  private static async getRecentActivity(userId: string) {
    try {
      const query = `
        SELECT 
          c.id,
          'call_completed' as type,
          CASE 
            WHEN c.status = 'completed' THEN 'Call completed successfully'
            WHEN c.status = 'failed' THEN 'Call failed'
            ELSE 'Call in progress'
          END as message,
          c.created_at as timestamp,
          a.name as agent_name
        FROM calls c
        JOIN agents a ON c.agent_id = a.id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC
        LIMIT 5
      `;
      
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return [{
          id: 1,
          type: 'no_activity',
          message: 'No recent activity. Start making calls to see data here.',
          timestamp: new Date().toISOString(),
          agentName: 'System',
        }];
      }
      
      return result.rows.map((row: any, index: number) => ({
        id: index + 1,
        type: row.type,
        message: row.message,
        timestamp: row.timestamp,
        agentName: row.agent_name,
      }));
    } catch (error) {
      logger.error('Error fetching recent activity:', error);
      return [{
        id: 1,
        type: 'error',
        message: 'Unable to load recent activity.',
        timestamp: new Date().toISOString(),
        agentName: 'System',
      }];
    }
  }

  /**
   * Get optimized recent activity using indexed ORDER BY and proper LIMIT with caching
   * Uses the idx_calls_recent_activity index for optimal performance
   */
  private static async getOptimizedRecentActivity(userId: string) {
    try {
      // Check cache first
      const cacheKey = QueryCache.generateDashboardKey(userId, 'recent_activity');
      const cachedResult = queryCache.get<any[]>(cacheKey);
      
      if (cachedResult) {
        logger.debug(`Cache hit for recent activity: ${userId}`);
        return cachedResult;
      }

      // Optimized query using composite index idx_calls_recent_activity
      // This query is designed to use the index (user_id, created_at DESC, status, phone_number)
      const query = `
        SELECT 
          c.id,
          'call_completed' as type,
          CASE 
            WHEN c.status = 'completed' THEN 'Call completed successfully'
            WHEN c.status = 'failed' THEN 'Call failed'
            WHEN c.status = 'cancelled' THEN 'Call cancelled'
            ELSE 'Call in progress'
          END as message,
          c.created_at as timestamp,
          a.name as agent_name,
          c.phone_number
        FROM calls c
        INNER JOIN agents a ON c.agent_id = a.id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC
        LIMIT 5
      `;
      
      const result = await database.query(query, [userId]);
      
      let recentActivity;
      if (result.rows.length === 0) {
        recentActivity = [{
          id: 1,
          type: 'no_activity',
          message: 'No recent activity. Start making calls to see data here.',
          timestamp: new Date().toISOString(),
          agentName: 'System',
        }];
      } else {
        recentActivity = result.rows.map((row: any, index: number) => ({
          id: index + 1,
          type: row.type,
          message: row.message,
          timestamp: row.timestamp,
          agentName: row.agent_name,
        }));
      }
      
      // Cache the result for 2 minutes (recent activity changes frequently)
      queryCache.set(cacheKey, recentActivity, 2 * 60 * 1000);
      logger.debug(`Cached recent activity for user: ${userId}`);
      
      return recentActivity;
    } catch (error) {
      logger.error('Error fetching optimized recent activity:', error);
      // Fallback to original method
      return this.getRecentActivity(userId);
    }
  }

  /**
   * Get enhanced lead metrics including CTA data and company information
   * Requirements: US-2.1 - Enhanced CTA metrics and company data
   */
  private static async getEnhancedLeadMetrics(userId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          COUNT(CASE WHEN la.cta_pricing_clicked = true THEN 1 END) as pricing_clicks,
          COUNT(CASE WHEN la.cta_demo_clicked = true THEN 1 END) as demo_requests,
          COUNT(CASE WHEN la.cta_followup_clicked = true THEN 1 END) as followup_requests,
          COUNT(CASE WHEN la.cta_sample_clicked = true THEN 1 END) as sample_requests,
          COUNT(CASE WHEN la.cta_escalated_to_human = true THEN 1 END) as human_escalations,
          COUNT(CASE WHEN la.company_name IS NOT NULL AND la.company_name != '' THEN 1 END) as leads_with_company
        FROM lead_analytics la
        JOIN calls c ON la.call_id = c.id
        WHERE c.user_id = $1 
          AND c.created_at >= CURRENT_DATE - INTERVAL '30 days'
      `;

      const result = await database.query(query, [userId]);
      const row = result.rows[0] || {};

      return {
        pricingClicks: parseInt(String(row.pricing_clicks)) || 0,
        demoRequests: parseInt(String(row.demo_requests)) || 0,
        followupRequests: parseInt(String(row.followup_requests)) || 0,
        sampleRequests: parseInt(String(row.sample_requests)) || 0,
        humanEscalations: parseInt(String(row.human_escalations)) || 0,
        leadsWithCompany: parseInt(String(row.leads_with_company)) || 0
      };
    } catch (error) {
      logger.error('Error getting enhanced lead metrics:', error);
      return {
        pricingClicks: 0,
        demoRequests: 0,
        followupRequests: 0,
        sampleRequests: 0,
        humanEscalations: 0,
        leadsWithCompany: 0
      };
    }
  }

  /**
   * Get empty overview data for users with no KPI summary
   */
  private static getEmptyOverviewData(): DashboardOverviewData {
    return {
      kpis: this.getEmptyKPIs(),
      credits: {
        current: 0,
        usedThisMonth: 0,
        remaining: 0,
      },
      agents: {
        total: 0,
        active: 0,
        draft: 0,
      },
      conversations: {
        total: 0,
        thisMonth: 0,
        successRate: 0,
      },
      leads: {
        total: 0,
        qualified: 0,
        conversionRate: 0,
        withCompany: 0,
      },
      ctaMetrics: {
        pricingClicks: 0,
        demoRequests: 0,
        followupRequests: 0,
        sampleRequests: 0,
        humanEscalations: 0,
      },
      recentActivity: [{
        id: 1,
        type: 'no_data',
        message: 'No data available. Create agents and start making calls.',
        timestamp: new Date().toISOString(),
        agentName: 'System',
      }],
    };
  }

  /**
   * Refresh materialized view (can be called manually or by background job)
   */
  static async refreshMaterializedView(): Promise<void> {
    try {
      logger.info('Refreshing user KPI summary materialized view...');
      const startTime = Date.now();
      
      await database.query('SELECT refresh_user_kpi_summary()');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      logger.info(`Materialized view refreshed successfully in ${duration}ms`);
    } catch (error) {
      logger.error('Error refreshing materialized view:', error);
      throw error;
    }
  }

  /**
   * Check if materialized view needs refresh based on age
   */
  static async checkAndRefreshIfNeeded(): Promise<boolean> {
    try {
      // Check the age of the materialized view data
      const query = `
        SELECT 
          MAX(calculated_at) as last_calculated,
          COUNT(*) as total_rows
        FROM user_kpi_summary
      `;
      
      const result = await database.query(query);
      const { last_calculated, total_rows } = result.rows[0];
      
      if (total_rows === 0) {
        logger.info('Materialized view is empty, refreshing...');
        await this.refreshMaterializedView();
        return true;
      }
      
      // Check if data is older than 15 minutes (configurable)
      const refreshIntervalMs = 30 * 1000; // 30 seconds
      const lastCalculatedTime = new Date(last_calculated).getTime();
      const now = Date.now();
      
      if (now - lastCalculatedTime > refreshIntervalMs) {
        logger.info('Materialized view data is stale, refreshing...');
        await this.refreshMaterializedView();
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking materialized view freshness:', error);
      return false;
    }
  }

  /**
   * Get materialized view statistics for monitoring
   */
  static async getViewStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_users,
          MAX(calculated_at) as last_refresh,
          MIN(calculated_at) as oldest_data,
          AVG(total_calls_30d) as avg_calls_per_user,
          AVG(success_rate_30d) as avg_success_rate,
          COUNT(CASE WHEN total_calls_30d > 0 THEN 1 END) as active_users
        FROM user_kpi_summary
      `;
      
      const result = await database.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting view statistics:', error);
      throw error;
    }
  }
}