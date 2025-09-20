import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  onLogout?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: 'unauthorized' | 'data_integrity' | 'network' | 'unknown';
  retryCount: number;
}

/**
 * Error boundary specifically designed to handle data access errors
 * including unauthorized access, data integrity issues, and network errors
 */
export class DataAccessErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'unknown',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Determine error type based on error message
    let errorType: State['errorType'] = 'unknown';
    
    if (error.message.includes('authenticated') || 
        error.message.includes('unauthorized') ||
        error.message.includes('access denied') ||
        error.message.includes('session expired')) {
      errorType = 'unauthorized';
    } else if (error.message.includes('data integrity') ||
               error.message.includes('belongs to another user') ||
               error.message.includes('cross-agent') ||
               error.message.includes('cross-tenant')) {
      errorType = 'data_integrity';
    } else if (error.message.includes('network') ||
               error.message.includes('connection') ||
               error.message.includes('timeout')) {
      errorType = 'network';
    }

    return {
      hasError: true,
      error,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DataAccessErrorBoundary caught an error:', error, errorInfo);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log security-related errors for monitoring
    if (this.state.errorType === 'unauthorized' || this.state.errorType === 'data_integrity') {
      console.error('🚨 SECURITY ALERT: Data access violation detected', {
        error: error.message,
        stack: error.stack,
        errorInfo,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1,
      }));

      // Call the onRetry callback if provided
      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }
  };

  handleLogout = () => {
    if (this.props.onLogout) {
      this.props.onLogout();
    }
  };

  getErrorMessage(): { title: string; description: string; actions: ReactNode } {
    const { error, errorType, retryCount } = this.state;

    switch (errorType) {
      case 'unauthorized':
        return {
          title: 'Authentication Required',
          description: 'Your session has expired or you are not authorized to access this data. Please log in again to continue.',
          actions: (
            <div className="flex gap-2 mt-4">
              <Button onClick={this.handleLogout} variant="default" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Log In Again
              </Button>
            </div>
          ),
        };

      case 'data_integrity':
        return {
          title: 'Data Access Error',
          description: 'A data integrity issue was detected. You can only access your own data. This incident has been logged for security purposes.',
          actions: (
            <div className="flex gap-2 mt-4">
              {retryCount < this.maxRetries && (
                <Button onClick={this.handleRetry} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              <Button onClick={this.handleLogout} variant="default" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>
          ),
        };

      case 'network':
        return {
          title: 'Connection Error',
          description: 'Unable to connect to the server. Please check your internet connection and try again.',
          actions: (
            <div className="flex gap-2 mt-4">
              {retryCount < this.maxRetries && (
                <Button onClick={this.handleRetry} variant="default" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry ({this.maxRetries - retryCount} attempts left)
                </Button>
              )}
            </div>
          ),
        };

      default:
        return {
          title: 'Something went wrong',
          description: error?.message || 'An unexpected error occurred while accessing your data.',
          actions: (
            <div className="flex gap-2 mt-4">
              {retryCount < this.maxRetries && (
                <Button onClick={this.handleRetry} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              <Button onClick={() => window.location.reload()} variant="default" size="sm">
                Reload Page
              </Button>
            </div>
          ),
        };
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { title, description, actions } = this.getErrorMessage();

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{title}</AlertTitle>
              <AlertDescription className="mt-2">
                {description}
              </AlertDescription>
              {actions}
            </Alert>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-4 bg-gray-100 rounded-md text-sm">
                <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DataAccessErrorBoundary;