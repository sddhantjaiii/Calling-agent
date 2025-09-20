// API Configuration for Backend Integration
// This file configures the frontend to connect to the backend APIs

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    PROFILE: `${API_BASE_URL}/auth/profile`,
    VALIDATE: `${API_BASE_URL}/auth/validate`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    SESSION: `${API_BASE_URL}/auth/session`,
  },

  // Agents
  AGENTS: {
    LIST: `${API_BASE_URL}/agents`,
    CREATE: `${API_BASE_URL}/agents`,
    GET: (id: string) => `${API_BASE_URL}/agents/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/agents/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/agents/${id}`,
    VOICES: `${API_BASE_URL}/agents/voices`,
    TEST_CONNECTION: `${API_BASE_URL}/agents/test-connection`,
    UPDATE_STATUS: (id: string) => `${API_BASE_URL}/agents/${id}/status`,
  },

  // Dashboard
  DASHBOARD: {
    OVERVIEW: `${API_BASE_URL}/dashboard/overview`,
    ANALYTICS: `${API_BASE_URL}/dashboard/analytics`,
  },

  // Billing
  BILLING: {
    CREDITS: `${API_BASE_URL}/billing/credits`,
    STATS: `${API_BASE_URL}/billing/stats`,
    PURCHASE: `${API_BASE_URL}/billing/purchase`,
    CONFIRM_PAYMENT: `${API_BASE_URL}/billing/confirm-payment`,
    HISTORY: `${API_BASE_URL}/billing/history`,
    PRICING: `${API_BASE_URL}/billing/pricing`,
    PAYMENT_HISTORY: `${API_BASE_URL}/billing/payment-history`,
    CHECK: `${API_BASE_URL}/billing/check`,
    ADMIN_ADJUST: `${API_BASE_URL}/billing/admin/adjust`,
    PROCESS_CALL: `${API_BASE_URL}/billing/process-call`,
  },

  // Calls
  CALLS: {
    LIST: `${API_BASE_URL}/calls`,
    GET: (id: string) => `${API_BASE_URL}/calls/${id}`,
    TRANSCRIPT: (id: string) => `${API_BASE_URL}/calls/${id}/transcript`,
    RECORDING: (id: string) => `${API_BASE_URL}/calls/${id}/recording`,
    STATS: `${API_BASE_URL}/calls/stats`,
    RECENT: `${API_BASE_URL}/calls/recent`,
    SEARCH: `${API_BASE_URL}/calls/search`,
    SEARCH_TRANSCRIPTS: `${API_BASE_URL}/calls/search/transcripts`,
    AUDIO: (id: string) => `${API_BASE_URL}/calls/${id}/audio`,
  },

  // Contacts
  CONTACTS: {
    LIST: `${API_BASE_URL}/contacts`,
    CREATE: `${API_BASE_URL}/contacts`,
    GET: (id: string) => `${API_BASE_URL}/contacts/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/contacts/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/contacts/${id}`,
    UPLOAD: `${API_BASE_URL}/contacts/upload`,
    STATS: `${API_BASE_URL}/contacts/stats`,
    TEMPLATE: `${API_BASE_URL}/contacts/template`,
    LOOKUP: (phone: string) => `${API_BASE_URL}/contacts/lookup/${phone}`,
    BATCH_LOOKUP: `${API_BASE_URL}/contacts/lookup/batch`,
  },

  // Leads
  LEADS: {
    LIST: `${API_BASE_URL}/leads`,
    GET: (id: string) => `${API_BASE_URL}/leads/${id}`,
    ANALYTICS: `${API_BASE_URL}/leads/analytics`,
    TIMELINE: (id: string) => `${API_BASE_URL}/leads/${id}/timeline`,
    PROFILE: (id: string) => `${API_BASE_URL}/leads/${id}/profile`,
    INTELLIGENCE: `${API_BASE_URL}/lead-intelligence`,
    INTELLIGENCE_TIMELINE: (groupId: string) => `${API_BASE_URL}/lead-intelligence/${groupId}/timeline`,
  },

  // Follow-ups
  FOLLOW_UPS: {
    LIST: `${API_BASE_URL}/follow-ups`,
    CREATE: `${API_BASE_URL}/follow-ups`,
    UPDATE: (id: string) => `${API_BASE_URL}/follow-ups/${id}`,
    COMPLETE: (id: string) => `${API_BASE_URL}/follow-ups/${id}/complete`,
    DELETE: (id: string) => `${API_BASE_URL}/follow-ups/${id}`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/notifications`,
    MARK_READ: (id: string) => `${API_BASE_URL}/notifications/${id}/read`,
  },

  // Transcripts
  TRANSCRIPTS: {
    SEARCH: `${API_BASE_URL}/transcripts/search`,
    ANALYTICS: `${API_BASE_URL}/transcripts/analytics`,
    BY_CALL: (callId: string) => `${API_BASE_URL}/transcripts/call/${callId}`,
    EXPORT: (callId: string) => `${API_BASE_URL}/transcripts/call/${callId}/export`,
    FORMATTED: (callId: string) => `${API_BASE_URL}/transcripts/call/${callId}/formatted`,
  },

  // Analytics
  ANALYTICS: {
    CALLS: (callId: string) => `${API_BASE_URL}/analytics/calls/${callId}`,
    LEADS: `${API_BASE_URL}/analytics/leads`,
    SUMMARY: `${API_BASE_URL}/analytics/summary`,
    SCORE_DISTRIBUTION: `${API_BASE_URL}/analytics/score-distribution`,
    DASHBOARD: {
      METRICS: `${API_BASE_URL}/analytics/dashboard/metrics`,
      CALL_VOLUME: `${API_BASE_URL}/analytics/dashboard/call-volume`,
      LEAD_TRENDS: `${API_BASE_URL}/analytics/dashboard/lead-trends`,
      CTA_TRENDS: `${API_BASE_URL}/analytics/dashboard/cta-trends`,
      TOP_AGENTS: `${API_BASE_URL}/analytics/dashboard/top-agents`,
    },
  },

  // Call Analytics
  CALL_ANALYTICS: {
    KPIS: `${API_BASE_URL}/call-analytics/kpis`,
    LEAD_QUALITY: `${API_BASE_URL}/call-analytics/lead-quality`,
    FUNNEL: `${API_BASE_URL}/call-analytics/funnel`,
    INTENT_BUDGET: `${API_BASE_URL}/call-analytics/intent-budget`,
    SOURCE_BREAKDOWN: `${API_BASE_URL}/call-analytics/source-breakdown`,
    CALL_SOURCE_ANALYTICS: `${API_BASE_URL}/call-analytics/call-source-analytics`,
    SUMMARY: `${API_BASE_URL}/call-analytics/summary`,
  },

  // Agent Analytics
  AGENT_ANALYTICS: {
    OVERVIEW: (agentId: string) => `${API_BASE_URL}/agent-analytics/${agentId}/overview`,
    METRICS: (agentId: string) => `${API_BASE_URL}/agent-analytics/${agentId}/metrics`,
    CALL_OUTCOMES: (agentId: string) => `${API_BASE_URL}/agent-analytics/${agentId}/call-outcomes`,
    TRENDS: (agentId: string) => `${API_BASE_URL}/agent-analytics/${agentId}/trends`,
    TARGETS: (agentId: string) => `${API_BASE_URL}/agent-analytics/${agentId}/targets`,
    COMPARISON: (agentId: string) => `${API_BASE_URL}/agent-analytics/${agentId}/comparison`,
    RANKING: (agentId: string) => `${API_BASE_URL}/agent-analytics/${agentId}/ranking`,
    REALTIME: (agentId: string) => `${API_BASE_URL}/agent-analytics/${agentId}/realtime`,
  },

  // User Management
  USER: {
    INITIALIZE: `${API_BASE_URL}/user/initialize`,
    PROFILE: `${API_BASE_URL}/user/profile`,
    STATS: `${API_BASE_URL}/user/stats`,
    CREDITS: `${API_BASE_URL}/user/credits`,
    CHECK_CREDITS: `${API_BASE_URL}/user/check-credits`,
    DELETE_ACCOUNT: `${API_BASE_URL}/user/account`,
    UPDATE_PASSWORD: `${API_BASE_URL}/user/password`,
  },

  // Email
  EMAIL: {
    SEND_VERIFICATION: `${API_BASE_URL}/email/send-verification`,
    VERIFY: `${API_BASE_URL}/email/verify`,
    SEND_PASSWORD_RESET: `${API_BASE_URL}/email/send-password-reset`,
    RESET_PASSWORD: `${API_BASE_URL}/email/reset-password`,
    TEST: `${API_BASE_URL}/email/test`,
    ADMIN_SEND_REMINDERS: `${API_BASE_URL}/email/admin/send-verification-reminders`,
  },

  // Admin (if user has admin access)
  ADMIN: {
    USERS: `${API_BASE_URL}/admin/users`,
    USER: (userId: string) => `${API_BASE_URL}/admin/users/${userId}`,
    USER_CREDITS: (userId: string) => `${API_BASE_URL}/admin/users/${userId}/credits`,
    SYSTEM_STATS: `${API_BASE_URL}/admin/stats/system`,
    AUDIT_LOGS: `${API_BASE_URL}/admin/audit/logs`,
    AUDIT_STATS: `${API_BASE_URL}/admin/audit/stats`,
    CONFIG: `${API_BASE_URL}/admin/config`,
    AGENTS: `${API_BASE_URL}/admin/agents`,
    AGENTS_STATS: `${API_BASE_URL}/admin/agents/stats`,
    AGENTS_MONITOR: `${API_BASE_URL}/admin/agents/monitor`,
    USER_AGENT: (userId: string, agentId: string) => `${API_BASE_URL}/admin/users/${userId}/agents/${agentId}`,
    AGENTS_BULK_STATUS: `${API_BASE_URL}/admin/agents/bulk-status`,
    AGENTS_HEALTH: `${API_BASE_URL}/admin/agents/health`,
    VALIDATE: `${API_BASE_URL}/admin/validate`,
    PROFILE: `${API_BASE_URL}/admin/profile`,
    ANALYTICS_REALTIME: `${API_BASE_URL}/admin/analytics/realtime`,
    REPORTS_GENERATE: `${API_BASE_URL}/admin/reports/generate`,
    REPORTS_DOWNLOAD: (reportId: string) => `${API_BASE_URL}/admin/reports/${reportId}/download`,
    ANALYTICS_EXPORT: `${API_BASE_URL}/admin/analytics/export`,
  },

  // Webhooks (for reference, not typically called from frontend)
  WEBHOOKS: {
    ELEVENLABS_POST_CALL: `${API_BASE_URL}/webhooks/elevenlabs/post-call`,
    ELEVENLABS_CALL_COMPLETED: `${API_BASE_URL}/webhooks/elevenlabs/call-completed`,
    ELEVENLABS_CALL_ANALYTICS: `${API_BASE_URL}/webhooks/elevenlabs/call-analytics`,
    CONTACT_LOOKUP: (phone: string) => `${API_BASE_URL}/webhooks/contact-lookup/${phone}`,
    HEALTH: `${API_BASE_URL}/webhooks/health`,
    STATUS: `${API_BASE_URL}/webhooks/status`,
    RETRY: (jobId: string) => `${API_BASE_URL}/webhooks/retry/${jobId}`,
  },
};

// Import types from centralized types file
import type { ApiResponse, Agent } from '../types';

// API Client Configuration
export const apiClient = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Helper function to get auth token from custom auth
export const getAuthToken = (): string | null => {
  // Get custom auth token from localStorage
  return localStorage.getItem('auth_token');
};

export default API_ENDPOINTS;

// Re-export types for backward compatibility
export type { ApiResponse, Agent };