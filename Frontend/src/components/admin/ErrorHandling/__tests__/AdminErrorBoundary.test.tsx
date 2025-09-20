import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminErrorBoundary } from '../AdminErrorBoundary';

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

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('AdminErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
      userId: 'test-user-id',
      token: 'test-token',
      role: 'admin'
    }));
    mockSessionStorage.getItem.mockReturnValue('test-session-id');
    
    // Mock fetch to resolve successfully
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();

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
    expect(screen.getByText(/admin-error-/)).toBeInTheDocument();

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
    expect(retryButton).toHaveTextContent('3 attempts left');

    consoleSpy.mockRestore();
  });

  it('handles retry functionality', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;

    const { rerender } = render(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </AdminErrorBoundary>
    );

    // Error should be displayed
    expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

    // Click retry
    const retryButton = screen.getByText(/Try Again/);
    fireEvent.click(retryButton);

    // Component should reset and try to render again
    shouldThrow = false;
    rerender(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </AdminErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('reports error to backend', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AdminErrorBoundary>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: expect.stringContaining('Test error message')
      });
    });

    consoleSpy.mockRestore();
  });

  it('handles network errors in error reporting gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock fetch to fail
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AdminErrorBoundary>
    );

    // Should still render error UI even if reporting fails
    expect(screen.getByText('Admin Panel Error')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('shows network error guidance for network errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const NetworkError = () => {
      throw new Error('fetch failed');
    };

    render(
      <AdminErrorBoundary>
        <NetworkError />
      </AdminErrorBoundary>
    );

    expect(screen.getByText(/network connectivity issue/)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('shows permission error guidance for 403 errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const PermissionError = () => {
      throw new Error('403 unauthorized');
    };

    render(
      <AdminErrorBoundary>
        <PermissionError />
      </AdminErrorBoundary>
    );

    expect(screen.getByText(/sufficient permissions/)).toBeInTheDocument();

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

  it('shows technical details when showDetails is true', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AdminErrorBoundary showDetails={true}>
        <ThrowError shouldThrow={true} />
      </AdminErrorBoundary>
    );

    expect(screen.getByText('Technical Details (for developers)')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('calls onError callback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();

    render(
      <AdminErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </AdminErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );

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

  it('decreases retry count with each attempt', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AdminErrorBoundary>
    );

    // First attempt
    expect(screen.getByText(/3 attempts left/)).toBeInTheDocument();

    // Click retry
    fireEvent.click(screen.getByText(/Try Again/));

    // Should still show error (since component still throws)
    expect(screen.getByText(/2 attempts left/)).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('disables retry button after max attempts', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AdminErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AdminErrorBoundary>
    );

    // Exhaust all retry attempts
    fireEvent.click(screen.getByText(/Try Again/));
    fireEvent.click(screen.getByText(/Try Again/));
    fireEvent.click(screen.getByText(/Try Again/));

    // Retry button should no longer be available
    expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});