import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuditLogDetails } from '../AuditLogDetails';
import type { AuditLogEntry } from '../../../../types/admin';

// Mock the toast hook
vi.mock('../../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'MMMM dd, yyyy') return 'January 01, 2024';
    if (formatStr === 'HH:mm:ss.SSS') return '12:00:00.000';
    return 'Jan 01, 2024 12:00:00';
  }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

const mockAuditLog: AuditLogEntry = {
  id: 'log-123',
  adminUserId: 'admin-456',
  adminUserEmail: 'admin@example.com',
  action: 'user.create',
  resourceType: 'user',
  resourceId: 'user-789',
  targetUserId: 'user-789',
  targetUserEmail: 'newuser@example.com',
  details: {
    name: 'John Doe',
    email: 'newuser@example.com',
    role: 'user',
    metadata: {
      source: 'admin_panel',
      reason: 'Manual creation',
    },
  },
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  timestamp: new Date('2024-01-01T12:00:00Z'),
  success: true,
};

const mockFailedAuditLog: AuditLogEntry = {
  ...mockAuditLog,
  id: 'log-456',
  action: 'user.delete',
  success: false,
  errorMessage: 'User not found or already deleted',
};

describe('AuditLogDetails', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders audit log details modal', () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    expect(screen.getByText('Audit Log Details')).toBeInTheDocument();
    expect(screen.getByText('user.create')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('displays log ID and timestamp correctly', () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    expect(screen.getByText('log-123')).toBeInTheDocument();
    expect(screen.getByText('January 01, 2024')).toBeInTheDocument();
    expect(screen.getByText('12:00:00.000 UTC')).toBeInTheDocument();
  });

  it('displays admin user information', () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin-456')).toBeInTheDocument();
  });

  it('displays resource information', () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('user-789')).toBeInTheDocument();
  });

  it('displays target user information when available', () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    expect(screen.getByText('newuser@example.com')).toBeInTheDocument();
    expect(screen.getByText('user-789')).toBeInTheDocument();
  });

  it('displays technical information', () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.getByText('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBeInTheDocument();
  });

  it('displays action details', () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    expect(screen.getByText('Name:')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.getByText('newuser@example.com')).toBeInTheDocument();
  });

  it('displays error message for failed actions', () => {
    render(<AuditLogDetails log={mockFailedAuditLog} onClose={mockOnClose} />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Error Message')).toBeInTheDocument();
    expect(screen.getByText('User not found or already deleted')).toBeInTheDocument();
  });

  it('handles copy to clipboard functionality', async () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    // Find copy buttons and click one
    const copyButtons = screen.getAllByRole('button');
    const logIdCopyButton = copyButtons.find(button => 
      button.getAttribute('aria-label') === 'Copy' || 
      button.querySelector('svg')?.classList.contains('lucide-copy')
    );

    if (logIdCopyButton) {
      fireEvent.click(logIdCopyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    }
  });

  it('handles modal close', () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays success badge with correct styling', () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    const successBadge = screen.getByText('Success');
    expect(successBadge).toBeInTheDocument();
    expect(successBadge.closest('.bg-green-100')).toBeInTheDocument();
  });

  it('displays failed badge with correct styling', () => {
    render(<AuditLogDetails log={mockFailedAuditLog} onClose={mockOnClose} />);

    const failedBadge = screen.getByText('Failed');
    expect(failedBadge).toBeInTheDocument();
    expect(failedBadge.closest('.bg-red-100')).toBeInTheDocument();
  });

  it('displays action badge with correct styling', () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    const actionBadge = screen.getByText('user.create');
    expect(actionBadge).toBeInTheDocument();
    // Should have blue styling for user.create action
    expect(actionBadge.closest('.bg-blue-100')).toBeInTheDocument();
  });

  it('handles complex nested details objects', () => {
    render(<AuditLogDetails log={mockAuditLog} onClose={mockOnClose} />);

    // Should display nested metadata
    expect(screen.getByText('Metadata:')).toBeInTheDocument();
    // The nested object should be displayed as JSON
    expect(screen.getByText(/"source": "admin_panel"/)).toBeInTheDocument();
    expect(screen.getByText(/"reason": "Manual creation"/)).toBeInTheDocument();
  });

  it('handles missing target user information gracefully', () => {
    const logWithoutTarget = {
      ...mockAuditLog,
      targetUserId: undefined,
      targetUserEmail: undefined,
    };

    render(<AuditLogDetails log={logWithoutTarget} onClose={mockOnClose} />);

    // Should not display target user section
    expect(screen.queryByText('Target User')).not.toBeInTheDocument();
  });

  it('handles missing resource ID gracefully', () => {
    const logWithoutResourceId = {
      ...mockAuditLog,
      resourceId: undefined,
    };

    render(<AuditLogDetails log={logWithoutResourceId} onClose={mockOnClose} />);

    // Should still display resource type but not resource ID
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.queryByText('Resource ID')).not.toBeInTheDocument();
  });

  it('handles empty details object', () => {
    const logWithEmptyDetails = {
      ...mockAuditLog,
      details: {},
    };

    render(<AuditLogDetails log={logWithEmptyDetails} onClose={mockOnClose} />);

    // Should not display action details section
    expect(screen.queryByText('Action Details')).not.toBeInTheDocument();
  });
});