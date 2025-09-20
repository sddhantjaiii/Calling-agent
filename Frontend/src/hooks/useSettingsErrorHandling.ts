import React, { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { errorHandler } from '@/utils/errorHandler';
import { handleServerValidationErrors, FORM_FIELD_MAPPINGS } from '@/utils/serverValidationHandler';

interface SettingsError {
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
  timestamp: Date;
}

interface UseSettingsErrorHandlingOptions {
  showToast?: boolean;
  logErrors?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

interface UseSettingsErrorHandlingReturn {
  error: SettingsError | null;
  isRetrying: boolean;
  retryCount: number;
  canRetry: boolean;
  fieldErrors: Record<string, string>;
  clearError: () => void;
  clearFieldErrors: () => void;
  handleError: (error: unknown) => boolean;
  handleValidationError: (error: unknown) => boolean;
  retry: (operation: () => Promise<void>) => Promise<void>;
  setFieldErrors: (errors: Record<string, string>) => void;
}

export const useSettingsErrorHandling = (
  options: UseSettingsErrorHandlingOptions = {}
): UseSettingsErrorHandlingReturn => {
  const {
    showToast = true,
    logErrors = true,
    retryAttempts = 3,
    retryDelay = 1000,
  } = options;

  const [error, setError] = useState<SettingsError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const lastOperationRef = useRef<(() => Promise<void>) | null>(null);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const clearFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const normalizeError = useCallback((error: unknown): SettingsError => {
    if (error && typeof error === 'object' && 'code' in error) {
      const apiError = error as any;
      return {
        code: apiError.code || 'UNKNOWN_ERROR',
        message: apiError.message || 'An unexpected error occurred',
        status: apiError.status,
        details: apiError.details,
        timestamp: new Date(),
      };
    }

    if (error instanceof Error) {
      return {
        code: 'CLIENT_ERROR',
        message: error.message,
        timestamp: new Date(),
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date(),
    };
  }, []);

  const isRetryableError = useCallback((errorCode: string): boolean => {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'SERVER_ERROR',
      'RATE_LIMITED',
    ];
    return retryableCodes.includes(errorCode);
  }, []);

  const handleError = useCallback((error: unknown): boolean => {
    const normalizedError = normalizeError(error);
    setError(normalizedError);

    if (logErrors) {
      console.error('Settings Error:', normalizedError);
    }

    // Use centralized error handler for user feedback
    if (showToast) {
      errorHandler.handleError(error);
    }

    return true;
  }, [normalizeError, logErrors, showToast]);

  const handleValidationError = useCallback((error: unknown): boolean => {
    // Try to handle as server validation error first
    const wasHandled = handleServerValidationErrors(
      error,
      setFieldErrors,
      FORM_FIELD_MAPPINGS.settings,
      {
        showToast,
        toastTitle: 'Settings Validation Error',
      }
    );

    if (wasHandled) {
      // Also set the general error for retry purposes
      const normalizedError = normalizeError(error);
      setError(normalizedError);
      return true;
    }

    // Fall back to general error handling
    return handleError(error);
  }, [handleError, normalizeError, showToast]);

  const retry = useCallback(async (operation: () => Promise<void>): Promise<void> => {
    if (!isRetryableError(error?.code || '') || retryCount >= retryAttempts) {
      throw new Error('Cannot retry this operation');
    }

    setIsRetrying(true);
    lastOperationRef.current = operation;

    try {
      // Add delay before retry
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retryCount - 1)));
      }

      await operation();
      
      // Success - clear error state
      clearError();
      clearFieldErrors();
      
      if (showToast) {
        toast.success('Operation completed successfully');
      }
    } catch (retryError) {
      setRetryCount(prev => prev + 1);
      handleError(retryError);
    } finally {
      setIsRetrying(false);
    }
  }, [error?.code, retryCount, retryAttempts, retryDelay, isRetryableError, clearError, clearFieldErrors, handleError, showToast]);

  const canRetry = error ? isRetryableError(error.code) && retryCount < retryAttempts : false;

  return {
    error,
    isRetrying,
    retryCount,
    canRetry,
    fieldErrors,
    clearError,
    clearFieldErrors,
    handleError,
    handleValidationError,
    retry,
    setFieldErrors,
  };
};

// Hook for network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const updateOnlineStatus = useCallback(() => {
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      setLastSync(new Date());
    }
  }, []);

  // Set up event listeners
  React.useEffect(() => {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [updateOnlineStatus]);

  return { isOnline, lastSync };
};

// Hook for form field validation states
export const useFieldValidation = () => {
  const [validatingFields, setValidatingFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldValidating = useCallback((fieldName: string, isValidating: boolean) => {
    setValidatingFields(prev => {
      const newSet = new Set(prev);
      if (isValidating) {
        newSet.add(fieldName);
      } else {
        newSet.delete(fieldName);
      }
      return newSet;
    });
  }, []);

  const setFieldError = useCallback((fieldName: string, error: string | null) => {
    setFieldErrors(prev => {
      if (error === null) {
        const { [fieldName]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [fieldName]: error };
    });
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setFieldError(fieldName, null);
  }, [setFieldError]);

  const isFieldValidating = useCallback((fieldName: string) => {
    return validatingFields.has(fieldName);
  }, [validatingFields]);

  const getFieldError = useCallback((fieldName: string) => {
    return fieldErrors[fieldName];
  }, [fieldErrors]);

  return {
    setFieldValidating,
    setFieldError,
    clearFieldError,
    isFieldValidating,
    getFieldError,
    fieldErrors,
    clearAllErrors: () => setFieldErrors({}),
  };
};

export default useSettingsErrorHandling;