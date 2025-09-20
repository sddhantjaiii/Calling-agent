import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

interface SettingsErrorHandlerProps {
  error: {
    code: string;
    message: string;
    status?: number;
    details?: Record<string, unknown>;
  } | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const SettingsErrorHandler: React.FC<SettingsErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  className = '',
}) => {
  if (!error) return null;

  const getErrorIcon = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT_ERROR':
        return <WifiOff className="h-5 w-5" />;
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Connection Error';
      case 'TIMEOUT_ERROR':
        return 'Request Timeout';
      case 'UNAUTHORIZED':
        return 'Authentication Required';
      case 'FORBIDDEN':
        return 'Access Denied';
      case 'VALIDATION_ERROR':
        return 'Invalid Input';
      case 'SERVER_ERROR':
        return 'Server Error';
      default:
        return 'Error';
    }
  };

  const getErrorDescription = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'TIMEOUT_ERROR':
        return 'The request took too long to complete. Please try again.';
      case 'UNAUTHORIZED':
        return 'Your session has expired. Please log in again to continue.';
      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and correct any errors before submitting.';
      case 'SERVER_ERROR':
        return 'A server error occurred. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  };

  const isRetryable = () => {
    return ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVER_ERROR'].includes(error.code);
  };

  return (
    <Alert variant="destructive" className={className}>
      <div className="flex items-start gap-3">
        {getErrorIcon()}
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-medium">
            {getErrorTitle()}
          </AlertTitle>
          <AlertDescription className="text-sm mt-1">
            {getErrorDescription()}
          </AlertDescription>
          {error.details && (
            <div className="mt-2 text-xs text-muted-foreground">
              Error ID: {error.details.errorId || 'Unknown'}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {isRetryable() && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8 px-3"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 px-3"
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
};

interface NetworkStatusIndicatorProps {
  isOnline: boolean;
  lastSync?: Date;
  className?: string;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  isOnline,
  lastSync,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" />
      )}
      <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
        {isOnline ? 'Connected' : 'Offline'}
      </span>
      {lastSync && isOnline && (
        <span className="text-muted-foreground">
          • Last sync: {lastSync.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

interface SettingsErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SettingsErrorBoundary extends React.Component<
  React.PropsWithChildren<{ onError?: (error: Error) => void }>,
  SettingsErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ onError?: (error: Error) => void }>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SettingsErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Settings Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Settings Error
            </CardTitle>
            <CardDescription>
              An error occurred while loading the settings page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || 'An unexpected error occurred.'}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button
                  onClick={() => this.setState({ hasError: false, error: null })}
                  variant="ghost"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default SettingsErrorHandler;