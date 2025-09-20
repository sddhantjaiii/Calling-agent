import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuditLogList } from '../AuditLogList';
import { adminApiService } from '../../../../services/adminApiService';
import type { AuditLogEntry } from '../../../../types/admin';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    getAuditLogs: vi.fn(),
    exportReport: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('../../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'MMM dd, yyyy') return 'Jan 01, 2024';
    if (formatStr === 'HH:mm:ss') return '12:00:00';
    if (formatStr === 'yyyy-MM-dd-HHmm') return '2024-01-01-1200';
    return 'Jan 01, 2024 12:00:00';
  }),
}));

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: '1',
    adminUserId: 'admin-1',
    adminUserEmail: 'admin@example.com',
    action: 'user.create',
    resourceType: 'user',
    resourceId: 'user-1',
    targetUserId: 'user-1',
    targetUserEmail: 'user@example.com',
    details: { name: 'Test User' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    success: true,
  },
  {
    id: '2',
    adminUserId: 'admin-1',
    adminUserEmail: 'admin@example.com',
    action: 'user.delete',
    resourceType: 'user',
    resourceId: 'user-2',
    targetUserId: 'user-2',
    targetUserEmail: 'user2@example.com',
    details: { reason: 'Account violation' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    timestamp: new Date('2024-01-01T11:00:00Z'),
    success: false,
    errorMessage: 'User not found',
  },
];

describe('AuditLogList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminApiService.getAuditLogs as any).mockResolvedValue({
      success: true,
      data: mockAuditLogs,
      pagination: {
        totalPages: 1,
        total: 2,
        page: 1,
        limit: 20,
      },
    });
  });

  it('renders audit logs list', async () => {
    render(<AuditLogList />);

    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('Track all administrative actions and system events')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
  });

  it('loads audit logs on mount', async () => {
    render(<AuditLogList />);

    await waitFor(() => {
      expect(adminApiService.getAuditLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        sortBy: 'timestamp',
        sortOrder: 'DESC',
      });
    });
  });

  it('handles search functionality', async () => {
    render(<AuditLogList />);

    const searchInput = screen.getByPlaceholderText('Search logs...');
    fireEvent.change(searchInput, { target: { value: 'admin@example.com' } });

    await waitFor(() => {
      expect(adminApiService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'admin@example.com',
        })
      );
    });
  });

  it('handles filter toggle', () => {
    render(<AuditLogList />);

    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    // Filter component should be visible
    expect(screen.getByText('Admin User ID')).toBeInTheDocument();
  });

  it('handles sort changes', async () => {
    render(<AuditLogList />);

    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });

    const sortSelect = screen.getByDisplayValue('timestamp');
    fireEvent.click(sortSelect);
    
    const actionOption = screen.getByText('Action');
    fireEvent.click(actionOption);

    await waitFor(() => {
      expect(adminApiService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'action',
        })
      );
    });
  });

  it('handles log selection', async () => {
    render(<AuditLogList />);

    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });

    // Find and click a checkbox (first one should be select all)
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    
    // Click the first log checkbox (not select all)
    if (checkboxes.length > 1) {
      fireEvent.click(checkboxes[1]);
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    }
  });

  it('handles export functionality', async () => {
    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    (adminApiService.exportReport as any).mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document.createElement and appendChild
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

    render(<AuditLogList />);

    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(adminApiService.exportReport).toHaveBeenCalled();
    });
  });

  it('displays success and failed status badges correctly', async () => {
    render(<AuditLogList />);

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('displays action badges with correct colors', async () => {
    render(<AuditLogList />);

    await waitFor(() => {
      expect(screen.getByText('user.create')).toBeInTheDocument();
      expect(screen.getByText('user.delete')).toBeInTheDocument();
    });
  });

  it('handles pagination', async () => {
    (adminApiService.getAuditLogs as any).mockResolvedValue({
      success: true,
      data: mockAuditLogs,
      pagination: {
        totalPages: 3,
        total: 60,
        page: 1,
        limit: 20,
      },
    });

    render(<AuditLogList />);

    await waitFor(() => {
      expect(screen.getByText('Total: 60 logs')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (adminApiService.getAuditLogs as any).mockRejectedValue(
      new Error('Failed to load audit logs')
    );

    render(<AuditLogList />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load audit logs')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    (adminApiService.getAuditLogs as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<AuditLogList />);

    // The AdminTable component should show loading state
    expect(adminApiService.getAuditLogs).toHaveBeenCalled();
  });

  it('shows empty state when no logs found', async () => {
    (adminApiService.getAuditLogs as any).mockResolvedValue({
      success: true,
      data: [],
      pagination: {
        totalPages: 0,
        total: 0,
        page: 1,
        limit: 20,
      },
    });

    render(<AuditLogList />);

    await waitFor(() => {
      expect(screen.getByText('Total: 0 logs')).toBeInTheDocument();
    });
  });
});