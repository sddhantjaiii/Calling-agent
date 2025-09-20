import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdminErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface AdminErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  retryCount: number;
}

export class AdminErrorBoundary extends Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: AdminErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AdminErrorBoundaryState> {
    const errorId = `admin-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    
    // Log error to admin error reporting service
    this.logAdminError(error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    if (onError) {
      onError(error, errorInfo);
    }
  }

  private logAdminError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getCurrentUserId(),
        adminContext: this.getAdminContext()
      };

      // Send to admin error reporting endpoint
      await fetch('/api/admin/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(errorReport)
      });
    } catch (reportingError) {
      console.error('Failed to report admin error:', reportingError);
    }
  };

  private getCurrentUserId = (): string | null => {
    try {
      const authData = localStorage.getItem('auth');
      return authData ? JSON.parse(authData).userId : null;
    } catch {
      return null;
    }
  };

  private getAuthToken = (): string | null => {
    try {
      const authData = localStorage.getItem('auth');
      return authData ? JSON.parse(authData).token : null;
    } catch {
      return null;
    }
  };

  private getAdminContext = () => {
    return {
      currentPath: window.location.pathname,
      adminSection: this.extractAdminSection(),
      timestamp: new Date().toISOString()
    };
  };

  private extractAdminSection = (): string => {
    const path = window.location.pathname;
    const adminMatch = path.match(/\/admin\/([^\/]+)/);
    return adminMatch ? adminMatch[1] : 'unknown';
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: retryCount + 1
      });
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    });
  };

  private handleGoHome = () => {
    window.location.href = '/admin';
  };

  private handleReportBug = () => {
    const { error, errorId } = this.state;
    const subject = encodeURIComponent(`Admin Panel Error Report - ${errorId}`);
    const body = encodeURIComponent(`
Error ID: ${errorId}
Error Message: ${error?.message || 'Unknown error'}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:
    `);
    
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  render() {
    const { hasError, error, errorInfo, errorId, retryCount } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const canRetry = retryCount < this.maxRetries;
      const isNetworkError = error?.message?.includes('fetch') || error?.message?.includes('network');
      const isPermissionError = error?.message?.includes('403') || error?.message?.includes('unauthorized');

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-600">
                Admin Panel Error
              </CardTitle>
              <CardDescription>
                Something went wrong in the admin interface. We've been notified and are working on a fix.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error ID for support */}
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error ID:</strong> {errorId}
                  <br />
                  <span className="text-sm text-gray-600">
                    Please include this ID when reporting the issue.
                  </span>
                </AlertDescription>
              </Alert>

              {/* Error-specific guidance */}
              {isNetworkError && (
                <Alert>
                  <AlertDescription>
                    This appears to be a network connectivity issue. Please check your internet connection and try again.
                  </AlertDescription>
                </Alert>
              )}

              {isPermissionError && (
                <Alert>
                  <AlertDescription>
                    You may not have sufficient permissions for this action. Please contact your system administrator.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 justify-center">
                {canRetry && (
                  <Button onClick={this.handleRetry} variant="default">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - retryCount} attempts left)
                  </Button>
                )}
                
                <Button onClick={this.handleReset} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Component
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Admin Home
                </Button>
                
                <Button onClick={this.handleReportBug} variant="outline">
                  <Bug className="w-4 h-4 mr-2" />
                  Report Bug
                </Button>
              </div>

              {/* Technical details for developers */}
              {showDetails && error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Technical Details (for developers)
                  </summary>
                  <div className="mt-2 p-4 bg-gray-100 rounded-md">
                    <div className="text-sm">
                      <div className="font-medium text-red-600 mb-2">Error Message:</div>
                      <div className="mb-4 font-mono text-xs bg-white p-2 rounded border">
                        {error.message}
                      </div>
                      
                      {error.stack && (
                        <>
                          <div className="font-medium text-red-600 mb-2">Stack Trace:</div>
                          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                            {error.stack}
                          </pre>
                        </>
                      )}
                      
                      {errorInfo?.componentStack && (
                        <>
                          <div className="font-medium text-red-600 mb-2 mt-4">Component Stack:</div>
                          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                            {errorInfo.componentStack}
                          </pre>
                        </>
                      )}
                    </div>
                  </div>
                </details>
              )}

              {/* Recovery suggestions */}
              <div className="text-sm text-gray-600 text-center">
                <p className="mb-2">If the problem persists, try:</p>
                <ul className="text-left space-y-1 max-w-md mx-auto">
                  <li>• Refreshing the page (Ctrl+F5 or Cmd+Shift+R)</li>
                  <li>• Clearing your browser cache</li>
                  <li>• Logging out and back in</li>
                  <li>• Contacting technical support with the error ID above</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

export default AdminErrorBoundary;