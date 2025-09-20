// Admin API Service
// This service handles all admin-specific API calls with comprehensive error handling

import type { ApiResponse, PaginatedResponse } from '../types/api';
import type {
  AdminUser,
  AdminUserListItem,
  AdminUserDetails,
  AdminUserFilters,
  AdminAgentListItem,
  AdminAgentStats,
  AdminAgentMonitoring,
  AgentHealthCheck,
  BulkAgentActionRequest,
  BulkAgentActionResponse,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogStats,
  SystemStatistics,
  AdminDashboardMetrics,
  CreditAdjustmentRequest,
  CreditAdjustmentResponse,
  APIKeyConfig,
  FeatureFlagConfig,
  SystemConfig,
  AdminMessage,
  SupportTicket,
  AdminReport,
  ReportTemplate,
  AdminListOptions,
  PhoneNumber,
  PhoneNumberStats,
  AssignableUser,
} from '../types/admin';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const ADMIN_API_BASE = `${API_BASE_URL}/admin`;

// Admin API endpoints
const ADMIN_ENDPOINTS = {
  // Dashboard
  DASHBOARD: `${ADMIN_API_BASE}/dashboard`,
  SYSTEM_STATS: `${ADMIN_API_BASE}/stats/system`,
  
  // User Management
  USERS: {
    LIST: `${ADMIN_API_BASE}/users`,
    GET: (id: string) => `${ADMIN_API_BASE}/users/${id}`,
    UPDATE: (id: string) => `${ADMIN_API_BASE}/users/${id}`,
    DELETE: (id: string) => `${ADMIN_API_BASE}/users/${id}`,
    STATUS: (id: string) => `${ADMIN_API_BASE}/users/${id}/status`,
    CREDITS: {
      ADJUST: (id: string) => `${ADMIN_API_BASE}/users/${id}/credits`,
      HISTORY: (id: string) => `${ADMIN_API_BASE}/users/${id}/credits/history`,
    },
    STATS: (id: string) => `${ADMIN_API_BASE}/users/${id}/stats`,
  },
  
  // Agent Management
  AGENTS: {
    LIST: `${ADMIN_API_BASE}/agents`,
    CREATE: `${ADMIN_API_BASE}/agents`,
    GET: (id: string) => `${ADMIN_API_BASE}/agents/${id}`,
    UPDATE: (id: string) => `${ADMIN_API_BASE}/agents/${id}`,
    DELETE: (id: string) => `${ADMIN_API_BASE}/agents/${id}`,
    ASSIGN: (id: string) => `${ADMIN_API_BASE}/agents/${id}/assign`,
    BULK_ACTION: `${ADMIN_API_BASE}/agents/bulk`,
    STATS: `${ADMIN_API_BASE}/agents/stats`,
    MONITORING: `${ADMIN_API_BASE}/agents/monitoring`,
    HEALTH_CHECK: `${ADMIN_API_BASE}/agents/health`,
    VOICES: `${ADMIN_API_BASE}/agents/voices`,
  },
  
  // Audit Logs
  AUDIT: {
    LIST: `${ADMIN_API_BASE}/audit`,
    GET: (id: string) => `${ADMIN_API_BASE}/audit/${id}`,
    STATS: `${ADMIN_API_BASE}/audit/stats`,
  },
  
  // Configuration
  CONFIG: {
    API_KEYS: `${ADMIN_API_BASE}/config/api-keys`,
    FEATURE_FLAGS: `${ADMIN_API_BASE}/config/feature-flags`,
    SYSTEM: `${ADMIN_API_BASE}/config/system`,
  },
  
  // Communication
  COMMUNICATION: {
    MESSAGES: `${ADMIN_API_BASE}/messages`,
    BROADCAST: `${ADMIN_API_BASE}/announcements`,
    TICKETS: `${ADMIN_API_BASE}/support/tickets`,
    NOTIFICATIONS: `${ADMIN_API_BASE}/notifications`,
  },
  
  // Reports
  REPORTS: {
    LIST: `${ADMIN_API_BASE}/reports`,
    GENERATE: `${ADMIN_API_BASE}/reports/generate`,
    DOWNLOAD: (id: string) => `${ADMIN_API_BASE}/reports/${id}/download`,
    TEMPLATES: `${ADMIN_API_BASE}/reports/templates`,
  },
  
  // Analytics
  ANALYTICS: {
    SYSTEM: `${ADMIN_API_BASE}/analytics/system`,
    REALTIME: `${ADMIN_API_BASE}/analytics/realtime`,
    USAGE: `${ADMIN_API_BASE}/analytics/usage`,
    EXPORT: `${ADMIN_API_BASE}/analytics/export`,
  },
  
  // Phone Number Management
  PHONE_NUMBERS: {
    LIST: `${ADMIN_API_BASE}/phone-numbers`,
    CREATE: `${ADMIN_API_BASE}/phone-numbers`,
    GET: (id: string) => `${ADMIN_API_BASE}/phone-numbers/${id}`,
    UPDATE: (id: string) => `${ADMIN_API_BASE}/phone-numbers/${id}`,
    DELETE: (id: string) => `${ADMIN_API_BASE}/phone-numbers/${id}`,
    ASSIGN: (id: string) => `${ADMIN_API_BASE}/phone-numbers/${id}/assign`,
    STATS: `${ADMIN_API_BASE}/phone-numbers/stats`,
    ASSIGNABLE_USERS: `${ADMIN_API_BASE}/phone-numbers/assignable-users`,
  },
} as const;

// Get auth headers
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Enhanced request method with admin-specific error handling
async function adminRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data: unknown;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorData = data as { error?: { message?: string }; message?: string };
      const errorMessage = errorData?.error?.message || errorData?.message || `HTTP error! status: ${response.status}`;
      
      // Handle admin-specific errors
      if (response.status === 403) {
        throw new Error('Admin access required. Please check your permissions.');
      } else if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      throw new Error(errorMessage);
    }

    return data as ApiResponse<T>;
  } catch (error) {
    console.error('Admin API request failed:', error);
    throw error;
  }
}

// Build query string from parameters
function buildQueryString(params: Record<string, unknown>): string {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, v.toString()));
      } else if (value instanceof Date) {
        queryParams.append(key, value.toISOString());
      } else if (typeof value === 'object' && value !== null) {
        // Handle complex objects like DateRange
        if ('from' in value && 'to' in value) {
          // Handle DateRange with from/to properties
          const dateRange = value as { from: Date; to: Date };
          queryParams.append(`${key}From`, dateRange.from.toISOString());
          queryParams.append(`${key}To`, dateRange.to.toISOString());
        } else if ('start' in value && 'end' in value) {
          // Handle DateRange with start/end properties
          const dateRange = value as { start: Date; end: Date };
          queryParams.append(`${key}Start`, dateRange.start.toISOString());
          queryParams.append(`${key}End`, dateRange.end.toISOString());
        } else {
          // For other objects, serialize as JSON
          queryParams.append(key, JSON.stringify(value));
        }
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });
  
  return queryParams.toString();
}

class AdminApiService {
  // ============================================================================
  // DASHBOARD METHODS
  // ============================================================================

  async getDashboardMetrics(): Promise<ApiResponse<AdminDashboardMetrics>> {
    return adminRequest<AdminDashboardMetrics>(ADMIN_ENDPOINTS.DASHBOARD);
  }

  async getSystemStats(): Promise<ApiResponse<SystemStatistics>> {
    return adminRequest<SystemStatistics>(ADMIN_ENDPOINTS.SYSTEM_STATS);
  }

  // ============================================================================
  // USER MANAGEMENT METHODS
  // ============================================================================

  async getUsers(options: AdminListOptions & AdminUserFilters = {}): Promise<PaginatedResponse<AdminUserListItem>> {
    const queryString = buildQueryString(options as Record<string, unknown>);
    const url = queryString ? `${ADMIN_ENDPOINTS.USERS.LIST}?${queryString}` : ADMIN_ENDPOINTS.USERS.LIST;
    return adminRequest<AdminUserListItem[]>(url) as Promise<PaginatedResponse<AdminUserListItem>>;
  }

  async getUser(userId: string): Promise<ApiResponse<AdminUserDetails>> {
    return adminRequest<AdminUserDetails>(ADMIN_ENDPOINTS.USERS.GET(userId));
  }

  async updateUser(userId: string, userData: Partial<AdminUser>): Promise<ApiResponse<AdminUser>> {
    return adminRequest<AdminUser>(ADMIN_ENDPOINTS.USERS.UPDATE(userId), {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    return adminRequest<void>(ADMIN_ENDPOINTS.USERS.DELETE(userId), {
      method: 'DELETE',
    });
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<AdminUser>> {
    return adminRequest<AdminUser>(ADMIN_ENDPOINTS.USERS.STATUS(userId), {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async adjustUserCredits(request: CreditAdjustmentRequest): Promise<ApiResponse<CreditAdjustmentResponse>> {
    return adminRequest<CreditAdjustmentResponse>(ADMIN_ENDPOINTS.USERS.CREDITS.ADJUST(request.userId), {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getUserCreditHistory(userId: string, options: AdminListOptions = {}): Promise<PaginatedResponse<unknown>> {
    const queryString = buildQueryString(options as Record<string, unknown>);
    const url = queryString ? 
      `${ADMIN_ENDPOINTS.USERS.CREDITS.HISTORY(userId)}?${queryString}` : 
      ADMIN_ENDPOINTS.USERS.CREDITS.HISTORY(userId);
    return adminRequest<unknown[]>(url) as Promise<PaginatedResponse<unknown>>;
  }

  async getUserStats(userId: string): Promise<ApiResponse<unknown>> {
    return adminRequest<unknown>(ADMIN_ENDPOINTS.USERS.STATS(userId));
  }

  // ============================================================================
  // AGENT MANAGEMENT METHODS
  // ============================================================================

  async getAgents(options: AdminListOptions & { 
    userId?: string; 
    isActive?: boolean; 
    agentType?: string; 
  } = {}): Promise<PaginatedResponse<AdminAgentListItem>> {
    const queryString = buildQueryString(options as Record<string, unknown>);
    const url = queryString ? `${ADMIN_ENDPOINTS.AGENTS.LIST}?${queryString}` : ADMIN_ENDPOINTS.AGENTS.LIST;
    return adminRequest<AdminAgentListItem[]>(url) as Promise<PaginatedResponse<AdminAgentListItem>>;
  }

  async getAgent(agentId: string): Promise<ApiResponse<AdminAgentListItem>> {
    return adminRequest<AdminAgentListItem>(ADMIN_ENDPOINTS.AGENTS.GET(agentId));
  }

  async createAgent(agentData: any): Promise<ApiResponse<AdminAgentListItem>> {
    return adminRequest<AdminAgentListItem>(ADMIN_ENDPOINTS.AGENTS.CREATE, {
      method: 'POST',
      body: JSON.stringify(agentData),
    });
  }

  async assignAgent(agentId: string, userId: string): Promise<ApiResponse<AdminAgentListItem>> {
    return adminRequest<AdminAgentListItem>(ADMIN_ENDPOINTS.AGENTS.ASSIGN(agentId), {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async getVoices(): Promise<ApiResponse<any[]>> {
    return adminRequest<any[]>(ADMIN_ENDPOINTS.AGENTS.VOICES);
  }

  async updateAgent(agentId: string, agentData: Partial<AdminAgentListItem>): Promise<ApiResponse<AdminAgentListItem>> {
    return adminRequest<AdminAgentListItem>(ADMIN_ENDPOINTS.AGENTS.UPDATE(agentId), {
      method: 'PUT',
      body: JSON.stringify(agentData),
    });
  }

  async deleteAgent(agentId: string): Promise<ApiResponse<void>> {
    return adminRequest<void>(ADMIN_ENDPOINTS.AGENTS.DELETE(agentId), {
      method: 'DELETE',
    });
  }

  async bulkAgentAction(request: BulkAgentActionRequest): Promise<ApiResponse<BulkAgentActionResponse>> {
    return adminRequest<BulkAgentActionResponse>(ADMIN_ENDPOINTS.AGENTS.BULK_ACTION, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getAgentStats(): Promise<ApiResponse<AdminAgentStats>> {
    return adminRequest<AdminAgentStats>(ADMIN_ENDPOINTS.AGENTS.STATS);
  }

  async getAgentMonitoring(timeframe: string = '24h'): Promise<ApiResponse<AdminAgentMonitoring>> {
    return adminRequest<AdminAgentMonitoring>(`${ADMIN_ENDPOINTS.AGENTS.MONITORING}?timeframe=${timeframe}`);
  }

  async getAgentHealthCheck(): Promise<ApiResponse<AgentHealthCheck>> {
    return adminRequest<AgentHealthCheck>(ADMIN_ENDPOINTS.AGENTS.HEALTH_CHECK);
  }

  // ============================================================================
  // AUDIT LOG METHODS
  // ============================================================================

  async getAuditLogs(options: AdminListOptions & AuditLogFilters = {}): Promise<PaginatedResponse<AuditLogEntry>> {
    const queryString = buildQueryString(options as Record<string, unknown>);
    const url = queryString ? `${ADMIN_ENDPOINTS.AUDIT.LIST}?${queryString}` : ADMIN_ENDPOINTS.AUDIT.LIST;
    return adminRequest<AuditLogEntry[]>(url) as Promise<PaginatedResponse<AuditLogEntry>>;
  }

  async getAuditLog(logId: string): Promise<ApiResponse<AuditLogEntry>> {
    return adminRequest<AuditLogEntry>(ADMIN_ENDPOINTS.AUDIT.GET(logId));
  }

  async getAuditStats(): Promise<ApiResponse<AuditLogStats>> {
    return adminRequest<AuditLogStats>(ADMIN_ENDPOINTS.AUDIT.STATS);
  }

  // ============================================================================
  // CONFIGURATION METHODS
  // ============================================================================

  async getAPIKeys(): Promise<ApiResponse<APIKeyConfig[]>> {
    return adminRequest<APIKeyConfig[]>(ADMIN_ENDPOINTS.CONFIG.API_KEYS);
  }

  async updateAPIKey(keyId: string, config: Partial<APIKeyConfig>): Promise<ApiResponse<APIKeyConfig>> {
    return adminRequest<APIKeyConfig>(`${ADMIN_ENDPOINTS.CONFIG.API_KEYS}/${keyId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async createAPIKey(config: Omit<APIKeyConfig, 'id'>): Promise<ApiResponse<APIKeyConfig>> {
    return adminRequest<APIKeyConfig>(ADMIN_ENDPOINTS.CONFIG.API_KEYS, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async deleteAPIKey(keyId: string): Promise<ApiResponse<void>> {
    return adminRequest<void>(`${ADMIN_ENDPOINTS.CONFIG.API_KEYS}/${keyId}`, {
      method: 'DELETE',
    });
  }

  async getFeatureFlags(): Promise<ApiResponse<FeatureFlagConfig[]>> {
    return adminRequest<FeatureFlagConfig[]>(ADMIN_ENDPOINTS.CONFIG.FEATURE_FLAGS);
  }

  async updateFeatureFlag(flagId: string, config: Partial<FeatureFlagConfig>): Promise<ApiResponse<FeatureFlagConfig>> {
    return adminRequest<FeatureFlagConfig>(`${ADMIN_ENDPOINTS.CONFIG.FEATURE_FLAGS}/${flagId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getFeatureFlagUsage(flagId?: string): Promise<ApiResponse<any>> {
    const endpoint = flagId 
      ? `${ADMIN_ENDPOINTS.CONFIG.FEATURE_FLAGS}/${flagId}/usage`
      : `${ADMIN_ENDPOINTS.CONFIG.FEATURE_FLAGS}/usage`;
    return adminRequest<any>(endpoint);
  }

  async bulkUpdateFeatureFlags(updates: Array<{ flagId: string; config: Partial<FeatureFlagConfig> }>): Promise<ApiResponse<FeatureFlagConfig[]>> {
    return adminRequest<FeatureFlagConfig[]>(`${ADMIN_ENDPOINTS.CONFIG.FEATURE_FLAGS}/bulk`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  }

  async syncTierFeatures(tierConfig: { tier: string; features: string[] }): Promise<ApiResponse<any>> {
    return adminRequest<any>(`${ADMIN_ENDPOINTS.CONFIG.FEATURE_FLAGS}/sync-tier`, {
      method: 'POST',
      body: JSON.stringify(tierConfig),
    });
  }

  async getSystemConfig(): Promise<ApiResponse<SystemConfig>> {
    return adminRequest<SystemConfig>(ADMIN_ENDPOINTS.CONFIG.SYSTEM);
  }

  async updateSystemConfig(config: Partial<SystemConfig>): Promise<ApiResponse<SystemConfig>> {
    return adminRequest<SystemConfig>(ADMIN_ENDPOINTS.CONFIG.SYSTEM, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // ============================================================================
  // COMMUNICATION METHODS
  // ============================================================================

  async getMessages(options: AdminListOptions & {
    status?: string;
    priority?: string;
    recipientId?: string;
  } = {}): Promise<PaginatedResponse<AdminMessage>> {
    const queryString = buildQueryString(options as Record<string, unknown>);
    const url = queryString ? `${ADMIN_ENDPOINTS.COMMUNICATION.MESSAGES}?${queryString}` : ADMIN_ENDPOINTS.COMMUNICATION.MESSAGES;
    return adminRequest<AdminMessage[]>(url) as Promise<PaginatedResponse<AdminMessage>>;
  }

  async getMessage(messageId: string): Promise<ApiResponse<AdminMessage>> {
    return adminRequest<AdminMessage>(`${ADMIN_ENDPOINTS.COMMUNICATION.MESSAGES}/${messageId}`);
  }

  async sendMessage(message: {
    recipientId: string;
    subject: string;
    content: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<ApiResponse<AdminMessage>> {
    return adminRequest<AdminMessage>(ADMIN_ENDPOINTS.COMMUNICATION.MESSAGES, {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  async updateMessage(messageId: string, update: Partial<AdminMessage>): Promise<ApiResponse<AdminMessage>> {
    return adminRequest<AdminMessage>(`${ADMIN_ENDPOINTS.COMMUNICATION.MESSAGES}/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    return adminRequest<void>(`${ADMIN_ENDPOINTS.COMMUNICATION.MESSAGES}/${messageId}`, {
      method: 'DELETE',
    });
  }

  async markMessageAsRead(messageId: string): Promise<ApiResponse<AdminMessage>> {
    return adminRequest<AdminMessage>(`${ADMIN_ENDPOINTS.COMMUNICATION.MESSAGES}/${messageId}/read`, {
      method: 'POST',
    });
  }

  async getMessageDeliveryStatus(messageId: string): Promise<ApiResponse<{
    messageId: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    deliveredAt?: Date;
    readAt?: Date;
    error?: string;
  }>> {
    return adminRequest<any>(`${ADMIN_ENDPOINTS.COMMUNICATION.MESSAGES}/${messageId}/status`);
  }

  // Broadcast Announcements
  async getAnnouncements(options: AdminListOptions & {
    status?: string;
    type?: string;
    targetAudience?: string;
  } = {}): Promise<PaginatedResponse<any>> {
    const queryString = buildQueryString(options as Record<string, unknown>);
    const url = queryString ? `${ADMIN_ENDPOINTS.COMMUNICATION.BROADCAST}?${queryString}` : ADMIN_ENDPOINTS.COMMUNICATION.BROADCAST;
    return adminRequest<any[]>(url) as Promise<PaginatedResponse<any>>;
  }

  async createAnnouncement(announcement: {
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success' | 'error';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    targetAudience: 'all' | 'active' | 'inactive' | 'tier-specific';
    targetTiers?: string[];
    scheduledAt?: Date;
    expiresAt?: Date;
  }): Promise<ApiResponse<any>> {
    return adminRequest<any>(ADMIN_ENDPOINTS.COMMUNICATION.BROADCAST, {
      method: 'POST',
      body: JSON.stringify(announcement),
    });
  }

  async updateAnnouncement(announcementId: string, update: any): Promise<ApiResponse<any>> {
    return adminRequest<any>(`${ADMIN_ENDPOINTS.COMMUNICATION.BROADCAST}/${announcementId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  async deleteAnnouncement(announcementId: string): Promise<ApiResponse<void>> {
    return adminRequest<void>(`${ADMIN_ENDPOINTS.COMMUNICATION.BROADCAST}/${announcementId}`, {
      method: 'DELETE',
    });
  }

  async publishAnnouncement(announcementId: string): Promise<ApiResponse<any>> {
    return adminRequest<any>(`${ADMIN_ENDPOINTS.COMMUNICATION.BROADCAST}/${announcementId}/publish`, {
      method: 'POST',
    });
  }

  async getAnnouncementStats(announcementId: string): Promise<ApiResponse<{
    viewCount: number;
    uniqueViews: number;
    clickCount: number;
    engagementRate: number;
  }>> {
    return adminRequest<any>(`${ADMIN_ENDPOINTS.COMMUNICATION.BROADCAST}/${announcementId}/stats`);
  }

  // Support Tickets
  async getSupportTickets(options: AdminListOptions & {
    status?: string;
    priority?: string;
    category?: string;
    assignedAdminId?: string;
    escalated?: boolean;
  } = {}): Promise<PaginatedResponse<SupportTicket>> {
    const queryString = buildQueryString(options as Record<string, unknown>);
    const url = queryString ? `${ADMIN_ENDPOINTS.COMMUNICATION.TICKETS}?${queryString}` : ADMIN_ENDPOINTS.COMMUNICATION.TICKETS;
    return adminRequest<SupportTicket[]>(url) as Promise<PaginatedResponse<SupportTicket>>;
  }

  async getSupportTicket(ticketId: string): Promise<ApiResponse<SupportTicket>> {
    return adminRequest<SupportTicket>(`${ADMIN_ENDPOINTS.COMMUNICATION.TICKETS}/${ticketId}`);
  }

  async updateSupportTicket(ticketId: string, update: Partial<SupportTicket>): Promise<ApiResponse<SupportTicket>> {
    return adminRequest<SupportTicket>(`${ADMIN_ENDPOINTS.COMMUNICATION.TICKETS}/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  async addTicketResponse(ticketId: string, response: {
    content: string;
    isInternal: boolean;
    status?: string;
    priority?: string;
    assignTo?: string;
  }): Promise<ApiResponse<any>> {
    return adminRequest<any>(`${ADMIN_ENDPOINTS.COMMUNICATION.TICKETS}/${ticketId}/responses`, {
      method: 'POST',
      body: JSON.stringify(response),
    });
  }

  async escalateTicket(ticketId: string, reason?: string): Promise<ApiResponse<SupportTicket>> {
    return adminRequest<SupportTicket>(`${ADMIN_ENDPOINTS.COMMUNICATION.TICKETS}/${ticketId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async assignTicket(ticketId: string, adminId: string): Promise<ApiResponse<SupportTicket>> {
    return adminRequest<SupportTicket>(`${ADMIN_ENDPOINTS.COMMUNICATION.TICKETS}/${ticketId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ adminId }),
    });
  }

  async bulkUpdateTickets(updates: Array<{
    ticketId: string;
    status?: string;
    priority?: string;
    assignedAdminId?: string;
  }>): Promise<ApiResponse<{ successful: number; failed: Array<{ ticketId: string; error: string }> }>> {
    return adminRequest<any>(`${ADMIN_ENDPOINTS.COMMUNICATION.TICKETS}/bulk`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  }

  async getTicketStats(): Promise<ApiResponse<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    escalated: number;
    averageResponseTime: number;
    averageResolutionTime: number;
  }>> {
    return adminRequest<any>(`${ADMIN_ENDPOINTS.COMMUNICATION.TICKETS}/stats`);
  }

  // Notification Management
  async getNotificationSettings(): Promise<ApiResponse<any[]>> {
    return adminRequest<any[]>(`${ADMIN_API_BASE}/notifications/settings`);
  }

  async updateNotificationSetting(settingId: string, config: {
    enabled: boolean;
    channels?: Array<{ type: string; enabled: boolean }>;
    conditions?: Array<{ field: string; operator: string; value: any }>;
  }): Promise<ApiResponse<any>> {
    return adminRequest<any>(`${ADMIN_API_BASE}/notifications/settings/${settingId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getNotificationHistory(options: AdminListOptions & {
    category?: string;
    status?: string;
    settingId?: string;
  } = {}): Promise<PaginatedResponse<any>> {
    const queryString = buildQueryString(options as Record<string, unknown>);
    const url = queryString ? `${ADMIN_API_BASE}/notifications/history?${queryString}` : `${ADMIN_API_BASE}/notifications/history`;
    return adminRequest<any[]>(url) as Promise<PaginatedResponse<any>>;
  }

  async testNotification(settingId: string, testData?: any): Promise<ApiResponse<{
    success: boolean;
    channels: Array<{ type: string; success: boolean; error?: string }>;
  }>> {
    return adminRequest<any>(`${ADMIN_API_BASE}/notifications/settings/${settingId}/test`, {
      method: 'POST',
      body: JSON.stringify(testData || {}),
    });
  }

  async getNotificationStats(): Promise<ApiResponse<{
    totalSettings: number;
    activeSettings: number;
    totalSent: number;
    totalFailed: number;
    sentToday: number;
    failedToday: number;
    channelStats: Record<string, { sent: number; failed: number }>;
  }>> {
    return adminRequest<any>(`${ADMIN_API_BASE}/notifications/stats`);
  }

  // ============================================================================
  // REPORTING METHODS
  // ============================================================================

  async getReports(options: AdminListOptions = {}): Promise<PaginatedResponse<AdminReport>> {
    const queryString = buildQueryString(options as Record<string, unknown>);
    const url = queryString ? `${ADMIN_ENDPOINTS.REPORTS.LIST}?${queryString}` : ADMIN_ENDPOINTS.REPORTS.LIST;
    return adminRequest<AdminReport[]>(url) as Promise<PaginatedResponse<AdminReport>>;
  }

  async generateReport(reportConfig: {
    name: string;
    type: string;
    parameters: Record<string, unknown>;
    format: 'pdf' | 'csv' | 'excel' | 'json';
  }): Promise<ApiResponse<AdminReport>> {
    return adminRequest<AdminReport>(ADMIN_ENDPOINTS.REPORTS.GENERATE, {
      method: 'POST',
      body: JSON.stringify(reportConfig),
    });
  }

  async downloadReport(reportId: string): Promise<Blob> {
    const response = await fetch(ADMIN_ENDPOINTS.REPORTS.DOWNLOAD(reportId), {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download report: ${response.statusText}`);
    }
    
    return response.blob();
  }

  async getReportTemplates(): Promise<ApiResponse<ReportTemplate[]>> {
    return adminRequest<ReportTemplate[]>(ADMIN_ENDPOINTS.REPORTS.TEMPLATES);
  }

  // Enhanced report generation and management
  async generateReportPreview(config: any): Promise<any> {
    return adminRequest<any>(`${ADMIN_API_BASE}/reports/preview`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async saveReportTemplate(config: any): Promise<void> {
    await adminRequest<void>(ADMIN_ENDPOINTS.REPORTS.TEMPLATES, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async deleteReportTemplate(templateId: string): Promise<void> {
    await adminRequest<void>(`${ADMIN_ENDPOINTS.REPORTS.TEMPLATES}/${templateId}`, {
      method: 'DELETE',
    });
  }

  // Scheduled reports
  async getScheduledReports(): Promise<any[]> {
    return adminRequest<any[]>(`${ADMIN_API_BASE}/reports/scheduled`);
  }

  async createScheduledReport(schedule: any): Promise<any> {
    return adminRequest<any>(`${ADMIN_API_BASE}/reports/scheduled`, {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  }

  async updateScheduledReport(scheduleId: string, updates: any): Promise<void> {
    await adminRequest<void>(`${ADMIN_API_BASE}/reports/scheduled/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteScheduledReport(scheduleId: string): Promise<void> {
    await adminRequest<void>(`${ADMIN_API_BASE}/reports/scheduled/${scheduleId}`, {
      method: 'DELETE',
    });
  }

  async runScheduledReport(scheduleId: string): Promise<void> {
    await adminRequest<void>(`${ADMIN_API_BASE}/reports/scheduled/${scheduleId}/run`, {
      method: 'POST',
    });
  }

  // Report sharing
  async getReportShares(reportId: string): Promise<any[]> {
    return adminRequest<any[]>(`${ADMIN_API_BASE}/reports/${reportId}/shares`);
  }

  async createReportShare(shareConfig: any): Promise<any> {
    return adminRequest<any>(`${ADMIN_API_BASE}/reports/shares`, {
      method: 'POST',
      body: JSON.stringify(shareConfig),
    });
  }

  async revokeReportShare(shareId: string): Promise<void> {
    await adminRequest<void>(`${ADMIN_API_BASE}/reports/shares/${shareId}`, {
      method: 'DELETE',
    });
  }

  async sendReportShareEmail(shareId: string, emailConfig: any): Promise<void> {
    await adminRequest<void>(`${ADMIN_API_BASE}/reports/shares/${shareId}/email`, {
      method: 'POST',
      body: JSON.stringify(emailConfig),
    });
  }

  // Data export
  async exportData(exportConfig: any): Promise<{ downloadUrl: string }> {
    return adminRequest<{ downloadUrl: string }>(`${ADMIN_API_BASE}/export`, {
      method: 'POST',
      body: JSON.stringify(exportConfig),
    });
  }

  async getExportHistory(): Promise<any[]> {
    return adminRequest<any[]>(`${ADMIN_API_BASE}/export/history`);
  }

  // ============================================================================
  // ANALYTICS METHODS
  // ============================================================================

  async getSystemAnalytics(filters: Record<string, unknown> = {}): Promise<ApiResponse<unknown>> {
    const queryString = buildQueryString(filters);
    const url = queryString ? `${ADMIN_ENDPOINTS.ANALYTICS.SYSTEM}?${queryString}` : ADMIN_ENDPOINTS.ANALYTICS.SYSTEM;
    return adminRequest<unknown>(url);
  }

  async getRealtimeMetrics(): Promise<ApiResponse<unknown>> {
    return adminRequest<unknown>(ADMIN_ENDPOINTS.ANALYTICS.REALTIME);
  }

  async getUsagePatterns(filters: Record<string, unknown> = {}): Promise<ApiResponse<unknown>> {
    const queryString = buildQueryString(filters);
    const url = queryString ? `${ADMIN_ENDPOINTS.ANALYTICS.USAGE}?${queryString}` : ADMIN_ENDPOINTS.ANALYTICS.USAGE;
    return adminRequest<unknown>(url);
  }

  async exportReport(reportConfig: Record<string, unknown>): Promise<Blob> {
    const response = await fetch(ADMIN_ENDPOINTS.ANALYTICS.EXPORT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(reportConfig),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to export report: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // ============================================================================
  // PHONE NUMBER MANAGEMENT
  // ============================================================================

  async getPhoneNumbers(
    page: number = 1,
    limit: number = 20,
    filters: {
      search?: string;
      assigned_to?: string;
      is_active?: string;
      created_by?: string;
    } = {}
  ): Promise<ApiResponse<{
    phone_numbers: PhoneNumber[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
      ),
    });

    return adminRequest<{
      phone_numbers: PhoneNumber[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>(`${ADMIN_ENDPOINTS.PHONE_NUMBERS.LIST}?${queryParams}`);
  }

  async getPhoneNumberById(id: string): Promise<ApiResponse<PhoneNumber>> {
    return adminRequest<PhoneNumber>(ADMIN_ENDPOINTS.PHONE_NUMBERS.GET(id));
  }

  async createPhoneNumber(data: {
    name: string;
    phone_number: string;
    elevenlabs_phone_number_id: string;
    assigned_to_user_id?: string | null;
  }): Promise<ApiResponse<PhoneNumber>> {
    // Backend expects `elevenlabs_phone_id` while UI uses `elevenlabs_phone_number_id`.
    const payload = {
      name: data.name,
      phone_number: data.phone_number,
      elevenlabs_phone_id: data.elevenlabs_phone_number_id,
      assigned_to_user_id: data.assigned_to_user_id ?? null,
    };
    return adminRequest<PhoneNumber>(ADMIN_ENDPOINTS.PHONE_NUMBERS.CREATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async updatePhoneNumber(
    id: string,
    data: {
      name?: string;
      phone_number?: string;
      elevenlabs_phone_number_id?: string;
      assigned_to_user_id?: string | null;
      is_active?: boolean;
    }
  ): Promise<ApiResponse<PhoneNumber>> {
    const payload: Record<string, unknown> = { ...data };
    if (payload.elevenlabs_phone_number_id) {
      payload.elevenlabs_phone_id = payload.elevenlabs_phone_number_id;
      delete payload.elevenlabs_phone_number_id;
    }
    return adminRequest<PhoneNumber>(ADMIN_ENDPOINTS.PHONE_NUMBERS.UPDATE(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async assignPhoneNumber(
    id: string,
    assigned_to_user_id: string | null
  ): Promise<ApiResponse<PhoneNumber>> {
    return adminRequest<PhoneNumber>(ADMIN_ENDPOINTS.PHONE_NUMBERS.ASSIGN(id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to_user_id }),
    });
  }

  async togglePhoneNumberStatus(id: string, isActive: boolean): Promise<ApiResponse<PhoneNumber>> {
    return adminRequest<PhoneNumber>(ADMIN_ENDPOINTS.PHONE_NUMBERS.UPDATE(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async deletePhoneNumber(id: string): Promise<ApiResponse<PhoneNumber>> {
    return adminRequest<PhoneNumber>(ADMIN_ENDPOINTS.PHONE_NUMBERS.DELETE(id), {
      method: 'DELETE',
    });
  }

  async getPhoneNumberStats(): Promise<ApiResponse<PhoneNumberStats>> {
    return adminRequest<PhoneNumberStats>(ADMIN_ENDPOINTS.PHONE_NUMBERS.STATS);
  }

  async getAssignableUsers(search?: string): Promise<ApiResponse<{ users: AssignableUser[] }>> {
    const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
    return adminRequest<{ users: AssignableUser[] }>(
      `${ADMIN_ENDPOINTS.PHONE_NUMBERS.ASSIGNABLE_USERS}${queryParams}`
    );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async validateAdminAccess(): Promise<ApiResponse<{ hasAccess: boolean; role: string; permissions: string[] }>> {
    return adminRequest<{ hasAccess: boolean; role: string; permissions: string[] }>(`${ADMIN_API_BASE}/validate`);
  }

  async getAdminProfile(): Promise<ApiResponse<AdminUser>> {
    return adminRequest<AdminUser>(`${ADMIN_API_BASE}/profile`);
  }
}

// Export singleton instance
export const adminApiService = new AdminApiService();
export default adminApiService;