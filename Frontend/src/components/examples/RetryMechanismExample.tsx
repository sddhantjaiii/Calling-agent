import React, { useState } from 'react';
import { Button } from '../ui/button';
import { RetryButton, RetryStatus, AutoRetryIndicator } from '../ui/RetryButton';
import { ApiStatusIndicator } from '../ui/ApiStatusIndicator';
import { useApiRetry, useApiServiceStatus } from '../../hooks/useApiRetry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Example component demonstrating retry mechanisms
 */
export function RetryMechanismExample() {
  const [simulateError, setSimulateError] = useState(false);
  const [errorType, setErrorType] = useState<'network' | 'server' | 'rate_limit'>('network');
  
  const {
    data,
    loading,
    error,
    retryState,
    canRetry,
    retry,
    reset,
    execute,
  } = useApiRetry<string>({
    maxAttempts: 3,
    showToasts: true,
    onSuccess: () => console.log('Operation succeeded'),
    onError: (err) => console.log('Operation failed:', err),
    onRetry: (attempt) => console.log(`Retry attempt ${attempt}`),
  });

  const { circuitBreakerState, rateLimitStatus } = useApiServiceStatus();

  // Simulate different types of API calls
  const simulateApiCall = async (): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (simulateError) {
      switch (errorType) {
        case 'network':
          throw new Error('Network connection failed');
        case 'server':
          throw { status: 500, code: 'SERVER_ERROR', message: 'Internal server error' };
        case 'rate_limit':
          throw { status: 429, code: 'RATE_LIMITED', message: 'Too many requests' };
        default:
          throw new Error('Unknown error');
      }
    }

    return 'API call successful!';
  };

  const handleExecute = () => {
    execute(simulateApiCall);
  };

  const handleManualRetry = async () => {
    try {
      await simulateApiCall();
      toast.success('Manual retry successful!');
    } catch (error) {
      toast.error('Manual retry failed');
      throw error;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Retry Mechanism Demo</h2>
        <ApiStatusIndicator />
      </div>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>
            Configure the test scenario to see how retry mechanisms work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={simulateError}
                onChange={(e) => setSimulateError(e.target.checked)}
                className="rounded"
              />
              <span>Simulate Error</span>
            </label>
          </div>

          {simulateError && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Error Type:</label>
              <div className="flex space-x-4">
                {(['network', 'server', 'rate_limit'] as const).map((type) => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="errorType"
                      value={type}
                      checked={errorType === type}
                      onChange={(e) => setErrorType(e.target.value as any)}
                    />
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button onClick={handleExecute} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Execute API Call
            </Button>
            <Button onClick={reset} variant="outline">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center space-x-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {data && <CheckCircle className="h-4 w-4 text-green-500" />}
            {error && !loading && <AlertCircle className="h-4 w-4 text-red-500" />}
            
            <span className="font-medium">
              {loading ? 'Loading...' : data ? 'Success' : error ? 'Error' : 'Ready'}
            </span>
          </div>

          {/* Data */}
          {data && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800">{data}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800">{error.message || 'An error occurred'}</p>
            </div>
          )}

          {/* Retry Status */}
          <RetryStatus retryState={retryState} maxAttempts={3} />

          {/* Auto Retry Indicator */}
          {retryState.isRetrying && (
            <AutoRetryIndicator
              isRetrying={retryState.isRetrying}
              attempt={retryState.attempt}
              maxAttempts={3}
            />
          )}

          {/* Manual Retry Button */}
          {error && canRetry && (
            <RetryButton
              onRetry={handleManualRetry}
              maxAttempts={3}
              showCountdown={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Service Status Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>
            Monitor API service health and controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Circuit Breaker:</span>
              <Badge variant={circuitBreakerState === 'CLOSED' ? 'default' : 'destructive'}>
                {circuitBreakerState}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rate Limit:</span>
              <Badge variant={rateLimitStatus.allowed ? 'default' : 'destructive'}>
                {rateLimitStatus.allowed ? 'OK' : 'Limited'}
              </Badge>
            </div>

            {rateLimitStatus.timeUntilReset > 0 && (
              <p className="text-xs text-gray-600">
                Reset in {Math.ceil(rateLimitStatus.timeUntilReset / 1000)} seconds
              </p>
            )}

            <ApiStatusIndicator showDetails={true} />
          </div>
        </CardContent>
      </Card>

      {/* Implementation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Automatic Retry</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Exponential backoff with jitter</li>
                <li>• Configurable max attempts</li>
                <li>• Smart retry conditions</li>
                <li>• Rate limiting awareness</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Manual Retry</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• User-initiated retry</li>
                <li>• Countdown timers</li>
                <li>• Attempt tracking</li>
                <li>• State management</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Circuit Breaker</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Prevents cascading failures</li>
                <li>• Automatic recovery</li>
                <li>• Configurable thresholds</li>
                <li>• Manual reset capability</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Rate Limiting</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Request throttling</li>
                <li>• Sliding window</li>
                <li>• Retry-After header support</li>
                <li>• Backoff strategies</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RetryMechanismExample;