import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all analytics routes
router.use(authenticateToken);

/**
 * @route GET /api/analytics/calls/:callId
 * @desc Get lead analytics for a specific call with reasoning
 * @access Private
 */
router.get('/calls/:callId', analyticsController.getCallAnalytics.bind(analyticsController));

/**
 * @route GET /api/analytics/leads
 * @desc Get lead analytics list with filtering and pagination
 * @access Private
 * @query minScore - Minimum lead score filter
 * @query maxScore - Maximum lead score filter
 * @query leadStatus - Lead status tag filter
 * @query dateFrom - Start date filter (ISO string)
 * @query dateTo - End date filter (ISO string)
 * @query limit - Number of results per page (default: 50)
 * @query offset - Number of results to skip (default: 0)
 */
router.get('/leads', analyticsController.getLeadAnalyticsList.bind(analyticsController));

/**
 * @route GET /api/analytics/summary
 * @desc Get analytics summary statistics
 * @access Private
 * @query dateFrom - Start date filter (ISO string)
 * @query dateTo - End date filter (ISO string)
 */
router.get('/summary', analyticsController.getAnalyticsSummary.bind(analyticsController));

/**
 * @route GET /api/analytics/score-distribution
 * @desc Get lead score distribution data
 * @access Private
 */
router.get('/score-distribution', analyticsController.getScoreDistribution.bind(analyticsController));

// Dashboard Analytics Routes

/**
 * @route GET /api/analytics/dashboard/metrics
 * @desc Get dashboard metrics overview
 * @access Private
 * @query dateFrom - Start date filter (ISO string)
 * @query dateTo - End date filter (ISO string)
 */
router.get('/dashboard/metrics', analyticsController.getDashboardMetrics.bind(analyticsController));

/**
 * @route GET /api/analytics/dashboard/call-volume
 * @desc Get call volume data for charts
 * @access Private
 * @query dateFrom - Start date (required, ISO string)
 * @query dateTo - End date (required, ISO string)
 * @query groupBy - Grouping period: day, week, month (default: day)
 */
router.get('/dashboard/call-volume', analyticsController.getCallVolumeData.bind(analyticsController));

/**
 * @route GET /api/analytics/dashboard/lead-trends
 * @desc Get lead score trends over time
 * @access Private
 * @query dateFrom - Start date (required, ISO string)
 * @query dateTo - End date (required, ISO string)
 * @query groupBy - Grouping period: day, week, month (default: day)
 */
router.get('/dashboard/lead-trends', analyticsController.getLeadScoreTrends.bind(analyticsController));

/**
 * @route GET /api/analytics/dashboard/cta-trends
 * @desc Get CTA performance trends over time
 * @access Private
 * @query dateFrom - Start date (required, ISO string)
 * @query dateTo - End date (required, ISO string)
 * @query groupBy - Grouping period: day, week, month (default: day)
 */
router.get('/dashboard/cta-trends', analyticsController.getCTAPerformanceTrends.bind(analyticsController));

/**
 * @route GET /api/analytics/dashboard/top-agents
 * @desc Get top performing agents by lead quality
 * @access Private
 * @query dateFrom - Start date filter (ISO string)
 * @query dateTo - End date filter (ISO string)
 * @query limit - Number of agents to return (default: 10)
 */
router.get('/dashboard/top-agents', analyticsController.getTopPerformingAgents.bind(analyticsController));

export default router;