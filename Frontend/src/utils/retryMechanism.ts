/**
 * Enhanced retry mechanism for API requests with exponential backoff,
 * jitter, and rate limiting support
 */

import React from 'react';
import { isRetryableError, getErrorMapping } from './errorMapping';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryState {
  attempt: number;
  lastError: any;
  nextRetryAt?: Date;
  isRetrying: boolean;
}

export interface ManualRetryOptions {
  operation: () => Promise<any>;
  config?: Partial<RetryConfig>;
  onStateChange?: (state: RetryState) => void;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  exponentialBase: 2,
  jitter: true,
  retryCondition: (error: any) => {
    // Check if error is retryable based on error code
    if (error?.code) {
      return isRetryableError(error.code);
    }
    
    // Check HTTP status codes
    if (error?.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status);
    }
    
    // Network errors are retryable
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    
    return false;
  },
};

/**
 * Calculate delay for next retry attempt with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.exponentialBase, attempt - 1);
  let delay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter to prevent thundering herd
  if (config.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }
  
  return Math.floor(delay);
}

/**
 * Handle rate limiting with proper backoff
 */
function handleRateLimit(error: any): number {
  // Check for Retry-After header
  if (error?.headers?.['retry-after']) {
    const retryAfter = parseInt(error.headers['retry-after'], 10);
    if (!isNaN(retryAfter)) {
      return retryAfter * 1000; // Convert to milliseconds
    }
  }
  
  // Check for rate limit error code
  if (error?.code === 'RATE_LIMITED') {
    // Use exponential backoff for rate limiting
    return Math.min(5000 + Math.random() * 5000, 30000); // 5-10 seconds with jitter
  }
  
  return 0;
}

/**
 * Enhanced retry mechanism with exponential backoff and jitter
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!finalConfig.retryCondition!(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        throw error;
      }
      
      // Handle rate limiting
      let delay = calculateDelay(attempt, finalConfig);
      const rateLimitDelay = handleRateLimit(error);
      if (rateLimitDelay > 0) {
        delay = rateLimitDelay;
      }
      
      // Call retry callback if provided
      if (finalConfig.onRetry) {
        finalConfig.onRetry(attempt, error);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Manual retry manager for user-initiated retries
 */
export class ManualRetryManager {
  private state: RetryState = {
    attempt: 0,
    lastError: null,
    isRetrying: false,
  };
  
  private config: RetryConfig;
  private onStateChange?: (state: RetryState) => void;
  
  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }
  
  /**
   * Set state change callback
   */
  setStateChangeCallback(callback: (state: RetryState) => void): void {
    this.onStateChange = callback;
  }
  
  /**
   * Get current retry state
   */
  getState(): RetryState {
    return { ...this.state };
  }
  
  /**
   * Execute operation with manual retry capability
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.state.isRetrying = true;
    this.state.attempt++;
    this.notifyStateChange();
    
    try {
      const result = await operation();
      // Don't reset on success, keep attempt count for UI
      this.state.isRetrying = false;
      this.state.lastError = null;
      this.notifyStateChange();
      return result;
    } catch (error) {
      this.state.lastError = error;
      this.state.isRetrying = false;
      
      // Calculate next retry time for UI display
      if (this.canRetry()) {
        const delay = calculateDelay(this.state.attempt, this.config);
        this.state.nextRetryAt = new Date(Date.now() + delay);
      }
      
      this.notifyStateChange();
      throw error;
    }
  }
  
  /**
   * Check if retry is possible
   */
  canRetry(): boolean {
    return (
      this.state.attempt < this.config.maxAttempts &&
      this.state.lastError &&
      this.config.retryCondition!(this.state.lastError) &&
      !this.state.isRetrying
    );
  }
  
  /**
   * Manually trigger retry
   */
  async retry<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.canRetry()) {
      throw new Error('Cannot retry: maximum attempts reached or error not retryable');
    }
    
    return this.execute(operation);
  }
  
  /**
   * Reset retry state
   */
  reset(): void {
    this.state = {
      attempt: 0,
      lastError: null,
      isRetrying: false,
    };
    this.notifyStateChange();
  }
  
  /**
   * Notify state change
   */
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 60000 // 1 minute
  ) {}
  
  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
  
  /**
   * Get current circuit breaker state
   */
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }
  
  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

/**
 * Rate limiter for preventing too many requests
 */
export class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  /**
   * Check if request is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // Check if we can make another request
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get time until next request is allowed
   */
  getTimeUntilReset(): number {
    if (this.requests.length === 0) {
      return 0;
    }
    
    const oldestRequest = Math.min(...this.requests);
    const timeUntilReset = this.windowMs - (Date.now() - oldestRequest);
    
    return Math.max(0, timeUntilReset);
  }
  
  /**
   * Reset rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}

/**
 * Utility function to create a retry-enabled API call
 */
export function createRetryableApiCall<T>(
  apiCall: () => Promise<T>,
  config?: Partial<RetryConfig>
): () => Promise<T> {
  return () => retryWithBackoff(apiCall, config);
}

/**
 * React hook for manual retry functionality
 */
export function useManualRetry(config?: Partial<RetryConfig>) {
  const [retryManager] = React.useState(() => new ManualRetryManager(config));
  
  return {
    execute: retryManager.execute.bind(retryManager),
    retry: retryManager.retry.bind(retryManager),
    canRetry: retryManager.canRetry.bind(retryManager),
    getState: retryManager.getState.bind(retryManager),
    reset: retryManager.reset.bind(retryManager),
    setStateChangeCallback: retryManager.setStateChangeCallback.bind(retryManager),
  };
}

/**
 * Exponential backoff utility
 */
export const exponentialBackoff = {
  /**
   * Calculate delay with exponential backoff
   */
  calculateDelay(attempt: number, baseDelay = 1000, maxDelay = 30000): number {
    const delay = baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
  },
  
  /**
   * Calculate delay with jitter
   */
  calculateDelayWithJitter(attempt: number, baseDelay = 1000, maxDelay = 30000): number {
    const delay = this.calculateDelay(attempt, baseDelay, maxDelay);
    return delay * (0.5 + Math.random() * 0.5);
  },
};