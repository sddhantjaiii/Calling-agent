# Retry Mechanism Implementation

This document describes the comprehensive retry mechanism implementation for the frontend application, addressing task 9.3 from the frontend-backend-integration spec.

## Overview

The retry mechanism provides automatic and manual retry capabilities for API requests with exponential backoff, jitter, rate limiting support, and circuit breaker patterns to handle transient network failures and improve application resilience.

## Features Implemented

### 1. Automatic Retry with Exponential Backoff

**Location**: `Frontend/src/utils/retryMechanism.ts`

- **Exponential Backoff**: Delays increase exponentially (1s, 2s, 4s, 8s, etc.)
- **Jitter**: Random variation added to prevent thundering herd problems
- **Configurable Parameters**: Max attempts, base delay, max delay, exponential base
- **Smart Retry Conditions**: Only retries appropriate error types

```typescript
const result = await retryWithBackoff(apiCall, {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBase: 2,
  jitter: true
});
```

### 2. Manual Retry Options

**Components**: 
- `Frontend/src/components/ui/RetryButton.tsx`
- `Frontend/src/hooks/useApiRetry.ts`

- **User-Initiated Retries**: Manual retry buttons with state tracking
- **Retry State Management**: Tracks attempts, errors, and retry availability
- **Countdown Timers**: Shows time until next retry is allowed
- **Visual Feedback**: Loading states, attempt counters, and status indicators

```typescript
const { retry, canRetry, retryState } = useApiRetry({
  maxAttempts: 3,
  onRetry: (attempt) => console.log(`Retry attempt ${attempt}`)
});
```

### 3. Rate Limiting and Backoff Strategies

**Features**:
- **Rate Limiter**: Prevents too many requests (configurable window and limits)
- **Retry-After Header Support**: Respects server-provided retry delays
- **Sliding Window**: Time-based request tracking
- **Backoff Strategies**: Multiple backoff algorithms available

```typescript
// Rate limiter (100 requests per minute)
const rateLimiter = new RateLimiter(100, 60000);

// Check if request is allowed
if (rateLimiter.isAllowed()) {
  // Make request
}
```

### 4. Circuit Breaker Pattern

**Location**: `Frontend/src/utils/retryMechanism.ts`

- **Failure Threshold**: Opens circuit after configurable number of failures
- **Recovery Timeout**: Automatic recovery after specified time
- **State Management**: CLOSED, OPEN, HALF_OPEN states
- **Manual Reset**: Admin capability to reset circuit breaker

```typescript
const circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 60s recovery

const result = await circuitBreaker.execute(apiCall);
```

## Integration with API Service

### Enhanced Request Method

The API service has been updated to use the retry mechanisms:

```typescript
// Enhanced request with retry, circuit breaker, and rate limiting
private async request<T>(url: string, options: RequestConfig = {}): Promise<ApiResponse<T>> {
  // Check rate limiter
  if (!this.rateLimiter.isAllowed()) {
    throw new ApiServiceError('Rate limit exceeded');
  }

  // Use circuit breaker and retry mechanism
  return this.circuitBreaker.execute(async () => {
    return retryWithBackoff(async () => {
      // Make actual HTTP request
    }, API_RETRY_CONFIG);
  });
}
```

### Retry Configuration

Smart retry conditions based on error types:

```typescript
const API_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBase: 2,
  jitter: true,
  retryCondition: (error: any) => {
    // Don't retry authentication errors
    if (error?.code === 'UNAUTHORIZED') return false;
    
    // Don't retry validation errors
    if (error?.code === 'VALIDATION_ERROR') return false;
    
    // Retry network and server errors
    return isRetryableError(error?.code || 'UNKNOWN_ERROR');
  }
};
```

## User Interface Components

### 1. Retry Button Component

**Features**:
- Automatic retry state management
- Countdown timers for rate-limited retries
- Visual feedback for retry attempts
- Configurable appearance and behavior

```tsx
<RetryButton
  onRetry={handleRetry}
  maxAttempts={3}
  showCountdown={true}
  variant="outline"
/>
```

### 2. API Status Indicator

**Features**:
- Real-time service status monitoring
- Circuit breaker state display
- Rate limit status and reset times
- Manual control buttons for admins

```tsx
<ApiStatusIndicator showDetails={true} />
```

### 3. Retry Status Display

**Features**:
- Current retry attempt tracking
- Error state visualization
- Progress indicators for ongoing retries

```tsx
<RetryStatus 
  retryState={retryState} 
  maxAttempts={3} 
/>
```

## Error Handling Integration

### Retryable Error Classification

Errors are classified based on their retry potential:

```typescript
// Retryable errors
- NETWORK_ERROR: Connection failures
- TIMEOUT_ERROR: Request timeouts
- SERVER_ERROR: 5xx status codes
- RATE_LIMITED: 429 status codes
- SERVICE_UNAVAILABLE: 503 status codes

// Non-retryable errors
- UNAUTHORIZED: 401 authentication failures
- FORBIDDEN: 403 authorization failures
- VALIDATION_ERROR: 400 bad request
- NOT_FOUND: 404 resource not found
```

### Error Handler Integration

The retry mechanism integrates with the centralized error handler:

```typescript
// Automatic error handling with retry awareness
errorHandler.handleError(this.convertToErrorHandlerFormat(error));

// Manual retry options in error messages
toast.error(message, {
  action: isRetryableError(error.code) ? {
    label: 'Retry',
    onClick: () => retryOperation(),
  } : undefined,
});
```

## React Hooks

### useApiRetry Hook

Provides complete retry functionality for React components:

```typescript
const {
  data,
  loading,
  error,
  retryState,
  canRetry,
  retry,
  reset,
  execute
} = useApiRetry<ResponseType>({
  maxAttempts: 3,
  showToasts: true,
  onSuccess: () => console.log('Success'),
  onError: (error) => console.log('Error:', error),
  onRetry: (attempt) => console.log(`Retry ${attempt}`)
});
```

### useApiServiceStatus Hook

Monitors and controls API service health:

```typescript
const {
  circuitBreakerState,
  rateLimitStatus,
  resetCircuitBreaker,
  resetRateLimit
} = useApiServiceStatus();
```

## Testing

### Unit Tests

Comprehensive test coverage for all retry mechanisms:

- **Retry Logic Tests**: Exponential backoff, jitter, max attempts
- **Circuit Breaker Tests**: State transitions, failure thresholds
- **Rate Limiter Tests**: Request limits, time windows, resets
- **Hook Tests**: React hook behavior, state management
- **Integration Tests**: End-to-end retry scenarios

### Test Files

- `Frontend/src/utils/__tests__/retryMechanism.test.ts`
- `Frontend/src/hooks/__tests__/useApiRetry.test.ts`

## Configuration Options

### Global Configuration

```typescript
// API service configuration
const API_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  exponentialBase: 2,
  jitter: true
};

// Circuit breaker configuration
const circuitBreaker = new CircuitBreaker(
  5,      // failure threshold
  60000   // recovery timeout (ms)
);

// Rate limiter configuration
const rateLimiter = new RateLimiter(
  100,    // max requests
  60000   // time window (ms)
);
```

### Per-Request Configuration

```typescript
// Custom retry configuration for specific requests
const result = await apiService.request('/api/data', {
  retries: 5,
  retryDelay: 2000,
  timeout: 60000
});
```

## Performance Considerations

### Optimization Features

1. **Jitter**: Prevents synchronized retry storms
2. **Exponential Backoff**: Reduces server load during outages
3. **Circuit Breaker**: Prevents cascading failures
4. **Rate Limiting**: Protects against abuse
5. **Smart Retry Conditions**: Avoids retrying permanent failures

### Memory Management

- Automatic cleanup of retry timers
- State reset capabilities
- Efficient error tracking
- Minimal memory footprint

## Usage Examples

### Basic Retry Usage

```typescript
// Simple automatic retry
const data = await retryWithBackoff(() => apiService.getData());

// With custom configuration
const data = await retryWithBackoff(() => apiService.getData(), {
  maxAttempts: 5,
  baseDelay: 2000
});
```

### React Component Usage

```tsx
function DataComponent() {
  const { data, loading, error, retry, canRetry } = useApiRetry();

  useEffect(() => {
    execute(() => apiService.getData());
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return (
    <div>
      <p>Error: {error.message}</p>
      {canRetry && <RetryButton onRetry={retry} />}
    </div>
  );
  
  return <div>{data}</div>;
}
```

### Manual Retry Management

```tsx
function ManualRetryExample() {
  const retryManager = new ManualRetryManager({ maxAttempts: 3 });
  
  const handleOperation = async () => {
    try {
      const result = await retryManager.execute(apiCall);
      console.log('Success:', result);
    } catch (error) {
      if (retryManager.canRetry()) {
        // Show retry button
      }
    }
  };
}
```

## Requirements Fulfilled

This implementation addresses the following requirements from task 9.3:

✅ **Automatic retry for transient network failures**
- Exponential backoff with jitter
- Smart retry conditions
- Configurable max attempts

✅ **Manual retry options for failed operations**
- User-initiated retry buttons
- Retry state management
- Visual feedback and countdowns

✅ **Rate limiting and backoff strategies**
- Rate limiter with sliding window
- Retry-After header support
- Multiple backoff algorithms
- Circuit breaker pattern

✅ **Requirements 7.3, 7.5 compliance**
- Comprehensive error handling
- User-friendly retry mechanisms
- Robust failure recovery

## Future Enhancements

Potential improvements for future iterations:

1. **Adaptive Retry**: Machine learning-based retry strategies
2. **Distributed Rate Limiting**: Cross-tab coordination
3. **Retry Analytics**: Success/failure rate tracking
4. **Custom Retry Policies**: Per-endpoint retry configurations
5. **Offline Support**: Queue requests during network outages