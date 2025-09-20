import { Router } from 'express';
import { agentAnalyticsController } from '../controllers/agentAnalyticsController';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateAgentOwnership, AgentOwnershipRequest } from '../middleware/agentOwnership';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Agent performance overview
router.get('/:agentId/overview', validateAgentOwnership, (req, res) => agentAnalyticsController.getAgentOverview(req as AgentOwnershipRequest, res));

// Agent performance metrics for specific time periods
router.get('/:agentId/metrics', validateAgentOwnership, (req, res) => agentAnalyticsController.getAgentMetrics(req as AgentOwnershipRequest, res));

// Agent call outcomes and detailed analytics
router.get('/:agentId/call-outcomes', validateAgentOwnership, (req, res) => agentAnalyticsController.getCallOutcomes(req as AgentOwnershipRequest, res));

// Agent performance trends over time
router.get('/:agentId/trends', validateAgentOwnership, (req, res) => agentAnalyticsController.getPerformanceTrends(req as AgentOwnershipRequest, res));

// Agent targets and goals
router.get('/:agentId/targets', validateAgentOwnership, (req, res) => agentAnalyticsController.getAgentTargets(req as AgentOwnershipRequest, res));
router.post('/:agentId/targets', validateAgentOwnership, (req, res) => agentAnalyticsController.setAgentTargets(req as AgentOwnershipRequest, res));
router.put('/:agentId/targets/:targetId', validateAgentOwnership, (req, res) => agentAnalyticsController.updateAgentTargets(req as AgentOwnershipRequest, res));

// Agent comparison with other agents
router.get('/:agentId/comparison', validateAgentOwnership, (req, res) => agentAnalyticsController.getAgentComparison(req as AgentOwnershipRequest, res));

// Agent performance ranking
router.get('/:agentId/ranking', validateAgentOwnership, (req, res) => agentAnalyticsController.getAgentRanking(req as AgentOwnershipRequest, res));

// Real-time agent statistics
router.get('/:agentId/realtime', validateAgentOwnership, (req, res) => agentAnalyticsController.getRealtimeStats(req as AgentOwnershipRequest, res));

export default router;