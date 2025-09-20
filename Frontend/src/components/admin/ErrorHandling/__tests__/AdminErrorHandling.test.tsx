import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdminErrorBoundary } from '../AdminErrorBoundary';
import { AdminErrorMessage } from '../AdminErrorMessages';
import { AdminGenericFallback } from '../AdminFallbacks';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('Admin Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
      userId: 'test-user-id',
      token: 'test-token'
    }));
    
    // Mock fetch to resolve successfully
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  describe('AdminErrorBoundary', () => {
    it('renders children when there is no error', () => {
      render(
        <AdminErrorBoundary>
          <ThrowError shouldThrow={false} />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('renders error UI when child component throws', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AdminErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();
      expect(screen.getByText(/Something went wrong in the admin interface/)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('displays error ID for support', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AdminErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AdminErrorBoundary>
      );

      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('shows retry button when retries are available', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AdminErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AdminErrorBoundary>
      );

      const retryButton = screen.getByText(/Try Again/);
      expect(retryButton).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('provides navigation options', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AdminErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AdminErrorBoundary>
      );

      expect(screen.getByText(/Go to Admin Home/)).toBeInTheDocument();
      expect(screen.getByText(/Report Bug/)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('renders custom fallback when provided', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const customFallback = <div>Custom error fallback</div>;

      render(
        <AdminErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </AdminErrorBoundary>
      );

      expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
      expect(screen.queryByText('Admin Panel Error')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('AdminErrorMessage', () => {
    it('displays error message with recovery options', () => {
      const testError = { code: 'NETWORK_ERROR', message: 'Connection failed' };
      const mockRetry = vi.fn();

      render(
        <AdminErrorMessage error={testError} onRetry={mockRetry} />
      );

      expect(screen.getByText('Network Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();

      const retryButton = screen.getByText(/Try Again/);
      fireEvent.click(retryButton);
      expect(mockRetry).toHaveBeenCalled();
    });

    it('handles permission errors appropriately', () => {
      const permissionError = { code: 'PERMISSION_DENIED', message: 'Access denied' };

      render(
        <AdminErrorMessage error={permissionError} />
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Contact your system administrator/)).toBeInTheDocument();
    });

    it('handles server errors with appropriate guidance', () => {
      const serverError = { code: 'SERVER_ERROR', message: 'Internal server error' };

      render(
        <AdminErrorMessage error={serverError} />
      );

      expect(screen.getByText('Server Error')).toBeInTheDocument();
      expect(screen.getByText(/Contact technical support/)).toBeInTheDocument();
    });
  });

  describe('AdminGenericFallback', () => {
    it('renders fallback interface with retry option', () => {
      const mockRetry = vi.fn();
      const mockNavigateHome = vi.fn();

      render(
        <AdminGenericFallback 
          onRetry={mockRetry} 
          onNavigateHome={mockNavigateHome} 
        />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      const retryButton = screen.getByText(/Try Again/);
      fireEvent.click(retryButton);
      expect(mockRetry).toHaveBeenCalled();

      const homeButton = screen.getByText(/Go to Admin Home/);
      fireEvent.click(homeButton);
      expect(mockNavigateHome).toHaveBeenCalled();
    });

    it('displays error details when provided', () => {
      const testError = new Error('Detailed error message');

      render(
        <AdminGenericFallback error={testError} />
      );

      expect(screen.getByText('Detailed error message')).toBeInTheDocument();
    });
  });

  describe('Error Recovery Workflows', () => {
    it('provides comprehensive error recovery options', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AdminErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AdminErrorBoundary>
      );

      // Should provide multiple recovery options
      expect(screen.getByText(/Try Again/)).toBeInTheDocument();
      expect(screen.getByText(/Reset Component/)).toBeInTheDocument();
      expect(screen.getByText(/Go to Admin Home/)).toBeInTheDocument();
      expect(screen.getByText(/Report Bug/)).toBeInTheDocument();

      // Should provide user guidance
      expect(screen.getByText(/If the problem persists, try:/)).toBeInTheDocument();
      expect(screen.getByText(/Refreshing the page/)).toBeInTheDocument();
      expect(screen.getByText(/Clearing your browser cache/)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('handles different error types with appropriate messaging', () => {
      const networkError = new Error('fetch failed: network error');
      
      render(
        <AdminErrorMessage error={networkError} />
      );

      expect(screen.getByText('Network Connection Error')).toBeInTheDocument();
      expect(screen.getByText(/Check your internet connection/)).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('provides accessible error interfaces', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AdminErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AdminErrorBoundary>
      );

      // Should have proper ARIA roles and labels
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();

      // Should have keyboard accessible buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });

      consoleSpy.mockRestore();
    });

    it('provides clear and actionable error messages', () => {
      const validationError = { code: 'VALIDATION_ERROR', message: 'Invalid input data' };

      render(
        <AdminErrorMessage error={validationError} />
      );

      expect(screen.getByText('Validation Error')).toBeInTheDocument();
      expect(screen.getByText(/Check all required fields/)).toBeInTheDocument();
      expect(screen.getByText(/Verify data formats/)).toBeInTheDocument();
    });
  });
});