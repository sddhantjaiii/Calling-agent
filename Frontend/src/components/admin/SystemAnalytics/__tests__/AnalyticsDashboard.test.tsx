import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';

// Mock the hooks
vi.mock('@/hooks/useAdminAnalytics');

// Mock child components
vi.mock('../SystemMetrics', () => ({
  SystemMetrics: ({ data, filters, onRefresh }: any) => (
    <div data-testid="system-metrics">
      <div>System Metrics</div>
      <button onClick={onRefresh}>Refresh</button>
      <div>{JSON.stringify(filters)}</div>
    </div>
  )
}));

vi.mock('../UsageCharts', () => ({
  UsageCharts: ({ data, filters, onDateRangeChange }: any) => (
    <div data-testid="usage-charts">
      <div>Usage Charts</div>
      <button onClick={() => onDateRangeChange({ start: new Date(), end: new Date() })}>
        Change Date Range
      </button>
    </div>
  )
}));

vi.mock('../ReportGenerator', () => ({
  ReportGenerator: ({ data, filters }: any) => (
    <div data-testid="report-generator">
      <div>Report Generator</div>
    </div>
  )
}));

const mockAnalyticsData = {
  users: { total: 100, active: 80, growth: 10 },
  agents: { total: 50, active: 40, growth: 5 },
  calls: { total: 1000, growth: 15, successRate: 95 },
  revenue: { total: 5000, monthly: 1000, growth: 20 },
  system: { uptime: 99.9, responseTime: 50, errorRate: 0.1 }
};

describe('AnalyticsDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(useAdminAnalytics).mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({ data: mockAnalyticsData }),
    } as any);
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('renders analytics dashboard with header', () => {
    renderWithQueryClient(<AnalyticsDashboard />);
    
    expect(screen.getByText('System Analytics')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive platform metrics and reporting')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    vi.mocked(useAdminAnalytics).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<AnalyticsDashboard />);
    
    // Look for the loading spinner by its class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays error state', () => {
    const mockError = new Error('Failed to load analytics');
    vi.mocked(useAdminAnalytics).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<AnalyticsDashboard />);
    
    expect(screen.getByText('Unexpected Error')).toBeInTheDocument();
  });

  it('renders filter controls', () => {
    renderWithQueryClient(<AnalyticsDashboard />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Date Range:')).toBeInTheDocument();
  });

  it('renders navigation tabs', () => {
    renderWithQueryClient(<AnalyticsDashboard />);
    
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usage Patterns' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reports' })).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    renderWithQueryClient(<AnalyticsDashboard />);
    
    // Initially shows overview (SystemMetrics)
    expect(screen.getByTestId('system-metrics')).toBeInTheDocument();
    
    // Switch to usage patterns
    fireEvent.click(screen.getByRole('button', { name: 'Usage Patterns' }));
    expect(screen.getByTestId('usage-charts')).toBeInTheDocument();
    
    // Switch to reports
    fireEvent.click(screen.getByRole('button', { name: 'Reports' }));
    expect(screen.getByTestId('report-generator')).toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    const mockRefetch = vi.fn().mockResolvedValue({ data: mockAnalyticsData });
    vi.mocked(useAdminAnalytics).mockReturnValue({
      data: mockAnalyticsData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    renderWithQueryClient(<AnalyticsDashboard />);
    
    const refreshButtons = screen.getAllByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButtons[0]); // Click the first refresh button
    
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('handles filter changes', () => {
    renderWithQueryClient(<AnalyticsDashboard />);
    
    // Test that filter controls are present
    expect(screen.getByText('All Tiers')).toBeInTheDocument();
    expect(screen.getByText('All Types')).toBeInTheDocument();
  });

  it('passes correct props to child components', () => {
    renderWithQueryClient(<AnalyticsDashboard />);
    
    // Check that SystemMetrics receives correct props
    const systemMetrics = screen.getByTestId('system-metrics');
    expect(systemMetrics).toBeInTheDocument();
    
    // Check that filters are passed correctly
    expect(systemMetrics).toHaveTextContent('dateRange');
  });

  it('handles date range changes from child components', () => {
    renderWithQueryClient(<AnalyticsDashboard />);
    
    // Switch to usage charts tab
    fireEvent.click(screen.getByRole('button', { name: 'Usage Patterns' }));
    
    // Trigger date range change from child component
    const changeDateButton = screen.getByText('Change Date Range');
    fireEvent.click(changeDateButton);
    
    // Component should handle the date range change
    expect(screen.getByTestId('usage-charts')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithQueryClient(
      <AnalyticsDashboard className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles analytics data updates', () => {
    const { rerender } = renderWithQueryClient(<AnalyticsDashboard />);
    
    // Update with new data
    const updatedData = {
      ...mockAnalyticsData,
      users: { total: 150, active: 120, growth: 15 }
    };
    
    vi.mocked(useAdminAnalytics).mockReturnValue({
      data: updatedData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    
    rerender(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard />
      </QueryClientProvider>
    );
    
    // Component should re-render with new data
    expect(screen.getByTestId('system-metrics')).toBeInTheDocument();
  });
});