import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { LeadIntelligenceController } from '../controllers/leadIntelligenceController';

const router = Router();
const leadIntelligenceController = new LeadIntelligenceController();

// Get grouped leads for intelligence view
router.get('/', authenticateToken, leadIntelligenceController.getLeadIntelligence.bind(leadIntelligenceController));

// Get detailed timeline for a specific lead group
router.get('/:groupId/timeline', authenticateToken, leadIntelligenceController.getLeadTimeline.bind(leadIntelligenceController));

export default router;