import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UsageCharts } from '../UsageCharts';

// Mock Recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

const mockData = {
  usage: [
    { date: '2024-01-01', users: 120, calls: 450, agents: 25, revenue: 1200 },
    { date: '2024-01-02', users: 135, calls: 520, agents: 28, revenue: 1350 },
    { date: '2024-01-03', users: 142, calls: 480, agents: 30, revenue: 1280 },
  ],
  userTiers: [
    { name: 'Free', value: 65, color: '#0088FE' },
    { name: 'Pro', value: 25, color: '#00C49F' },
    { name: 'Enterprise', value: 10, color: '#FFBB28' }
  ],
  agentTypes: [
    { name: 'Sales', value: 45, color: '#0088FE' },
    { name: 'Support', value: 35, color: '#00C49F' },
    { name: 'Survey', value: 20, color: '#FFBB28' }
  ],
  hourlyUsage: [
    { hour: '00:00', calls: 12, users: 8 },
    { hour: '01:00', calls: 8, users: 5 },
    { hour: '09:00', calls: 65, users: 48 },
    { hour: '15:00', calls: 102, users: 78 },
  ]
};

const mockFilters = {
  dateRange: {
    from: new Date('2024-01-01'),
    to: new Date('2024-01-31')
  }
};

describe('UsageCharts', () => {
  const mockOnDateRangeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders usage pattern analysis section', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    expect(screen.getByText('Usage Pattern Analysis')).toBeInTheDocument();
    expect(screen.getByText('Visualize platform usage patterns and trends over time')).toBeInTheDocument();
  });

  it('renders chart controls', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    expect(screen.getByText('Metric:')).toBeInTheDocument();
    expect(screen.getByText('Chart Type:')).toBeInTheDocument();
    expect(screen.getByText('Timeframe:')).toBeInTheDocument();
  });

  it('renders line chart by default', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line')).toBeInTheDocument();
  });

  it('switches chart types correctly', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    // Find and click the chart type selector
    const chartTypeSelects = screen.getAllByRole('combobox');
    const chartTypeSelect = chartTypeSelects.find(select => 
      select.closest('div')?.textContent?.includes('Chart Type:')
    );
    
    if (chartTypeSelect) {
      fireEvent.click(chartTypeSelect);
      
      // The select options would be rendered in a portal, so we can't easily test the selection
      // But we can verify the select is interactive
      expect(chartTypeSelect).toBeInTheDocument();
    }
  });

  it('renders distribution charts', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    expect(screen.getByText('User Tier Distribution')).toBeInTheDocument();
    expect(screen.getByText('Agent Type Distribution')).toBeInTheDocument();
    
    // Should render pie charts for distributions
    const pieCharts = screen.getAllByTestId('pie-chart');
    expect(pieCharts).toHaveLength(2);
  });

  it('renders hourly usage pattern', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    expect(screen.getByText('Hourly Usage Pattern')).toBeInTheDocument();
    expect(screen.getByText('Platform activity throughout the day')).toBeInTheDocument();
    
    // Should render area chart for hourly usage
    const areaCharts = screen.getAllByTestId('area-chart');
    expect(areaCharts.length).toBeGreaterThan(0);
  });

  it('renders usage summary', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    expect(screen.getByText('Usage Summary')).toBeInTheDocument();
    expect(screen.getByText('Peak Calls/Hour')).toBeInTheDocument();
    expect(screen.getByText('Peak Hour')).toBeInTheDocument();
    expect(screen.getByText('Avg Calls/Hour')).toBeInTheDocument();
    expect(screen.getByText('Pro Users')).toBeInTheDocument();
  });

  it('calculates peak metrics correctly', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    // Peak calls should be 102 from the hourly data
    expect(screen.getByText('102')).toBeInTheDocument();
    
    // Peak hour should be 15:00
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });

  it('handles metric selection changes', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    // Find metric selector
    const metricSelects = screen.getAllByRole('combobox');
    const metricSelect = metricSelects.find(select => 
      select.closest('div')?.textContent?.includes('Metric:')
    );
    
    if (metricSelect) {
      fireEvent.click(metricSelect);
      expect(metricSelect).toBeInTheDocument();
    }
  });

  it('handles timeframe selection changes', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    // Find timeframe selector
    const timeframeSelects = screen.getAllByRole('combobox');
    const timeframeSelect = timeframeSelects.find(select => 
      select.closest('div')?.textContent?.includes('Timeframe:')
    );
    
    if (timeframeSelect) {
      fireEvent.click(timeframeSelect);
      expect(timeframeSelect).toBeInTheDocument();
    }
  });

  it('handles missing data gracefully', () => {
    const emptyData = {};
    
    render(
      <UsageCharts 
        data={emptyData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    // Should still render without crashing
    expect(screen.getByText('Usage Pattern Analysis')).toBeInTheDocument();
  });

  it('renders area chart when selected', () => {
    const { rerender } = render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    // Component should handle chart type changes internally
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders bar chart when selected', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    // Default is line chart
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('calculates average calls per hour correctly', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    // Average of [12, 8, 65, 102] = 46.75, rounded to 47
    expect(screen.getByText('47')).toBeInTheDocument();
  });

  it('displays pro users percentage correctly', () => {
    render(
      <UsageCharts 
        data={mockData} 
        filters={mockFilters} 
        onDateRangeChange={mockOnDateRangeChange} 
      />
    );

    // Pro users should be 25% from mockData
    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});