import { Router, Request, Response } from 'express';
import { LeadsController } from '../controllers/leadsController';
import { authenticateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const leadsController = new LeadsController();

// Apply authentication to all leads routes
router.use(authenticateToken, requireAuth);

/**
 * GET /api/leads
 * Get leads data for frontend ChatData/CallData components
 */
router.get('/', (req: Request, res: Response) => 
  leadsController.getLeads(req as AuthenticatedRequest, res)
);

/**
 * GET /api/leads/analytics
 * Get lead analytics data
 */
router.get('/analytics', (req: Request, res: Response) => 
  leadsController.getLeadAnalytics(req as AuthenticatedRequest, res)
);

/**
 * GET /api/leads/intelligence
 * Get lead intelligence data with grouping and aggregation
 */
router.get('/intelligence', (req: Request, res: Response) => 
  leadsController.getLeadIntelligence(req as AuthenticatedRequest, res)
);

/**
 * GET /api/leads/intelligence/:groupId/timeline
 * Get detailed timeline for a specific lead group
 */
router.get('/intelligence/:groupId/timeline', (req: Request, res: Response) => 
  leadsController.getLeadIntelligenceTimeline(req as AuthenticatedRequest, res)
);

/**
 * GET /api/leads/:id
 * Get single lead details for LeadProfileTab component
 */
router.get('/:id', (req: Request, res: Response) => 
  leadsController.getLead(req as AuthenticatedRequest, res)
);

/**
 * GET /api/leads/:id/timeline
 * Get lead interaction timeline
 */
router.get('/:id/timeline', (req: Request, res: Response) => 
  leadsController.getLeadTimeline(req as AuthenticatedRequest, res)
);

/**
 * GET /api/leads/:id/profile
 * Get comprehensive lead profile data
 */
router.get('/:id/profile', (req: Request, res: Response) => 
  leadsController.getLeadProfile(req as AuthenticatedRequest, res)
);

export default router;