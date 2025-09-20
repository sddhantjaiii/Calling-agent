import React, { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { useManualRetry, type RetryState } from '../utils/retryMechanism';
import { toast } from 'sonner';

interface ApiRetryOptions {
  maxAttempts?: number;
  showToasts?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  onRetry?: (attempt: number) => void;
}

interface ApiRetryResult<T> {
  data: T | null;
  loading: boolean;
  error: any;
  retryState: RetryState;
  canRetry: boolean;
  retry: () => Promise<void>;
  reset: () => void;
  execute: (operation: () => Promise<T>) => Promise<void>;
}

/**
 * Hook for API operations with retry functionality
 */
export function useApiRetry<T>(
  options: ApiRetryOptions = {}
): ApiRetryResult<T> {
  const {
    maxAttempts = 3,
    showToasts = true,
    onSuccess,
    onError,
    onRetry,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [lastOperation, setLastOperation] = useState<(() => Promise<T>) | null>(null);

  const retryManager = useManualRetry({
    maxAttempts,
    baseDelay: 1000,
    maxDelay: 30000,
    exponentialBase: 2,
    jitter: true,
    onRetry: (attempt, error) => {
      if (showToasts) {
        toast.info(`Retrying... (attempt ${attempt}/${maxAttempts})`);
      }
      onRetry?.(attempt);
    },
  });

  const [retryState, setRetryState] = useState<RetryState>({
    attempt: 0,
    lastError: null,
    isRetrying: false,
  });

  // Set up retry state callback
  useEffect(() => {
    retryManager.setStateChangeCallback(setRetryState);
  }, [retryManager]);

  const execute = useCallback(async (operation: () => Promise<T>) => {
    setLastOperation(() => operation);
    setLoading(true);
    setError(null);

    try {
      const result = await retryManager.execute(operation);
      setData(result);
      setError(null);
      
      if (showToasts) {
        toast.success('Operation completed successfully');
      }
      onSuccess?.();
    } catch (err) {
      setError(err);
      setData(null);
      
      if (showToasts && !retryManager.canRetry()) {
        toast.error('Operation failed after maximum retry attempts');
      }
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [retryManager, showToasts, onSuccess, onError]);

  const retry = useCallback(async () => {
    if (!lastOperation || !retryManager.canRetry()) {
      return;
    }

    setLoading(true);
    try {
      const result = await retryManager.retry(lastOperation);
      setData(result);
      setError(null);
      
      if (showToasts) {
        toast.success('Retry successful');
      }
      onSuccess?.();
    } catch (err) {
      setError(err);
      
      if (showToasts && !retryManager.canRetry()) {
        toast.error('Retry failed - maximum attempts reached');
      }
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [lastOperation, retryManager, showToasts, onSuccess, onError]);

  const reset = useCallback(() => {
    retryManager.reset();
    setData(null);
    setError(null);
    setLoading(false);
    setLastOperation(null);
  }, [retryManager]);

  return {
    data,
    loading,
    error,
    retryState,
    canRetry: retryManager.canRetry() || false,
    retry,
    reset,
    execute,
  };
}

/**
 * Hook for API service status and controls
 */
export function useApiServiceStatus() {
  const [circuitBreakerState, setCircuitBreakerState] = useState<'CLOSED' | 'OPEN' | 'HALF_OPEN'>('CLOSED');
  const [rateLimitStatus, setRateLimitStatus] = useState({ allowed: true, timeUntilReset: 0 });

  const updateStatus = useCallback(() => {
    setCircuitBreakerState(apiService.getCircuitBreakerState());
    setRateLimitStatus(apiService.getRateLimitStatus());
  }, []);

  // Update status periodically
  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateStatus]);

  const resetCircuitBreaker = useCallback(() => {
    apiService.resetCircuitBreaker();
    updateStatus();
    toast.success('Circuit breaker reset');
  }, [updateStatus]);

  const resetRateLimit = useCallback(() => {
    apiService.resetRateLimit();
    updateStatus();
    toast.success('Rate limit reset');
  }, [updateStatus]);

  return {
    circuitBreakerState,
    rateLimitStatus,
    resetCircuitBreaker,
    resetRateLimit,
    updateStatus,
  };
}

/**
 * Hook for automatic retry with exponential backoff
 */
export function useAutoRetry<T>(
  operation: () => Promise<T>,
  dependencies: any[] = [],
  options: ApiRetryOptions = {}
) {
  const { data, loading, error, execute } = useApiRetry<T>(options);

  useEffect(() => {
    if (operation) {
      execute(operation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error };
}

/**
 * Higher-order component for wrapping components with retry functionality
 */
export function withRetry<P extends object>(
  Component: React.ComponentType<P & { retryHook: ApiRetryResult<any> }>,
  retryOptions?: ApiRetryOptions
) {
  return function RetryWrapper(props: P) {
    const retryHook = useApiRetry(retryOptions);

    return React.createElement(Component, { ...props, retryHook });
  };
}

/**
 * Utility function to create retryable API calls
 */
export function createRetryableCall<T>(
  apiCall: () => Promise<T>,
  options?: ApiRetryOptions
) {
  return function useRetryableCall() {
    return useApiRetry<T>(options);
  };
}