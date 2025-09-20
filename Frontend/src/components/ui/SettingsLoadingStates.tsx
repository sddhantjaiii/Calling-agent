import React from 'react';
import { Loader2, Save, Check, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader } from './card';
import { Skeleton } from './skeleton';

interface SettingsLoadingOverlayProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingsLoadingOverlay: React.FC<SettingsLoadingOverlayProps> = ({
  isLoading,
  loadingText = 'Loading settings...',
  children,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="flex items-center gap-3 bg-card p-4 rounded-lg shadow-lg border">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">{loadingText}</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface SettingsSaveButtonProps {
  isLoading: boolean;
  isSaved: boolean;
  hasChanges: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const SettingsSaveButton: React.FC<SettingsSaveButtonProps> = ({
  isLoading,
  isSaved,
  hasChanges,
  onClick,
  disabled = false,
  className = '',
}) => {
  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Saving...
        </>
      );
    }
    
    if (isSaved && !hasChanges) {
      return (
        <>
          <Check className="h-4 w-4 mr-2" />
          Saved
        </>
      );
    }
    
    return (
      <>
        <Save className="h-4 w-4 mr-2" />
        Save Changes
      </>
    );
  };

  const getButtonVariant = () => {
    if (isSaved && !hasChanges) return 'outline';
    return 'default';
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading || (!hasChanges && isSaved)}
      variant={getButtonVariant()}
      className={`px-6 ${className}`}
    >
      {getButtonContent()}
    </Button>
  );
};

interface FieldLoadingStateProps {
  isLoading: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FieldLoadingState: React.FC<FieldLoadingStateProps> = ({
  isLoading,
  error,
  children,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="absolute top-0 right-0 -mt-1 -mr-1">
          <AlertCircle className="h-4 w-4 text-red-500" />
        </div>
      )}
    </div>
  );
};

export const SettingsFormSkeleton: React.FC = () => {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Personal Info Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
            <div className="sm:col-span-2 space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        </div>

        {/* Password Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Team Members Section */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-28" />
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 border-b last:border-b-0">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ValidationLoadingStateProps {
  isValidating: boolean;
  hasError: boolean;
  errorMessage?: string;
  children: React.ReactNode;
}

export const ValidationLoadingState: React.FC<ValidationLoadingStateProps> = ({
  isValidating,
  hasError,
  errorMessage,
  children,
}) => {
  return (
    <div className="relative">
      {children}
      <div className="absolute top-0 right-0 flex items-center gap-1 mt-1 mr-1">
        {isValidating && (
          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
        )}
        {hasError && (
          <div className="group relative">
            <AlertCircle className="h-3 w-3 text-red-500" />
            {errorMessage && (
              <div className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {errorMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  current,
  total,
  label = 'Progress',
  className = '',
}) => {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default SettingsLoadingOverlay;