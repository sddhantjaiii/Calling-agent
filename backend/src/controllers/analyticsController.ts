import { Request, Response } from 'express';
import { analyticsService } from '../services/analyticsService';
import { logger } from '../utils/logger';

export class AnalyticsController {
  /**
   * Get lead analytics for a specific call
   * GET /api/analytics/calls/:callId
   */
  async getCallAnalytics(req: Request, res: Response): Promise<void> {
    const { callId } = req.params;
    const userId = (req.user as any)?.id;
    logger.info(`getCallAnalytics called for callId: ${callId} by user: ${userId}`);

    try {
      if (!callId) {
        logger.warn('getCallAnalytics called without callId');
        res.status(400).json({
          success: false,
          error: 'Call ID is required'
        });
        return;
      }

      // Verify user owns the call (security check)
      logger.info(`Fetching call ${callId} from database`);
      const Call = (await import('../models/Call')).default;
      const call = await Call.findById(callId);
      
      if (!call) {
        logger.warn(`Call not found for callId: ${callId}`);
        res.status(404).json({
          success: false,
          error: 'Call not found'
        });
        return;
      }

      if (call.user_id !== userId) {
        logger.warn(`User ${userId} attempted to access call ${callId} owned by ${call.user_id}`);
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      logger.info(`Fetching analytics for call ${callId}`);
      const analytics = await analyticsService.getLeadAnalyticsWithReasoning(callId);

      if (!analytics) {
        logger.warn(`Analytics not found for callId: ${callId}`);
        res.status(404).json({
          success: false,
          error: 'Analytics not found for this call'
        });
        return;
      }

      logger.info(`Successfully fetched analytics for callId: ${callId}`, { analytics });
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting call analytics:', { error, callId, userId });
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get lead analytics list with filtering
   * GET /api/analytics/leads
   */
  async getLeadAnalyticsList(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Parse query parameters
      const {
        minScore,
        maxScore,
        leadStatus,
        dateFrom,
        dateTo,
        limit = 50,
        offset = 0
      } = req.query;

      const filters: any = {};

      if (minScore) filters.minScore = parseInt(minScore as string);
      if (maxScore) filters.maxScore = parseInt(maxScore as string);
      if (leadStatus) filters.leadStatus = leadStatus as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const result = await analyticsService.getLeadAnalyticsList(userId, filters);

      res.status(200).json({
        success: true,
        data: {
          analytics: result.analytics,
          pagination: {
            total: result.total,
            limit: filters.limit || 50,
            offset: filters.offset || 0,
            has_more: result.total > (filters.offset || 0) + result.analytics.length
          }
        }
      });
    } catch (error) {
      logger.error('Error getting lead analytics list:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get lead analytics summary statistics
   * GET /api/analytics/summary
   */
  async getAnalyticsSummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { dateFrom, dateTo } = req.query;
      
      // Get summary statistics
      let query = `
        SELECT 
          COUNT(*) as total_analytics,
          AVG(la.total_score) as avg_score,
          COUNT(CASE WHEN la.total_score >= 80 THEN 1 END) as hot_leads,
          COUNT(CASE WHEN la.total_score >= 60 AND la.total_score < 80 THEN 1 END) as warm_leads,
          COUNT(CASE WHEN la.total_score >= 40 AND la.total_score < 60 THEN 1 END) as qualified_leads,
          COUNT(CASE WHEN la.total_score < 40 THEN 1 END) as cold_leads,
          COUNT(CASE WHEN la.cta_interactions->>'pricing_clicked' = 'true' THEN 1 END) as pricing_clicks,
          COUNT(CASE WHEN la.cta_interactions->>'demo_clicked' = 'true' THEN 1 END) as demo_requests,
          COUNT(CASE WHEN la.cta_interactions->>'followup_clicked' = 'true' THEN 1 END) as followup_requests,
          COUNT(CASE WHEN la.cta_interactions->>'escalated_to_human' = 'true' THEN 1 END) as human_escalations
        FROM lead_analytics la
        JOIN calls c ON la.call_id = c.id
        WHERE c.user_id = $1
      `;
      
      const params: any[] = [userId];
      let paramIndex = 2;

      if (dateFrom) {
        query += ` AND c.created_at >= $${paramIndex}`;
        params.push(new Date(dateFrom as string));
        paramIndex++;
      }

      if (dateTo) {
        query += ` AND c.created_at <= $${paramIndex}`;
        params.push(new Date(dateTo as string));
        paramIndex++;
      }

      const LeadAnalytics = (await import('../models/LeadAnalytics')).default;
      const result = await LeadAnalytics.query(query, params);
      const stats = result.rows[0];

      // Format response
      const summary = {
        total_analytics: parseInt(stats.total_analytics) || 0,
        average_score: parseFloat(stats.avg_score) || 0,
        lead_distribution: {
          hot_leads: parseInt(stats.hot_leads) || 0,
          warm_leads: parseInt(stats.warm_leads) || 0,
          qualified_leads: parseInt(stats.qualified_leads) || 0,
          cold_leads: parseInt(stats.cold_leads) || 0
        },
        cta_performance: {
          pricing_clicks: parseInt(stats.pricing_clicks) || 0,
          demo_requests: parseInt(stats.demo_requests) || 0,
          followup_requests: parseInt(stats.followup_requests) || 0,
          human_escalations: parseInt(stats.human_escalations) || 0
        }
      };

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error getting analytics summary:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get lead score distribution
   * GET /api/analytics/score-distribution
   */
  async getScoreDistribution(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const query = `
        SELECT 
          CASE 
            WHEN la.total_score >= 80 THEN '80-100'
            WHEN la.total_score >= 60 THEN '60-79'
            WHEN la.total_score >= 40 THEN '40-59'
            WHEN la.total_score >= 20 THEN '20-39'
            ELSE '0-19'
          END as score_range,
          COUNT(*) as count
        FROM lead_analytics la
        JOIN calls c ON la.call_id = c.id
        WHERE c.user_id = $1
        GROUP BY score_range
        ORDER BY MIN(la.total_score) DESC
      `;

      const LeadAnalytics = (await import('../models/LeadAnalytics')).default;
      const result = await LeadAnalytics.query(query, [userId]);
      
      const total = result.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0);
      
      const distribution = result.rows.map((row: any) => ({
        score_range: row.score_range,
        count: parseInt(row.count),
        percentage: total > 0 ? Math.round((parseInt(row.count) / total) * 100) : 0
      }));

      res.status(200).json({
        success: true,
        data: {
          distribution,
          total_leads: total
        }
      });
    } catch (error) {
      logger.error('Error getting score distribution:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get dashboard metrics overview
   * GET /api/analytics/dashboard/metrics
   */
  async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { dateFrom, dateTo } = req.query;
      
      let fromDate: Date | undefined;
      let toDate: Date | undefined;

      if (dateFrom) fromDate = new Date(dateFrom as string);
      if (dateTo) toDate = new Date(dateTo as string);

      const metrics = await analyticsService.getDashboardMetrics(userId, fromDate, toDate);

      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get call volume data for charts
   * GET /api/analytics/dashboard/call-volume
   */
  async getCallVolumeData(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { dateFrom, dateTo, groupBy = 'day' } = req.query;

      if (!dateFrom || !dateTo) {
        res.status(400).json({
          success: false,
          error: 'dateFrom and dateTo parameters are required'
        });
        return;
      }

      const fromDate = new Date(dateFrom as string);
      const toDate = new Date(dateTo as string);
      const groupByPeriod = groupBy as 'day' | 'week' | 'month';

      const volumeData = await analyticsService.getCallVolumeData(
        userId,
        fromDate,
        toDate,
        groupByPeriod
      );

      res.status(200).json({
        success: true,
        data: {
          volume_data: volumeData,
          period: groupByPeriod,
          date_range: {
            from: fromDate.toISOString(),
            to: toDate.toISOString()
          }
        }
      });
    } catch (error) {
      logger.error('Error getting call volume data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get lead score trends
   * GET /api/analytics/dashboard/lead-trends
   */
  async getLeadScoreTrends(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { dateFrom, dateTo, groupBy = 'day' } = req.query;

      if (!dateFrom || !dateTo) {
        res.status(400).json({
          success: false,
          error: 'dateFrom and dateTo parameters are required'
        });
        return;
      }

      const fromDate = new Date(dateFrom as string);
      const toDate = new Date(dateTo as string);
      const groupByPeriod = groupBy as 'day' | 'week' | 'month';

      const trends = await analyticsService.getLeadScoreTrends(
        userId,
        fromDate,
        toDate,
        groupByPeriod
      );

      res.status(200).json({
        success: true,
        data: {
          trends,
          period: groupByPeriod,
          date_range: {
            from: fromDate.toISOString(),
            to: toDate.toISOString()
          }
        }
      });
    } catch (error) {
      logger.error('Error getting lead score trends:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get CTA performance trends
   * GET /api/analytics/dashboard/cta-trends
   */
  async getCTAPerformanceTrends(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { dateFrom, dateTo, groupBy = 'day' } = req.query;

      if (!dateFrom || !dateTo) {
        res.status(400).json({
          success: false,
          error: 'dateFrom and dateTo parameters are required'
        });
        return;
      }

      const fromDate = new Date(dateFrom as string);
      const toDate = new Date(dateTo as string);
      const groupByPeriod = groupBy as 'day' | 'week' | 'month';

      const ctaTrends = await analyticsService.getCTAPerformanceTrends(
        userId,
        fromDate,
        toDate,
        groupByPeriod
      );

      res.status(200).json({
        success: true,
        data: {
          cta_trends: ctaTrends,
          period: groupByPeriod,
          date_range: {
            from: fromDate.toISOString(),
            to: toDate.toISOString()
          }
        }
      });
    } catch (error) {
      logger.error('Error getting CTA performance trends:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get top performing agents
   * GET /api/analytics/dashboard/top-agents
   */
  async getTopPerformingAgents(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { dateFrom, dateTo, limit = 10 } = req.query;
      
      let fromDate: Date | undefined;
      let toDate: Date | undefined;

      if (dateFrom) fromDate = new Date(dateFrom as string);
      if (dateTo) toDate = new Date(dateTo as string);

      const topAgents = await analyticsService.getTopPerformingAgents(
        userId,
        fromDate,
        toDate,
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: {
          top_agents: topAgents,
          date_range: {
            from: fromDate?.toISOString(),
            to: toDate?.toISOString()
          }
        }
      });
    } catch (error) {
      logger.error('Error getting top performing agents:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export const analyticsController = new AnalyticsController();
