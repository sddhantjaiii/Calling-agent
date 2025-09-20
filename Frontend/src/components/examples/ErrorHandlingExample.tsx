import React, { useState } from 'react';
import { useErrorHandler } from '@/utils/errorHandler';
import ErrorBoundary from '../ErrorBoundary';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';
import { SkeletonCard, SkeletonList } from '../ui/SkeletonLoader';

// Example component that demonstrates error handling
const ErrorProneComponent: React.FC<{ shouldThrow?: boolean; errorType?: string }> = ({ 
  shouldThrow = false, 
  errorType = 'generic' 
}) => {
  if (shouldThrow) {
    if (errorType === 'network') {
      throw new TypeError('fetch failed');
    } else if (errorType === 'auth') {
      throw { status: 401, message: 'Unauthorized', code: 'UNAUTHORIZED' };
    } else if (errorType === 'validation') {
      throw { 
        status: 400, 
        message: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: { email: ['Email is required'] }
      };
    } else {
      throw new Error('Something went wrong');
    }
  }
  
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
      <p className="text-green-800">Component loaded successfully!</p>
    </div>
  );
};

const ErrorHandlingExample: React.FC = () => {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [errorType, setErrorType] = useState('generic');
  const [loading, setLoading] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const { handleError, withErrorHandling } = useErrorHandler();

  // Example async function with error handling
  const simulateApiCall = withErrorHandling(async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Use crypto.getRandomValues() for better randomness in examples
    let shouldThrowError: boolean;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const randomArray = new Uint8Array(1);
      crypto.getRandomValues(randomArray);
      shouldThrowError = randomArray[0] > 127;
    } else {
      shouldThrowError = Math.random() > 0.5;
    }
    
    if (shouldThrowError) {
      throw new Error('Random API error');
    }
    
    setLoading(false);
    return 'API call successful';
  });

  const handleManualError = () => {
    try {
      throw new Error('Manual error for testing');
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Error Handling Examples
        </h1>
        <p className="text-gray-600">
          Demonstration of error boundaries, loading states, and error handling utilities
        </p>
      </div>

      {/* Error Boundary Example */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Error Boundary</h2>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShouldThrow(!shouldThrow)}
              className={`px-4 py-2 rounded-md text-white ${
                shouldThrow ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {shouldThrow ? 'Stop Throwing' : 'Throw Error'}
            </button>
            
            <select
              value={errorType}
              onChange={(e) => setErrorType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="generic">Generic Error</option>
              <option value="network">Network Error</option>
              <option value="auth">Auth Error</option>
              <option value="validation">Validation Error</option>
            </select>
          </div>

          <ErrorBoundary>
            <ErrorProneComponent shouldThrow={shouldThrow} errorType={errorType} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Manual Error Handling */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Manual Error Handling</h2>
        <div className="space-y-4">
          <button
            onClick={handleManualError}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Trigger Manual Error
          </button>
          
          <button
            onClick={simulateApiCall}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Simulate API Call'}
          </button>
        </div>
      </div>

      {/* Loading States */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Loading States</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setShowSkeleton(!showSkeleton)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Toggle Skeleton
            </button>
          </div>

          {showSkeleton ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonList items={3} />
            </div>
          ) : (
            <div className="space-y-4">
              <LoadingSpinner size="sm" text="Small spinner" />
              <LoadingSpinner size="md" text="Medium spinner" />
              <LoadingSpinner size="lg" text="Large spinner" />
            </div>
          )}
        </div>
      </div>

      {/* Empty States */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Empty States</h2>
        <div className="space-y-4">
          <button
            onClick={() => setShowEmpty(!showEmpty)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Toggle Empty State
          </button>

          {showEmpty && (
            <EmptyState
              title="No data found"
              description="There are no items to display. Try creating a new item or adjusting your filters."
              action={{
                label: 'Create New Item',
                onClick: () => setShowEmpty(false),
              }}
            />
          )}
        </div>
      </div>

      {/* Custom Error Boundary with Fallback */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Custom Error Fallback</h2>
        <ErrorBoundary
          fallback={
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800">Custom error fallback UI</p>
            </div>
          }
        >
          <ErrorProneComponent shouldThrow={shouldThrow} errorType={errorType} />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default ErrorHandlingExample;