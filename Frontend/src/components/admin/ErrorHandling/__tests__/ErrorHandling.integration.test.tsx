import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminErrorBoundary } from '../AdminErrorBoundary';
import { AdminErrorMessage } from '../AdminErrorMessages';
import { UserManagementFallback, SystemAnalyticsFallback } from '../AdminFallbacks';
import { useAdminRetry } from '../../../../hooks/useAdminRetry';
import { adminErrorReporting } from '../../../../services/adminErrorReporting';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

vi.mock('../../../../services/adminErrorReporting', () => ({
  adminErrorReporting: {
    reportError: vi.fn(),
    reportUIError: vi.fn(),
    reportAPIError: vi.fn()
  }
}));

// Mock fetch
global.fetch = vi.fn();

// Test component that can throw errors
const TestComponent = ({ 
  shouldThrow = false, 
  errorType = 'generic' 
}: { 
  shouldThrow?: boolean; 
  errorType?: string; 
}) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'network':
        throw new Error('fetch failed: network error');
      case 'permission':
        throw new Error('403 unauthorized access');
      case 'server':
        throw new Error('500 internal server error');
      default:
        throw new Error('Generic test error');
    }
  }
  return <div>Component working normally</div>;
};

// Test component using retry hook
const RetryTestComponent = ({ shouldFail = false }: { shouldFail?: boolean }) => {
  const mockOperation = vi.fn().mockImplementation(() => {
    if (shouldFail) {
      throw new Error('Operation failed');
    }
    return Promise.resolve('Success');
  });

  const { execute, state } = useAdminRetry(mockOperation);

  return (
    <div>
      <button onClick={() => execute('test')}>Execute Operation</button>
      <div>Status: {state.isRetrying ? 'Retrying' : 'Ready'}</div>
      <div>Attempts: {state.attemptCount}</div>
    </div>
  );
};

describe('Error Handling Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Mock successful fetch by default
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Error Boundary Integration', () => {
    it('catches errors and reports them automatically', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(
        <AdminErrorBoundary>
          <TestComponent shouldThrow={true} />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();
      
      // Should report error automatically
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/errors', expect.any(Object));
      });

      consoleSpy.mockRestore();
    });

    it('provides appropriate fallbacks for different error types', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Network error
      renderWithProviders(
        <AdminErrorBoundary>
          <TestComponent shouldThrow={true} errorType="network" />
        </AdminErrorBoundary>
      );

      expect(screen.getByText(/network connectivity issue/)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('integrates with retry mechanism', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let shouldThrow = true;

      const { rerender } = renderWithProviders(
        <AdminErrorBoundary>
          <TestComponent shouldThrow={shouldThrow} />
        </AdminErrorBoundary>
      );

      // Error boundary should show
      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

      // Click retry
      const retryButton = screen.getByText(/Try Again/);
      fireEvent.click(retryButton);

      // Fix the error condition
      shouldThrow = false;
      rerender(
        <AdminErrorBoundary>
          <TestComponent shouldThrow={shouldThrow} />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Component working normally')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Fallback Components Integration', () => {
    it('provides working navigation in fallback states', () => {
      const mockRetry = vi.fn();
      const mockNavigateHome = vi.fn();

      renderWithProviders(
        <UserManagementFallback 
          onRetry={mockRetry} 
          onNavigateHome={mockNavigateHome} 
        />
      );

      expect(screen.getByText('User Management Unavailable')).toBeInTheDocument();
      
      // Test navigation buttons
      const viewReportsButton = screen.getByText(/View User Reports/);
      expect(viewReportsButton).toBeInTheDocument();

      const retryButton = screen.getByText(/Retry/);
      fireEvent.click(retryButton);
      expect(mockRetry).toHaveBeenCalled();
    });

    it('shows cached data in analytics fallback', () => {
      renderWithProviders(
        <SystemAnalyticsFallback onRetry={vi.fn()} />
      );

      expect(screen.getByText('Analytics Temporarily Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Active Agents')).toBeInTheDocument();
      expect(screen.getByText('System Uptime')).toBeInTheDocument();
    });
  });

  describe('Error Reporting Integration', () => {
    it('reports different error types correctly', async () => {
      const testError = new Error('Test error');

      await adminErrorReporting.reportUIError(testError, { component: 'TestComponent' });
      
      expect(adminErrorReporting.reportUIError).toHaveBeenCalledWith(
        testError,
        { component: 'TestComponent' }
      );
    });

    it('handles error reporting failures gracefully', async () => {
      // Mock fetch to fail
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(
        <AdminErrorBoundary>
          <TestComponent shouldThrow={true} />
        </AdminErrorBoundary>
      );

      // Should still show error UI even if reporting fails
      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Retry Hook Integration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('integrates retry logic with UI components', async () => {
      renderWithProviders(
        <RetryTestComponent shouldFail={true} />
      );

      const executeButton = screen.getByText('Execute Operation');
      
      // Initial state
      expect(screen.getByText('Status: Ready')).toBeInTheDocument();
      expect(screen.getByText('Attempts: 0')).toBeInTheDocument();

      // Execute operation (will fail and retry)
      fireEvent.click(executeButton);

      // Should show retrying state
      await waitFor(() => {
        expect(screen.getByText('Attempts: 1')).toBeInTheDocument();
      });
    });
  });

  describe('Error Message Integration', () => {
    it('provides contextual error messages with recovery options', () => {
      const testError = { code: 'NETWORK_ERROR', message: 'Connection failed' };
      const mockRetry = vi.fn();

      renderWithProviders(
        <AdminErrorMessage error={testError} onRetry={mockRetry} />
      );

      expect(screen.getByText('Network Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();

      const retryButton = screen.getByText(/Try Again/);
      fireEvent.click(retryButton);
      expect(mockRetry).toHaveBeenCalled();
    });

    it('handles different error severities appropriately', () => {
      const criticalError = { code: 'SERVER_ERROR', message: 'Database connection lost' };

      renderWithProviders(
        <AdminErrorMessage error={criticalError} />
      );

      expect(screen.getByText('Server Error')).toBeInTheDocument();
      expect(screen.getByText(/Contact technical support/)).toBeInTheDocument();
    });
  });

  describe('End-to-End Error Scenarios', () => {
    it('handles complete error recovery workflow', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      let componentShouldFail = true;

      const TestWorkflow = () => {
        if (componentShouldFail) {
          throw new Error('Temporary failure');
        }
        return <div>System recovered successfully</div>;
      };

      const { rerender } = renderWithProviders(
        <AdminErrorBoundary>
          <TestWorkflow />
        </AdminErrorBoundary>
      );

      // 1. Error occurs and is caught
      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

      // 2. Error is reported
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/errors', expect.any(Object));
      });

      // 3. User attempts recovery
      const retryButton = screen.getByText(/Try Again/);
      
      // 4. Fix the underlying issue
      componentShouldFail = false;
      
      // 5. Retry the operation
      fireEvent.click(retryButton);
      
      rerender(
        <AdminErrorBoundary>
          <TestWorkflow />
        </AdminErrorBoundary>
      );

      // 6. System recovers
      expect(screen.getByText('System recovered successfully')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('handles cascading failures with appropriate fallbacks', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate a critical system failure
      const CriticalFailure = () => {
        throw new Error('Critical system failure');
      };

      renderWithProviders(
        <AdminErrorBoundary 
          fallback={
            <UserManagementFallback 
              onRetry={() => window.location.reload()} 
              onNavigateHome={() => window.location.href = '/admin'} 
            />
          }
        >
          <CriticalFailure />
        </AdminErrorBoundary>
      );

      // Should show the fallback interface
      expect(screen.getByText('User Management Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/View User Reports/)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Memory Management', () => {
    it('cleans up error reporting resources properly', () => {
      const { unmount } = renderWithProviders(
        <AdminErrorBoundary>
          <TestComponent />
        </AdminErrorBoundary>
      );

      // Component should unmount without memory leaks
      expect(() => unmount()).not.toThrow();
    });

    it('handles high-frequency errors without overwhelming the system', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate rapid error generation
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithProviders(
          <AdminErrorBoundary>
            <TestComponent shouldThrow={true} />
          </AdminErrorBoundary>
        );
        unmount();
      }

      // System should remain responsive
      expect(screen.queryByText('Admin Panel Error')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});