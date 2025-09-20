import { Router, Request, Response } from 'express';
import { AgentController } from '../controllers/agentController';
import { authenticateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateAgentOwnership, AgentOwnershipRequest } from '../middleware/agentOwnership';

const router = Router();
const agentController = new AgentController();

// Apply authentication to all agent routes
router.use(authenticateToken, requireAuth);

// Agent management routes (no agent ownership validation needed)
router.get('/', (req: Request, res: Response) => agentController.getAgents(req as AuthenticatedRequest, res));
router.post('/', (req: Request, res: Response) => agentController.createAgent(req as AuthenticatedRequest, res));
router.get('/voices', (req: Request, res: Response) => agentController.getVoices(req as AuthenticatedRequest, res));
router.get('/test-connection', (req: Request, res: Response) => agentController.testConnection(req as AuthenticatedRequest, res));

// Agent-specific routes (require agent ownership validation)
router.get('/:id', validateAgentOwnership, (req, res) => agentController.getAgent(req as AgentOwnershipRequest, res));
router.put('/:id', validateAgentOwnership, (req, res) => agentController.updateAgent(req as AgentOwnershipRequest, res));
router.patch('/:id/status', validateAgentOwnership, (req, res) => agentController.updateAgentStatus(req as AgentOwnershipRequest, res));
router.delete('/:id', validateAgentOwnership, (req, res) => agentController.deleteAgent(req as AgentOwnershipRequest, res));

export default router;