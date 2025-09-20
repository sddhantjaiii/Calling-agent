import { Router, Request, Response } from 'express';
import { LeadsController } from '../controllers/leadsController';
import { authenticateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const leadsController = new LeadsController();

// Apply authentication to all follow-up routes
router.use(authenticateToken, requireAuth);

/**
 * POST /api/follow-ups
 * Create a new follow-up
 */
router.post('/', (req: Request, res: Response) => 
  leadsController.createFollowUp(req as AuthenticatedRequest, res)
);

/**
 * GET /api/follow-ups
 * Get follow-ups for the current user
 */
router.get('/', (req: Request, res: Response) => 
  leadsController.getFollowUps(req as AuthenticatedRequest, res)
);

/**
 * PUT /api/follow-ups/:id/complete
 * Mark a follow-up as completed
 */
router.put('/:id/complete', (req: Request, res: Response) => 
  leadsController.completeFollowUp(req as AuthenticatedRequest, res)
);

/**
 * PATCH /api/follow-ups/status
 * Update follow-up status by lead phone/email
 */
router.patch('/status', (req: Request, res: Response) => 
  leadsController.updateFollowUpStatus(req as AuthenticatedRequest, res)
);

export default router;