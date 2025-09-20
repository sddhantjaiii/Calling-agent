import React, { useState, useEffect } from 'react';
import { Button } from './button';
import LoadingSpinner from './LoadingSpinner';
import { RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { useManualRetry, type RetryState } from '../../utils/retryMechanism';
import { toast } from 'sonner';

interface RetryButtonProps {
  onRetry: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showCountdown?: boolean;
  maxAttempts?: number;
}

export function RetryButton({
  onRetry,
  disabled = false,
  className = '',
  variant = 'outline',
  size = 'default',
  showCountdown = true,
  maxAttempts = 3,
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [retryState, setRetryState] = useState<RetryState>({
    attempt: 0,
    lastError: null,
    isRetrying: false,
  });

  const retryManager = useManualRetry({
    maxAttempts,
    baseDelay: 1000,
    maxDelay: 30000,
    exponentialBase: 2,
    jitter: true,
  });

  // Set up state change callback
  useEffect(() => {
    retryManager.setStateChangeCallback(setRetryState);
  }, [retryManager]);

  // Countdown timer
  useEffect(() => {
    if (retryState.nextRetryAt && showCountdown) {
      const interval = setInterval(() => {
        const now = Date.now();
        const timeLeft = retryState.nextRetryAt!.getTime() - now;
        
        if (timeLeft <= 0) {
          setCountdown(0);
          clearInterval(interval);
        } else {
          setCountdown(Math.ceil(timeLeft / 1000));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [retryState.nextRetryAt, showCountdown]);

  const handleRetry = async () => {
    if (disabled || isRetrying) return;

    setIsRetrying(true);
    try {
      await retryManager.execute(onRetry);
      toast.success('Operation completed successfully');
    } catch (error) {
      console.error('Retry failed:', error);
      // Error is already handled by the retry manager and error handler
    } finally {
      setIsRetrying(false);
    }
  };

  const canRetry = retryManager.canRetry() && !disabled && !isRetrying;
  const showSpinner = isRetrying || retryState.isRetrying;

  // Button text based on state
  const getButtonText = () => {
    if (showSpinner) return 'Retrying...';
    if (retryState.attempt === 0) return 'Retry';
    if (countdown > 0 && showCountdown) return `Retry in ${countdown}s`;
    if (retryState.attempt >= maxAttempts) return 'Max retries reached';
    return `Retry (${retryState.attempt}/${maxAttempts})`;
  };

  // Button icon based on state
  const getButtonIcon = () => {
    if (showSpinner) return <LoadingSpinner size="sm" />;
    if (retryState.attempt >= maxAttempts) return <AlertCircle className="h-4 w-4" />;
    if (countdown > 0) return <Clock className="h-4 w-4" />;
    return <RefreshCw className="h-4 w-4" />;
  };

  return (
    <Button
      onClick={handleRetry}
      disabled={!canRetry || countdown > 0}
      variant={variant}
      size={size}
      className={`${className} ${retryState.attempt >= maxAttempts ? 'opacity-50' : ''}`}
    >
      {getButtonIcon()}
      <span className="ml-2">{getButtonText()}</span>
    </Button>
  );
}

interface RetryStatusProps {
  retryState: RetryState;
  maxAttempts: number;
  className?: string;
}

export function RetryStatus({ retryState, maxAttempts, className = '' }: RetryStatusProps) {
  if (retryState.attempt === 0) return null;

  const isMaxReached = retryState.attempt >= maxAttempts;
  const hasError = retryState.lastError;

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {isMaxReached ? (
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-4 w-4 mr-1" />
          <span>Maximum retry attempts reached</span>
        </div>
      ) : hasError ? (
        <div className="flex items-center text-yellow-600">
          <RefreshCw className="h-4 w-4 mr-1" />
          <span>Attempt {retryState.attempt}/{maxAttempts}</span>
        </div>
      ) : (
        <div className="flex items-center text-green-600">
          <RefreshCw className="h-4 w-4 mr-1" />
          <span>Retrying...</span>
        </div>
      )}
    </div>
  );
}

interface AutoRetryIndicatorProps {
  isRetrying: boolean;
  attempt: number;
  maxAttempts: number;
  nextRetryIn?: number;
  className?: string;
}

export function AutoRetryIndicator({
  isRetrying,
  attempt,
  maxAttempts,
  nextRetryIn,
  className = '',
}: AutoRetryIndicatorProps) {
  if (!isRetrying && !nextRetryIn) return null;

  return (
    <div className={`flex items-center space-x-2 text-sm text-blue-600 ${className}`}>
      <LoadingSpinner size="sm" />
      {nextRetryIn ? (
        <span>Retrying in {Math.ceil(nextRetryIn / 1000)}s (attempt {attempt}/{maxAttempts})</span>
      ) : (
        <span>Retrying... (attempt {attempt}/{maxAttempts})</span>
      )}
    </div>
  );
}
export
 default RetryButton;