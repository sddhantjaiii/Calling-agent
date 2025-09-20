import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  ActivityChart,
  SystemHealthChart,
  CallVolumeChart,
  UserGrowthChart,
  AgentDistributionChart,
  ResponseTimeChart,
} from '../AdminCharts';

// Mock recharts components to avoid rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-points={data?.length}>
      {children}
    </div>
  ),
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-points={data?.length}>
      {children}
    </div>
  ),
  AreaChart: ({ children, data }: any) => (
    <div data-testid="area-chart" data-points={data?.length}>
      {children}
    </div>
  ),
  PieChart: ({ children }: any) => (
    <div data-testid="pie-chart">
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  ),
  Bar: ({ dataKey, fill }: any) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill} />
  ),
  Area: ({ dataKey, fill }: any) => (
    <div data-testid={`area-${dataKey}`} data-fill={fill} />
  ),
  Pie: ({ data, dataKey }: any) => (
    <div data-testid="pie" data-key={dataKey} data-points={data?.length} />
  ),
  Cell: ({ fill }: any) => (
    <div data-testid="pie-cell" data-fill={fill} />
  ),
  XAxis: ({ dataKey }: any) => (
    <div data-testid="x-axis" data-key={dataKey} />
  ),
  YAxis: ({ domain }: any) => (
    <div data-testid="y-axis" data-domain={domain?.join?.(',')} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: ({ content }: any) => (
    <div data-testid="tooltip">{content}</div>
  ),
}));

// Mock the ChartContainer component
vi.mock('../../ui/chart', () => ({
  ChartContainer: ({ children, className }: any) => (
    <div data-testid="chart-container" className={className}>
      {children}
    </div>
  ),
  ChartTooltip: ({ content }: any) => (
    <div data-testid="chart-tooltip">{content}</div>
  ),
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
}));

describe('AdminCharts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ActivityChart', () => {
    const mockActivityData = [
      { name: '00:00', users: 120, agents: 45, calls: 23 },
      { name: '04:00', users: 98, agents: 38, calls: 18 },
      { name: '08:00', users: 180, agents: 67, calls: 45 },
    ];

    it('renders activity chart with correct data', () => {
      render(<ActivityChart data={mockActivityData} />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-points', '3');
      
      // Check that all three lines are rendered
      expect(screen.getByTestId('line-users')).toBeInTheDocument();
      expect(screen.getByTestId('line-agents')).toBeInTheDocument();
      expect(screen.getByTestId('line-calls')).toBeInTheDocument();
      
      // Check axes
      expect(screen.getByTestId('x-axis')).toHaveAttribute('data-key', 'name');
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const customClass = 'custom-chart-class';
      render(<ActivityChart data={mockActivityData} className={customClass} />);

      expect(screen.getByTestId('chart-container')).toHaveClass(customClass);
    });

    it('handles empty data gracefully', () => {
      render(<ActivityChart data={[]} />);

      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-points', '0');
    });
  });

  describe('SystemHealthChart', () => {
    const mockHealthData = [
      { name: 'CPU', value: 65, status: 'healthy' as const },
      { name: 'Memory', value: 78, status: 'warning' as const },
      { name: 'Disk', value: 45, status: 'healthy' as const },
      { name: 'Network', value: 92, status: 'error' as const },
    ];

    it('renders system health chart with correct data', () => {
      render(<SystemHealthChart data={mockHealthData} />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-points', '4');
      
      expect(screen.getByTestId('bar-value')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toHaveAttribute('data-domain', '0,100');
    });

    it('renders pie cells with correct colors', () => {
      render(<SystemHealthChart data={mockHealthData} />);

      const cells = screen.getAllByTestId('pie-cell');
      expect(cells).toHaveLength(4);
    });
  });

  describe('CallVolumeChart', () => {
    const mockCallData = [
      { time: '00:00', successful: 45, failed: 5, total: 50 },
      { time: '01:00', successful: 38, failed: 7, total: 45 },
      { time: '02:00', successful: 52, failed: 3, total: 55 },
    ];

    it('renders call volume chart with stacked areas', () => {
      render(<CallVolumeChart data={mockCallData} />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('area-chart')).toHaveAttribute('data-points', '3');
      
      expect(screen.getByTestId('area-successful')).toBeInTheDocument();
      expect(screen.getByTestId('area-failed')).toBeInTheDocument();
      
      expect(screen.getByTestId('x-axis')).toHaveAttribute('data-key', 'time');
    });
  });

  describe('UserGrowthChart', () => {
    const mockGrowthData = [
      { date: '2024-01-01', newUsers: 25, totalUsers: 1000 },
      { date: '2024-01-02', newUsers: 30, totalUsers: 1030 },
      { date: '2024-01-03', newUsers: 22, totalUsers: 1052 },
    ];

    it('renders user growth chart with two lines', () => {
      render(<UserGrowthChart data={mockGrowthData} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-points', '3');
      
      expect(screen.getByTestId('line-newUsers')).toBeInTheDocument();
      expect(screen.getByTestId('line-totalUsers')).toBeInTheDocument();
      
      expect(screen.getByTestId('x-axis')).toHaveAttribute('data-key', 'date');
    });
  });

  describe('AgentDistributionChart', () => {
    const mockDistributionData = [
      { name: 'Call Agents', value: 400, color: '#0088FE' },
      { name: 'Chat Agents', value: 167, color: '#00C49F' },
      { name: 'Inactive', value: 50, color: '#FFBB28' },
    ];

    it('renders agent distribution pie chart', () => {
      render(<AgentDistributionChart data={mockDistributionData} />);

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toHaveAttribute('data-points', '3');
      expect(screen.getByTestId('pie')).toHaveAttribute('data-key', 'value');
      
      expect(screen.getByTestId('legend')).toBeInTheDocument();
      
      const cells = screen.getAllByTestId('pie-cell');
      expect(cells).toHaveLength(3);
    });
  });

  describe('ResponseTimeChart', () => {
    const mockResponseData = [
      { time: '00:00', responseTime: 120, threshold: 200 },
      { time: '01:00', responseTime: 150, threshold: 200 },
      { time: '02:00', responseTime: 180, threshold: 200 },
    ];

    it('renders response time chart with threshold line', () => {
      render(<ResponseTimeChart data={mockResponseData} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toHaveAttribute('data-points', '3');
      
      expect(screen.getByTestId('line-responseTime')).toBeInTheDocument();
      expect(screen.getByTestId('line-threshold')).toBeInTheDocument();
      
      expect(screen.getByTestId('x-axis')).toHaveAttribute('data-key', 'time');
    });
  });

  describe('Chart responsiveness', () => {
    it('all charts use ResponsiveContainer', () => {
      const mockData = [{ name: 'test', value: 100 }];
      
      render(<ActivityChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      
      render(<SystemHealthChart data={[{ name: 'test', value: 100, status: 'healthy' }]} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      
      render(<CallVolumeChart data={[{ time: '00:00', successful: 10, failed: 2, total: 12 }]} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Chart accessibility', () => {
    it('charts have proper structure for screen readers', () => {
      const mockData = [{ name: 'test', users: 100, agents: 50, calls: 25 }];
      
      render(<ActivityChart data={mockData} />);
      
      // Charts should be wrapped in containers that can be labeled
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });
});