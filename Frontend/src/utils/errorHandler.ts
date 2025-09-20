import { toast } from 'sonner';
import { getErrorMessage, getUserActionSuggestion, isRetryableError, getErrorSeverity } from './errorMapping';

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

export interface NetworkError extends Error {
  code: 'NETWORK_ERROR';
  status?: number;
}

export interface AuthError extends Error {
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'TOKEN_EXPIRED';
  status: 401 | 403;
}

export interface ValidationError extends Error {
  code: 'VALIDATION_ERROR';
  status: 400;
  details: Record<string, string[]>;
}

export interface ServerError extends Error {
  code: 'SERVER_ERROR';
  status: number;
}

export type AppError = NetworkError | AuthError | ValidationError | ServerError;

/**
 * Centralized error handler for API and application errors
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private onAuthError?: () => void;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Set callback for authentication errors
   */
  setAuthErrorHandler(handler: () => void) {
    this.onAuthError = handler;
  }

  /**
   * Handle different types of errors with appropriate user feedback
   */
  handleError(error: unknown): void {
    const appError = this.normalizeError(error);
    
    switch (appError.code) {
      case 'NETWORK_ERROR':
        this.handleNetworkError(appError);
        break;
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
      case 'TOKEN_EXPIRED':
        this.handleAuthError(appError);
        break;
      case 'VALIDATION_ERROR':
        this.handleValidationError(appError);
        break;
      case 'SERVER_ERROR':
        this.handleServerError(appError);
        break;
      default:
        this.handleGenericError(appError);
    }

    // Log error for debugging
    this.logError(appError);
  }

  /**
   * Handle network connectivity errors
   */
  private handleNetworkError(error: NetworkError): void {
    const message = getErrorMessage(error.code, error.message);
    const userAction = getUserActionSuggestion(error.code);
    
    toast.error(message, {
      description: userAction,
      action: isRetryableError(error.code) ? {
        label: 'Retry',
        onClick: () => window.location.reload(),
      } : undefined,
    });
  }

  /**
   * Handle authentication and authorization errors
   */
  private handleAuthError(error: AuthError): void {
    const message = getErrorMessage(error.code, error.message);
    const userAction = getUserActionSuggestion(error.code);
    const severity = getErrorSeverity(error.code);

    toast.error(message, {
      description: userAction,
      duration: severity === 'high' ? 8000 : 5000,
    });
    
    // Trigger auth error handler (logout and redirect)
    if (this.onAuthError && error.code !== 'FORBIDDEN') {
      this.onAuthError();
    }
  }

  /**
   * Handle validation errors from the server
   */
  private handleValidationError(error: ValidationError): void {
    const messages = Object.values(error.details).flat();
    const specificMessage = messages.length > 0 ? messages[0] : undefined;
    const message = getErrorMessage(error.code, specificMessage || error.message);
    const userAction = getUserActionSuggestion(error.code);
    
    toast.error(message, {
      description: userAction,
      duration: 6000,
    });
  }

  /**
   * Handle server errors (5xx status codes)
   */
  private handleServerError(error: ServerError): void {
    const message = getErrorMessage(error.code, error.message);
    const userAction = getUserActionSuggestion(error.code);
    const severity = getErrorSeverity(error.code);
    
    toast.error(message, {
      description: userAction,
      duration: severity === 'high' ? 8000 : 5000,
      action: isRetryableError(error.code) ? {
        label: 'Retry',
        onClick: () => window.location.reload(),
      } : undefined,
    });
  }

  /**
   * Handle generic or unknown errors
   */
  private handleGenericError(error: Error): void {
    const message = getErrorMessage('UNKNOWN_ERROR', error.message);
    const userAction = getUserActionSuggestion('UNKNOWN_ERROR');
    
    toast.error(message, {
      description: userAction,
    });
  }

  /**
   * Normalize different error types into a consistent format
   */
  private normalizeError(error: unknown): AppError {
    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        name: 'NetworkError',
        message: 'Network connection failed',
        code: 'NETWORK_ERROR',
      } as NetworkError;
    }

    // Handle API response errors
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as any;
      
      if (apiError.status === 401) {
        return {
          name: 'AuthError',
          message: apiError.message || 'Unauthorized',
          code: apiError.code || 'UNAUTHORIZED',
          status: 401,
        } as AuthError;
      }
      
      if (apiError.status === 403) {
        return {
          name: 'AuthError',
          message: apiError.message || 'Forbidden',
          code: apiError.code || 'FORBIDDEN',
          status: 403,
        } as AuthError;
      }
      
      if (apiError.status === 400 && apiError.details) {
        return {
          name: 'ValidationError',
          message: apiError.message || 'Validation failed',
          code: 'VALIDATION_ERROR',
          status: 400,
          details: apiError.details,
        } as ValidationError;
      }
      
      if (apiError.status >= 500) {
        return {
          name: 'ServerError',
          message: apiError.message || 'Server error',
          code: 'SERVER_ERROR',
          status: apiError.status,
        } as ServerError;
      }
    }

    // Handle generic errors
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        code: 'UNKNOWN_ERROR',
        stack: error.stack,
      } as any;
    }

    // Handle unknown error types
    return {
      name: 'UnknownError',
      message: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR',
    } as any;
  }

  /**
   * Log errors for debugging and monitoring
   */
  private logError(error: AppError): void {
    const errorDetails = {
      code: error.code,
      message: error.message,
      status: 'status' in error ? error.status : undefined,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    console.group('🚨 Error Handler');
    console.error('Error:', error);
    console.error('Details:', errorDetails);
    console.groupEnd();

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToMonitoring(errorDetails);
    }
  }

  /**
   * Send error to monitoring service
   */
  private sendErrorToMonitoring(errorDetails: any): void {
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorDetails),
      }).catch(() => {
        // Silently fail if error reporting fails
      });
    } catch {
      // Silently fail if error reporting fails
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * Utility function for handling errors in async operations
 */
export const handleAsyncError = (error: unknown): void => {
  errorHandler.handleError(error);
};

/**
 * Higher-order function to wrap async functions with error handling
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T
): T => {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler.handleError(error);
      throw error; // Re-throw to allow component-level handling if needed
    }
  }) as T;
};

/**
 * React hook for error handling in components
 */
export const useErrorHandler = () => {
  return {
    handleError: (error: unknown) => errorHandler.handleError(error),
    handleAsyncError,
    withErrorHandling,
  };
};