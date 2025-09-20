import { Router } from 'express';
import { dataIntegrityController } from '../controllers/dataIntegrityController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

// All data integrity endpoints require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route GET /api/data-integrity/metrics
 * @desc Get basic data integrity metrics
 * @access Admin only
 */
router.get('/metrics', dataIntegrityController.getIntegrityMetrics.bind(dataIntegrityController));

/**
 * @route GET /api/data-integrity/full-check
 * @desc Run comprehensive data integrity check
 * @access Admin only
 */
router.get('/full-check', dataIntegrityController.runFullIntegrityCheck.bind(dataIntegrityController));

/**
 * @route GET /api/data-integrity/contamination/cross-agent
 * @desc Check for cross-agent data contamination
 * @access Admin only
 */
router.get('/contamination/cross-agent', dataIntegrityController.checkCrossAgentContamination.bind(dataIntegrityController));

/**
 * @route GET /api/data-integrity/contamination/analytics
 * @desc Check for analytics data contamination
 * @access Admin only
 */
router.get('/contamination/analytics', dataIntegrityController.checkAnalyticsContamination.bind(dataIntegrityController));

/**
 * @route GET /api/data-integrity/orphaned-records
 * @desc Check for orphaned records
 * @access Admin only
 */
router.get('/orphaned-records', dataIntegrityController.checkOrphanedRecords.bind(dataIntegrityController));

/**
 * @route GET /api/data-integrity/trigger-health
 * @desc Check database trigger health
 * @access Admin only
 */
router.get('/trigger-health', dataIntegrityController.checkTriggerHealth.bind(dataIntegrityController));

/**
 * @route GET /api/data-integrity/performance
 * @desc Check query performance issues
 * @access Admin only
 */
router.get('/performance', dataIntegrityController.checkQueryPerformance.bind(dataIntegrityController));

/**
 * @route GET /api/data-integrity/alerts
 * @desc Get active data integrity alerts
 * @access Admin only
 */
router.get('/alerts', dataIntegrityController.getActiveAlerts.bind(dataIntegrityController));

/**
 * @route POST /api/data-integrity/alerts/check
 * @desc Run alert checks manually
 * @access Admin only
 */
router.post('/alerts/check', dataIntegrityController.runAlertChecks.bind(dataIntegrityController));

/**
 * @route PUT /api/data-integrity/alerts/:alertId/acknowledge
 * @desc Acknowledge an alert
 * @access Admin only
 */
router.put('/alerts/:alertId/acknowledge', dataIntegrityController.acknowledgeAlert.bind(dataIntegrityController));

/**
 * @route PUT /api/data-integrity/alerts/:alertId/resolve
 * @desc Resolve an alert
 * @access Admin only
 */
router.put('/alerts/:alertId/resolve', dataIntegrityController.resolveAlert.bind(dataIntegrityController));

/**
 * @route GET /api/data-integrity/dashboard
 * @desc Get comprehensive dashboard data
 * @access Admin only
 */
router.get('/dashboard', dataIntegrityController.getDashboardData.bind(dataIntegrityController));

export default router;