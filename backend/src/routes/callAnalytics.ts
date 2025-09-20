import { Router, Request, Response } from 'express';
import { callAnalyticsController } from '../controllers/callAnalyticsController';
import { authenticateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { optionalAgentOwnership, AgentOwnershipRequest } from '../middleware/agentOwnership';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken, requireAuth);

// Apply optional agent ownership validation to all routes
// This validates agent ownership when agentId is provided in query parameters
router.use(optionalAgentOwnership);

// Call Analytics KPIs
router.get('/kpis', (req: Request, res: Response) =>
  callAnalyticsController.getCallAnalyticsKPIs(req as AgentOwnershipRequest, res)
);

// Lead Quality Distribution
router.get('/lead-quality', (req: Request, res: Response) =>
  callAnalyticsController.getLeadQualityDistribution(req as AgentOwnershipRequest, res)
);

// Funnel Conversion Data
router.get('/funnel', (req: Request, res: Response) =>
  callAnalyticsController.getFunnelData(req as AgentOwnershipRequest, res)
);

// Intent vs Budget Scatter Data
router.get('/intent-budget', (req: Request, res: Response) =>
  callAnalyticsController.getIntentBudgetData(req as AgentOwnershipRequest, res)
);

// Source Breakdown (Phone vs Internet vs Unknown)
router.get('/source-breakdown', (req: Request, res: Response) =>
  callAnalyticsController.getSourceBreakdown(req as AgentOwnershipRequest, res)
);

// Call Source Analytics with detailed metrics
router.get('/call-source-analytics', (req: Request, res: Response) =>
  callAnalyticsController.getCallSourceAnalytics(req as AgentOwnershipRequest, res)
);

// Analytics Summary for Header
router.get('/summary', (req: Request, res: Response) =>
  callAnalyticsController.getAnalyticsSummary(req as AgentOwnershipRequest, res)
);

export default router;