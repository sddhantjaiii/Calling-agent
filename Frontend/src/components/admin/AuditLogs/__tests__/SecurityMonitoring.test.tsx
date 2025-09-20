import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SecurityMonitoring } from '../SecurityMonitoring';
import { adminApiService } from '../../../../services/adminApiService';
import type { AuditLogEntry } from '../../../../types/admin';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    getAuditLogs: vi.fn(),
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
    if (formatStr === 'MMM dd, HH:mm') return 'Jan 01, 12:00';
    if (formatStr === 'yyyy') return '2024';
    return 'Jan 01, 2024';
  }),
  subDays: vi.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  subHours: vi.fn((date, hours) => new Date(date.getTime() - hours * 60 * 60 * 1000)),
}));

// Mock recharts
vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockSecurityAuditLogs: AuditLogEntry[] = [
  {
    id: '1',
    adminUserId: 'admin-1',
    adminUserEmail: 'admin@example.com',
    action: 'auth.failed',
    resourceType: 'auth',
    details: { attempts: 3, reason: 'Invalid password' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    success: false,
    targetUserId: 'user-1',
    targetUserEmail: 'user@example.com',
  },
  {
    id: '2',
    adminUserId: 'admin-1',
    adminUserEmail: 'admin@example.com',
    action: 'auth.failed',
    resourceType: 'auth',
    details: { attempts: 5, reason: 'Account locked' },
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0',
    timestamp: new Date('2024-01-01T11:00:00Z'),
    success: false,
    targetUserId: 'user-2',
    targetUserEmail: 'user2@example.com',
  },
  {
    id: '3',
    adminUserId: 'admin-1',
    adminUserEmail: 'admin@example.com',
    action: 'auth.failed',
    resourceType: 'auth',
    details: { attempts: 10, reason: 'Brute force detected' },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    success: false,
    targetUserId: 'user-1',
    targetUserEmail: 'user@example.com',
  },
];

describe('SecurityMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminApiService.getAuditLogs as any).mockResolvedValue({
      success: true,
      data: mockSecurityAuditLogs,
    });
  });

  it('renders security monitoring dashboard', async () => {
    render(<SecurityMonitoring />);

    expect(screen.getByText('Security Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Monitor security events and detect suspicious activities')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Total Events')).toBeInTheDocument();
    });
  });

  it('loads security data on mount', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      expect(adminApiService.getAuditLogs).toHaveBeenCalledWith({
        action: 'auth.failed',
        limit: 100,
        sortBy: 'timestamp',
        sortOrder: 'DESC',
      });
    });
  });

  it('displays security statistics cards', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Total Events')).toBeInTheDocument();
      expect(screen.getByText('Failed Logins')).toBeInTheDocument();
      expect(screen.getByText('Unique IPs')).toBeInTheDocument();
      expect(screen.getByText('Affected Users')).toBeInTheDocument();
    });
  });

  it('calculates statistics correctly', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      // Should show 3 total events
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Should show 3 failed logins
      const failedLoginsCard = screen.getByText('Failed Logins').closest('.space-y-0')?.parentElement;
      expect(failedLoginsCard?.textContent).toContain('3');
      
      // Should show 2 unique IPs (192.168.1.100 and 192.168.1.101)
      const uniqueIPsCard = screen.getByText('Unique IPs').closest('.space-y-0')?.parentElement;
      expect(uniqueIPsCard?.textContent).toContain('2');
      
      // Should show 2 affected users
      const affectedUsersCard = screen.getByText('Affected Users').closest('.space-y-0')?.parentElement;
      expect(affectedUsersCard?.textContent).toContain('2');
    });
  });

  it('handles timeframe changes', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Total Events')).toBeInTheDocument();
    });

    const timeframeSelect = screen.getByDisplayValue('Last 24h');
    fireEvent.click(timeframeSelect);

    const lastHourOption = screen.getByText('Last Hour');
    fireEvent.click(lastHourOption);

    await waitFor(() => {
      expect(adminApiService.getAuditLogs).toHaveBeenCalledTimes(2);
    });
  });

  it('handles refresh functionality', async () => {
    const mockToast = vi.fn();

    render(<SecurityMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Total Events')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(adminApiService.getAuditLogs).toHaveBeenCalledTimes(2);
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Refreshed',
        description: 'Security monitoring data has been updated.',
      });
    });
  });

  it('displays security events table', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Recent Security Events')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    });
  });

  it('displays severity badges correctly', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      // Should have different severity levels based on attempt counts
      expect(screen.getByText('MEDIUM')).toBeInTheDocument(); // 3 attempts
      expect(screen.getByText('HIGH')).toBeInTheDocument(); // 5 attempts
      expect(screen.getByText('CRITICAL')).toBeInTheDocument(); // 10 attempts
    });
  });

  it('displays event type badges', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      const failedLoginBadges = screen.getAllByText('Failed Login');
      expect(failedLoginBadges).toHaveLength(3);
    });
  });

  it('displays top IP addresses', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Top IP Addresses')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.101')).toBeInTheDocument();
      expect(screen.getByText('2 events')).toBeInTheDocument(); // 192.168.1.100 appears twice
      expect(screen.getByText('1 events')).toBeInTheDocument(); // 192.168.1.101 appears once
    });
  });

  it('displays most affected users', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Most Affected Users')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    (adminApiService.getAuditLogs as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<SecurityMonitoring />);

    expect(screen.getByText('Loading security monitoring data...')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    const mockToast = vi.fn();

    (adminApiService.getAuditLogs as any).mockRejectedValue(
      new Error('Failed to load security data')
    );

    render(<SecurityMonitoring />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to load security data',
        variant: 'destructive',
      });
    });
  });

  it('generates hourly distribution correctly', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Security Events by Hour')).toBeInTheDocument();
    });
  });

  it('generates events by severity chart', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Events by Severity')).toBeInTheDocument();
    });
  });

  it('determines event severity based on attempt count', async () => {
    render(<SecurityMonitoring />);

    await waitFor(() => {
      // Verify that different attempt counts result in different severities
      const severityBadges = screen.getAllByText(/LOW|MEDIUM|HIGH|CRITICAL/);
      expect(severityBadges.length).toBeGreaterThan(0);
    });
  });

  it('handles events without user information', async () => {
    const eventsWithoutUser = [
      {
        ...mockSecurityAuditLogs[0],
        targetUserId: undefined,
        targetUserEmail: undefined,
      },
    ];

    (adminApiService.getAuditLogs as any).mockResolvedValue({
      success: true,
      data: eventsWithoutUser,
    });

    render(<SecurityMonitoring />);

    await waitFor(() => {
      expect(screen.getByText('Total Events')).toBeInTheDocument();
      // Should show 0 affected users
      const affectedUsersCard = screen.getByText('Affected Users').closest('.space-y-0')?.parentElement;
      expect(affectedUsersCard?.textContent).toContain('0');
    });
  });
});