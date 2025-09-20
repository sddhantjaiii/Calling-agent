import { Router, Request, Response } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const dashboardController = new DashboardController();

// Apply authentication to all dashboard routes
router.use(authenticateToken, requireAuth);

/**
 * GET /api/dashboard/overview
 * Get overview data for dashboard KPIs
 */
router.get('/overview', (req: Request, res: Response) => 
  dashboardController.getOverview(req as AuthenticatedRequest, res)
);

/**
 * GET /api/dashboard/analytics
 * Get analytics data for dashboard charts
 */
router.get('/analytics', (req: Request, res: Response) => 
  dashboardController.getAnalytics(req as AuthenticatedRequest, res)
);

export default router;