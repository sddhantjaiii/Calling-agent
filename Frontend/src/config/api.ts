// API Configuration for Backend Integration
// This file configures the frontend to connect to the backend APIs

// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Production environment detection
  if (import.meta.env.PROD || window.location.hostname.includes('vercel.app')) {
    // IMPORTANT: You need to replace this with your actual backend URL
    // The 405 errors happen because the frontend is trying to call APIs on itself
    // instead of the backend server
    console.warn('⚠️ Using placeholder backend URL. Please set VITE_API_BASE_URL environment variable in Vercel settings!');
    
    // For now, try to use the backend if it's deployed alongside
    // This is a temporary fix - you should set the proper environment variable
    return 'https://your-backend-domain.com'; // ⚠️ REPLACE WITH ACTUAL BACKEND URL
  }
  
  // Development fallback
  console.log('Using development backend URL: http://localhost:3000');
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();
const API_URL = `${API_BASE_URL}/api`;

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `${API_URL}/auth/login`,
    REGISTER: `${API_URL}/auth/register`,
    PROFILE: `${API_URL}/auth/profile`,
    VALIDATE: `${API_URL}/auth/validate`,
    REFRESH: `${API_URL}/auth/refresh`,
    LOGOUT: `${API_URL}/auth/logout`,
    SESSION: `${API_URL}/auth/session`,
  },

  // Agents
  AGENTS: {
    LIST: `${API_URL}/agents`,
    CREATE: `${API_URL}/agents`,
    GET: (id: string) => `${API_URL}/agents/${id}`,
    UPDATE: (id: string) => `${API_URL}/agents/${id}`,
    DELETE: (id: string) => `${API_URL}/agents/${id}`,
    VOICES: `${API_URL}/agents/voices`,
    TEST_CONNECTION: `${API_URL}/agents/test-connection`,
    UPDATE_STATUS: (id: string) => `${API_URL}/agents/${id}/status`,
  },

  // Dashboard
  DASHBOARD: {
    OVERVIEW: `${API_URL}/dashboard/overview`,
    ANALYTICS: `${API_URL}/dashboard/analytics`,
  },

  // Billing
  BILLING: {
    CREDITS: `${API_URL}/billing/credits`,
    STATS: `${API_URL}/billing/stats`,
    PURCHASE: `${API_URL}/billing/purchase`,
    CONFIRM_PAYMENT: `${API_URL}/billing/confirm-payment`,
    HISTORY: `${API_URL}/billing/history`,
    PRICING: `${API_URL}/billing/pricing`,
    PAYMENT_HISTORY: `${API_URL}/billing/payment-history`,
    CHECK: `${API_URL}/billing/check`,
    ADMIN_ADJUST: `${API_URL}/billing/admin/adjust`,
    PROCESS_CALL: `${API_URL}/billing/process-call`,
  },

  // Calls
  CALLS: {
    LIST: `${API_URL}/calls`,
    GET: (id: string) => `${API_URL}/calls/${id}`,
    TRANSCRIPT: (id: string) => `${API_URL}/calls/${id}/transcript`,
    RECORDING: (id: string) => `${API_URL}/calls/${id}/recording`,
    STATS: `${API_URL}/calls/stats`,
    RECENT: `${API_URL}/calls/recent`,
    SEARCH: `${API_URL}/calls/search`,
    SEARCH_TRANSCRIPTS: `${API_URL}/calls/search/transcripts`,
    AUDIO: (id: string) => `${API_URL}/calls/${id}/audio`,
  },

  // Contacts
  CONTACTS: {
    LIST: `${API_URL}/contacts`,
    CREATE: `${API_URL}/contacts`,
    GET: (id: string) => `${API_URL}/contacts/${id}`,
    UPDATE: (id: string) => `${API_URL}/contacts/${id}`,
    DELETE: (id: string) => `${API_URL}/contacts/${id}`,
    UPLOAD: `${API_URL}/contacts/upload`,
    STATS: `${API_URL}/contacts/stats`,
    TEMPLATE: `${API_URL}/contacts/template`,
    LOOKUP: (phone: string) => `${API_URL}/contacts/lookup/${phone}`,
    BATCH_LOOKUP: `${API_URL}/contacts/lookup/batch`,
  },

  // Leads
  LEADS: {
    LIST: `${API_URL}/leads`,
    GET: (id: string) => `${API_URL}/leads/${id}`,
    ANALYTICS: `${API_URL}/leads/analytics`,
    TIMELINE: (id: string) => `${API_URL}/leads/${id}/timeline`,
    PROFILE: (id: string) => `${API_URL}/leads/${id}/profile`,
    INTELLIGENCE: `${API_URL}/lead-intelligence`,
    INTELLIGENCE_TIMELINE: (groupId: string) => `${API_URL}/lead-intelligence/${groupId}/timeline`,
  },

  // Follow-ups
  FOLLOW_UPS: {
    LIST: `${API_URL}/follow-ups`,
    CREATE: `${API_URL}/follow-ups`,
    UPDATE: (id: string) => `${API_URL}/follow-ups/${id}`,
    COMPLETE: (id: string) => `${API_URL}/follow-ups/${id}/complete`,
    DELETE: (id: string) => `${API_URL}/follow-ups/${id}`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: `${API_URL}/notifications`,
    MARK_READ: (id: string) => `${API_URL}/notifications/${id}/read`,
  },

  // Transcripts
  TRANSCRIPTS: {
    SEARCH: `${API_URL}/transcripts/search`,
    ANALYTICS: `${API_URL}/transcripts/analytics`,
    BY_CALL: (callId: string) => `${API_URL}/transcripts/call/${callId}`,
    EXPORT: (callId: string) => `${API_URL}/transcripts/call/${callId}/export`,
    FORMATTED: (callId: string) => `${API_URL}/transcripts/call/${callId}/formatted`,
  },

  // Analytics
  ANALYTICS: {
    CALLS: (callId: string) => `${API_URL}/analytics/calls/${callId}`,
    LEADS: `${API_URL}/analytics/leads`,
    SUMMARY: `${API_URL}/analytics/summary`,
    SCORE_DISTRIBUTION: `${API_URL}/analytics/score-distribution`,
    DASHBOARD: {
      METRICS: `${API_URL}/analytics/dashboard/metrics`,
      CALL_VOLUME: `${API_URL}/analytics/dashboard/call-volume`,
      LEAD_TRENDS: `${API_URL}/analytics/dashboard/lead-trends`,
      CTA_TRENDS: `${API_URL}/analytics/dashboard/cta-trends`,
      TOP_AGENTS: `${API_URL}/analytics/dashboard/top-agents`,
    },
  },

  // Call Analytics
  CALL_ANALYTICS: {
    KPIS: `${API_URL}/call-analytics/kpis`,
    LEAD_QUALITY: `${API_URL}/call-analytics/lead-quality`,
    FUNNEL: `${API_URL}/call-analytics/funnel`,
    INTENT_BUDGET: `${API_URL}/call-analytics/intent-budget`,
    SOURCE_BREAKDOWN: `${API_URL}/call-analytics/source-breakdown`,
    CALL_SOURCE_ANALYTICS: `${API_URL}/call-analytics/call-source-analytics`,
    SUMMARY: `${API_URL}/call-analytics/summary`,
  },

  // Agent Analytics
  AGENT_ANALYTICS: {
    OVERVIEW: (agentId: string) => `${API_URL}/agent-analytics/${agentId}/overview`,
    METRICS: (agentId: string) => `${API_URL}/agent-analytics/${agentId}/metrics`,
    CALL_OUTCOMES: (agentId: string) => `${API_URL}/agent-analytics/${agentId}/call-outcomes`,
    TRENDS: (agentId: string) => `${API_URL}/agent-analytics/${agentId}/trends`,
    TARGETS: (agentId: string) => `${API_URL}/agent-analytics/${agentId}/targets`,
    COMPARISON: (agentId: string) => `${API_URL}/agent-analytics/${agentId}/comparison`,
    RANKING: (agentId: string) => `${API_URL}/agent-analytics/${agentId}/ranking`,
    REALTIME: (agentId: string) => `${API_URL}/agent-analytics/${agentId}/realtime`,
  },

  // User Management
  USER: {
    INITIALIZE: `${API_URL}/user/initialize`,
    PROFILE: `${API_URL}/user/profile`,
    STATS: `${API_URL}/user/stats`,
    CREDITS: `${API_URL}/user/credits`,
    CHECK_CREDITS: `${API_URL}/user/check-credits`,
    DELETE_ACCOUNT: `${API_URL}/user/account`,
    UPDATE_PASSWORD: `${API_URL}/user/password`,
  },

  // Customers
  CUSTOMERS: {
    LIST: `${API_URL}/customers`,
    CREATE: `${API_URL}/customers`,
    GET: (id: string) => `${API_URL}/customers/${id}`,
    UPDATE: (id: string) => `${API_URL}/customers/${id}`,
    DELETE: (id: string) => `${API_URL}/customers/${id}`,
    CONVERT: `${API_URL}/customers/convert`,
    ANALYTICS: `${API_URL}/customers/analytics`,
  },

  // Email
  EMAIL: {
    SEND_VERIFICATION: `${API_URL}/email/send-verification`,
    VERIFY: `${API_URL}/email/verify`,
    SEND_PASSWORD_RESET: `${API_URL}/email/send-password-reset`,
    RESET_PASSWORD: `${API_URL}/email/reset-password`,
    TEST: `${API_URL}/email/test`,
    ADMIN_SEND_REMINDERS: `${API_URL}/email/admin/send-verification-reminders`,
  },

  // Admin (if user has admin access)
  ADMIN: {
    USERS: `${API_URL}/admin/users`,
    USER: (userId: string) => `${API_URL}/admin/users/${userId}`,
    USER_CREDITS: (userId: string) => `${API_URL}/admin/users/${userId}/credits`,
    SYSTEM_STATS: `${API_URL}/admin/stats/system`,
    AUDIT_LOGS: `${API_URL}/admin/audit/logs`,
    AUDIT_STATS: `${API_URL}/admin/audit/stats`,
    CONFIG: `${API_URL}/admin/config`,
    AGENTS: `${API_URL}/admin/agents`,
    AGENTS_STATS: `${API_URL}/admin/agents/stats`,
    AGENTS_MONITOR: `${API_URL}/admin/agents/monitor`,
    USER_AGENT: (userId: string, agentId: string) => `${API_URL}/admin/users/${userId}/agents/${agentId}`,
    AGENTS_BULK_STATUS: `${API_URL}/admin/agents/bulk-status`,
    AGENTS_HEALTH: `${API_URL}/admin/agents/health`,
    VALIDATE: `${API_URL}/admin/validate`,
    PROFILE: `${API_URL}/admin/profile`,
    ANALYTICS_REALTIME: `${API_URL}/admin/analytics/realtime`,
    REPORTS_GENERATE: `${API_URL}/admin/reports/generate`,
    REPORTS_DOWNLOAD: (reportId: string) => `${API_URL}/admin/reports/${reportId}/download`,
    ANALYTICS_EXPORT: `${API_URL}/admin/analytics/export`,
  },

  // Webhooks (for reference, not typically called from frontend)
  WEBHOOKS: {
    ELEVENLABS_POST_CALL: `${API_URL}/webhooks/elevenlabs/post-call`,
    ELEVENLABS_CALL_COMPLETED: `${API_URL}/webhooks/elevenlabs/call-completed`,
    ELEVENLABS_CALL_ANALYTICS: `${API_URL}/webhooks/elevenlabs/call-analytics`,
    CONTACT_LOOKUP: (phone: string) => `${API_URL}/webhooks/contact-lookup/${phone}`,
    HEALTH: `${API_URL}/webhooks/health`,
    STATUS: `${API_URL}/webhooks/status`,
    RETRY: (jobId: string) => `${API_URL}/webhooks/retry/${jobId}`,
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
