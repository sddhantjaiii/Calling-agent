import React from 'react';
import { DataAccessErrorBoundary } from '../components/ui/DataAccessErrorBoundary';
import { useAuth } from '../contexts/AuthContext';

interface WithDataAccessErrorBoundaryOptions {
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRetry?: () => void;
}

/**
 * Higher-order component that wraps components with data access error boundary
 * Provides automatic error handling for unauthorized access and data integrity issues
 */
export function withDataAccessErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithDataAccessErrorBoundaryOptions = {}
) {
  const WithDataAccessErrorBoundaryComponent = (props: P) => {
    const { logout } = useAuth();

    const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
      // Log the error for monitoring
      console.error('Data access error boundary triggered:', {
        error: error.message,
        stack: error.stack,
        errorInfo,
        timestamp: new Date().toISOString(),
      });

      // Call custom error handler if provided
      if (options.onError) {
        options.onError(error, errorInfo);
      }
    };

    const handleRetry = () => {
      // Refresh the page or call custom retry logic
      if (options.onRetry) {
        options.onRetry();
      } else {
        window.location.reload();
      }
    };

    const handleLogout = () => {
      logout();
    };

    return (
      <DataAccessErrorBoundary
        fallback={options.fallback}
        onError={handleError}
        onRetry={handleRetry}
        onLogout={handleLogout}
      >
        <WrappedComponent {...props} />
      </DataAccessErrorBoundary>
    );
  };

  WithDataAccessErrorBoundaryComponent.displayName = 
    `withDataAccessErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithDataAccessErrorBoundaryComponent;
}

/**
 * Hook wrapper that provides error boundary protection for custom hooks
 * Use this to wrap hook calls that might throw data access errors
 */
export function useWithErrorBoundary<T>(
  hookFn: () => T,
  errorHandler?: (error: Error) => void
): T | null {
  try {
    return hookFn();
  } catch (error) {
    if (error instanceof Error) {
      // Log the error
      console.error('Hook error boundary caught error:', error);
      
      // Call custom error handler if provided
      if (errorHandler) {
        errorHandler(error);
      }
      
      // Re-throw the error so it can be caught by the component error boundary
      throw error;
    }
    
    return null;
  }
}

export default withDataAccessErrorBoundary;