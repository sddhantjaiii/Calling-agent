import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'sonner';
import { generateErrorId } from '@/utils/uuid';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging and monitoring
    this.logError(error, errorInfo);
    
    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Show toast notification for non-critical errors
    if (!this.isCriticalError(error)) {
      toast.error('Something went wrong. Please try again.');
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
    };

    // Log to console for development
    console.group('🚨 Error Boundary Caught Error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Error Details:', errorDetails);
    console.groupEnd();

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorToMonitoring(errorDetails);
    }
  };

  private getUserId = (): string | undefined => {
    try {
      // Try to get user ID from localStorage or auth context
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.id;
      }
    } catch {
      // Ignore errors when getting user ID
    }
    return undefined;
  };

  private sendErrorToMonitoring = (errorDetails: ErrorDetails) => {
    // In a real application, send to monitoring service like Sentry, LogRocket, etc.
    // For now, we'll just log it
    try {
      // Example: Send to monitoring API
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
  };

  private isCriticalError = (error: Error): boolean => {
    // Determine if error is critical and requires full page fallback
    const criticalPatterns = [
      /ChunkLoadError/,
      /Loading chunk \d+ failed/,
      /Loading CSS chunk/,
      /Cannot read propert(y|ies) of undefined/,
      /Cannot read propert(y|ies) of null/,
    ];

    return criticalPatterns.some(pattern => pattern.test(error.message));
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
      
      toast.success('Retrying...');
    } else {
      toast.error('Maximum retry attempts reached. Please reload the page.');
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderErrorUI = () => {
    const { error, errorId } = this.state;
    const isCritical = error ? this.isCriticalError(error) : true;

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-lg w-full bg-white shadow-lg rounded-lg p-6">
          {/* Error Icon */}
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0">
              <svg 
                className="h-10 w-10 text-red-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-xl font-semibold text-gray-900">
                {isCritical ? 'Application Error' : 'Something went wrong'}
              </h3>
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              {isCritical 
                ? 'A critical error occurred that prevented the application from working properly.'
                : 'An unexpected error occurred, but you may be able to continue.'
              }
            </p>
            
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 p-3 bg-gray-100 rounded-md">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                  {error.message}
                  {error.stack && `\n\nStack trace:\n${error.stack}`}
                </pre>
              </details>
            )}

            {errorId && (
              <p className="text-xs text-gray-400 mt-2">
                Error ID: {errorId}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isCritical && this.retryCount < this.maxRetries && (
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Try Again ({this.maxRetries - this.retryCount} attempts left)
              </button>
            )}
            
            <button
              onClick={this.handleReload}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Reload Page
            </button>
            
            <button
              onClick={this.handleGoHome}
              className="w-full bg-white text-gray-700 py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Go to Home
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              If this problem persists, please contact support with the error ID above.
            </p>
          </div>
        </div>
      </div>
    );
  };

  render() {
    if (this.state.hasError) {
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

export default ErrorBoundary;