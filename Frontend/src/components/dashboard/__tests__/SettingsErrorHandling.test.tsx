import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';
import { SettingsErrorHandler, NetworkStatusIndicator, SettingsErrorBoundary } from '@/components/ui/SettingsErrorHandler';
import { useSettingsErrorHandling, useNetworkStatus } from '@/hooks/useSettingsErrorHandling';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/utils/errorHandler', () => ({
  errorHandler: {
    handleError: vi.fn(),
  },
}));

vi.mock('@/utils/serverValidationHandler', () => ({
  handleServerValidationErrors: vi.fn(),
  FORM_FIELD_MAPPINGS: {
    settings: {
      name: 'name',
      email: 'email',
    },
  },
}));

describe('SettingsErrorHandler', () => {
  const mockOnRetry = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no error', () => {
    const { container } = render(
      <SettingsErrorHandler error={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders network error with retry button', () => {
    const error = {
      code: 'NETWORK_ERROR',
      message: 'Connection failed',
      status: 0,
    };

    render(
      <SettingsErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('renders validation error without retry button', () => {
    const error = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      status: 400,
    };

    render(
      <SettingsErrorHandler
        error={error}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Invalid Input')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders authentication error', () => {
    const error = {
      code: 'UNAUTHORIZED',
      message: 'Session expired',
      status: 401,
    };

    render(<SettingsErrorHandler error={error} />);

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.getByText(/Your session has expired/)).toBeInTheDocument();
  });

  it('displays error details when available', () => {
    const error = {
      code: 'SERVER_ERROR',
      message: 'Internal server error',
      status: 500,
      details: { errorId: 'ERR-12345' },
    };

    render(<SettingsErrorHandler error={error} />);

    expect(screen.getByText('Error ID: ERR-12345')).toBeInTheDocument();
  });
});

describe('NetworkStatusIndicator', () => {
  it('shows online status', () => {
    const lastSync = new Date();
    render(<NetworkStatusIndicator isOnline={true} lastSync={lastSync} />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText(/Last sync:/)).toBeInTheDocument();
  });

  it('shows offline status', () => {
    render(<NetworkStatusIndicator isOnline={false} />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.queryByText(/Last sync:/)).not.toBeInTheDocument();
  });
});

describe('SettingsErrorBoundary', () => {
  const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>No error</div>;
  };

  it('renders children when no error', () => {
    render(
      <SettingsErrorBoundary>
        <ThrowError shouldThrow={false} />
      </SettingsErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when error occurs', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SettingsErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SettingsErrorBoundary>
    );

    expect(screen.getByText('Settings Error')).toBeInTheDocument();
    expect(screen.getByText(/An error occurred while loading/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});

// Test component for useSettingsErrorHandling hook
const TestErrorHandlingComponent = () => {
  const {
    error,
    fieldErrors,
    handleError,
    handleValidationError,
    clearError,
    retry,
    canRetry,
  } = useSettingsErrorHandling();

  return (
    <div>
      <div data-testid="error-state">
        {error ? `${error.code}: ${error.message}` : 'No error'}
      </div>
      <div data-testid="field-errors">
        {JSON.stringify(fieldErrors)}
      </div>
      <div data-testid="can-retry">{canRetry.toString()}</div>
      
      <button onClick={() => handleError({ code: 'NETWORK_ERROR', message: 'Network failed' })}>
        Trigger Network Error
      </button>
      <button onClick={() => handleValidationError({ 
        code: 'VALIDATION_ERROR', 
        status: 400,
        details: { name: 'Name is required' }
      })}>
        Trigger Validation Error
      </button>
      <button onClick={clearError}>Clear Error</button>
      <button onClick={() => retry(async () => {})}>Retry</button>
    </div>
  );
};

describe('useSettingsErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles network errors correctly', async () => {
    render(<TestErrorHandlingComponent />);

    const triggerButton = screen.getByText('Trigger Network Error');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toHaveTextContent('NETWORK_ERROR: Network failed');
      expect(screen.getByTestId('can-retry')).toHaveTextContent('true');
    });
  });

  it('handles validation errors correctly', async () => {
    const { handleServerValidationErrors } = await import('@/utils/serverValidationHandler');
    (handleServerValidationErrors as any).mockReturnValue(true);

    render(<TestErrorHandlingComponent />);

    const triggerButton = screen.getByText('Trigger Validation Error');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(handleServerValidationErrors).toHaveBeenCalled();
    });
  });

  it('clears errors correctly', async () => {
    render(<TestErrorHandlingComponent />);

    // Trigger an error first
    const triggerButton = screen.getByText('Trigger Network Error');
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toHaveTextContent('NETWORK_ERROR: Network failed');
    });

    // Clear the error
    const clearButton = screen.getByText('Clear Error');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toHaveTextContent('No error');
    });
  });
});

// Test component for useNetworkStatus hook
const TestNetworkStatusComponent = () => {
  const { isOnline, lastSync } = useNetworkStatus();

  return (
    <div>
      <div data-testid="online-status">{isOnline.toString()}</div>
      <div data-testid="last-sync">{lastSync?.toISOString() || 'null'}</div>
    </div>
  );
};

describe('useNetworkStatus', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
  });

  it('detects online status', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    render(<TestNetworkStatusComponent />);
    expect(screen.getByTestId('online-status')).toHaveTextContent('true');
  });

  it('detects offline status', () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<TestNetworkStatusComponent />);
    expect(screen.getByTestId('online-status')).toHaveTextContent('false');
  });

  it('updates status on network events', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<TestNetworkStatusComponent />);
    expect(screen.getByTestId('online-status')).toHaveTextContent('false');

    // Simulate going online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    fireEvent(window, new Event('online'));

    await waitFor(() => {
      expect(screen.getByTestId('online-status')).toHaveTextContent('true');
      expect(screen.getByTestId('last-sync')).not.toHaveTextContent('null');
    });
  });
});

export default {};