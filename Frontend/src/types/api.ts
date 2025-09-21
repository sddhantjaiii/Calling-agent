// Comprehensive TypeScript Interface Definitions
// This file defines all TypeScript interfaces matching backend data models
// and API request/response types for complete type safety

// ============================================================================
// BASE TYPES AND UTILITIES
// ============================================================================

export type AuthProvider = 'email' | 'google' | 'linkedin' | 'github';
export type UserRole = 'user' | 'admin' | 'super_admin';
export type AgentType = 'call' | 'chat';
export type CallStatus = 'completed' | 'failed' | 'in_progress' | 'cancelled';
export type TransactionType = 'purchase' | 'usage' | 'bonus' | 'admin_adjustment' | 'refund';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type NotificationType = 'smart_notification' | 'demo_booking' | 'follow_up' | 'conversion';

// ============================================================================
// API RESPONSE WRAPPER
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp?: string;
  };
  message?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    page?: number;
    totalPages?: number;
  };
}

// ============================================================================
// USER INTERFACES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  credits: number;
  isActive: boolean;
  authProvider: AuthProvider;
  role: UserRole;
  emailVerified: boolean;
  emailVerificationSentAt?: string;
  createdAt: string;
  updatedAt: string;
  // Extended profile fields
  company?: string;
  website?: string;
  location?: string;
  bio?: string;
  phone?: string;
}

export interface UserProfileUpdate {
  name?: string;
  email?: string;
  company?: string;
  website?: string;
  location?: string;
  bio?: string;
  phone?: string;
  password?: string;
}

export interface UserStats {
  user: User;
  totalCalls: number;
  totalCreditsUsed: number;
  agentCount: number;
  contactCount: number;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalCreditsInSystem: number;
  totalCreditsUsed: number;
  usersByRole: Record<string, number>;
  usersByProvider: Record<string, number>;
}

// ============================================================================
// AUTHENTICATION INTERFACES
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
  message: string;
  timestamp: string;
}

export interface TokenValidationResponse {
  user: User;
  timestamp: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  user: User;
  message: string;
  timestamp: string;
}

// ============================================================================
// AGENT INTERFACES
// ============================================================================

export interface Agent {
  id: string;
  userId: string;
  elevenlabsAgentId: string;
  name: string;
  agentType: AgentType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Frontend-specific fields (computed by backend)
  status?: 'active' | 'draft';
  type?: 'CallAgent' | 'ChatAgent';
  conversations?: number;
  creditsRemaining?: number;
  language?: string;
  description?: string;
  model?: string;
  voiceId?: string;
  created?: string;
  // Performance metrics
  successRate?: number;
  avgDuration?: string;
}

export interface CreateAgentRequest {
  name: string;
  agentType?: AgentType;
  elevenlabsAgentId?: string;
  language?: string;
  type?: 'CallAgent' | 'ChatAgent';
  description?: string;
  data_collection?: {
    default?: {
      type?: string;
      description?: string;
    };
  };
}

export interface UpdateAgentRequest {
  name?: string;
  agentType?: AgentType;
  isActive?: boolean;
  language?: string;
  status?: 'active' | 'draft';
  type?: 'CallAgent' | 'ChatAgent';
  description?: string;
  data_collection?: {
    default?: {
      type?: string;
      description?: string;
    };
  };
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  available_for_tiers?: string[];
  settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface AgentTestConnectionResponse {
  connected: boolean;
  success: boolean;
  message: string;
}

// ============================================================================
// CONTACT INTERFACES
// ============================================================================

export interface Contact {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  notes?: string;
  autoCreatedFromCallId?: string;
  isAutoCreated: boolean;
  autoCreationSource?: 'webhook' | 'manual';
  linkedCallId?: string;
  callLinkType?: 'auto_created' | 'manually_linked' | 'not_linked';
  callCreatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactRequest {
  name: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  notes?: string;
}

export interface UpdateContactRequest {
  name?: string;
  phoneNumber?: string;
  email?: string;
  company?: string;
  notes?: string;
}

export interface ContactsListOptions {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'created_at' | 'phone_number';
  sortOrder?: 'asc' | 'desc';
}

export interface ContactStats {
  totalContacts: number;
  contactsThisMonth: number;
  contactsThisWeek: number;
  contactsToday: number;
  averageContactsPerDay: number;
  autoCreatedContacts: number;
  manuallyCreatedContacts: number;
  topCompanies: Array<{
    company: string;
    count: number;
  }>;
}

export interface ContactUploadResult {
  success: boolean;
  message: string;
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    duplicates: number;
  };
  errors?: Array<{
    row: number;
    message: string;
    data?: Record<string, unknown>;
  }>;
}

export interface ContactLookupResult {
  found: boolean;
  name?: string;
  company?: string;
  hasEmail?: boolean;
  hasNotes?: boolean;
  message?: string;
}

export interface BatchContactLookupRequest {
  phones: string[];
}

export interface BatchContactLookupResult {
  results: Array<{
    phone: string;
    found: boolean;
    name?: string;
    company?: string;
    hasEmail?: boolean;
    hasNotes?: boolean;
    error?: string;
  }>;
  summary: {
    total: number;
    found: number;
    notFound: number;
  };
}

// ============================================================================
// CALL INTERFACES
// ============================================================================

export interface Call {
  id: string;
  agentId: string;
  userId: string;
  contactId?: string;
  elevenlabsConversationId: string;
  phoneNumber: string;
  durationMinutes: number;
  durationSeconds?: number;
  callDurationSecs?: number; // Adding this as a fallback
  displayDuration?: string;
  creditsUsed: number;
  status: CallStatus;
  recordingUrl?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
  // Call source detection fields
  callSource?: 'phone' | 'internet' | 'unknown';
  callerName?: string;
  callerEmail?: string;
  // Joined data from related tables
  contactName?: string;
  contactEmail?: string;
  agentName?: string;
  transcript?: Transcript;
  leadAnalytics?: LeadAnalytics;
}

export interface CallFilters {
  search?: string;
  status?: CallStatus;
  agentId?: string;
  agentName?: string;
  phoneNumber?: string;
  contactName?: string;
  startDate?: Date;
  endDate?: Date;
  minDuration?: number;
  maxDuration?: number;
  hasTranscript?: boolean;
  hasAnalytics?: boolean;
  minScore?: number;
  maxScore?: number;
  leadStatus?: string;
  leadTag?: 'Hot' | 'Warm' | 'Cold';
}

export interface CallListOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'duration_minutes' | 'total_score' | 'contact_name' | 'phone_number';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CallSearchOptions {
  limit?: number;
  offset?: number;
}

export interface CallListResponse {
  calls: Call[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface CallSearchResult {
  results: Call[];
  calls: Call[]; // Add calls property for backward compatibility
  searchTerm: string;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface CallStatistics {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  inProgressCalls: number;
  totalDuration: number;
  averageDuration: number;
  totalCreditsUsed: number;
  averageCreditsPerCall: number;
  successRate: number;
  callsThisPeriod: number;
  growthRate: number;
}

// ============================================================================
// TRANSCRIPT INTERFACES
// ============================================================================

export interface Transcript {
  id: string;
  callId: string;
  content: string;
  speakers: Array<{
    speaker: string;
    text: string;
    timestamp: number;
    confidence?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSearchResult {
  results: Array<{
    callId: string;
    transcript: Transcript;
    matches: Array<{
      text: string;
      context: string;
      timestamp: number;
    }>;
  }>;
  total: number;
}

export interface TranscriptAnalytics {
  totalTranscripts: number;
  averageLength: number;
  topKeywords: Array<{
    keyword: string;
    frequency: number;
  }>;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// ============================================================================
// LEAD INTERFACES
// ============================================================================

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
  leadAnalytics?: LeadAnalytics;
}

export interface LeadAnalytics {
  id: string;
  callId: string;
  totalScore: number;
  leadStatusTag: string;
  intentScore: number;
  urgencyScore: number;
  budgetScore: number;
  fitScore: number;
  engagementScore: number;
  reasoning: string;
  ctaInteractions: Array<{
    type: string;
    value: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface LeadProfile {
  lead: Lead;
  timeline: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
  analytics: LeadAnalytics;
  relatedCalls: Call[];
}

export interface LeadAnalyticsData {
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageScore: number;
  scoreDistribution: {
    hot: number;
    warm: number;
    cold: number;
  };
  leadsBySource: Array<{
    source: string;
    count: number;
    conversionRate: number;
  }>;
  leadsByStatus: Array<{
    status: LeadStatus;
    count: number;
  }>;
}

// ============================================================================
// NOTIFICATION INTERFACES
// ============================================================================

export interface Notification {
  id: string;
  leadId: string;
  contactId: string;
  phoneNumber: string;
  email: string;
  smartNotification: string;
  demoBookDateTime: string | null;
  createdAt: string;
  isRead: boolean;
  leadType: string;
  totalScore: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
}

// ============================================================================
// DASHBOARD INTERFACES
// ============================================================================

export interface DashboardOverview {
  kpis: Array<{
    label: string;
    value: number | string;
    delta?: number;
    percentage?: number;
    compare?: string;
    description?: string;
    efficiency?: string;
  }>;
  credits: {
    current: number;
    usedThisMonth: number;
    remaining: number;
  };
  agents: {
    total: number;
    active: number;
    draft: number;
  };
  conversations: {
    total: number;
    thisMonth: number;
    successRate: number;
  };
  leads: {
    total: number;
    qualified: number;
    conversionRate: number;
  };
  recentActivity: Array<{
    id: number;
    type: string;
    message: string;
    timestamp: string;
    agentName?: string;
  }>;
}

export interface DashboardAnalytics {
  leadsOverTimeData: Array<{
    date: string;
    chatLeads: number;
    callLeads: number;
    total: number;
  }>;
  interactionsOverTimeData: Array<{
    date: string;
    chat: number;
    call: number;
    total: number;
  }>;
  leadQualityData: Array<{
    name: string;
    chatCount: number;
    callCount: number;
    color: string;
  }>;
  engagementFunnelData: Array<{
    name: string;
    value: number;
    fill: string;
  }>;
  interactionsToConvertData: Array<{
    interactions: string;
    chatCount: number;
    callCount: number;
  }>;
  timeToConvertData: Array<{
    period: string;
    count: number;
  }>;
  sourceBreakdownData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  // Legacy compatibility
  callVolume?: {
    labels: string[];
    data: number[];
  };
  successRates?: {
    labels: string[];
    data: number[];
  };
  leadQuality?: {
    high: number;
    medium: number;
    low: number;
  };
  agentPerformance?: Array<{
    name: string;
    conversations: number;
    successRate: number;
    avgDuration: string;
  }>;
  lastRefresh?: string;
}

// ============================================================================
// BILLING INTERFACES
// ============================================================================

export interface CreditBalance {
  credits: number;
  userId?: string;
}

export interface CreditStats {
  currentBalance: number;
  totalPurchased: number;
  totalUsed: number;
  totalBonus: number;
  totalAdjustments: number;
  transactionCount: number;
  averageUsagePerDay: number;
  projectedRunoutDate?: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  stripePaymentId?: string;
  callId?: string;
  createdBy?: string;
  createdAt: string;
}

export interface BillingHistory {
  transactions: CreditTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseCreditsRequest {
  amount: number;
}

export interface PurchaseCreditsResponse {
  clientSecret: string;
  paymentIntentId: string;
  pricing: {
    credits: number;
    pricePerCredit: number;
    totalPrice: number;
    currency: string;
  };
}

export interface PaymentConfirmationRequest {
  paymentIntentId: string;
}

export interface PaymentConfirmationResponse {
  userId: string;
  creditsAdded: number;
  transactionId: string;
  message: string;
}

export interface PricingConfig {
  pricePerCredit: number;
  minimumPurchase: number;
  currency: string;
  examples: Array<{
    credits: number;
    price: number;
  }>;
}

export interface PaymentHistory {
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: Date;
    description: string;
    credits: number;
  }>;
  total: number;
}

export interface AdminCreditAdjustmentRequest {
  userId: string;
  amount: number;
  reason: string;
}

export interface AdminCreditAdjustmentResponse {
  user: {
    id: string;
    email: string;
    credits: number;
  };
  transaction: CreditTransaction;
  message: string;
}

export interface CallCreditsRequest {
  userId: string;
  callId: string;
  durationSeconds: number;
  phoneNumber: string;
}

export interface CallCreditsResponse {
  creditsUsed: number;
  remainingCredits: number;
  transaction: CreditTransaction;
}

export interface CreditCheckResponse {
  hasEnoughCredits: boolean;
  currentCredits: number;
  requiredCredits: number;
}

// ============================================================================
// ANALYTICS INTERFACES
// ============================================================================

export interface AnalyticsMetrics {
  totalCalls: number;
  totalLeads: number;
  conversionRate: number;
  averageCallDuration: number;
  totalCreditsUsed: number;
  activeAgents: number;
  successRate: number;
  growthMetrics: {
    callsGrowth: number;
    leadsGrowth: number;
    conversionGrowth: number;
  };
}

export interface CallVolumeData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export interface LeadTrendsData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export interface CTATrendsData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export interface TopPerformingAgents {
  agents: Array<{
    id: string;
    name: string;
    totalCalls: number;
    successRate: number;
    averageDuration: number;
    totalLeads: number;
    conversionRate: number;
  }>;
}

export interface ScoreDistribution {
  distribution: Array<{
    scoreRange: string;
    count: number;
    percentage: number;
  }>;
  averageScore: number;
  medianScore: number;
}

// ============================================================================
// EMAIL INTERFACES
// ============================================================================

export interface EmailVerificationRequest {
  // No body needed - uses authenticated user
  // This interface is intentionally minimal as it represents an empty request body
}

export interface EmailVerificationResponse {
  success: boolean;
  message: string;
}

export interface EmailVerifyRequest {
  token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

// ============================================================================
// ADMIN INTERFACES
// ============================================================================

export interface AdminUserListOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AdminUserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  changes: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  adminUser?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface AdminAuditStats {
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
// ERROR INTERFACES
// ============================================================================

export interface ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  isRetryable?: boolean;
  timestamp?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown> | ValidationError[];
    timestamp: string;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SortOrder = 'ASC' | 'DESC' | 'asc' | 'desc';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface SearchOptions {
  search?: string;
  query?: string;
}

export interface DateRangeOptions {
  dateFrom?: string;
  dateTo?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface FilterOptions extends PaginationOptions, SortOptions, SearchOptions, DateRangeOptions {
  [key: string]: unknown;
}

// ============================================================================
// WEBHOOK INTERFACES (for reference)
// ============================================================================

export interface ElevenLabsWebhookPayload {
  conversationId: string;
  agentId: string;
  userId: string;
  phoneNumber: string;
  status: CallStatus;
  durationSeconds: number;
  recordingUrl?: string;
  transcript?: string;
  metadata?: Record<string, unknown>;
}

export interface ContactLookupWebhookRequest {
  phone: string;
}

export interface ContactLookupWebhookResponse {
  found: boolean;
  name?: string;
  company?: string;
  email?: string;
  notes?: string;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  // Re-export commonly used types for convenience
  ApiResponse as Response,
  PaginatedResponse as PaginatedApiResponse,
  User as UserInterface,
  Agent as AgentInterface,
  Contact as ContactInterface,
  Call as CallInterface,
  Lead as LeadInterface,
  Transcript as TranscriptInterface,
};