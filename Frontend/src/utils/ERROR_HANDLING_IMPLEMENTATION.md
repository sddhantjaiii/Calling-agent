# API Error Handling Implementation

## Overview

This document describes the comprehensive API error handling system implemented for the frontend application. The system provides centralized error processing, user-friendly messaging, automatic authentication handling, and consistent error reporting.

## Architecture

### Components

1. **Error Handler (`errorHandler.ts`)** - Centralized error processing singleton
2. **Error Mapping (`errorMapping.ts`)** - Error code to message mapping utility
3. **API Service Integration** - Automatic error handling in API calls
4. **Authentication Context Integration** - Automatic logout on auth errors

### Key Features

- **Centralized Error Processing**: All errors are processed through a single handler
- **User-Friendly Messages**: Backend error codes are mapped to readable messages
- **Automatic Authentication Handling**: Auth errors trigger automatic logout
- **Retry Mechanisms**: Retryable errors show retry options
- **Severity-Based Handling**: Different error severities get different treatment
- **Comprehensive Logging**: All errors are logged for debugging and monitoring

## Error Categories

### Authentication Errors
- `UNAUTHORIZED` - User not authenticated
- `TOKEN_EXPIRED` - Session expired
- `FORBIDDEN` - Insufficient permissions
- `ACCOUNT_LOCKED` - Account temporarily locked

### Validation Errors
- `VALIDATION_ERROR` - General validation failure
- `INVALID_EMAIL` - Invalid email format
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `REQUIRED_FIELD` - Missing required field

### Network Errors
- `NETWORK_ERROR` - Connection failure
- `TIMEOUT_ERROR` - Request timeout

### Business Logic Errors
- `INSUFFICIENT_CREDITS` - Not enough credits
- `AGENT_LIMIT_EXCEEDED` - Too many agents
- `RATE_LIMITED` - Too many requests

### Server Errors
- `SERVER_ERROR` - Internal server error
- `SERVICE_UNAVAILABLE` - Service temporarily down
- `BAD_GATEWAY` - Gateway error

### Payment Errors
- `PAYMENT_FAILED` - Payment processing failed
- `CARD_DECLINED` - Card was declined
- `INSUFFICIENT_FUNDS` - Not enough funds

### File Upload Errors
- `FILE_TOO_LARGE` - File exceeds size limit
- `INVALID_FILE_TYPE` - Unsupported file format
- `UPLOAD_FAILED` - Upload process failed

### Integration Errors
- `ELEVENLABS_ERROR` - ElevenLabs service error
- `VOICE_NOT_FOUND` - Voice not available
- `AGENT_CONNECTION_FAILED` - Agent service connection failed

## Usage

### Basic Error Handling

```typescript
import { useErrorHandler } from '@/utils/errorHandler';

function MyComponent() {
  const { handleError } = useErrorHandler();

  const handleApiCall = async () => {
    try {
      await apiService.someMethod();
    } catch (error) {
      handleError(error);
    }
  };
}
```

### Automatic Error Handling

```typescript
import { withErrorHandling } from '@/utils/errorHandler';

const handleApiCall = withErrorHandling(async () => {
  await apiService.someMethod();
});
```

### API Service Integration

The API service automatically handles errors through interceptors:

```typescript
// Errors are automatically processed and displayed to users
const agents = await apiService.getAgents();
```

## Error Flow

1. **Error Occurs**: API call fails or throws error
2. **Error Normalization**: Error is converted to standard format
3. **Error Mapping**: Error code is mapped to user-friendly message
4. **User Notification**: Toast notification is displayed with message and actions
5. **Special Handling**: Auth errors trigger logout, retryable errors show retry options
6. **Logging**: Error is logged for debugging and monitoring

## Configuration

### Error Mapping

Error mappings are defined in `errorMapping.ts`:

```typescript
export const ERROR_MAPPINGS: Record<string, ErrorMapping> = {
  'UNAUTHORIZED': {
    code: 'UNAUTHORIZED',
    message: 'You are not authorized to perform this action. Please log in again.',
    category: 'auth',
    severity: 'high',
    retryable: false,
    userAction: 'Please log in again to continue.',
  },
  // ... more mappings
};
```

### API Service Configuration

The API service is configured with interceptors:

```typescript
// Authentication error interceptor
apiService.addErrorInterceptor(async (error: ApiServiceError) => {
  if (error.code === 'UNAUTHORIZED' || error.code === 'TOKEN_EXPIRED') {
    localStorage.removeItem('auth_token');
    const authErrorEvent = new CustomEvent('auth-error', { detail: error });
    window.dispatchEvent(authErrorEvent);
  }
  return error;
});
```

## Authentication Integration

### Automatic Logout

When authentication errors occur:

1. Token is removed from localStorage
2. Auth error event is dispatched
3. AuthContext listens for the event and triggers logout
4. User is redirected to login page

### Event-Based Communication

```typescript
// API Service dispatches auth error event
const authErrorEvent = new CustomEvent('auth-error', { detail: error });
window.dispatchEvent(authErrorEvent);

// AuthContext listens for auth error events
window.addEventListener('auth-error', handleAuthError);
```

## Error Severity Levels

- **Low**: Validation errors, minor issues
- **Medium**: Business logic errors, conflicts
- **High**: Authentication errors, server errors, network issues
- **Critical**: System failures, security issues

### Severity-Based Behavior

- **Low/Medium**: 5-6 second toast duration
- **High**: 8 second toast duration
- **Retryable**: Show retry button
- **Non-retryable**: Show appropriate action suggestion

## Monitoring and Logging

### Development Logging

```typescript
console.group('🚨 Error Handler');
console.error('Error:', error);
console.error('Details:', errorDetails);
console.groupEnd();
```

### Production Monitoring

```typescript
// Send to monitoring service
fetch('/api/errors', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(errorDetails),
});
```

## Testing

### Unit Tests

- Error handler functionality
- Error mapping utilities
- API service error handling
- Authentication integration

### Integration Tests

- End-to-end error flows
- Authentication error handling
- User experience testing

## Best Practices

### For Developers

1. **Use Centralized Handling**: Always use the error handler for consistent UX
2. **Provide Context**: Include relevant error details for debugging
3. **Test Error Scenarios**: Test both success and failure paths
4. **Update Mappings**: Add new error codes to the mapping as needed

### For Error Messages

1. **Be User-Friendly**: Use plain language, avoid technical jargon
2. **Be Actionable**: Tell users what they can do to resolve the issue
3. **Be Specific**: Provide specific guidance when possible
4. **Be Consistent**: Use consistent tone and format across all messages

## Future Enhancements

### Planned Features

1. **Error Analytics**: Track error frequency and patterns
2. **User Feedback**: Allow users to report error handling issues
3. **Contextual Help**: Show relevant help articles for specific errors
4. **Offline Handling**: Better handling of offline scenarios
5. **Progressive Enhancement**: Graceful degradation for different error types

### Monitoring Improvements

1. **Error Dashboards**: Real-time error monitoring
2. **Alert System**: Notifications for critical errors
3. **User Impact Tracking**: Measure error impact on user experience
4. **Performance Metrics**: Track error handling performance

## Troubleshooting

### Common Issues

1. **Errors Not Showing**: Check if error handler is properly initialized
2. **Wrong Messages**: Verify error code mapping in errorMapping.ts
3. **Auth Not Working**: Check event listener setup in AuthContext
4. **Retry Not Working**: Verify isRetryableError configuration

### Debug Steps

1. Check browser console for error logs
2. Verify error code in network tab
3. Check error mapping configuration
4. Test with different error scenarios
5. Verify toast notifications are working

## Migration Guide

### From Previous Error Handling

1. Replace manual error handling with centralized handler
2. Update error messages to use error mapping
3. Remove duplicate error handling code
4. Test all error scenarios
5. Update tests to use new error handling

### Breaking Changes

- Error messages may change due to centralized mapping
- Authentication errors now trigger automatic logout
- Some error codes may be normalized differently
- Toast notification format may be different

## API Reference

### ErrorHandler

```typescript
class ErrorHandler {
  static getInstance(): ErrorHandler
  setAuthErrorHandler(handler: () => void): void
  handleError(error: unknown): void
}
```

### Error Mapping Functions

```typescript
function getErrorMessage(code: string, defaultMessage?: string): string
function getUserActionSuggestion(code: string): string | undefined
function isRetryableError(code: string): boolean
function getErrorSeverity(code: string): 'low' | 'medium' | 'high' | 'critical'
function mapStatusToErrorCode(status: number, responseCode?: string): string
```

### React Hooks

```typescript
function useErrorHandler(): {
  handleError: (error: unknown) => void
  handleAsyncError: (error: unknown) => void
  withErrorHandling: <T extends (...args: any[]) => Promise<any>>(fn: T) => T
}
```