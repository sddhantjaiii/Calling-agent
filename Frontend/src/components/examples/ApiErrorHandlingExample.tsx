import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/services/apiService';
import { useErrorHandler } from '@/utils/errorHandler';

/**
 * Example component demonstrating centralized API error handling
 */
export function ApiErrorHandlingExample() {
  const [loading, setLoading] = useState(false);
  const { handleError, withErrorHandling } = useErrorHandler();

  // Example of manual error handling
  const handleManualError = async () => {
    setLoading(true);
    try {
      // This will trigger a 404 error
      await apiService.getAgent('nonexistent-id');
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // Example of automatic error handling with wrapper
  const handleAutoError = withErrorHandling(async () => {
    setLoading(true);
    try {
      // This will trigger a validation error
      await apiService.createAgent({
        name: '', // Empty name should trigger validation error
        agentType: 'call',
        elevenlabsAgentId: '',
      });
    } finally {
      setLoading(false);
    }
  });

  // Example of network error
  const handleNetworkError = async () => {
    setLoading(true);
    try {
      // Simulate network error by calling invalid endpoint
      await fetch('http://invalid-url.com/api/test');
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // Example of authentication error
  const handleAuthError = async () => {
    setLoading(true);
    try {
      // Clear token to simulate auth error
      localStorage.removeItem('auth_token');
      await apiService.getAgents();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // Example of server error
  const handleServerError = async () => {
    setLoading(true);
    try {
      // This would typically be a 500 error from the server
      const mockServerError = {
        status: 500,
        message: 'Internal server error',
        code: 'SERVER_ERROR',
      };
      throw mockServerError;
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Error Handling Examples</CardTitle>
          <CardDescription>
            Click the buttons below to see different types of error handling in action.
            Each error will be processed by the centralized error handler and display
            appropriate user-friendly messages with action suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleManualError}
              disabled={loading}
              variant="outline"
            >
              Test 404 Error (Manual Handling)
            </Button>

            <Button
              onClick={handleAutoError}
              disabled={loading}
              variant="outline"
            >
              Test Validation Error (Auto Handling)
            </Button>

            <Button
              onClick={handleNetworkError}
              disabled={loading}
              variant="outline"
            >
              Test Network Error
            </Button>

            <Button
              onClick={handleAuthError}
              disabled={loading}
              variant="outline"
            >
              Test Auth Error
            </Button>

            <Button
              onClick={handleServerError}
              disabled={loading}
              variant="outline"
            >
              Test Server Error
            </Button>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Error Handling Features:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Centralized error processing with consistent user messages</li>
              <li>• Automatic authentication error handling with logout</li>
              <li>• User-friendly error messages mapped from backend error codes</li>
              <li>• Retry mechanisms for retryable errors</li>
              <li>• Different severity levels with appropriate durations</li>
              <li>• Action suggestions to help users resolve issues</li>
              <li>• Comprehensive error logging for debugging</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ApiErrorHandlingExample;