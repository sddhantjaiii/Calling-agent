import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { SkeletonKPI, SkeletonChart, SkeletonTable, SkeletonCard } from './SkeletonLoader';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex items-center space-x-2">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
        {text && (
          <span className="text-sm text-muted-foreground">{text}</span>
        )}
      </div>
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  children: React.ReactNode;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  text = 'Loading...',
  children,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <LoadingSpinner text={text} />
        </div>
      )}
    </div>
  );
};

interface RefreshIndicatorProps {
  isRefreshing: boolean;
  onRefresh?: () => void;
  lastRefresh?: Date;
  className?: string;
}

export const RefreshIndicator: React.FC<RefreshIndicatorProps> = ({
  isRefreshing,
  onRefresh,
  lastRefresh,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      {lastRefresh && (
        <span>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </span>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
};

// Dashboard-specific loading states
export const DashboardKPIsLoading: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-7 bg-muted rounded w-64 animate-pulse"></div>
      <div className="flex items-center gap-2">
        <div className="h-5 bg-muted rounded w-32 animate-pulse"></div>
        <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonKPI key={i} />
      ))}
    </div>
  </div>
);

export const DashboardChartsLoading: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-6">
    <div className="h-7 bg-muted rounded w-48 animate-pulse"></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonChart key={i} height="300px" />
      ))}
    </div>
  </div>
);

export const LeadsTableLoading: React.FC<{ rows?: number }> = ({ rows = 10 }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-8 bg-muted rounded w-32 animate-pulse"></div>
      <div className="flex gap-2">
        <div className="h-10 bg-muted rounded w-24 animate-pulse"></div>
        <div className="h-10 bg-muted rounded w-20 animate-pulse"></div>
      </div>
    </div>
    <div className="rounded-lg border overflow-hidden">
      <SkeletonTable rows={rows} columns={6} className="p-4" />
    </div>
  </div>
);

export const LeadProfileLoading: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 bg-muted rounded-full animate-pulse"></div>
      <div className="space-y-2">
        <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
        <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SkeletonCard />
      <SkeletonCard />
    </div>
    
    <div className="space-y-4">
      <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded">
            <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

interface InlineLoadingProps {
  text?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  text = 'Loading...',
  size = 'sm',
  className = '',
}) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <Loader2 className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} animate-spin`} />
    <span className={`${size === 'sm' ? 'text-sm' : 'text-base'} text-muted-foreground`}>
      {text}
    </span>
  </div>
);

interface FullPageLoadingProps {
  text?: string;
  description?: string;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  text = 'Loading...',
  description,
}) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center space-y-4">
      <LoadingSpinner size="lg" />
      <div>
        <h3 className="text-lg font-medium text-foreground">{text}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  </div>
);

export default LoadingSpinner;