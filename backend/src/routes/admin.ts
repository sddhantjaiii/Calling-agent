import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin, requireSuperAdmin, logAdminAction } from '../middleware/adminAuth';
import phoneNumberRoutes from './phoneNumbers';

const router = Router();

// Apply authentication middleware to all admin routes
router.use(authenticateToken);

// User management routes (admin access required)
router.get(
  '/users',
  requireAdmin,
  logAdminAction('LIST_USERS', 'user'),
  AdminController.getUsers
);

router.get(
  '/users/:userId',
  requireAdmin,
  logAdminAction('VIEW_USER', 'user'),
  AdminController.getUser
);

router.put(
  '/users/:userId',
  requireAdmin,
  logAdminAction('UPDATE_USER', 'user'),
  AdminController.updateUser
);

router.patch(
  '/users/:userId/status',
  requireAdmin,
  logAdminAction('TOGGLE_USER_STATUS', 'user'),
  AdminController.toggleUserStatus
);

router.post(
  '/users/:userId/credits',
  requireAdmin,
  logAdminAction('ADJUST_CREDITS', 'user'),
  AdminController.adjustCredits
);

// System statistics (admin access required)
router.get(
  '/stats/system',
  requireAdmin,
  logAdminAction('VIEW_SYSTEM_STATS', 'system'),
  AdminController.getSystemStats
);

// Dashboard endpoint (alias for system stats)
router.get(
  '/dashboard',
  requireAdmin,
  logAdminAction('VIEW_ADMIN_DASHBOARD', 'system'),
  AdminController.getSystemStats
);

// Dashboard metrics endpoint (optimized for dashboard display)
router.get(
  '/dashboard/metrics',
  requireAdmin,
  logAdminAction('VIEW_DASHBOARD_METRICS', 'system'),
  AdminController.getDashboardMetrics
);

// Audit logs (admin access required)
router.get(
  '/audit',
  requireAdmin,
  logAdminAction('VIEW_AUDIT_LOGS', 'audit'),
  AdminController.getAuditLogs
);

router.get(
  '/audit/logs',
  requireAdmin,
  logAdminAction('VIEW_AUDIT_LOGS', 'audit'),
  AdminController.getAuditLogs
);

router.get(
  '/audit/stats',
  requireAdmin,
  logAdminAction('VIEW_AUDIT_STATS', 'audit'),
  AdminController.getAuditStats
);

// System configuration (super admin access required)
router.get(
  '/config',
  requireSuperAdmin,
  logAdminAction('VIEW_SYSTEM_CONFIG', 'config'),
  AdminController.getSystemConfig
);

router.put(
  '/config',
  requireSuperAdmin,
  logAdminAction('UPDATE_SYSTEM_CONFIG', 'config'),
  AdminController.updateSystemConfig
);

// Admin validation and profile routes
router.get(
  '/validate',
  requireAdmin,
  AdminController.validateAdminAccess
);

router.get(
  '/profile',
  requireAdmin,
  AdminController.getAdminProfile
);

// Agent management routes (admin access required)
router.get(
  '/agents',
  requireAdmin,
  logAdminAction('LIST_ALL_AGENTS', 'agent'),
  AdminController.getAllAgents
);

router.post(
  '/agents',
  requireAdmin,
  logAdminAction('CREATE_AGENT', 'agent'),
  AdminController.createAgent
);

router.post(
  '/agents/:agentId/assign',
  requireAdmin,
  logAdminAction('ASSIGN_AGENT', 'agent'),
  AdminController.assignAgent
);

router.get(
  '/agents/voices',
  requireAdmin,
  logAdminAction('LIST_VOICES', 'agent'),
  AdminController.getVoices
);

router.get(
  '/agents/stats',
  requireAdmin,
  logAdminAction('VIEW_AGENT_STATS', 'agent'),
  AdminController.getAgentStats
);

router.get(
  '/agents/monitor',
  requireAdmin,
  logAdminAction('MONITOR_AGENTS', 'agent'),
  AdminController.monitorAgents
);

router.get(
  '/agents/monitoring',
  requireAdmin,
  logAdminAction('MONITOR_AGENTS', 'agent'),
  AdminController.monitorAgents
);

router.get(
  '/users/:userId/agents/:agentId',
  requireAdmin,
  logAdminAction('VIEW_USER_AGENT', 'agent'),
  AdminController.getAnyUserAgent
);

router.put(
  '/users/:userId/agents/:agentId',
  requireAdmin,
  logAdminAction('UPDATE_USER_AGENT', 'agent'),
  AdminController.updateAnyUserAgent
);

router.delete(
  '/users/:userId/agents/:agentId',
  requireAdmin,
  logAdminAction('DELETE_USER_AGENT', 'agent'),
  AdminController.deleteAnyUserAgent
);

// Bulk agent operations (admin access required)
router.post(
  '/agents/bulk-status',
  requireAdmin,
  logAdminAction('BULK_UPDATE_AGENT_STATUS', 'agent'),
  AdminController.bulkUpdateAgentStatus
);

// Agent health check (admin access required)
router.get(
  '/agents/health',
  requireAdmin,
  logAdminAction('AGENT_HEALTH_CHECK', 'agent'),
  AdminController.getAgentHealthCheck
);

// Analytics endpoints (admin access required)
router.get(
  '/analytics/system',
  requireAdmin,
  logAdminAction('VIEW_SYSTEM_ANALYTICS', 'analytics'),
  AdminController.getSystemStats
);

router.get(
  '/analytics/realtime',
  requireAdmin,
  logAdminAction('VIEW_REALTIME_ANALYTICS', 'analytics'),
  AdminController.getDashboardMetrics
);

router.get(
  '/analytics/usage',
  requireAdmin,
  logAdminAction('VIEW_USAGE_ANALYTICS', 'analytics'),
  AdminController.getSystemStats
);

// Phone number management routes (admin access required)
router.use('/phone-numbers', phoneNumberRoutes);

export default router;