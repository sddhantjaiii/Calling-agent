import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { LeadIntelligenceController } from '../controllers/leadIntelligenceController';
import { Response } from 'express';

const router = Router();
const leadIntelligenceController = new LeadIntelligenceController();

// Get grouped leads for intelligence view
router.get('/', authenticateToken, (req, res) => {
  return leadIntelligenceController.getLeadIntelligence(req as AuthenticatedRequest, res);
});

// Get detailed timeline for a specific lead group
router.get('/:groupId/timeline', authenticateToken, (req, res) => {
  return leadIntelligenceController.getLeadTimeline(req as AuthenticatedRequest, res);
});

export default router;