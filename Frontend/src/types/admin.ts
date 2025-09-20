// Admin Panel TypeScript Interface Definitions
// This file defines all TypeScript interfaces for admin panel functionality

import type { User, Agent, ApiResponse, PaginatedResponse } from './api';

// ============================================================================
// ADMIN USER INTERFACES
// ============================================================================

export interface AdminUser extends User {
  adminRole: 'admin' | 'super_admin';
  permissions: AdminPermission[];
  lastAdminAction?: Date;
  adminActionCount: number;
}

export interface AdminPermission {
  resource: string;
  actions: string[];
}

export interface AdminPermissions {
  canViewUsers: boolean;
  canEditUsers: boolean;
  canManageCredits: boolean;
  canViewAgents: boolean;
  canManageAgents: boolean;
  canViewAuditLogs: boolean;
  canManageSystem: boolean;
  canManageAPIKeys: boolean;
  canManageFeatureFlags: boolean;
}

// ============================================================================
// ADMIN STATISTICS INTERFACES
// ============================================================================

export interface SystemStatistics {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    byTier: Record<string, number>;
  };
  agents: {
    total: number;
    active: number;
    byType: Record<string, number>;
    healthyPercentage: number;
  };
  calls: {
    totalThisMonth: number;
    successRate: number;
    averageDuration: number;
    costThisMonth: number;
  };
  system: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeConnections: number;
  };
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalAgents: number;
  activeAgents: number;
  totalCalls: number;
  callsToday: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  recentActivity: AdminActivity[];
}

export interface AdminActivity {
  id: string;
  type: 'user_registered' | 'agent_created' | 'call_completed' | 'system_alert';
  message: string;
  timestamp: Date;
  userId?: string;
  agentId?: string;
  severity?: 'info' | 'warning' | 'error';
}

// ============================================================================
// USER MANAGEMENT INTERFACES
// ============================================================================

export interface AdminUserListItem extends User {
  agentCount: number;
  callCount: number;
  creditsUsed: number;
  lastLogin?: Date;
  registrationDate: Date;
}

export interface AdminUserFilters {
  role?: 'user' | 'admin' | 'super_admin';
  status?: 'active' | 'inactive';
  registrationDate?: DateRange;
  creditRange?: NumberRange;
  search?: string;
}

export interface AdminUserDetails {
  user: User;
  statistics: {
    totalAgents: number;
    totalCalls: number;
    totalCreditsUsed: number;
    averageCallDuration: number;
    successRate: number;
  };
  recentActivity: ActivityItem[];
  agents: AgentSummary[];
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AgentSummary {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  callCount: number;
  lastUsed?: Date;
}

export interface CreditAdjustmentRequest {
  userId: string;
  amount: number;
  reason: string;
  type: 'add' | 'subtract';
}

export interface CreditAdjustmentResponse {
  success: boolean;
  newBalance: number;
  transactionId: string;
  message: string;
}

// ============================================================================
// AGENT MANAGEMENT INTERFACES
// ============================================================================

export interface AdminAgentListItem extends Agent {
  userEmail: string;
  userName: string;
  callCount: number;
  lastCallAt?: Date;
  elevenlabsStatus?: 'active' | 'inactive' | 'error' | 'unknown';
  healthStatus: 'healthy' | 'warning' | 'error';
}

export interface AdminAgentStats {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  agentsByType: {
    call: number;
    chat: number;
  };
  agentsByUser: Array<{
    userId: string;
    userEmail: string;
    userName: string;
    agentCount: number;
  }>;
  recentlyCreated: number;
  averageAgentsPerUser: number;
}

export interface AdminAgentMonitoring {
  timeframe: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageCallDuration: number;
  topPerformingAgents: Array<{
    agentId: string;
    agentName: string;
    userId: string;
    userEmail: string;
    callCount: number;
    successRate: number;
    averageDuration: number;
  }>;
  errorRates: Record<string, number>;
  usageByHour: Array<{
    hour: string;
    callCount: number;
  }>;
}

export interface AgentHealthCheck {
  totalAgents: number;
  healthyAgents: number;
  unhealthyAgents: number;
  unreachableAgents: number;
  healthDetails: Array<{
    agentId: string;
    agentName: string;
    userId: string;
    status: 'healthy' | 'unhealthy' | 'unreachable';
    lastChecked: Date;
    error?: string;
  }>;
}

export interface BulkAgentActionRequest {
  agentIds: string[];
  action: 'activate' | 'deactivate' | 'delete';
}

export interface BulkAgentActionResponse {
  successful: number;
  failed: Array<{
    agentId: string;
    error: string;
  }>;
}

// ============================================================================
// AUDIT LOG INTERFACES
// ============================================================================

export interface AuditLogEntry {
  id: string;
  adminUserId: string;
  adminUserEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogFilters {
  adminUserId?: string;
  action?: string;
  resourceType?: string;
  targetUserId?: string;
  dateRange?: DateRange;
  success?: boolean;
  search?: string;
}

export interface AuditLogStats {
  totalLogs: number;
  logsToday: number;
  logsThisWeek: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  topAdmins: Array<{
    adminId: string;
    adminName: string;
    actionCount: number;
  }>;
}

// ============================================================================
// SECURITY MONITORING INTERFACES
// ============================================================================

export interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'multiple_locations' | 'unusual_hours' | 'brute_force';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  location?: string;
  timestamp: Date;
  details: Record<string, unknown>;
  resolved: boolean;
}

export interface SecurityStats {
  totalEvents: number;
  eventsToday: number;
  failedLogins: number;
  suspiciousActivities: number;
  uniqueIPs: number;
  affectedUsers: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  hourlyDistribution: Array<{ hour: string; count: number }>;
  topIPs: Array<{ ip: string; count: number; location?: string }>;
  topUsers: Array<{ userId: string; userEmail: string; eventCount: number }>;
}

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

export interface APIKeyConfig {
  id: string;
  name: string;
  key: string; // Masked for security
  isDefault: boolean;
  assignedUsers: string[];
  usageStats: {
    totalCalls: number;
    remainingQuota: number;
    costThisMonth: number;
  };
  status: 'active' | 'inactive' | 'error';
}

export interface FeatureFlagConfig {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  scope: 'global' | 'user' | 'tier';
  targetUsers?: string[];
  targetTiers?: string[];
  rolloutPercentage?: number;
}

export interface ProprietaryFeature {
  id: 'dashboard_kpis' | 'agent_analytics' | 'advanced_reports';
  name: string;
  description: string;
  defaultEnabled: boolean;
  tierRestrictions: string[];
}

export interface FeatureUsageStats {
  flagId: string;
  totalUsers: number;
  activeUsers: number;
  usagePercentage: number;
  lastUsed: Date;
  usageByTier: Record<string, number>;
  usageByDay: Array<{ date: string; count: number }>;
}

export interface TierFeatureConfig {
  tier: string;
  features: string[];
  userCount: number;
  isAutoManaged: boolean;
}

export interface BulkFeatureFlagUpdate {
  flagId: string;
  isEnabled: boolean;
  targetUsers?: string[];
  targetTiers?: string[];
}

export interface SystemConfig {
  creditRates: {
    pricePerCredit: number;
    minimumPurchase: number;
    currency: string;
  };
  contactLimits: {
    freeUser: number;
    paidUser: number;
    premiumUser: number;
  };
  systemMaintenance: {
    enabled: boolean;
    message?: string;
    scheduledStart?: Date;
    scheduledEnd?: Date;
  };
}

// ============================================================================
// COMMUNICATION INTERFACES
// ============================================================================

export interface AdminMessage {
  id: string;
  fromAdminId: string;
  toUserId?: string; // undefined for broadcast
  subject: string;
  content: string;
  type: 'direct' | 'broadcast' | 'announcement';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'sent' | 'delivered' | 'read';
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedAdminId?: string;
  createdAt: Date;
  updatedAt: Date;
  responses: TicketResponse[];
}

export interface TicketResponse {
  id: string;
  ticketId: string;
  fromUserId: string;
  fromUserType: 'user' | 'admin';
  content: string;
  createdAt: Date;
}

// ============================================================================
// REPORTING INTERFACES
// ============================================================================

export interface AdminReport {
  id: string;
  name: string;
  type: 'user_activity' | 'agent_performance' | 'system_health' | 'financial';
  parameters: Record<string, unknown>;
  format: 'pdf' | 'csv' | 'excel' | 'json';
  status: 'generating' | 'completed' | 'failed';
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  error?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'select';
    required: boolean;
    options?: string[];
    defaultValue?: unknown;
  }>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface NumberRange {
  min: number;
  max: number;
}

export interface AdminListOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AdminApiResponse<T> extends ApiResponse<T> {
  adminContext?: {
    adminUserId: string;
    permissions: string[];
    timestamp: Date;
  };
}

export interface AdminPaginatedResponse<T> extends PaginatedResponse<T> {
  adminContext?: {
    adminUserId: string;
    permissions: string[];
    timestamp: Date;
  };
}

// ============================================================================
// ADMIN ROUTE INTERFACES
// ============================================================================

export interface AdminRouteConfig {
  path: string;
  component: React.ComponentType;
  requiredRole: 'admin' | 'super_admin';
  permissions?: string[];
  title: string;
  description?: string;
  icon?: React.ComponentType;
}

export interface AdminMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  requiredRole?: 'admin' | 'super_admin';
  badge?: string | number;
  children?: AdminMenuItem[];
}

// ============================================================================
// ADMIN CONTEXT INTERFACES
// ============================================================================

export interface AdminContextType {
  user: AdminUser | null;
  permissions: AdminPermissions;
  isLoading: boolean;
  error: string | null;
  refreshAdminData: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: 'admin' | 'super_admin') => boolean;
}

// ============================================================================
// PHONE NUMBER MANAGEMENT INTERFACES
// ============================================================================

export interface PhoneNumber {
  id: string;
  name: string;
  phone_number: string;
  elevenlabs_phone_number_id: string;
  assigned_to_user_id: string | null;
  created_by_admin_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_user_name?: string | null;
  assigned_user_email?: string | null;
  created_by_admin_name?: string;
  created_by_admin_email?: string;
}

export interface PhoneNumberStats {
  total_phone_numbers: number;
  active_phone_numbers: number;
  inactive_phone_numbers: number;
  assigned_phone_numbers: number;
  unassigned_phone_numbers: number;
  users_with_phone_numbers: number;
}

export interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface PhoneNumberFilters {
  search?: string;
  assigned_to?: string;
  is_active?: string;
  created_by?: string;
}

export interface CreatePhoneNumberRequest {
  name: string;
  phone_number: string;
  elevenlabs_phone_number_id: string;
  assigned_to_user_id?: string | null;
}

export interface UpdatePhoneNumberRequest {
  name?: string;
  phone_number?: string;
  elevenlabs_phone_number_id?: string;
  assigned_to_user_id?: string | null;
  is_active?: boolean;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  // Re-export commonly used types for convenience
  AdminUser as AdminUserInterface,
  AdminAgentListItem as AdminAgentInterface,
  AuditLogEntry as AuditLogInterface,
  SystemStatistics as SystemStatsInterface,
  PhoneNumber as PhoneNumberInterface,
  PhoneNumberStats as PhoneNumberStatsInterface,
};