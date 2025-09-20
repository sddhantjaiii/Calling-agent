import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import OverviewKPIs from '@/components/Overview/OverviewKPIs';
import OverviewCharts from '@/components/Overview/OverviewCharts';
import LeadsData from '@/components/leads/LeadsData';
import LeadProfileTab from '@/components/chat/LeadProfileTab';
import { apiService } from '@/services/apiService';

// Mock the API service
vi.mock('@/services/apiService');
const mockedApiService = apiService as any;

// Mock recharts to avoid canvas issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  FunnelChart: ({ children }: any) => <div data-testid="funnel-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Area: () => <div data-testid="area" />,
  Funnel: () => <div data-testid="funnel" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Cell: () => <div data-testid="cell" />,
  LabelList: () => <div data-testid="label-list" />,
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          {component}
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Data Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OverviewKPIs Component', () => {
    it('should display real KPI data when API returns data', async () => {
      mockedApiService.getDashboardOverview.mockResolvedValue({
        success: true,
        data: {
          kpis: [
            {
              label: 'Total Calls',
              value: 150,
              description: 'Total number of calls made',
              delta: 12.5,
              compare: 'vs last month'
            },
            {
              label: 'Qualified Leads',
              value: 45,
              description: 'Number of qualified leads',
              delta: -2.1,
              compare: 'vs last month'
            }
          ]
        }
      });

      renderWithProviders(<OverviewKPIs filters={{}} />);

      await waitFor(() => {
        expect(screen.getByText('Total Calls')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Qualified Leads')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
      });

      // Ensure no mock data is displayed
      expect(screen.queryByText('Sample KPI')).not.toBeInTheDocument();
      expect(screen.queryByText('Mock Data')).not.toBeInTheDocument();
    });

    it('should show empty state when no KPI data is available', async () => {
      mockedApiService.getDashboardOverview.mockResolvedValue({
        success: true,
        data: {
          kpis: []
        }
      });

      renderWithProviders(<OverviewKPIs filters={{}} />);

      await waitFor(() => {
        // Should show empty state message
        const emptyStateElement = screen.getByText(/no.*data.*available/i) || 
                                 screen.getByText(/no.*kpi.*data/i);
        expect(emptyStateElement).toBeInTheDocument();
      });

      // Ensure no mock data is displayed
      expect(screen.queryByText('Sample KPI')).not.toBeInTheDocument();
      expect(screen.queryByText('Default KPI')).not.toBeInTheDocument();
    });

    it('should show error state when API fails', async () => {
      mockedApiService.getDashboardOverview.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<OverviewKPIs filters={{}} />);

      await waitFor(() => {
        // Should show error message and retry button
        expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i }) || 
               screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });
  });

  describe('OverviewCharts Component', () => {
    it('should display real analytics data in charts', async () => {
      mockedApiService.getDashboardAnalytics.mockResolvedValue({
        success: true,
        data: {
          leadsOverTimeData: [
            { date: '2024-01-01', chatLeads: 10, callLeads: 15, total: 25 },
            { date: '2024-01-02', chatLeads: 12, callLeads: 18, total: 30 }
          ],
          interactionsOverTimeData: [
            { date: '2024-01-01', chat: 50, call: 30, total: 80 },
            { date: '2024-01-02', chat: 55, call: 35, total: 90 }
          ],
          leadQualityData: [
            { name: 'Hot', chatCount: 5, callCount: 8, color: '#ff0000' },
            { name: 'Warm', chatCount: 15, callCount: 12, color: '#ffaa00' },
            { name: 'Cold', chatCount: 25, callCount: 20, color: '#0066ff' }
          ],
          engagementFunnelData: [],
          interactionsToConvertData: [],
          timeToConvertData: [],
          sourceBreakdownData: []
        }
      });

      renderWithProviders(<OverviewCharts filters={{}} />);

      await waitFor(() => {
        // Should render chart containers
        expect(screen.getAllByTestId('chart-container').length).toBeGreaterThan(0);
      });

      // Ensure no mock data is displayed
      expect(screen.queryByText('Sample Chart Data')).not.toBeInTheDocument();
      expect(screen.queryByText('Mock Analytics')).not.toBeInTheDocument();
      expect(screen.queryByText('Default Chart')).not.toBeInTheDocument();
    });

    it('should show empty states when no analytics data is available', async () => {
      mockedApiService.getDashboardAnalytics.mockResolvedValue({
        success: true,
        data: {
          leadsOverTimeData: [],
          interactionsOverTimeData: [],
          leadQualityData: [],
          engagementFunnelData: [],
          interactionsToConvertData: [],
          timeToConvertData: [],
          sourceBreakdownData: []
        }
      });

      renderWithProviders(<OverviewCharts filters={{}} />);

      await waitFor(() => {
        // Should show empty state messages for charts
        const emptyStateElements = screen.getAllByText(/no.*data.*available/i);
        expect(emptyStateElements.length).toBeGreaterThan(0);
      });

      // Ensure no mock data is displayed
      expect(screen.queryByText('Default Chart Data')).not.toBeInTheDocument();
      expect(screen.queryByText('Sample Analytics')).not.toBeInTheDocument();
    });
  });

  describe('LeadsData Component', () => {
    it('should display real leads data in table', async () => {
      mockedApiService.getLeads.mockResolvedValue({
        success: true,
        data: {
          data: [
            {
              id: '1',
              name: 'John Doe',
              email: 'john@example.com',
              phone: '+1234567890',
              leadTag: 'Hot',
              businessType: 'SaaS',
              createdAt: '2024-01-01T00:00:00Z'
            },
            {
              id: '2',
              name: 'Jane Smith',
              email: 'jane@example.com',
              phone: '+1234567891',
              leadTag: 'Warm',
              businessType: 'E-commerce',
              createdAt: '2024-01-02T00:00:00Z'
            }
          ],
          pagination: {
            total: 2,
            limit: 20,
            offset: 0,
            hasMore: false
          }
        }
      });

      renderWithProviders(<LeadsData />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });

      // Ensure no mock data is displayed
      expect(screen.queryByText('Sample Lead')).not.toBeInTheDocument();
      expect(screen.queryByText('mock@example.com')).not.toBeInTheDocument();
    });

    it('should show empty state when no leads are available', async () => {
      mockedApiService.getLeads.mockResolvedValue({
        success: true,
        data: {
          data: [],
          pagination: {
            total: 0,
            limit: 20,
            offset: 0,
            hasMore: false
          }
        }
      });

      renderWithProviders(<LeadsData />);

      await waitFor(() => {
        // Should show empty state message
        const emptyStateElement = screen.getByText(/no.*leads.*available/i) || 
                                 screen.getByText(/no.*data.*available/i);
        expect(emptyStateElement).toBeInTheDocument();
      });

      // Ensure no mock data is displayed
      expect(screen.queryByText('Sample Lead')).not.toBeInTheDocument();
      expect(screen.queryByText('Default Lead')).not.toBeInTheDocument();
    });
  });

  describe('LeadProfileTab Component', () => {
    const mockLead = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      leadTag: 'Hot',
      businessType: 'SaaS'
    };

    it('should display real lead profile and analytics data', async () => {
      mockedApiService.getLeadProfile.mockResolvedValue({
        success: true,
        data: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          totalScore: 85,
          scores: {
            intent: 90,
            urgency: 80,
            budget: 85,
            fit: 85,
            engagement: 80
          },
          reasoning: {
            intent: 'High interest shown in product features',
            urgency: 'Mentioned need to implement solution soon',
            budget: 'Discussed budget range that fits our pricing',
            fit: 'Company size and industry are ideal match'
          }
        }
      });

      mockedApiService.getLeadTimeline.mockResolvedValue({
        success: true,
        data: {
          timeline: [
            {
              id: '1',
              type: 'call',
              date: '2024-01-01',
              duration: '15:30',
              transcript: 'Customer expressed interest in our solution...'
            }
          ]
        }
      });

      renderWithProviders(<LeadProfileTab lead={mockLead as any} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('85/100')).toBeInTheDocument(); // Total score
        expect(screen.getByText('High interest shown in product features')).toBeInTheDocument();
      });

      // Ensure no mock data is displayed
      expect(screen.queryByText('Sample Analysis')).not.toBeInTheDocument();
      expect(screen.queryByText('Mock Reasoning')).not.toBeInTheDocument();
    });

    it('should show empty states when no profile data is available', async () => {
      mockedApiService.getLeadProfile.mockResolvedValue({
        success: true,
        data: null
      });

      mockedApiService.getLeadTimeline.mockResolvedValue({
        success: true,
        data: {
          timeline: []
        }
      });

      renderWithProviders(<LeadProfileTab lead={mockLead as any} />);

      await waitFor(() => {
        // Should show empty state messages
        expect(screen.getByText(/no.*analytics.*data.*available/i)).toBeInTheDocument();
        expect(screen.getByText(/no.*interactions.*available/i)).toBeInTheDocument();
      });

      // Ensure no mock data is displayed
      expect(screen.queryByText('Sample Analysis')).not.toBeInTheDocument();
      expect(screen.queryByText('Default Reasoning')).not.toBeInTheDocument();
    });
  });

  describe('Mock Data Detection', () => {
    it('should not display any mock data patterns in components', async () => {
      // Set up APIs to return empty data
      mockedApiService.getDashboardOverview.mockResolvedValue({
        success: true,
        data: { kpis: [] }
      });

      mockedApiService.getDashboardAnalytics.mockResolvedValue({
        success: true,
        data: {
          leadsOverTimeData: [],
          interactionsOverTimeData: [],
          leadQualityData: [],
          engagementFunnelData: [],
          interactionsToConvertData: [],
          timeToConvertData: [],
          sourceBreakdownData: []
        }
      });

      mockedApiService.getLeads.mockResolvedValue({
        success: true,
        data: { data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } }
      });

      // Render all components
      const { rerender } = renderWithProviders(<OverviewKPIs filters={{}} />);
      
      await waitFor(() => {
        // Check that no common mock data patterns are present
        expect(screen.queryByText(/sample/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/mock/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/default.*data/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/test.*data/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/lorem ipsum/i)).not.toBeInTheDocument();
      });

      // Test other components
      rerender(<OverviewCharts filters={{}} />);
      await waitFor(() => {
        expect(screen.queryByText(/sample/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/mock/i)).not.toBeInTheDocument();
      });

      rerender(<LeadsData />);
      await waitFor(() => {
        expect(screen.queryByText(/sample/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/mock/i)).not.toBeInTheDocument();
      });
    });
  });
});