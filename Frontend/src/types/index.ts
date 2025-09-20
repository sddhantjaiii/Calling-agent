// Types Index - Central export for all TypeScript interfaces
// This file provides a single import point for all type definitions

// Export all API-related types
export * from './api';

// Re-export commonly used types with shorter names for convenience
export type {
  ApiResponse,
  PaginatedResponse,
  User,
  Agent,
  Contact,
  Call,
  Lead,
  Transcript,
  DashboardOverview,
  DashboardAnalytics,
  CreditBalance,
  CreditStats,
  BillingHistory,
  Voice,
  LeadAnalytics,
  ContactStats,
  CallStatistics,
  TranscriptAnalytics,
  LeadAnalyticsData,
  AnalyticsMetrics,
  AdminUserListResponse,
  AdminAuditLog,
  ApiError,
  ValidationError,
  ErrorResponse,
} from './api';

// Export request/response types
export type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  TokenValidationResponse,
  CreateAgentRequest,
  UpdateAgentRequest,
  CreateContactRequest,
  UpdateContactRequest,
  PurchaseCreditsRequest,
  PurchaseCreditsResponse,
  PaymentConfirmationRequest,
  PaymentConfirmationResponse,
  ContactUploadResult,
  ContactLookupResult,
  BatchContactLookupRequest,
  BatchContactLookupResult,
  CallSearchResult,
  TranscriptSearchResult,
  LeadProfile,
  AdminCreditAdjustmentRequest,
  AdminCreditAdjustmentResponse,
  CallCreditsRequest,
  CallCreditsResponse,
  CreditCheckResponse,
  EmailVerificationResponse,
  PasswordResetResponse,
} from './api';

// Export utility types
export type {
  AuthProvider,
  UserRole,
  AgentType,
  CallStatus,
  TransactionType,
  LeadStatus,
  SortOrder,
  PaginationOptions,
  SortOptions,
  SearchOptions,
  DateRangeOptions,
  FilterOptions,
} from './api';

// Export filter and option types
export type {
  ContactsListOptions,
  CallFilters,
  CallListOptions,
  CallSearchOptions,
  AdminUserListOptions,
} from './api';

// Export webhook types (for reference)
export type {
  ElevenLabsWebhookPayload,
  ContactLookupWebhookRequest,
  ContactLookupWebhookResponse,
} from './api';