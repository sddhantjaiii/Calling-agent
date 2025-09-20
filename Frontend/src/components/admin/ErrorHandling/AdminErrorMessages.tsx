import React from 'react';
import { AlertTriangle, Wifi, Lock, Server, Clock, RefreshCw, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface AdminError {
  code: string;
  message: string;
  details?: string;
  context?: Record<string, any>;
  timestamp?: Date;
}

interface AdminErrorMessageProps {
  error: AdminError | Error;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

interface ErrorTypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  suggestions: string[];
  canRetry: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const errorTypeConfigs: Record<string, ErrorTypeConfig> = {
  NETWORK_ERROR: {
    icon: Wifi,
    title: 'Network Connection Error',
    description: 'Unable to connect to the server. Please check your internet connection.',
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Contact your network administrator if the problem persists'
    ],
    canRetry: true,
    severity: 'medium'
  },
  
  PERMISSION_DENIED: {
    icon: Lock,
    title: 'Access Denied',
    description: 'You don\'t have permission to perform this action.',
    suggestions: [
      'Contact your system administrator for access',
      'Verify you\'re logged in with the correct account',
      'Check if your admin role has the required permissions'
    ],
    canRetry: false,
    severity: 'high'
  },
  
  SERVER_ERROR: {
    icon: Server,
    title: 'Server Error',
    description: 'The server encountered an error while processing your request.',
    suggestions: [
      'Try the operation again in a few moments',
      'Contact technical support if the error persists',
      'Check the system status page for known issues'
    ],
    canRetry: true,
    severity: 'high'
  },
  
  TIMEOUT_ERROR: {
    icon: Clock,
    title: 'Request Timeout',
    description: 'The operation took too long to complete.',
    suggestions: [
      'Try the operation again',
      'Check your internet connection speed',
      'Consider breaking large operations into smaller chunks'
    ],
    canRetry: true,
    severity: 'medium'
  },
  
  VALIDATION_ERROR: {
    icon: AlertTriangle,
    title: 'Validation Error',
    description: 'The provided data doesn\'t meet the required format or constraints.',
    suggestions: [
      'Check all required fields are filled',
      'Verify data formats match the expected patterns',
      'Review any specific validation messages'
    ],
    canRetry: false,
    severity: 'low'
  },
  
  RATE_LIMIT_ERROR: {
    icon: Clock,
    title: 'Rate Limit Exceeded',
    description: 'Too many requests have been made. Please wait before trying again.',
    suggestions: [
      'Wait a few minutes before retrying',
      'Reduce the frequency of your requests',
      'Contact support if you need higher rate limits'
    ],
    canRetry: true,
    severity: 'medium'
  },
  
  DATA_NOT_FOUND: {
    icon: HelpCircle,
    title: 'Data Not Found',
    description: 'The requested data could not be found.',
    suggestions: [
      'Verify the item still exists',
      'Check if you have permission to view this data',
      'Try refreshing the page to reload the data'
    ],
    canRetry: true,
    severity: 'low'
  }
};

function getErrorType(error: AdminError | Error): string {
  if ('code' in error && error.code) {
    return error.code;
  }
  
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'NETWORK_ERROR';
  }
  if (message.includes('403') || message.includes('unauthorized') || message.includes('forbidden')) {
    return 'PERMISSION_DENIED';
  }
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return 'SERVER_ERROR';
  }
  if (message.includes('timeout')) {
    return 'TIMEOUT_ERROR';
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return 'VALIDATION_ERROR';
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return 'RATE_LIMIT_ERROR';
  }
  if (message.includes('not found') || message.includes('404')) {
    return 'DATA_NOT_FOUND';
  }
  
  return 'SERVER_ERROR'; // Default fallback
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'low': return 'border-yellow-200 bg-yellow-50';
    case 'medium': return 'border-orange-200 bg-orange-50';
    case 'high': return 'border-red-200 bg-red-50';
    case 'critical': return 'border-red-300 bg-red-100';
    default: return 'border-gray-200 bg-gray-50';
  }
}

export function AdminErrorMessage({ 
  error, 
  onRetry, 
  onDismiss, 
  showDetails = false,
  className = '' 
}: AdminErrorMessageProps) {
  const errorType = getErrorType(error);
  const config = errorTypeConfigs[errorType] || errorTypeConfigs.SERVER_ERROR;
  const Icon = config.icon;

  return (
    <Card className={`${getSeverityColor(config.severity)} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Icon className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg text-red-800">{config.title}</CardTitle>
            <CardDescription className="text-red-700 mt-1">
              {config.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error message */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Error:</strong> {error.message}
          </AlertDescription>
        </Alert>

        {/* Recovery suggestions */}
        <div>
          <h4 className="font-medium text-sm text-gray-900 mb-2">What you can do:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            {config.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {config.canRetry && onRetry && (
            <Button onClick={onRetry} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          
          {onDismiss && (
            <Button onClick={onDismiss} size="sm" variant="ghost">
              Dismiss
            </Button>
          )}
          
          <Button 
            onClick={() => window.open('mailto:support@example.com', '_blank')} 
            size="sm" 
            variant="ghost"
          >
            Contact Support
          </Button>
        </div>

        {/* Technical details */}
        {showDetails && 'code' in error && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-white rounded border text-xs">
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Error Code:</span> {error.code}
                </div>
                {error.details && (
                  <div>
                    <span className="font-medium">Details:</span> {error.details}
                  </div>
                )}
                {error.context && (
                  <div>
                    <span className="font-medium">Context:</span>
                    <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-auto">
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </div>
                )}
                {error.timestamp && (
                  <div>
                    <span className="font-medium">Timestamp:</span> {error.timestamp.toISOString()}
                  </div>
                )}
              </div>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

// Inline error message for smaller spaces
export function AdminInlineError({ 
  error, 
  onRetry, 
  className = '' 
}: Omit<AdminErrorMessageProps, 'showDetails' | 'onDismiss'>) {
  const errorType = getErrorType(error);
  const config = errorTypeConfigs[errorType] || errorTypeConfigs.SERVER_ERROR;
  const Icon = config.icon;

  return (
    <Alert className={`${getSeverityColor(config.severity)} ${className}`}>
      <Icon className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error.message}</span>
        {config.canRetry && onRetry && (
          <Button onClick={onRetry} size="sm" variant="ghost" className="ml-2">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default AdminErrorMessage;