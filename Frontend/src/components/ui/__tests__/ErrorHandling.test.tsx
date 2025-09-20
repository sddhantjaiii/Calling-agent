import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundaryWrapper } from '../ErrorBoundaryWrapper';
import ErrorHandler from '../ErrorHandler';
import LoadingSpinner from '../LoadingStates';
import { NoDataAvailable, LoadingFailed } from '../EmptyStateComponents';

// Mock components that throw errors
const ThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Component loaded successfully</div>;
};

const NetworkErrorComponent: React.FC = () => {
  throw new Error('fetch failed');
};

const AuthErrorComponent: React.FC = () => {
  const error = new Error('Unauthorized');
  (error as any).status = 401;
  throw error;
};

describe('Error Handling Components', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('ErrorBoundaryWrapper', () => {
    it('should catch and display errors', () => {
      renderWithQueryClient(
        <ErrorBoundaryWrapper>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      renderWithQueryClient(
        <ErrorBoundaryWrapper>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundaryWrapper>
      );

      expect(screen.getByText('Component loaded successfully')).toBeInTheDocument();
    });

    it('should show custom error message', () => {
      renderWithQueryClient(
        <ErrorBoundaryWrapper
          fallbackTitle="Custom Error"
          fallbackDescription="Custom error description"
        >
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      );

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('Custom error description')).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      renderWithQueryClient(
        <ErrorBoundaryWrapper onRetry={onRetry}>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      );

      fireEvent.click(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorHandler', () => {
    it('should display network error correctly', () => {
      renderWithQueryClient(
        <ErrorHandler error="fetch failed" />
      );

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
    });

    it('should display auth error correctly', () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      
      renderWithQueryClient(
        <ErrorHandler error={authError} />
      );

      expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      expect(screen.getByText(/Your session has expired/)).toBeInTheDocument();
    });

    it('should handle retry functionality', async () => {
      const onRetry = vi.fn().mockResolvedValue(undefined);
      renderWithQueryClient(
        <ErrorHandler error="Test error" onRetry={onRetry} />
      );

      fireEvent.click(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should show compact error display', () => {
      renderWithQueryClient(
        <ErrorHandler error="Test error" compact={true} />
      );

      expect(screen.getByText('Unexpected Error')).toBeInTheDocument();
      // Should be more compact layout
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should handle maximum retries', async () => {
      const onRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));
      renderWithQueryClient(
        <ErrorHandler error="Test error" onRetry={onRetry} maxRetries={2} />
      );

      // First retry
      fireEvent.click(screen.getByText('Try Again'));
      await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));

      // Second retry
      fireEvent.click(screen.getByText('Try Again'));
      await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(2));

      // Should disable retry after max attempts
      await waitFor(() => {
        const retryButton = screen.queryByText('Try Again');
        expect(retryButton).toBeNull();
      });
    });
  });

  describe('LoadingSpinner', () => {
    it('should render with default props', () => {
      renderWithQueryClient(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toBeInTheDocument();
    });

    it('should render with text', () => {
      renderWithQueryClient(<LoadingSpinner text="Loading data..." />);
      
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should apply size classes correctly', () => {
      renderWithQueryClient(<LoadingSpinner size="lg" />);
      
      const spinner = screen.getByRole('status', { hidden: true });
      expect(spinner).toHaveClass('h-8', 'w-8');
    });
  });

  describe('Empty State Components', () => {
    it('should render NoDataAvailable', () => {
      renderWithQueryClient(<NoDataAvailable />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByText(/Data will appear here once you have interactions/)).toBeInTheDocument();
    });

    it('should render NoDataAvailable with refresh button', () => {
      const onRefresh = vi.fn();
      renderWithQueryClient(<NoDataAvailable onRefresh={onRefresh} />);
      
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();
      
      fireEvent.click(refreshButton);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should render LoadingFailed with retry', () => {
      const onRetry = vi.fn();
      renderWithQueryClient(
        <LoadingFailed 
          onRetry={onRetry} 
          error="Network error" 
          entityType="dashboard data" 
        />
      );
      
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
      
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle error boundary with retry functionality', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Integration test error');
        }
        return <div>Success after retry</div>;
      };

      const onRetry = vi.fn(() => {
        shouldThrow = false;
      });

      renderWithQueryClient(
        <ErrorBoundaryWrapper onRetry={onRetry}>
          <TestComponent />
        </ErrorBoundaryWrapper>
      );

      // Should show error initially
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click retry
      fireEvent.click(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should handle loading states properly', () => {
      const { rerender } = renderWithQueryClient(
        <LoadingSpinner text="Loading..." />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Simulate loading complete
      rerender(<div>Data loaded</div>);
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });
});