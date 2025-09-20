import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { agentService } from '../services/agentService';
import { BillingService } from '../services/billingService';
import { DashboardKpiService } from '../services/dashboardKpiService';
import { DashboardAnalyticsService } from '../services/dashboardAnalyticsService';
import { dashboardCacheService } from '../services/dashboardCache';
import { logger } from '../utils/logger';
import database from '../config/database';

export class DashboardController {
  /**
   * Get overview data for dashboard KPIs (OPTIMIZED with cache-first strategy)
   * GET /api/dashboard/overview
   * Returns data matching OverviewKPIs component expectations
   * Requirements: 1.2, 6.1, 6.2, 6.3
   */
  async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      
      logger.info(`Fetching dashboard overview with cache-first strategy for user ${userId}`);
      const startTime = Date.now();

      // Check if materialized view needs refresh (background check)
      DashboardKpiService.checkAndRefreshIfNeeded().catch(error => {
        logger.error('Background refresh check failed:', error);
      });

      // Use cache-first strategy for dashboard data
      const overviewData = await dashboardCacheService.getOverviewData(userId);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      logger.info(`Dashboard overview fetched in ${duration}ms (cache-first strategy)`);

      res.json({
        success: true,
        data: overviewData,
        performance: {
          queryTime: duration,
          source: 'cache_first_strategy',
          optimized: true
        }
      });
    } catch (error) {
      logger.error('Error fetching dashboard overview with cache:', error);
      
      // Fallback to original method if cache fails
      try {
        logger.warn('Falling back to original dashboard method');
        await this.getOverviewFallback(req, res);
      } catch (fallbackError) {
        logger.error('Fallback method also failed:', fallbackError);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        });
      }
    }
  }

  /**
   * Fallback method using original dashboard logic
   * Used when materialized view is not available
   */
  private async getOverviewFallback(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;

    // Get user's credit balance
    const creditBalance = await BillingService.getUserCredits(userId);

    // Get user's agents
    const agents = await agentService.listAgentsForFrontend(userId);

    // Get real data from database
    const totalAgents = agents.length;
    const activeAgents = agents.filter(agent => agent.status === 'active').length;

    // Query aggregated data from agent analytics (faster than individual calls)
    const aggregatedStatsQuery = `
      SELECT 
        COALESCE(SUM(aa.total_calls), 0) as total_calls,
        COALESCE(SUM(aa.successful_calls), 0) as completed_calls,
        COALESCE(SUM(aa.total_duration_minutes), 0) as total_duration,
        COALESCE(SUM(aa.credits_used), 0) as total_credits_used,
        COALESCE(SUM(aa.leads_generated), 0) as total_leads,
        COALESCE(SUM(aa.qualified_leads), 0) as high_quality_leads,
        COALESCE(AVG(aa.avg_engagement_score), 0) as avg_lead_score
      FROM agent_analytics aa
      WHERE aa.user_id = $1 AND aa.hour IS NULL
    `;
    const aggregatedResult = await database.query(aggregatedStatsQuery, [userId]);
    const aggregatedData = aggregatedResult.rows[0];

    const callStats = {
      total_calls: aggregatedData.total_calls,
      completed_calls: aggregatedData.completed_calls,
      total_duration: aggregatedData.total_duration,
      total_credits_used: aggregatedData.total_credits_used
    };

    const leadStats = {
      total_leads: aggregatedData.total_leads,
      high_quality_leads: aggregatedData.high_quality_leads,
      avg_lead_score: aggregatedData.avg_lead_score
    };

    // Calculate metrics from real data
    const totalCalls = parseInt(callStats.total_calls) || 0;
    const completedCalls = parseInt(callStats.completed_calls) || 0;
    const totalLeads = parseInt(leadStats.total_leads) || 0;
    const qualifiedLeads = parseInt(leadStats.high_quality_leads) || 0;
    const conversionRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    // Calculate average conversations per hour (if we have data)
    const avgConversationsPerHour = totalCalls > 0 && callStats.total_duration > 0
      ? (totalCalls / (parseInt(callStats.total_duration) / 60)).toFixed(1)
      : '0.0';

    // KPI data with real database values
    const kpis = totalCalls > 0 ? [
      {
        label: "Total Unique Leads",
        value: totalLeads,
        delta: 0,
        compare: "vs last month",
        description: "Total number of new leads captured during the selected date range.",
      },
      {
        label: "Total Interactions",
        value: totalCalls,
        delta: 0,
        compare: "vs last month",
        description: "Sum of all call-based interactions across agents.",
      },
      {
        label: "Leads Converted",
        value: qualifiedLeads,
        percentage: parseFloat(conversionRate),
        delta: 0,
        compare: "vs last month",
        description: "Number and percentage of leads who became qualified prospects.",
      },
      {
        label: "Avg. Conversations per Hour",
        value: parseFloat(avgConversationsPerHour),
        delta: 0,
        compare: "vs last month",
        description: "Average number of interactions handled per hour by agents.",
        efficiency: parseFloat(avgConversationsPerHour) > 2 ? "high" : "medium",
      },
      {
        label: "Avg. Lead Score",
        value: parseFloat(leadStats.avg_lead_score || '0').toFixed(1),
        delta: 0,
        compare: "vs last month",
        description: "Average lead quality score from AI analysis.",
      },
      {
        label: "Call Success Rate",
        value: totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) + '%' : '0%',
        delta: 0,
        compare: "vs last month",
        description: "Percentage of calls that completed successfully.",
      },
    ] : [
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

    // Get recent activity from database
    const recentActivityQuery = `
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
    const recentActivityResult = await database.query(recentActivityQuery, [userId]);
    const recentActivity = recentActivityResult.rows.map((row: any, index: number) => ({
      id: index + 1,
      type: row.type,
      message: row.message,
      timestamp: row.timestamp,
      agentName: row.agent_name,
    }));

    // Additional overview data for other dashboard components
    const overviewData = {
      kpis,
      credits: {
        current: creditBalance,
        usedThisMonth: parseInt(callStats.total_credits_used) || 0,
        remaining: creditBalance,
      },
      agents: {
        total: totalAgents,
        active: activeAgents,
        draft: totalAgents - activeAgents,
      },
      conversations: {
        total: totalCalls,
        thisMonth: totalCalls,
        successRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
      },
      leads: {
        total: totalLeads,
        qualified: qualifiedLeads,
        conversionRate: parseFloat(conversionRate),
      },
      recentActivity: recentActivity.length > 0 ? recentActivity : [
        {
          id: 1,
          type: 'no_activity',
          message: 'No recent activity. Start making calls to see data here.',
          timestamp: new Date().toISOString(),
          agentName: 'System',
        },
      ],
    };

    res.json({
      success: true,
      data: overviewData,
      performance: {
        source: 'fallback_method',
        optimized: false
      }
    });
  }

  /**
   * Get analytics data for charts (OPTIMIZED with cache-first strategy)
   * GET /api/dashboard/analytics
   * Returns data matching OverviewCharts component expectations
   * Requirements: 6.1, 6.2
   */
  async getAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const queryParams = req.query;
      
      logger.info(`Fetching dashboard analytics with cache-first strategy for user ${userId}`);
      const startTime = Date.now();

      // Use cache-first strategy for analytics data
      const analyticsData = await dashboardCacheService.getAnalyticsData(userId, queryParams);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      logger.info(`Dashboard analytics fetched in ${duration}ms (cache-first strategy)`);

      res.json({
        success: true,
        data: analyticsData,
        performance: {
          queryTime: duration,
          source: 'cache_first_strategy',
          optimized: true
        }
      });
    } catch (error) {
      logger.error('Error fetching dashboard analytics with cache:', error);
      
      // Fallback to simplified analytics generation
      try {
        logger.warn('Falling back to simplified analytics generation');
        await this.getAnalyticsFallback(req, res);
      } catch (fallbackError) {
        logger.error('Fallback analytics method also failed:', fallbackError);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch analytics data',
        });
      }
    }
  }

  /**
   * Fallback analytics method with simplified data generation
   * Used when optimized analytics service fails
   */
  private async getAnalyticsFallback(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    
    // Generate fallback analytics data using the service
    const analyticsData = await DashboardAnalyticsService.getOptimizedAnalyticsData(userId);

    res.json({
      success: true,
      data: analyticsData,
      performance: {
        source: 'fallback_method',
        optimized: false
      }
    });
  }


}