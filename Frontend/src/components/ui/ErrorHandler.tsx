import React, { useState, useCallback } from 'react';
import { AlertCircle, RefreshCw, WifiOff, Shield, Clock } from 'lucide-react';
import { Button } from './button';
import { toast } from 'sonner';

interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorType: 'network' | 'auth' | 'server' | 'client' | 'timeout' | 'unknown';
  retryCount: number;
  canRetry: boolean;
}

interface ErrorHandlerProps {
  error: Error | string | null;
  onRetry?: () => Promise<void>;
  maxRetries?: number;
  showToast?: boolean;
  className?: string;
  compact?: boolean;
}

const getErrorType = (error: Error | string): ErrorState['errorType'] => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorLower = errorMessage.toLowerCase();

  if (errorLower.includes('network') || errorLower.includes('fetch')) {
    return 'network';
  }
  if (errorLower.includes('unauthorized') || errorLower.includes('401')) {
    return 'auth';
  }
  if (errorLower.includes('timeout')) {
    return 'timeout';
  }
  if (errorLower.includes('500') || errorLower.includes('server')) {
    return 'server';
  }
  if (errorLower.includes('400') || errorLower.includes('validation')) {
    return 'client';
  }
  return 'unknown';
};

const getErrorIcon = (errorType: ErrorState['errorType']) => {
  switch (errorType) {
    case 'network':
      return <WifiOff className="h-5 w-5 text-red-500" />;
    case 'auth':
      return <Shield className="h-5 w-5 text-orange-500" />;
    case 'timeout':
      return <Clock className="h-5 w-5 text-yellow-500" />;
    case 'server':
    case 'client':
    case 'unknown':
    default:
      return <AlertCircle className="h-5 w-5 text-red-500" />;
  }
};

const getErrorMessage = (errorType: ErrorState['errorType'], originalError: string) => {
  switch (errorType) {
    case 'network':
      return {
        title: 'Connection Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
      };
    case 'auth':
      return {
        title: 'Authentication Error',
        description: 'Your session has expired. Please log in again.',
      };
    case 'timeout':
      return {
        title: 'Request Timeout',
        description: 'The request took too long to complete. Please try again.',
      };
    case 'server':
      return {
        title: 'Server Error',
        description: 'A server error occurred. Please try again later.',
      };
    case 'client':
      return {
        title: 'Request Error',
        description: 'There was an issue with your request. Please check your input and try again.',
      };
    case 'unknown':
    default:
      return {
        title: 'Unexpected Error',
        description: originalError || 'An unexpected error occurred. Please try again.',
      };
  }
};

export const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  error,
  onRetry,
  maxRetries = 3,
  showToast = false,
  className = '',
  compact = false,
}) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorType: 'unknown',
    retryCount: 0,
    canRetry: true,
  });
  const [isRetrying, setIsRetrying] = useState(false);

  React.useEffect(() => {
    if (error) {
      const errorObj = typeof error === 'string' ? new Error(error) : error;
      const errorType = getErrorType(errorObj);
      
      setErrorState({
        hasError: true,
        error: errorObj,
        errorType,
        retryCount: 0,
        canRetry: onRetry !== undefined && errorType !== 'auth',
      });

      if (showToast) {
        const { title } = getErrorMessage(errorType, errorObj.message);
        toast.error(title);
      }
    } else {
      setErrorState({
        hasError: false,
        error: null,
        errorType: 'unknown',
        retryCount: 0,
        canRetry: true,
      });
    }
  }, [error, onRetry, showToast]);

  const handleRetry = useCallback(async () => {
    if (!onRetry || !errorState.canRetry || isRetrying) return;

    setIsRetrying(true);
    
    try {
      await onRetry();
      setErrorState(prev => ({
        ...prev,
        hasError: false,
        error: null,
        retryCount: 0,
      }));
      
      if (showToast) {
        toast.success('Successfully retried');
      }
    } catch (retryError) {
      const newRetryCount = errorState.retryCount + 1;
      const canStillRetry = newRetryCount < maxRetries;
      
      setErrorState(prev => ({
        ...prev,
        retryCount: newRetryCount,
        canRetry: canStillRetry,
      }));

      if (showToast) {
        if (canStillRetry) {
          toast.error(`Retry failed. ${maxRetries - newRetryCount} attempts remaining.`);
        } else {
          toast.error('Maximum retry attempts reached.');
        }
      }
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, errorState.canRetry, errorState.retryCount, isRetrying, maxRetries, showToast]);

  const handleLogin = useCallback(() => {
    window.location.href = '/';
  }, []);

  if (!errorState.hasError || !error) {
    return null;
  }

  const { title, description } = getErrorMessage(
    errorState.errorType, 
    errorState.error?.message || ''
  );

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded ${className}`}>
        {getErrorIcon(errorState.errorType)}
        <span className="flex-1">{title}</span>
        {errorState.canRetry && onRetry && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-8 px-4 text-center ${className}`}>
      <div className="flex justify-center mb-4">
        {getErrorIcon(errorState.errorType)}
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {description}
      </p>

      {errorState.retryCount > 0 && (
        <p className="text-xs text-muted-foreground mb-4">
          Attempt {errorState.retryCount} of {maxRetries}
        </p>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3">
        {errorState.canRetry && onRetry && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
        )}
        
        {errorState.errorType === 'auth' && (
          <Button
            onClick={handleLogin}
            variant="outline"
            size="sm"
          >
            Login Again
          </Button>
        )}
      </div>
    </div>
  );
};

// Hook for managing error states
export const useErrorHandler = () => {
  const [error, setError] = useState<Error | string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback((error: Error | string) => {
    setError(error);
    setRetryCount(0);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const retry = useCallback(async (retryFn: () => Promise<void>) => {
    try {
      await retryFn();
      clearError();
    } catch (retryError) {
      setRetryCount(prev => prev + 1);
      throw retryError;
    }
  }, [clearError]);

  return {
    error,
    retryCount,
    handleError,
    clearError,
    retry,
  };
};

export default ErrorHandler;