import React from 'react';
import LoadingSpinner, { InlineSpinner } from './LoadingSpinner';
import { SkeletonAgent, SkeletonContact, SkeletonKPI, SkeletonCall, SkeletonChart, SkeletonTable, SkeletonList } from './SkeletonLoader';
import { ProgressBar, CircularProgress } from './ProgressIndicator';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface LoadingStateManagerProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  loadingType?: 'spinner' | 'skeleton' | 'progress';
  skeletonType?: 'agent' | 'contact' | 'kpi' | 'call' | 'chart' | 'table' | 'list' | 'card';
  skeletonCount?: number;
  progress?: number; // 0-100 for progress type
  progressLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
  emptyState?: React.ReactNode;
  className?: string;
  minHeight?: string;
}

export const LoadingStateManager: React.FC<LoadingStateManagerProps> = ({
  loading,
  error,
  children,
  loadingType = 'skeleton',
  skeletonType = 'card',
  skeletonCount = 3,
  progress,
  progressLabel,
  onRetry,
  retryLabel = 'Retry',
  emptyState,
  className = '',
  minHeight,
}) => {
  const renderSkeleton = () => {
    const skeletons = Array.from({ length: skeletonCount }, (_, i) => {
      switch (skeletonType) {
        case 'agent':
          return <SkeletonAgent key={i} />;
        case 'contact':
          return <SkeletonContact key={i} />;
        case 'kpi':
          return <SkeletonKPI key={i} />;
        case 'call':
          return <SkeletonCall key={i} />;
        case 'chart':
          return <SkeletonChart key={i} />;
        case 'table':
          return <SkeletonTable key={i} rows={5} columns={4} />;
        case 'list':
          return <SkeletonList key={i} items={5} />;
        case 'card':
        default:
          return (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          );
      }
    });

    if (skeletonType === 'agent') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {skeletons}
        </div>
      );
    }

    if (skeletonType === 'kpi') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {skeletons}
        </div>
      );
    }

    return <div className="space-y-4">{skeletons}</div>;
  };

  const renderLoading = () => {
    switch (loadingType) {
      case 'spinner':
        return (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Loading..." />
          </div>
        );
      
      case 'progress':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            {progress !== undefined ? (
              <>
                <CircularProgress progress={progress} size={80} showPercentage />
                {progressLabel && (
                  <p className="text-sm text-muted-foreground">{progressLabel}</p>
                )}
              </>
            ) : (
              <LoadingSpinner size="lg" text={progressLabel || "Processing..."} />
            )}
          </div>
        );
      
      case 'skeleton':
      default:
        return renderSkeleton();
    }
  };

  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Something went wrong
        </h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          {error || 'An unexpected error occurred while loading the data.'}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );

  const containerStyle = minHeight ? { minHeight } : {};

  return (
    <div className={className} style={containerStyle}>
      {error ? renderError() : loading ? renderLoading() : children}
    </div>
  );
};

// Specialized loading components for common use cases
export const AgentLoadingState: React.FC<{
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  onRetry?: () => void;
}> = ({ loading, error, children, onRetry }) => (
  <LoadingStateManager
    loading={loading}
    error={error}
    loadingType="skeleton"
    skeletonType="agent"
    skeletonCount={6}
    onRetry={onRetry}
  >
    {children}
  </LoadingStateManager>
);

export const ContactLoadingState: React.FC<{
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  onRetry?: () => void;
}> = ({ loading, error, children, onRetry }) => (
  <LoadingStateManager
    loading={loading}
    error={error}
    loadingType="skeleton"
    skeletonType="contact"
    skeletonCount={8}
    onRetry={onRetry}
  >
    {children}
  </LoadingStateManager>
);

export const DashboardLoadingState: React.FC<{
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  onRetry?: () => void;
}> = ({ loading, error, children, onRetry }) => (
  <LoadingStateManager
    loading={loading}
    error={error}
    loadingType="skeleton"
    skeletonType="kpi"
    skeletonCount={6}
    onRetry={onRetry}
  >
    {children}
  </LoadingStateManager>
);

export const CallLoadingState: React.FC<{
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  onRetry?: () => void;
}> = ({ loading, error, children, onRetry }) => (
  <LoadingStateManager
    loading={loading}
    error={error}
    loadingType="skeleton"
    skeletonType="call"
    skeletonCount={5}
    onRetry={onRetry}
  >
    {children}
  </LoadingStateManager>
);

// Button loading state component
export const ButtonLoadingState: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  size?: 'xs' | 'sm' | 'md';
}> = ({ loading, children, loadingText, size = 'sm' }) => {
  if (loading) {
    return (
      <>
        <InlineSpinner size={size} className="mr-2" />
        {loadingText || 'Loading...'}
      </>
    );
  }
  return <>{children}</>;
};

export default LoadingStateManager;