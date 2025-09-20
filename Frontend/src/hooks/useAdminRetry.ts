import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
}

interface RetryState {
  isRetrying: boolean;
  attemptCount: number;
  lastError?: Error;
}

interface UseAdminRetryReturn<T> {
  execute: (...args: any[]) => Promise<T>;
  retry: () => Promise<T>;
  reset: () => void;
  state: RetryState;
}

const defaultConfig: Required<RetryConfig> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  }
};

export function useAdminRetry<T>(
  operation: (...args: any[]) => Promise<T>,
  config: RetryConfig = {}
): UseAdminRetryReturn<T> {
  const finalConfig = { ...defaultConfig, ...config };
  
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attemptCount: 0
  });
  
  const [lastArgs, setLastArgs] = useState<any[]>([]);

  const sleep = (ms: number): Promise<void> => 
    new Promise(resolve => setTimeout(resolve, ms));

  const calculateDelay = (attempt: number): number => {
    const delay = finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, finalConfig.maxDelay);
  };

  const executeWithRetry = useCallback(async (...args: any[]): Promise<T> => {
    setLastArgs(args);
    
    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      setState(prev => ({
        ...prev,
        isRetrying: attempt > 1,
        attemptCount: attempt
      }));

      try {
        const result = await operation(...args);
        
        // Success - reset state
        setState({
          isRetrying: false,
          attemptCount: 0
        });
        
        if (attempt > 1) {
          toast({
            title: "Operation Successful",
            description: `Succeeded after ${attempt} attempts`,
            variant: "default"
          });
        }
        
        return result;
      } catch (error) {
        const err = error as Error;
        
        setState(prev => ({
          ...prev,
          lastError: err,
          isRetrying: false
        }));

        // Check if we should retry
        const shouldRetry = attempt < finalConfig.maxAttempts && finalConfig.retryCondition(err);
        
        if (!shouldRetry) {
          // Final failure
          toast({
            title: "Operation Failed",
            description: attempt > 1 
              ? `Failed after ${attempt} attempts: ${err.message}`
              : err.message,
            variant: "destructive"
          });
          throw err;
        }

        // Wait before retry
        if (attempt < finalConfig.maxAttempts) {
          const delay = calculateDelay(attempt);
          
          toast({
            title: "Retrying Operation",
            description: `Attempt ${attempt} failed. Retrying in ${delay / 1000}s...`,
            variant: "default"
          });
          
          await sleep(delay);
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Retry logic error');
  }, [operation, finalConfig]);

  const retry = useCallback(async (): Promise<T> => {
    if (lastArgs.length === 0) {
      throw new Error('No previous operation to retry');
    }
    return executeWithRetry(...lastArgs);
  }, [executeWithRetry, lastArgs]);

  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      attemptCount: 0
    });
    setLastArgs([]);
  }, []);

  return {
    execute: executeWithRetry,
    retry,
    reset,
    state
  };
}

// Specialized hooks for common admin operations
export function useAdminApiRetry<T>(
  apiCall: (...args: any[]) => Promise<T>,
  config?: RetryConfig
) {
  return useAdminRetry(apiCall, {
    maxAttempts: 3,
    baseDelay: 1000,
    retryCondition: (error: Error) => {
      const message = error.message.toLowerCase();
      const isRetryableError = (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('fetch') ||
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504')
      );
      
      // Don't retry authentication or permission errors
      const isAuthError = (
        message.includes('401') ||
        message.includes('403') ||
        message.includes('unauthorized') ||
        message.includes('forbidden')
      );
      
      return isRetryableError && !isAuthError;
    },
    ...config
  });
}

export function useAdminBulkOperationRetry<T>(
  bulkOperation: (...args: any[]) => Promise<T>,
  config?: RetryConfig
) {
  return useAdminRetry(bulkOperation, {
    maxAttempts: 2, // Fewer retries for bulk operations
    baseDelay: 2000, // Longer delay for bulk operations
    maxDelay: 15000,
    ...config
  });
}

export default useAdminRetry;