import React, { ReactNode } from 'react';
import ErrorBoundary from '../ErrorBoundary';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  showRetry?: boolean;
  showHome?: boolean;
  onRetry?: () => void;
  className?: string;
}

const ErrorFallback: React.FC<{
  title: string;
  description: string;
  showRetry: boolean;
  showHome: boolean;
  onRetry?: () => void;
  className?: string;
}> = ({ title, description, showRetry, showHome, onRetry, className = '' }) => {
  const handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showRetry && (
            <Button
              onClick={onRetry || handleReload}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {showHome && (
            <Button
              onClick={handleGoHome}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({
  children,
  fallbackTitle = "Something went wrong",
  fallbackDescription = "An unexpected error occurred. Please try again or contact support if the problem persists.",
  showRetry = true,
  showHome = false,
  onRetry,
  className = '',
}) => {
  const fallback = (
    <ErrorFallback
      title={fallbackTitle}
      description={fallbackDescription}
      showRetry={showRetry}
      showHome={showHome}
      onRetry={onRetry}
      className={className}
    />
  );

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
};

// Specialized error boundaries for different dashboard sections
export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryWrapper
    fallbackTitle="Dashboard Error"
    fallbackDescription="Unable to load dashboard data. This might be a temporary issue."
    showRetry={true}
    showHome={false}
  >
    {children}
  </ErrorBoundaryWrapper>
);

export const ChartErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryWrapper
    fallbackTitle="Chart Loading Error"
    fallbackDescription="Unable to display chart data. The chart may be temporarily unavailable."
    showRetry={true}
    showHome={false}
    className="min-h-[300px]"
  >
    {children}
  </ErrorBoundaryWrapper>
);

export const TableErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryWrapper
    fallbackTitle="Table Loading Error"
    fallbackDescription="Unable to load table data. Please try refreshing the page."
    showRetry={true}
    showHome={false}
    className="min-h-[200px]"
  >
    {children}
  </ErrorBoundaryWrapper>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  componentName?: string;
}> = ({ children, componentName = "Component" }) => (
  <ErrorBoundaryWrapper
    fallbackTitle={`${componentName} Error`}
    fallbackDescription={`Unable to load ${componentName.toLowerCase()}. Please try again.`}
    showRetry={true}
    showHome={false}
  >
    {children}
  </ErrorBoundaryWrapper>
);

export default ErrorBoundaryWrapper;