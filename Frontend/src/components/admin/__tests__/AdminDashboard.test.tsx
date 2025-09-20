import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminDashboard } from '../AdminDashboard';
import { adminApiService } from '../../../services/adminApiService';
import type { AdminDashboardMetrics, SystemStatistics } from '../../../types/admin';

// Mock the admin API service
vi.mock('../../../services/adminApiService', () => ({
  adminApiService: {
    getDashboardMetrics: vi.fn(),
    getSystemStats: vi.fn(),
  },
}));

// Mock the chart components to avoid recharts rendering issues in tests
vi.mock('../charts/AdminCharts', () => ({
  ActivityChart: ({ data, className }: any) => (
    <div data-testid="activity-chart" className={className}>
      Activity Chart with {data.length} data points
    </div>
  ),
  SystemHealthChart: ({ data, className }: any) => (
    <div data-testid="system-health-chart" className={className}>
      System Health Chart with {data.length} data points
    </div>
  ),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 minutes ago'),
}));

const mockDashboardMetrics: AdminDashboardMetrics = {
  totalUsers: 1234,
  activeUsers: 987,
  totalAgents: 567,
  activeAgents: 456,
  totalCalls: 8901,
  callsToday: 89,
  systemHealth: 'healthy',
  recentActivity: [
    {
      id: '1',
      type: 'user_registered',
      message: 'New user registered: john@example.com',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      severity: 'info',
    },
    {
      id: '2',
      type: 'agent_created',
      message: 'Agent "Sales Bot" created by user@example.com',
      timestamp: new Date('2024-01-01T09:55:00Z'),
      severity: 'info',
    },
  ],
};

const mockSystemStats: SystemStatistics = {
  users: {
    total: 1234,
    active: 987,
    newThisMonth: 123,
    byTier: {
      free: 800,
      paid: 400,
      premium: 34,
    },
  },
  agents: {
    total: 567,
    active: 456,
    byType: {
      call: 400,
      chat: 167,
    },
    healthyPercentage: 95.5,
  },
  calls: {
    totalThisMonth: 8901,
    successRate: 0.92,
    averageDuration: 4.5,
    costThisMonth: 1234.56,
  },
  system: {
    uptime: 99.9,
    responseTime: 150,
    errorRate: 0.001,
    activeConnections: 45,
  },
};

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders loading state initially', () => {
    // Mock API calls to return pending promises
    vi.mocked(adminApiService.getDashboardMetrics).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    vi.mocked(adminApiService.getSystemStats).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<AdminDashboard />);

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Overview of system metrics and platform health')).toBeInTheDocument();
    
    // Check for loading indicators
    expect(screen.getAllByText('...')).toHaveLength(4); // 4 metric cards should show loading
  });

  it('renders dashboard data successfully', async () => {
    // Mock successful API responses
    vi.mocked(adminApiService.getDashboardMetrics).mockResolvedValue({
      data: mockDashboardMetrics,
    } as any);
    vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
      data: mockSystemStats,
    } as any);

    renderWithQueryClient(<AdminDashboard />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument(); // Total users
    });

    // Check metric cards
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('987 active users')).toBeInTheDocument();

    expect(screen.getByText('Active Agents')).toBeInTheDocument();
    expect(screen.getByText('456')).toBeInTheDocument();
    expect(screen.getByText('567 total agents')).toBeInTheDocument();

    expect(screen.getByText('Calls Today')).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
    expect(screen.getByText('8,901 this month')).toBeInTheDocument();

    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText('150ms avg response')).toBeInTheDocument();
  });

  it('displays recent activity correctly', async () => {
    vi.mocked(adminApiService.getDashboardMetrics).mockResolvedValue({
      data: mockDashboardMetrics,
    } as any);
    vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
      data: mockSystemStats,
    } as any);

    renderWithQueryClient(<AdminDashboard />);

    // Wait for data to load first
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument(); // Total users loaded
    });

    // Then check activity items
    await waitFor(() => {
      expect(screen.getByText('New user registered: john@example.com')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Agent "Sales Bot" created by user@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('2 minutes ago')).toHaveLength(2);
  });

  it('displays system health status correctly', async () => {
    vi.mocked(adminApiService.getDashboardMetrics).mockResolvedValue({
      data: mockDashboardMetrics,
    } as any);
    vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
      data: mockSystemStats,
    } as any);

    renderWithQueryClient(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Alerts')).toBeInTheDocument();
    });

    // Should show healthy status
    expect(screen.getByText('All Systems Operational')).toBeInTheDocument();
    expect(screen.getByText('No active alerts or issues detected')).toBeInTheDocument();
  });

  it('displays system alerts for unhealthy conditions', async () => {
    const unhealthyStats = {
      ...mockSystemStats,
      system: {
        ...mockSystemStats.system,
        errorRate: 0.06, // High error rate
        responseTime: 600, // Slow response time
      },
      agents: {
        ...mockSystemStats.agents,
        healthyPercentage: 85, // Low healthy percentage
      },
    };

    vi.mocked(adminApiService.getDashboardMetrics).mockResolvedValue({
      data: mockDashboardMetrics,
    } as any);
    vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
      data: unhealthyStats,
    } as any);

    renderWithQueryClient(<AdminDashboard />);

    // Wait for data to load first
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument(); // Total users loaded
    });

    // Then check for alerts
    await waitFor(() => {
      expect(screen.getByText('High Error Rate')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Current error rate: 6.00%')).toBeInTheDocument();
    expect(screen.getByText('Slow Response Time')).toBeInTheDocument();
    expect(screen.getByText('Average response: 600ms')).toBeInTheDocument();
    expect(screen.getByText('Agent Health Issues')).toBeInTheDocument();
    expect(screen.getByText('Only 85.0% of agents are healthy')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Failed to fetch dashboard data';
    vi.mocked(adminApiService.getDashboardMetrics).mockRejectedValue(
      new Error(errorMessage)
    );
    vi.mocked(adminApiService.getSystemStats).mockRejectedValue(
      new Error(errorMessage)
    );

    renderWithQueryClient(<AdminDashboard />);

    // Wait for error state to appear - check for the retry button which indicates error state
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Check that error message is displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('allows manual refresh of data', async () => {
    vi.mocked(adminApiService.getDashboardMetrics).mockResolvedValue({
      data: mockDashboardMetrics,
    } as any);
    vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
      data: mockSystemStats,
    } as any);

    renderWithQueryClient(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    // Verify API calls were made again
    await waitFor(() => {
      expect(adminApiService.getDashboardMetrics).toHaveBeenCalledTimes(2);
      expect(adminApiService.getSystemStats).toHaveBeenCalledTimes(2);
    });
  });

  it('renders charts correctly', async () => {
    vi.mocked(adminApiService.getDashboardMetrics).mockResolvedValue({
      data: mockDashboardMetrics,
    } as any);
    vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
      data: mockSystemStats,
    } as any);

    renderWithQueryClient(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Platform Activity (24h)')).toBeInTheDocument();
    });

    // Check that charts are rendered
    expect(screen.getByTestId('activity-chart')).toBeInTheDocument();
    expect(screen.getByTestId('system-health-chart')).toBeInTheDocument();
    
    expect(screen.getByText('System Resources')).toBeInTheDocument();
  });

  it('displays empty state when no recent activity', async () => {
    const metricsWithoutActivity = {
      ...mockDashboardMetrics,
      recentActivity: [],
    };

    vi.mocked(adminApiService.getDashboardMetrics).mockResolvedValue({
      data: metricsWithoutActivity,
    } as any);
    vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
      data: mockSystemStats,
    } as any);

    renderWithQueryClient(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('calculates trends correctly', async () => {
    vi.mocked(adminApiService.getDashboardMetrics).mockResolvedValue({
      data: mockDashboardMetrics,
    } as any);
    vi.mocked(adminApiService.getSystemStats).mockResolvedValue({
      data: mockSystemStats,
    } as any);

    renderWithQueryClient(<AdminDashboard />);

    // Wait for data to load first
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument(); // Total users loaded
    });

    // Check trend calculations
    // New users this month / total users * 100 = 123/1234 * 100 ≈ 10%
    await waitFor(() => {
      expect(screen.getByText('+10%')).toBeInTheDocument();
    });
    
    // Success rate * 100 = 92%
    expect(screen.getByText('+92%')).toBeInTheDocument();
  });
});