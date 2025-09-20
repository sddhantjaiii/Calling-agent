// Enhanced API Service for Backend Communication
// This service handles all API calls to the backend with comprehensive error handling,
// retry logic, request/response interceptors, and timeout management

import API_ENDPOINTS from '../config/api';
import { errorHandler, type ApiError as ErrorHandlerApiError } from '../utils/errorHandler';
import type {
  ApiResponse,
  Agent,
  User,
  UserProfileUpdate,
  Contact,
  Call,
  CallListOptions,
  CallListResponse,
  Lead,
  Transcript,
  Voice,
  DashboardOverview,
  DashboardAnalytics,
  CreditBalance,
  CreditStats,
  BillingHistory,
  LeadProfile,
  ContactUploadResult,
  CreateAgentRequest,
  UpdateAgentRequest,
  CreateContactRequest,
  UpdateContactRequest,
  PurchaseCreditsRequest,
  PurchaseCreditsResponse,
  ContactLookupResult,
  BatchContactLookupRequest,
  BatchContactLookupResult,
  CallSearchResult,
  TranscriptSearchResult,
  CallStatistics,
  ContactStats,
  LeadAnalyticsData,
  AnalyticsMetrics,
  CallVolumeData,
  LeadTrendsData,
  CTATrendsData,
  TopPerformingAgents,
  ScoreDistribution,
  TranscriptAnalytics,
  PricingConfig,
  PaymentHistory,
  CreditCheckResponse,
  EmailVerificationResponse,
  PasswordResetResponse,
  AuthResponse,
  TokenValidationResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  Notification,
  NotificationResponse,
} from '../types';

// Configuration constants - REDUCED for development
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRY_ATTEMPTS = 1; // Reduced from 3
const RETRY_DELAY = 2000; // Increased from 1000

// Enhanced retry configuration - REDUCED for development
const API_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 1, // Reduced from 3 to prevent rate limiting
  baseDelay: 2000, // Increased delay
  maxDelay: 30000,
  exponentialBase: 2,
  jitter: true,
  retryCondition: (error: { code?: string; status?: number }) => {
    // Don't retry rate limit errors
    if (error?.code === 'RATE_LIMIT_EXCEEDED') {
      console.warn('Rate limit exceeded, not retrying');
      return false;
    }

    // Don't retry authentication errors
    if (error?.code === 'UNAUTHORIZED' || error?.code === 'FORBIDDEN') {
      return false;
    }

    // Don't retry validation errors
    if (error?.code === 'VALIDATION_ERROR') {
      return false;
    }

    // Don't retry business logic errors
    if (error?.code === 'INSUFFICIENT_CREDITS' || error?.code === 'AGENT_LIMIT_EXCEEDED') {
      return false;
    }

    return isRetryableError(error?.code || 'UNKNOWN_ERROR');
  },
  onRetry: (attempt: number, error: { message?: string }) => {
    console.log(`Retrying API request (attempt ${attempt}):`, error?.message || 'Unknown error');
  },
};

// Enhanced error types
export interface ApiServiceError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  isRetryable?: boolean;
}

// Contact list options interface
interface ContactsListOptions {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// User stats interface
interface UserStats {
  totalCalls: number;
  totalCreditsUsed: number;
  totalLeads: number;
  conversionRate: number;
}

// Request configuration interface
interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
}

// All interfaces are now imported from ../types

// Request/Response interceptor types
type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
type ResponseInterceptor = <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;
type ErrorInterceptor = (error: ApiServiceError) => ApiServiceError | Promise<ApiServiceError>;

// Get auth headers with custom auth token
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Utility function to create API errors
function createApiError(message: string, status: number, code: string, details?: Record<string, unknown>): ApiServiceError {
  const error = new Error(message) as ApiServiceError;
  error.code = code;
  error.status = status;
  error.details = details;
  error.isRetryable = isRetryableError(code);
  return error;
}

import { getErrorMessage, mapStatusToErrorCode, isRetryableError } from '../utils/errorMapping';
import {
  retryWithBackoff,
  ManualRetryManager,
  CircuitBreaker,
  RateLimiter,
  type RetryConfig
} from '../utils/retryMechanism';
import { dataFlowDebugger } from '../utils/dataFlowDebugger';
import { validateApiResponse, detectMockData } from '../utils/typeValidation';

// Utility function to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class ApiService {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private manualRetryManager: ManualRetryManager;
  private currentAgentId: string | null = null;

  constructor() {
    // Initialize circuit breaker (5 failures, 60 second recovery)
    this.circuitBreaker = new CircuitBreaker(5, 60000);

    // Initialize rate limiter (100 requests per minute)
    this.rateLimiter = new RateLimiter(100, 60000);

    // Initialize manual retry manager
    this.manualRetryManager = new ManualRetryManager(API_RETRY_CONFIG);

    // Add automatic token refresh interceptor
    this.addRequestInterceptor(this.tokenRefreshInterceptor.bind(this));
  }

  // Set the current agent ID for all subsequent requests
  setCurrentAgent(agentId: string | null): void {
    this.currentAgentId = agentId;
  }

  // Get the current agent ID
  getCurrentAgent(): string | null {
    return this.currentAgentId;
  }

  // Token refresh interceptor
  private async tokenRefreshInterceptor(config: RequestConfig): Promise<RequestConfig> {
    // Skip token refresh for auth endpoints and requests that don't need auth
    if (config.skipAuth) {
      return config;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      return config;
    }

    // Check if token is expiring soon
    const isExpiring = this.isTokenExpiringSoon(token);
    if (isExpiring) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          console.log('Token expiring, refreshing before request...');
          const response = await this.refreshToken(refreshToken);
          if (response.token && response.refreshToken) {
            localStorage.setItem('auth_token', response.token);
            localStorage.setItem('refresh_token', response.refreshToken);

            // Dispatch event to notify AuthContext
            window.dispatchEvent(new CustomEvent('token-refreshed', {
              detail: { user: response.user }
            }));
          }
        } catch (error) {
          console.error('Token refresh failed in interceptor:', error);
          // Let the request proceed, it will fail with 401 and trigger logout
        }
      }
    }

    return config;
  }

  // Helper method to check if token is expiring soon
  private isTokenExpiringSoon(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiration = payload.exp * 1000; // Convert to milliseconds
      const threshold = 5 * 60 * 1000; // 5 minutes
      return Date.now() > expiration - threshold;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return true; // Assume expiring if we can't decode
    }
  }

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // Add error interceptor
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  // Manual retry functionality
  async retryLastFailedRequest<T>(operation: () => Promise<T>): Promise<T> {
    return this.manualRetryManager.retry(operation);
  }

  // Check if manual retry is available
  canRetryLastRequest(): boolean {
    return this.manualRetryManager.canRetry();
  }

  // Get retry state for UI display
  getRetryState() {
    return this.manualRetryManager.getState();
  }

  // Reset retry state
  resetRetryState(): void {
    this.manualRetryManager.reset();
  }

  // Circuit breaker management
  getCircuitBreakerState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.circuitBreaker.getState();
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  // Rate limiter management
  getRateLimitStatus(): { allowed: boolean; timeUntilReset: number } {
    return {
      allowed: this.rateLimiter.isAllowed(),
      timeUntilReset: this.rateLimiter.getTimeUntilReset(),
    };
  }

  resetRateLimit(): void {
    this.rateLimiter.reset();
  }

  // Convert API service error to error handler format
  private convertToErrorHandlerFormat(error: ApiServiceError): ErrorHandlerApiError {
    return {
      code: error.code,
      message: getErrorMessage(error.code, error.message),
      status: error.status,
      details: error.details,
    };
  }

  // Validate and log API response with comprehensive debugging
  private validateAndLogResponse<T>(url: string, response: ApiResponse<T>, performanceId: string): void {
    // Log basic API response
    dataFlowDebugger.logApiResponse(url, response, undefined, performanceId);

    // Detect potential mock data
    const mockDetection = detectMockData(response);
    if (mockDetection.isMock) {
      console.warn(`🚨 Potential mock data detected in API response from ${url}:`, mockDetection.reasons);
      dataFlowDebugger.logMockDataUsage('API_SERVICE', 'API Response', `Mock data detected: ${mockDetection.reasons.join(', ')}`);
    }

    // Validate specific endpoint responses
    this.validateSpecificEndpoint(url, response);

    // Log data transformation if response structure is wrapped
    if (response && typeof response === 'object' && 'data' in response) {
      dataFlowDebugger.logDataTransformation('API_SERVICE', response, (response as any).data, 'Extract data from wrapper');
    }
  }

  // Validate specific endpoint responses based on URL patterns
  private validateSpecificEndpoint<T>(url: string, response: ApiResponse<T>): void {
    try {
      if (url.includes('/dashboard/overview')) {
        const dataToValidate = response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
        const validation = validateApiResponse(dataToValidate, 'dashboardOverview', url);
        if (!validation.isValid) {
          dataFlowDebugger.logDataIntegrationIssue('API_SERVICE', `Dashboard overview validation failed: ${validation.errors.join(', ')}`, dataToValidate);
        }
      } else if (url.includes('/dashboard/analytics')) {
        const dataToValidate = response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
        const validation = validateApiResponse(dataToValidate, 'dashboardAnalytics', url);
        if (!validation.isValid) {
          dataFlowDebugger.logDataIntegrationIssue('API_SERVICE', `Dashboard analytics validation failed: ${validation.errors.join(', ')}`, dataToValidate);
        }
      } else if (url.includes('/leads') && !url.includes('/profile') && !url.includes('/timeline')) {
        // Validate leads list response
        if (response && typeof response === 'object' && 'data' in response) {
          const leadsData = (response as any).data;
          if (Array.isArray(leadsData) && leadsData.length > 0) {
            const validation = validateApiResponse(leadsData[0], 'lead', url);
            if (!validation.isValid) {
              dataFlowDebugger.logDataIntegrationIssue('API_SERVICE', `Lead validation failed: ${validation.errors.join(', ')}`, leadsData[0]);
            }
          }
        }
      } else if (url.includes('/leads/') && url.includes('/profile')) {
        const validation = validateApiResponse(response, 'leadProfile', url);
        if (!validation.isValid) {
          dataFlowDebugger.logDataIntegrationIssue('API_SERVICE', `Lead profile validation failed: ${validation.errors.join(', ')}`, response);
        }
      }
    } catch (error) {
      console.warn('Validation error for endpoint', url, error);
    }
  }

  // Helper method to validate UUID format
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Validate user profile data before sending to backend
  private validateUserProfileData(userData: UserProfileUpdate): UserProfileUpdate {
    const validatedData: UserProfileUpdate = {};

    // Validate and sanitize each field
    if (userData.name !== undefined) {
      const name = userData.name.trim();
      if (name.length === 0) {
        throw createApiError('Name cannot be empty', 400, 'VALIDATION_ERROR', { field: 'name' });
      }
      if (name.length > 100) {
        throw createApiError('Name cannot exceed 100 characters', 400, 'VALIDATION_ERROR', { field: 'name' });
      }
      validatedData.name = name;
    }

    if (userData.email !== undefined) {
      const email = userData.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw createApiError('Invalid email format', 400, 'VALIDATION_ERROR', { field: 'email' });
      }
      validatedData.email = email;
    }

    if (userData.company !== undefined) {
      const company = userData.company.trim();
      if (company.length > 100) {
        throw createApiError('Company name cannot exceed 100 characters', 400, 'VALIDATION_ERROR', { field: 'company' });
      }
      validatedData.company = company || null;
    }

    if (userData.website !== undefined) {
      const website = userData.website.trim();
      if (website && website.length > 0) {
        // Add protocol if missing
        const urlWithProtocol = website.startsWith('http://') || website.startsWith('https://')
          ? website
          : `https://${website}`;

        try {
          new URL(urlWithProtocol);
          validatedData.website = urlWithProtocol;
        } catch {
          throw createApiError('Invalid website URL format', 400, 'VALIDATION_ERROR', { field: 'website' });
        }
      } else {
        validatedData.website = null;
      }
    }

    if (userData.location !== undefined) {
      const location = userData.location.trim();
      if (location.length > 100) {
        throw createApiError('Location cannot exceed 100 characters', 400, 'VALIDATION_ERROR', { field: 'location' });
      }
      validatedData.location = location || null;
    }

    if (userData.bio !== undefined) {
      const bio = userData.bio.trim();
      if (bio.length > 500) {
        throw createApiError('Bio cannot exceed 500 characters', 400, 'VALIDATION_ERROR', { field: 'bio' });
      }
      validatedData.bio = bio || null;
    }

    if (userData.phone !== undefined) {
      const phone = userData.phone.trim();
      if (phone && phone.length > 0) {
        // Basic phone number validation (allows international formats)
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          throw createApiError('Invalid phone number format', 400, 'VALIDATION_ERROR', { field: 'phone' });
        }
        validatedData.phone = cleanPhone;
      } else {
        validatedData.phone = null;
      }
    }

    return validatedData;
  }

  // Helper method to add agent ID to URL parameters
  private addAgentIdToUrl(url: string, agentId?: string): string {
    const targetAgentId = agentId || this.currentAgentId;
    if (!targetAgentId) return url;

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}agentId=${encodeURIComponent(targetAgentId)}`;
  }

  // Enhanced request method with retry logic, interceptors, and debugging
  private async request<T>(
    url: string,
    options: RequestConfig & { agentId?: string; includeAgentId?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = DEFAULT_TIMEOUT,
      retries = MAX_RETRY_ATTEMPTS,
      retryDelay = RETRY_DELAY,
      skipAuth = false,
      agentId,
      includeAgentId = true,
      ...fetchOptions
    } = options;

    // Start performance tracking
    const performanceId = `api-${Date.now()}-${Math.random()}`;
    dataFlowDebugger.startPerformanceTracking(performanceId);

    // Check rate limiter
    if (!this.rateLimiter.isAllowed()) {
      const waitTime = this.rateLimiter.getTimeUntilReset();
      const error = createApiError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        429,
        'RATE_LIMITED'
      );
      errorHandler.handleError(this.convertToErrorHandlerFormat(error));
      throw error;
    }

    // Use circuit breaker and retry mechanism
    return this.circuitBreaker.execute(async () => {
      return retryWithBackoff(async () => {
        // Apply request interceptors
        let config = { ...options };
        for (const interceptor of this.requestInterceptors) {
          config = await interceptor(config);
        }

        // Add agent ID to URL if required
        let finalUrl = url;
        if (includeAgentId) {
          finalUrl = this.addAgentIdToUrl(url, agentId);
        }

        const headers: Record<string, string> = {
          // Only set Content-Type for non-FormData requests
          ...(!(fetchOptions.body instanceof FormData) && { 'Content-Type': 'application/json' }),
          ...(!skipAuth && getAuthHeaders()),
          // Add agent ID as header as alternative
          ...(includeAgentId && (agentId || this.currentAgentId) && {
            'X-Agent-ID': agentId || this.currentAgentId
          }),
          ...(fetchOptions.headers as Record<string, string>),
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(finalUrl, {
            ...fetchOptions,
            headers,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          let data: unknown;
          const contentType = response.headers.get('content-type');

          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }

          if (!response.ok) {
            const errorData = data as any;
            const errorMessage = errorData?.error?.message || errorData?.message || `HTTP error! status: ${response.status}`;
            const backendErrorCode = errorData?.error?.code || errorData?.code;
            const errorCode = mapStatusToErrorCode(response.status, backendErrorCode);

            // Handle rate limiting with Retry-After header
            let apiError: ApiServiceError;
            if (response.status === 429) {
              const retryAfter = response.headers.get('retry-after');
              apiError = createApiError(
                errorMessage,
                response.status,
                errorCode,
                {
                  ...errorData?.error?.details || errorData?.details,
                  retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined
                }
              );
            } else {
              apiError = createApiError(
                errorMessage,
                response.status,
                errorCode,
                errorData?.error?.details || errorData?.details
              );
            }

            // Apply error interceptors
            let processedError = apiError;
            for (const interceptor of this.errorInterceptors) {
              processedError = await interceptor(processedError);
            }

            // Log API error with performance tracking
            dataFlowDebugger.logApiResponse(url, null, processedError.message, performanceId);

            // Use centralized error handler for user feedback
            errorHandler.handleError(this.convertToErrorHandlerFormat(processedError));

            throw processedError;
          }

          // Apply response interceptors
          let result: ApiResponse<T> = data as ApiResponse<T>;
          for (const interceptor of this.responseInterceptors) {
            result = await interceptor(result);
          }

          // Validate and log successful API response
          this.validateAndLogResponse(url, result, performanceId);

          return result;

        } catch (error) {
          clearTimeout(timeoutId);

          let apiError: ApiServiceError;
          if (error instanceof Error && error.name === 'AbortError') {
            apiError = createApiError('Request timeout', 408, 'TIMEOUT_ERROR');
          } else if (error instanceof TypeError && error.message.includes('fetch')) {
            apiError = createApiError('Network error occurred', 0, 'NETWORK_ERROR');
          } else if (error instanceof Error) {
            apiError = error as ApiServiceError;
          } else {
            apiError = createApiError('Unknown error occurred', 0, 'UNKNOWN_ERROR');
          }

          // Log API error with performance tracking
          dataFlowDebugger.logApiResponse(url, null, apiError.message, performanceId);

          // Use centralized error handler for user feedback
          errorHandler.handleError(this.convertToErrorHandlerFormat(apiError));

          throw apiError;
        }
      }, {
        ...API_RETRY_CONFIG,
        maxAttempts: retries,
      });
    });
  }



  // Helper method to get current user from auth context
  private getCurrentUser(): { id: string } | null {
    // Try to get user from localStorage token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.userId || payload.sub || payload.id };
    } catch (error) {
      console.error('Failed to decode user from token:', error);
      return null;
    }
  }

  // Cache for user's agents to avoid repeated API calls
  private userAgentsCache: { agents: Agent[]; timestamp: number; userId: string } | null = null;
  private readonly AGENTS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  // Helper method to get user's agents with caching
  private async getUserAgents(forceRefresh: boolean = false): Promise<Agent[]> {
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to access agents', 401, 'UNAUTHORIZED');
    }

    // Check if we have valid cached data for this user
    const now = Date.now();
    if (!forceRefresh &&
      this.userAgentsCache &&
      this.userAgentsCache.userId === user.id &&
      (now - this.userAgentsCache.timestamp) < this.AGENTS_CACHE_TTL) {
      return this.userAgentsCache.agents;
    }

    // Fetch fresh data
    try {
      const response = await this.request<Agent[]>(API_ENDPOINTS.AGENTS.LIST);
      const userAgents = response.data || response as unknown as Agent[];

      // Update cache
      this.userAgentsCache = {
        agents: userAgents,
        timestamp: now,
        userId: user.id
      };

      return userAgents;
    } catch (error) {
      // Clear cache on error
      this.userAgentsCache = null;
      throw error;
    }
  }

  // Helper method to validate agent ownership before API calls
  private async validateAgentOwnership(agentId: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to access agents', 401, 'UNAUTHORIZED');
    }

    // Validate agent ID format
    if (!this.isValidUUID(agentId)) {
      throw createApiError('Invalid agent ID format', 400, 'VALIDATION_ERROR', { field: 'agentId' });
    }

    // Get user's agents to validate ownership
    try {
      const userAgents = await this.getUserAgents();

      const agentExists = userAgents.some(agent => agent.id === agentId);
      if (!agentExists) {
        // Try refreshing the cache once in case the agent was recently created
        const freshAgents = await this.getUserAgents(true);
        const agentExistsAfterRefresh = freshAgents.some(agent => agent.id === agentId);

        if (!agentExistsAfterRefresh) {
          throw createApiError('Agent not found or access denied', 403, 'AGENT_ACCESS_DENIED', { agentId });
        }
      }
    } catch (error) {
      // If it's already an access denied error, re-throw it
      if ((error as any)?.code === 'AGENT_ACCESS_DENIED') {
        throw error;
      }
      // For other errors, assume access denied for security
      throw createApiError('Unable to verify agent ownership', 403, 'AGENT_ACCESS_DENIED', { agentId });
    }
  }

  // Method to clear the agents cache (useful after creating/deleting agents)
  public clearAgentsCache(): void {
    this.userAgentsCache = null;
  }

  // Agent API methods with user context validation
  async getAgents(): Promise<ApiResponse<Agent[]>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to access agents', 401, 'UNAUTHORIZED');
    }

    return this.request<Agent[]>(API_ENDPOINTS.AGENTS.LIST);
  }

  async getAgent(id: string): Promise<ApiResponse<Agent>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(id);

    return this.request<Agent>(API_ENDPOINTS.AGENTS.GET(id));
  }

  async createAgent(agentData: CreateAgentRequest): Promise<ApiResponse<Agent>> {
    // Validate user context before creating agent
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to create agents', 401, 'UNAUTHORIZED');
    }

    // Validate agent data before sending
    if (!agentData.name || agentData.name.trim().length === 0) {
      throw createApiError('Agent name is required', 400, 'VALIDATION_ERROR', { field: 'name' });
    }

    if (agentData.name.length > 100) {
      throw createApiError('Agent name cannot exceed 100 characters', 400, 'VALIDATION_ERROR', { field: 'name' });
    }

    const response = await this.request<Agent>(API_ENDPOINTS.AGENTS.CREATE, {
      method: 'POST',
      body: JSON.stringify(agentData),
    });

    // Clear agents cache after successful creation
    this.clearAgentsCache();

    return response;
  }

  async updateAgent(id: string, agentData: UpdateAgentRequest): Promise<ApiResponse<Agent>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(id);

    // Validate update data
    if (agentData.name !== undefined) {
      if (!agentData.name || agentData.name.trim().length === 0) {
        throw createApiError('Agent name cannot be empty', 400, 'VALIDATION_ERROR', { field: 'name' });
      }
      if (agentData.name.length > 100) {
        throw createApiError('Agent name cannot exceed 100 characters', 400, 'VALIDATION_ERROR', { field: 'name' });
      }
    }

    return this.request<Agent>(API_ENDPOINTS.AGENTS.UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify(agentData),
    });
  }

  async deleteAgent(id: string): Promise<ApiResponse<void>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(id);

    const response = await this.request<void>(API_ENDPOINTS.AGENTS.DELETE(id), {
      method: 'DELETE',
    });

    // Clear agents cache after successful deletion
    this.clearAgentsCache();

    return response;
  }

  async getVoices(): Promise<ApiResponse<Voice[]>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to access voices', 401, 'UNAUTHORIZED');
    }

    return this.request<Voice[]>(API_ENDPOINTS.AGENTS.VOICES);
  }

  async testAgentConnection(): Promise<ApiResponse<{ connected: boolean }>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to test connection', 401, 'UNAUTHORIZED');
    }

    return this.request<{ connected: boolean }>(API_ENDPOINTS.AGENTS.TEST_CONNECTION);
  }

  // Agent Analytics API methods with user context validation
  async getAgentOverview(agentId: string, params?: { dateFrom?: string; dateTo?: string }): Promise<ApiResponse<any>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(agentId);

    let url = API_ENDPOINTS.AGENT_ANALYTICS.OVERVIEW(agentId);
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return this.request<any>(url);
  }

  async getAgentMetrics(agentId: string, params?: { dateFrom?: string; dateTo?: string; period?: string }): Promise<ApiResponse<any>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(agentId);

    let url = API_ENDPOINTS.AGENT_ANALYTICS.METRICS(agentId);
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);
      if (params.period) queryParams.append('period', params.period);

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return this.request<any>(url);
  }

  async getAgentCallOutcomes(agentId: string, params?: { dateFrom?: string; dateTo?: string }): Promise<ApiResponse<any>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(agentId);

    let url = API_ENDPOINTS.AGENT_ANALYTICS.CALL_OUTCOMES(agentId);
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return this.request<any>(url);
  }

  async getAgentPerformanceTrends(agentId: string, params?: { dateFrom?: string; dateTo?: string; granularity?: string }): Promise<ApiResponse<any>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(agentId);

    let url = API_ENDPOINTS.AGENT_ANALYTICS.TRENDS(agentId);
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);
      if (params.granularity) queryParams.append('granularity', params.granularity);

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return this.request<any>(url);
  }

  async getAgentTargets(agentId: string): Promise<ApiResponse<any>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(agentId);

    return this.request<any>(API_ENDPOINTS.AGENT_ANALYTICS.TARGETS(agentId));
  }

  async setAgentTargets(agentId: string, targets: any): Promise<ApiResponse<any>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(agentId);

    return this.request<any>(API_ENDPOINTS.AGENT_ANALYTICS.TARGETS(agentId), {
      method: 'POST',
      body: JSON.stringify(targets),
    });
  }

  async updateAgentTargets(agentId: string, targetId: string, targets: any): Promise<ApiResponse<any>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(agentId);

    if (!this.isValidUUID(targetId)) {
      throw createApiError('Invalid target ID format', 400, 'VALIDATION_ERROR', { field: 'targetId' });
    }

    return this.request<any>(`${API_ENDPOINTS.AGENT_ANALYTICS.TARGETS(agentId)}/${targetId}`, {
      method: 'PUT',
      body: JSON.stringify(targets),
    });
  }

  async getAgentComparison(agentId: string, params?: { compareWith?: string[]; dateFrom?: string; dateTo?: string }): Promise<ApiResponse<any>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(agentId);

    let url = API_ENDPOINTS.AGENT_ANALYTICS.COMPARISON(agentId);
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.compareWith) {
        // Validate all comparison agent IDs and ensure they belong to the user
        for (const id of params.compareWith) {
          await this.validateAgentOwnership(id);
          queryParams.append('compareWith', id);
        }
      }
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return this.request<any>(url);
  }

  async getAgentRanking(agentId: string, params?: { metric?: string; dateFrom?: string; dateTo?: string }): Promise<ApiResponse<any>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(agentId);

    let url = API_ENDPOINTS.AGENT_ANALYTICS.RANKING(agentId);
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.metric) queryParams.append('metric', params.metric);
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return this.request<any>(url);
  }

  async getAgentRealtimeStats(agentId: string): Promise<ApiResponse<any>> {
    // Validate user context and agent ownership before making request
    await this.validateAgentOwnership(agentId);

    return this.request<any>(API_ENDPOINTS.AGENT_ANALYTICS.REALTIME(agentId));
  }

  // Contact API methods
  async getContacts(options?: ContactsListOptions): Promise<ApiResponse<Contact[] | { contacts: Contact[]; pagination: any }>> {
    let url = API_ENDPOINTS.CONTACTS.LIST;

    if (options) {
      const queryParams = new URLSearchParams();
      if (options.search) queryParams.append('search', options.search);
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return this.request<Contact[] | { contacts: Contact[]; pagination: any }>(url);
  }

  async createContact(contactData: CreateContactRequest): Promise<ApiResponse<Contact>> {
    return this.request<Contact>(API_ENDPOINTS.CONTACTS.CREATE, {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  }

  async updateContact(id: string, contactData: UpdateContactRequest): Promise<ApiResponse<Contact>> {
    return this.request<Contact>(API_ENDPOINTS.CONTACTS.UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  }

  async deleteContact(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.CONTACTS.DELETE(id), {
      method: 'DELETE',
    });
  }

  async getContact(id: string): Promise<ApiResponse<Contact>> {
    return this.request<Contact>(API_ENDPOINTS.CONTACTS.GET(id));
  }

  async uploadContacts(file: File): Promise<ApiResponse<ContactUploadResult>> {
    console.log('Preparing file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: file.lastModified,
      uploadEndpoint: API_ENDPOINTS.CONTACTS.UPLOAD
    });

    const formData = new FormData();
    formData.append('file', file);

    // Debug FormData contents
    console.log('FormData created:', {
      hasFile: formData.has('file'),
      entries: Array.from(formData.entries()).map(([key, value]) => ({
        key,
        valueType: typeof value,
        isFile: value instanceof File,
        fileName: value instanceof File ? value.name : 'not a file'
      }))
    });

    console.log('Making upload request to:', API_ENDPOINTS.CONTACTS.UPLOAD);

    return this.request<ContactUploadResult>(API_ENDPOINTS.CONTACTS.UPLOAD, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it for FormData with boundary
      // Don't set empty headers object - let the request method add auth headers
    });
  }

  async getContactStats(): Promise<ApiResponse<ContactStats>> {
    return this.request<ContactStats>(API_ENDPOINTS.CONTACTS.STATS);
  }

  async lookupContact(phone: string): Promise<ApiResponse<ContactLookupResult>> {
    return this.request<ContactLookupResult>(API_ENDPOINTS.CONTACTS.LOOKUP(phone));
  }

  async batchLookupContacts(request: BatchContactLookupRequest): Promise<ApiResponse<BatchContactLookupResult>> {
    return this.request<BatchContactLookupResult>(API_ENDPOINTS.CONTACTS.BATCH_LOOKUP, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async downloadContactTemplate(): Promise<Blob> {
    const response = await fetch(API_ENDPOINTS.CONTACTS.TEMPLATE, {
      headers: getAuthHeaders(),
    });
    return response.blob();
  }

  // Call API methods with agent context
  async getCalls(options?: CallListOptions & { agentId?: string }): Promise<ApiResponse<CallListResponse>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to access call data', 401, 'UNAUTHORIZED');
    }

    let url = API_ENDPOINTS.CALLS.LIST;
    const targetAgentId = options?.agentId || this.currentAgentId;

    if (options) {
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    // Validate agent ownership if agentId is specified
    if (targetAgentId) {
      await this.validateAgentOwnership(targetAgentId);
    }

    return this.request<Call[] | { calls: Call[]; pagination: any }>(url, { 
      agentId: targetAgentId,
      includeAgentId: !!targetAgentId 
    });
  }

  async getCall(id: string, agentId?: string): Promise<ApiResponse<Call>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to access call data', 401, 'UNAUTHORIZED');
    }

    // Validate call ID format
    if (!this.isValidUUID(id)) {
      throw createApiError('Invalid call ID format', 400, 'VALIDATION_ERROR', { field: 'callId' });
    }

    const targetAgentId = agentId || this.currentAgentId;
    
    // Validate agent ownership if agentId is specified
    if (targetAgentId) {
      await this.validateAgentOwnership(targetAgentId);
    }

    return this.request<Call>(API_ENDPOINTS.CALLS.GET(id), { 
      agentId: targetAgentId,
      includeAgentId: !!targetAgentId 
    });
  }

  async getCallTranscript(id: string): Promise<ApiResponse<Transcript>> {
    return this.request<Transcript>(API_ENDPOINTS.CALLS.TRANSCRIPT(id));
  }

  async getCallRecording(id: string): Promise<ApiResponse<{ url: string }>> {
    return this.request<{ url: string }>(API_ENDPOINTS.CALLS.RECORDING(id));
  }

  async searchCalls(query: string, options?: { limit?: number; offset?: number }): Promise<ApiResponse<CallSearchResult>> {
    const queryParams = new URLSearchParams({ q: query });
    if (options?.limit) queryParams.append('limit', options.limit.toString());
    if (options?.offset) queryParams.append('offset', options.offset.toString());

    return this.request<CallSearchResult>(`${API_ENDPOINTS.CALLS.SEARCH}?${queryParams.toString()}`);
  }

  async searchTranscripts(query: string, options?: { limit?: number; offset?: number }): Promise<ApiResponse<TranscriptSearchResult>> {
    const queryParams = new URLSearchParams({ q: query });
    if (options?.limit) queryParams.append('limit', options.limit.toString());
    if (options?.offset) queryParams.append('offset', options.offset.toString());

    return this.request<TranscriptSearchResult>(`${API_ENDPOINTS.CALLS.SEARCH_TRANSCRIPTS}?${queryParams.toString()}`);
  }

  async getCallStats(period?: 'day' | 'week' | 'month', agentId?: string): Promise<ApiResponse<CallStatistics>> {
    const queryParams = period ? `?period=${period}` : '';
    const targetAgentId = agentId || this.currentAgentId;
    
    // Validate agent ownership if agentId is specified
    if (targetAgentId) {
      await this.validateAgentOwnership(targetAgentId);
    }

    return this.request<CallStatistics>(`${API_ENDPOINTS.CALLS.STATS}${queryParams}`, { 
      agentId: targetAgentId,
      includeAgentId: !!targetAgentId 
    });
  }

  async getRecentCalls(limit: number = 10): Promise<ApiResponse<Call[]>> {
    return this.request<Call[]>(`${API_ENDPOINTS.CALLS.RECENT}?limit=${limit}`);
  }

  // Lead API methods
  async getLeads(options?: {
    search?: string;
    leadType?: string;
    businessType?: string;
    leadTag?: string;
    platform?: string;
    agent?: string;
    startDate?: string;
    endDate?: string;
    engagementLevel?: string;
    intentLevel?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse<Lead[] | { data: Lead[]; pagination: any }>> {
    let url = API_ENDPOINTS.LEADS.LIST;

    if (options) {
      const queryParams = new URLSearchParams();
      if (options.search) queryParams.append('search', options.search);
      if (options.leadType) queryParams.append('leadType', options.leadType);
      if (options.businessType) queryParams.append('businessType', options.businessType);
      if (options.leadTag) queryParams.append('leadTag', options.leadTag);
      if (options.platform) queryParams.append('platform', options.platform);
      if (options.agent) queryParams.append('agent', options.agent);
      if (options.startDate) queryParams.append('startDate', options.startDate);
      if (options.endDate) queryParams.append('endDate', options.endDate);
      if (options.engagementLevel) queryParams.append('engagementLevel', options.engagementLevel);
      if (options.intentLevel) queryParams.append('intentLevel', options.intentLevel);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.sortOrder) queryParams.append('sortOrder', options.sortOrder);

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return this.request<{ data: Lead[]; pagination: any }>(url);
  }

  async getLead(id: string): Promise<ApiResponse<Lead>> {
    return this.request<Lead>(API_ENDPOINTS.LEADS.GET(id));
  }

  async getLeadProfile(id: string): Promise<ApiResponse<LeadProfile>> {
    return this.request<LeadProfile>(`${API_ENDPOINTS.LEADS.GET(id)}/profile`);
  }

  async getLeadTimeline(id: string): Promise<ApiResponse<LeadProfile['timeline']>> {
    return this.request<LeadProfile['timeline']>(`${API_ENDPOINTS.LEADS.GET(id)}/timeline`);
  }

  async getLeadAnalytics(): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request<Record<string, unknown>>(API_ENDPOINTS.LEADS.ANALYTICS);
  }

  // Lead Intelligence API methods
  async getLeadIntelligence(): Promise<ApiResponse<any[]>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to access lead intelligence', 401, 'UNAUTHORIZED');
    }

    return this.request<any[]>(API_ENDPOINTS.LEADS.INTELLIGENCE);
  }

  async getLeadIntelligenceTimeline(groupId: string): Promise<ApiResponse<any[]>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to access lead timeline', 401, 'UNAUTHORIZED');
    }

    return this.request<any[]>(API_ENDPOINTS.LEADS.INTELLIGENCE_TIMELINE(groupId));
  }

  // Follow-up API methods
  async getFollowUps(params?: { completed?: boolean; leadPhone?: string; leadEmail?: string }): Promise<ApiResponse<any[]>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to access follow-ups', 401, 'UNAUTHORIZED');
    }

    let url = API_ENDPOINTS.FOLLOW_UPS.LIST;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.completed !== undefined) queryParams.append('completed', params.completed.toString());
      if (params.leadPhone) queryParams.append('leadPhone', params.leadPhone);
      if (params.leadEmail) queryParams.append('leadEmail', params.leadEmail);
      
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    return this.request<any[]>(url);
  }

  async createFollowUp(followUpData: any): Promise<ApiResponse<any>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to create follow-ups', 401, 'UNAUTHORIZED');
    }

    return this.request<any>(API_ENDPOINTS.FOLLOW_UPS.CREATE, {
      method: 'POST',
      body: JSON.stringify(followUpData),
    });
  }

  async updateFollowUp(id: string, followUpData: any): Promise<ApiResponse<any>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to update follow-ups', 401, 'UNAUTHORIZED');
    }

    return this.request<any>(API_ENDPOINTS.FOLLOW_UPS.UPDATE(id), {
      method: 'PUT',
      body: JSON.stringify(followUpData),
    });
  }

  async completeFollowUp(id: string): Promise<ApiResponse<any>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to complete follow-ups', 401, 'UNAUTHORIZED');
    }

    return this.request<any>(API_ENDPOINTS.FOLLOW_UPS.COMPLETE(id), {
      method: 'PATCH',
    });
  }

  async deleteFollowUp(id: string): Promise<ApiResponse<void>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to delete follow-ups', 401, 'UNAUTHORIZED');
    }

    return this.request<void>(API_ENDPOINTS.FOLLOW_UPS.DELETE(id), {
      method: 'DELETE',
    });
  }

  async updateFollowUpStatus(statusData: { leadPhone?: string; leadEmail?: string; status: string }): Promise<ApiResponse<any>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to update follow-up status', 401, 'UNAUTHORIZED');
    }

    return this.request<any>(`${API_ENDPOINTS.FOLLOW_UPS.LIST}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    });
  }

  async scheduleDemo(demoData: { contactId: string; demoDate: string; leadPhone?: string; leadEmail?: string }): Promise<ApiResponse<any>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to schedule demos', 401, 'UNAUTHORIZED');
    }

    return this.request<any>('/api/demos/schedule', {
      method: 'POST',
      body: JSON.stringify(demoData),
    });
  }

  async convertToCustomer(leadData: { id: string; name: string; email?: string; phone?: string; company?: string; source?: string }, customerData?: { name?: string; email?: string; phone?: string; company?: string; status?: string; originalLeadSource?: string; assignedSalesRep?: string; notes?: string }): Promise<ApiResponse<any>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to convert customers', 401, 'UNAUTHORIZED');
    }

    const requestData = {
      contactId: leadData.id,
      name: customerData?.name || leadData.name,
      email: customerData?.email || leadData.email,
      phone: customerData?.phone || leadData.phone,
      company: customerData?.company || leadData.company,
      originalLeadSource: customerData?.originalLeadSource || leadData.source || 'Lead Conversion',
      assignedSalesRep: customerData?.assignedSalesRep,
      notes: customerData?.notes || ''
    };

    return this.request<any>('/api/customers/convert', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  // Customer management API methods
  async getCustomers(params?: { status?: string; limit?: number; offset?: number }): Promise<ApiResponse<any>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to get customers', 401, 'UNAUTHORIZED');
    }

    let url = '/api/customers';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<any>(url, {
      method: 'GET',
    });
  }

  async getCustomer(customerId: string): Promise<ApiResponse<any>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to get customer details', 401, 'UNAUTHORIZED');
    }

    return this.request<any>(`/api/customers/${customerId}`, {
      method: 'GET',
    });
  }

  async updateCustomer(customerId: string, updateData: { status?: string; notes?: string; [key: string]: any }): Promise<ApiResponse<any>> {
    // Validate user context before making request
    const user = this.getCurrentUser();
    if (!user) {
      throw createApiError('User must be authenticated to update customers', 401, 'UNAUTHORIZED');
    }

    return this.request<any>(`/api/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  // Call Analytics API methods with optional agent filtering
  async getCallAnalyticsKPIs(params?: { dateFrom?: string; dateTo?: string; agentId?: string }): Promise<ApiResponse<any>> {
    let url = API_ENDPOINTS.CALL_ANALYTICS.KPIS;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);

      // Add agent filtering with ownership validation
      if (params.agentId) {
        // Validate user context and agent ownership before making request
        await this.validateAgentOwnership(params.agentId);
        queryParams.append('agentId', params.agentId);
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    return this.request<any>(url);
  }

  async getCallAnalyticsLeadQuality(params?: { dateFrom?: string; dateTo?: string; agentId?: string }): Promise<ApiResponse<any>> {
    let url = API_ENDPOINTS.CALL_ANALYTICS.LEAD_QUALITY;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);

      // Add agent filtering with ownership validation
      if (params.agentId) {
        // Validate user context and agent ownership before making request
        await this.validateAgentOwnership(params.agentId);
        queryParams.append('agentId', params.agentId);
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    return this.request<any>(url);
  }

  async getCallAnalyticsFunnel(params?: { dateFrom?: string; dateTo?: string; agentId?: string }): Promise<ApiResponse<any>> {
    let url = API_ENDPOINTS.CALL_ANALYTICS.FUNNEL;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);

      // Add agent filtering with ownership validation
      if (params.agentId) {
        // Validate user context and agent ownership before making request
        await this.validateAgentOwnership(params.agentId);
        queryParams.append('agentId', params.agentId);
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    return this.request<any>(url);
  }

  async getCallAnalyticsIntentBudget(params?: { dateFrom?: string; dateTo?: string; agentId?: string }): Promise<ApiResponse<any>> {
    let url = API_ENDPOINTS.CALL_ANALYTICS.INTENT_BUDGET;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);

      // Add agent filtering with ownership validation
      if (params.agentId) {
        // Validate user context and agent ownership before making request
        await this.validateAgentOwnership(params.agentId);
        queryParams.append('agentId', params.agentId);
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    return this.request<any>(url);
  }

  // ============================================================================
  // ADMIN API METHODS - Comprehensive admin functionality integration
  // ============================================================================

  // Admin Dashboard
  async getAdminDashboard(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ADMIN.SYSTEM_STATS);
  }

  async getAdminSystemStats(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ADMIN.SYSTEM_STATS);
  }

  // Admin User Management
  async getAdminUsers(options: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(options).toString();
    const url = queryString ? `/admin/users?${queryString}` : '/admin/users';
    return this.request<any>(url);
  }

  async getAdminUser(userId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/users/${userId}`);
  }

  async updateAdminUser(userId: string, userData: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteAdminUser(userId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async adjustUserCredits(userId: string, adjustment: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/users/${userId}/credits`, {
      method: 'POST',
      body: JSON.stringify(adjustment),
    });
  }

  async getUserCreditHistory(userId: string, options: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(options).toString();
    const url = queryString ?
      `/admin/users/${userId}/credits/history?${queryString}` :
      `/admin/users/${userId}/credits/history`;
    return this.request<any>(url);
  }

  // Admin Agent Management
  async getAdminAgents(options: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(options).toString();
    const url = queryString ? `/admin/agents?${queryString}` : '/admin/agents';
    return this.request<any>(url);
  }

  async getAdminAgent(agentId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/agents/${agentId}`);
  }

  async updateAdminAgent(agentId: string, agentData: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(agentData),
    });
  }

  async deleteAdminAgent(agentId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/agents/${agentId}`, {
      method: 'DELETE',
    });
  }

  async bulkAgentAction(request: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/agents/bulk', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getAgentStats(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ADMIN.AGENTS_STATS);
  }

  async getAgentMonitoring(timeframe: string = '24h'): Promise<ApiResponse<any>> {
    return this.request<any>(`${API_ENDPOINTS.ADMIN.AGENTS_MONITOR}?timeframe=${timeframe}`);
  }

  async getAgentHealthCheck(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ADMIN.AGENTS_HEALTH);
  }

  // Admin Audit Logs
  async getAdminAuditLogs(options: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(options).toString();
    const url = queryString ? `${API_ENDPOINTS.ADMIN.AUDIT_LOGS}?${queryString}` : API_ENDPOINTS.ADMIN.AUDIT_LOGS;
    return this.request<any>(url);
  }

  async getAdminAuditLog(logId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`${API_ENDPOINTS.ADMIN.AUDIT_LOGS}/${logId}`);
  }

  async getAuditStats(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ADMIN.AUDIT_STATS);
  }

  // Admin Configuration
  async getAPIKeys(): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/config/api-keys');
  }

  async updateAPIKey(keyId: string, config: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/config/api-keys/${keyId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async createAPIKey(config: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/config/api-keys', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async deleteAPIKey(keyId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/config/api-keys/${keyId}`, {
      method: 'DELETE',
    });
  }

  async getFeatureFlags(): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/config/feature-flags');
  }

  async updateFeatureFlag(flagId: string, config: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/config/feature-flags/${flagId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async bulkUpdateFeatureFlags(updates: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/config/feature-flags/bulk', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getSystemConfig(): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/config/system');
  }

  async updateSystemConfig(config: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/config/system', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // Admin Communication
  async getAdminMessages(options: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(options).toString();
    const url = queryString ? `/admin/messages?${queryString}` : '/admin/messages';
    return this.request<any>(url);
  }

  async sendAdminMessage(message: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  async updateAdminMessage(messageId: string, update: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  async deleteAdminMessage(messageId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/admin/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  async createAnnouncement(announcement: any): Promise<ApiResponse<any>> {
    return this.request<any>('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(announcement),
    });
  }

  async getAnnouncements(options: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(options).toString();
    const url = queryString ? `/admin/announcements?${queryString}` : '/admin/announcements';
    return this.request<any>(url);
  }

  async getSupportTickets(options: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(options).toString();
    const url = queryString ? `/admin/support/tickets?${queryString}` : '/admin/support/tickets';
    return this.request<any>(url);
  }

  async updateSupportTicket(ticketId: string, update: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/admin/support/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  }

  // Admin Analytics
  async getSystemAnalytics(filters: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(filters).toString();
    const url = queryString ? `/admin/analytics/system?${queryString}` : '/admin/analytics/system';
    return this.request<any>(url);
  }

  async getRealtimeMetrics(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ADMIN.ANALYTICS_REALTIME);
  }

  async getUsagePatterns(filters: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(filters).toString();
    const url = queryString ? `/admin/analytics/usage?${queryString}` : '/admin/analytics/usage';
    return this.request<any>(url);
  }

  // Admin Reports
  async getAdminReports(options: any = {}): Promise<ApiResponse<any>> {
    const queryString = new URLSearchParams(options).toString();
    const url = queryString ? `/admin/reports?${queryString}` : '/admin/reports';
    return this.request<any>(url);
  }

  async generateAdminReport(reportConfig: any): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ADMIN.REPORTS_GENERATE, {
      method: 'POST',
      body: JSON.stringify(reportConfig),
    });
  }

  async downloadAdminReport(reportId: string): Promise<Blob> {
    const response = await fetch(API_ENDPOINTS.ADMIN.REPORTS_DOWNLOAD(reportId), {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to download report: ${response.statusText}`);
    }

    return response.blob();
  }

  async exportAdminData(exportConfig: any): Promise<Blob> {
    const response = await fetch(API_ENDPOINTS.ADMIN.ANALYTICS_EXPORT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(exportConfig),
    });

    if (!response.ok) {
      throw new Error(`Failed to export data: ${response.statusText}`);
    }

    return response.blob();
  }

  // Admin Validation
  async validateAdminAccess(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ADMIN.VALIDATE);
  }

  async getAdminProfile(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.ADMIN.PROFILE);
  }

  async getCallAnalyticsSourceBreakdown(params?: { dateFrom?: string; dateTo?: string; agentId?: string }): Promise<ApiResponse<any>> {
    let url = API_ENDPOINTS.CALL_ANALYTICS.SOURCE_BREAKDOWN;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);

      // Add agent filtering with ownership validation
      if (params.agentId) {
        // Validate agent ID format before making request
        if (!this.isValidUUID(params.agentId)) {
          throw createApiError('Invalid agent ID format', 400, 'VALIDATION_ERROR', { field: 'agentId' });
        }
        queryParams.append('agentId', params.agentId);
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    return this.request<any>(url);
  }

  async getCallSourceAnalytics(params?: { dateFrom?: string; dateTo?: string; agentId?: string }): Promise<ApiResponse<any>> {
    let url = API_ENDPOINTS.CALL_ANALYTICS.CALL_SOURCE_ANALYTICS;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);

      // Add agent filtering with ownership validation
      if (params.agentId) {
        // Validate agent ID format before making request
        if (!this.isValidUUID(params.agentId)) {
          throw createApiError('Invalid agent ID format', 400, 'VALIDATION_ERROR', { field: 'agentId' });
        }
        queryParams.append('agentId', params.agentId);
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }
    return this.request<any>(url);
  }

  async getCallAnalyticsSummary(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.CALL_ANALYTICS.SUMMARY);
  }

  // Dashboard API methods with agent context
  async getDashboardOverview(agentId?: string): Promise<ApiResponse<DashboardOverview>> {
    const targetAgentId = agentId || this.currentAgentId;
    
    // Validate agent ownership if agentId is specified
    if (targetAgentId) {
      await this.validateAgentOwnership(targetAgentId);
    }

    return this.request<DashboardOverview>(API_ENDPOINTS.DASHBOARD.OVERVIEW, { 
      agentId: targetAgentId,
      includeAgentId: !!targetAgentId 
    });
  }

  async getDashboardAnalytics(agentId?: string): Promise<ApiResponse<DashboardAnalytics>> {
    const targetAgentId = agentId || this.currentAgentId;
    
    // Validate agent ownership if agentId is specified
    if (targetAgentId) {
      await this.validateAgentOwnership(targetAgentId);
    }

    return this.request<DashboardAnalytics>(API_ENDPOINTS.DASHBOARD.ANALYTICS, { 
      agentId: targetAgentId,
      includeAgentId: !!targetAgentId 
    });
  }

  // Billing API methods
  async getCredits(): Promise<ApiResponse<CreditBalance>> {
    return this.request<CreditBalance>(API_ENDPOINTS.BILLING.CREDITS);
  }

  async getCreditStats(): Promise<ApiResponse<CreditStats>> {
    return this.request<CreditStats>(API_ENDPOINTS.BILLING.STATS);
  }

  async getBillingHistory(page: number = 1, limit: number = 20): Promise<ApiResponse<BillingHistory>> {
    return this.request<BillingHistory>(`${API_ENDPOINTS.BILLING.HISTORY}?page=${page}&limit=${limit}`);
  }

  async purchaseCredits(request: PurchaseCreditsRequest): Promise<ApiResponse<PurchaseCreditsResponse>> {
    return this.request<PurchaseCreditsResponse>(API_ENDPOINTS.BILLING.PURCHASE, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async confirmPayment(paymentIntentId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`${API_ENDPOINTS.BILLING.PURCHASE}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId }),
    });
  }

  async getPricing(): Promise<ApiResponse<PricingConfig>> {
    return this.request<PricingConfig>(API_ENDPOINTS.BILLING.PRICING);
  }

  async getPaymentHistory(limit: number = 10): Promise<ApiResponse<PaymentHistory>> {
    return this.request<PaymentHistory>(`${API_ENDPOINTS.BILLING.PAYMENT_HISTORY}?limit=${limit}`);
  }

  async checkCredits(requiredCredits?: number): Promise<ApiResponse<CreditCheckResponse>> {
    const queryParams = requiredCredits ? `?requiredCredits=${requiredCredits}` : '';
    return this.request<CreditCheckResponse>(`${API_ENDPOINTS.BILLING.CHECK}${queryParams}`);
  }

  // Authentication API methods
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    // Backend returns the response directly, not wrapped in a data property
    return response as unknown as AuthResponse;
  }

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
      skipAuth: true,
    });
    // Backend returns the response directly, not wrapped in a data property
    return response as unknown as AuthResponse;
  }

  async validateToken(): Promise<TokenValidationResponse> {
    const response = await this.request<TokenValidationResponse>(API_ENDPOINTS.AUTH.VALIDATE, {
      method: 'GET', // Changed to GET since no body is needed
    });
    // Backend returns the response directly, not wrapped in a data property
    return response as unknown as TokenValidationResponse;
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>(API_ENDPOINTS.AUTH.PROFILE);
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.AUTH.LOGOUT, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Analytics API methods
  async getCallAnalytics(callId: string): Promise<ApiResponse<LeadAnalyticsData>> {
    return this.request<LeadAnalyticsData>(API_ENDPOINTS.ANALYTICS.CALLS(callId));
  }

  async getAnalyticsLeads(params?: { limit?: number; offset?: number }): Promise<ApiResponse<LeadAnalyticsData>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.ANALYTICS.LEADS}?${queryParams.toString()}`
      : API_ENDPOINTS.ANALYTICS.LEADS;

    return this.request<LeadAnalyticsData>(url);
  }

  async getAnalyticsSummary(params?: { dateFrom?: string; dateTo?: string }): Promise<ApiResponse<AnalyticsMetrics>> {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.ANALYTICS.SUMMARY}?${queryParams.toString()}`
      : API_ENDPOINTS.ANALYTICS.SUMMARY;

    return this.request<AnalyticsMetrics>(url);
  }

  async getScoreDistribution(): Promise<ApiResponse<ScoreDistribution>> {
    return this.request<ScoreDistribution>(API_ENDPOINTS.ANALYTICS.SCORE_DISTRIBUTION);
  }

  async getDashboardMetrics(params?: { dateFrom?: string; dateTo?: string }): Promise<ApiResponse<AnalyticsMetrics>> {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.ANALYTICS.DASHBOARD.METRICS}?${queryParams.toString()}`
      : API_ENDPOINTS.ANALYTICS.DASHBOARD.METRICS;

    return this.request<AnalyticsMetrics>(url);
  }

  async getCallVolumeData(params?: { dateFrom?: string; dateTo?: string; groupBy?: 'day' | 'week' | 'month' }): Promise<ApiResponse<CallVolumeData>> {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.ANALYTICS.DASHBOARD.CALL_VOLUME}?${queryParams.toString()}`
      : API_ENDPOINTS.ANALYTICS.DASHBOARD.CALL_VOLUME;

    return this.request<CallVolumeData>(url);
  }

  async getLeadTrends(params?: { dateFrom?: string; dateTo?: string; groupBy?: 'day' | 'week' | 'month' }): Promise<ApiResponse<LeadTrendsData>> {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.ANALYTICS.DASHBOARD.LEAD_TRENDS}?${queryParams.toString()}`
      : API_ENDPOINTS.ANALYTICS.DASHBOARD.LEAD_TRENDS;

    return this.request<LeadTrendsData>(url);
  }

  async getCTATrends(params?: { dateFrom?: string; dateTo?: string; groupBy?: 'day' | 'week' | 'month' }): Promise<ApiResponse<CTATrendsData>> {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.ANALYTICS.DASHBOARD.CTA_TRENDS}?${queryParams.toString()}`
      : API_ENDPOINTS.ANALYTICS.DASHBOARD.CTA_TRENDS;

    return this.request<CTATrendsData>(url);
  }

  async getTopPerformingAgents(params?: { dateFrom?: string; dateTo?: string; limit?: number }): Promise<ApiResponse<TopPerformingAgents>> {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.ANALYTICS.DASHBOARD.TOP_AGENTS}?${queryParams.toString()}`
      : API_ENDPOINTS.ANALYTICS.DASHBOARD.TOP_AGENTS;

    return this.request<TopPerformingAgents>(url);
  }

  // Transcript API methods
  async searchTranscriptsAdvanced(params?: { query?: string; limit?: number; offset?: number }): Promise<ApiResponse<TranscriptSearchResult>> {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.append('query', params.query);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = queryParams.toString()
      ? `${API_ENDPOINTS.TRANSCRIPTS.SEARCH}?${queryParams.toString()}`
      : API_ENDPOINTS.TRANSCRIPTS.SEARCH;

    return this.request<TranscriptSearchResult>(url);
  }

  async getTranscriptAnalytics(): Promise<ApiResponse<TranscriptAnalytics>> {
    return this.request<TranscriptAnalytics>(API_ENDPOINTS.TRANSCRIPTS.ANALYTICS);
  }

  async getTranscriptByCallId(callId: string): Promise<ApiResponse<Transcript>> {
    return this.request<Transcript>(API_ENDPOINTS.TRANSCRIPTS.BY_CALL(callId));
  }

  async exportTranscript(callId: string): Promise<ApiResponse<{ url: string; format: string }>> {
    return this.request<{ url: string; format: string }>(API_ENDPOINTS.TRANSCRIPTS.EXPORT(callId));
  }

  async getFormattedTranscript(callId: string): Promise<ApiResponse<{ content: string; format: string }>> {
    return this.request<{ content: string; format: string }>(API_ENDPOINTS.TRANSCRIPTS.FORMATTED(callId));
  }

  // User management API methods
  async initializeUser(): Promise<ApiResponse<User>> {
    return this.request<User>(API_ENDPOINTS.USER.INITIALIZE, {
      method: 'POST',
    });
  }

  async getUserProfile(): Promise<ApiResponse<User>> {
    return this.request<User>(API_ENDPOINTS.USER.PROFILE);
  }

  async updateUserProfile(userData: UserProfileUpdate): Promise<ApiResponse<User>> {
    // Validate input data before sending
    const validatedData = this.validateUserProfileData(userData);

    return this.request<User>(API_ENDPOINTS.USER.PROFILE, {
      method: 'PUT',
      body: JSON.stringify(validatedData),
    });
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    // Validate input
    if (!currentPassword || !newPassword) {
      throw createApiError('Current password and new password are required', 400, 'VALIDATION_ERROR');
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      throw createApiError('Passwords must be strings', 400, 'VALIDATION_ERROR');
    }

    if (newPassword.length < 6) {
      throw createApiError('New password must be at least 6 characters long', 400, 'VALIDATION_ERROR');
    }

    if (currentPassword === newPassword) {
      throw createApiError('New password must be different from current password', 400, 'VALIDATION_ERROR');
    }

    return this.request<{ message: string }>(API_ENDPOINTS.USER.UPDATE_PASSWORD, {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
  }

  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return this.request<UserStats>(API_ENDPOINTS.USER.STATS);
  }

  async getUserCredits(): Promise<ApiResponse<CreditBalance>> {
    return this.request<CreditBalance>(API_ENDPOINTS.USER.CREDITS);
  }

  async checkUserCredits(requiredCredits?: number): Promise<ApiResponse<CreditCheckResponse>> {
    const queryParams = requiredCredits ? `?requiredCredits=${requiredCredits}` : '';
    return this.request<CreditCheckResponse>(`${API_ENDPOINTS.USER.CHECK_CREDITS}${queryParams}`);
  }

  async deleteUserAccount(): Promise<ApiResponse<void>> {
    return this.request<void>(API_ENDPOINTS.USER.DELETE_ACCOUNT, {
      method: 'DELETE',
    });
  }

  // Notification API methods
  async getNotifications(): Promise<ApiResponse<NotificationResponse>> {
    return this.request<NotificationResponse>(API_ENDPOINTS.NOTIFICATIONS.LIST);
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId), {
      method: 'PATCH',
    });
  }

  // Method to get the streamable URL for call audio
  getCallAudioUrl(callId: string): string {
    return API_ENDPOINTS.CALLS.AUDIO(callId);
  }

  // Method to get the call audio as a Blob for authenticated playback
  async getCallAudioBlob(callId: string): Promise<Blob> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(API_ENDPOINTS.CALLS.AUDIO(callId), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Try to parse error response as JSON, otherwise throw plain text
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // Not a JSON response
      }
      const errorMessage = errorJson?.message || errorJson?.error || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return response.blob();
  }

  // Email API methods
  async sendEmailVerification(): Promise<ApiResponse<EmailVerificationResponse>> {
    return this.request<EmailVerificationResponse>(API_ENDPOINTS.EMAIL.VERIFY, {
      method: 'POST',
    });
  }

  async verifyEmail(token: string): Promise<ApiResponse<EmailVerificationResponse>> {
    return this.request<EmailVerificationResponse>(API_ENDPOINTS.EMAIL.VERIFY, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async sendPasswordReset(email: string): Promise<ApiResponse<PasswordResetResponse>> {
    return this.request<PasswordResetResponse>(API_ENDPOINTS.EMAIL.SEND_PASSWORD_RESET, {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<PasswordResetResponse>> {
    return this.request<PasswordResetResponse>(API_ENDPOINTS.EMAIL.RESET_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
      skipAuth: true,
    });
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await this.request<RefreshTokenResponse>(API_ENDPOINTS.AUTH.REFRESH, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      skipAuth: true,
    });
    // Backend returns the response directly, not wrapped in a data property
    return response as unknown as RefreshTokenResponse;
  }
}

// Create and configure the API service instance
const apiService = new ApiService();

// Add authentication error interceptor for automatic logout
apiService.addErrorInterceptor(async (error: ApiServiceError) => {
  // Handle authentication errors with automatic logout
  if (error.code === 'UNAUTHORIZED' || error.code === 'TOKEN_EXPIRED') {
    // Clear token and redirect to login
    localStorage.removeItem('auth_token');

    // Trigger auth error handler if available
    const authErrorEvent = new CustomEvent('auth-error', { detail: error });
    window.dispatchEvent(authErrorEvent);
  }

  // Return the error for further processing
  return error;
});

// Add request interceptor for automatic token attachment
apiService.addRequestInterceptor(async (config: RequestConfig) => {
  // Skip auth for certain endpoints
  if (config.skipAuth) {
    return config;
  }

  // Add auth token to headers
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

// Add response interceptor for token refresh handling
apiService.addResponseInterceptor(async <T>(response: ApiResponse<T>) => {
  // Check if response contains a new token (for token refresh scenarios)
  if (response && typeof response === 'object' && 'token' in response) {
    const newToken = (response as any).token;
    if (newToken && typeof newToken === 'string') {
      localStorage.setItem('auth_token', newToken);
    }
  }

  return response;
});

export { apiService };
export default apiService;
