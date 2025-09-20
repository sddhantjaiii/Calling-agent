/**
 * Component Integration Tests
 * Tests actual component behavior to ensure proper data integration
 */

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import OverviewKPIs from '@/components/Overview/OverviewKPIs';
import OverviewCharts from '@/components/Overview/OverviewCharts';
import LeadsData from '@/components/leads/LeadsData';
import LeadProfileTab from '@/components/chat/LeadProfileTab';
import { apiService } from '@/services/apiService';

// Mock API service for testing different scenarios
jest.mock('@/services/apiService');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

interface ComponentTestResult {
  component: string;
  scenario: string;
  passed: boolean;
  message: string;
  details?: string;
}

class ComponentIntegrationTester {
  private queryClient: QueryClient;

  constructor() {
    this.queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
  }

  private renderWithProviders(component: React.ReactElement) {
    return render(
      <QueryClientProvider client={this.queryClient}>
        <BrowserRouter>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            {component}
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  }

  /**
   * Test OverviewKPIs component with different data scenarios
   */
  async testOverviewKPIsComponent(): Promise<ComponentTestResult[]> {
    const results: ComponentTestResult[] = [];

    // Test 1: Real data scenario
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

    try {
      this.renderWithProviders(<OverviewKPIs filters={{}} />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Calls')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Qualified Leads')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
      });

      results.push({
        component: 'OverviewKPIs',
        scenario: 'Real Data Display',
        passed: true,
        message: 'Component correctly displays real KPI data from API'
      });
    } catch (error) {
      results.push({
        component: 'OverviewKPIs',
        scenario: 'Real Data Display',
        passed: false,
        message: 'Component failed to display real KPI data',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 2: Empty data scenario
    mockedApiService.getDashboardOverview.mockResolvedValue({
      success: true,
      data: {
        kpis: []
      }
    });

    try {
      this.renderWithProviders(<OverviewKPIs filters={{}} />);
      
      await waitFor(() => {
        // Should show empty state, not mock data
        expect(screen.queryByText('Sample KPI')).not.toBeInTheDocument();
        expect(screen.queryByText('Mock Data')).not.toBeInTheDocument();
        // Should show appropriate empty state message
        expect(screen.getByText(/no.*data.*available/i) || screen.getByText(/no.*kpi.*data/i)).toBeInTheDocument();
      });

      results.push({
        component: 'OverviewKPIs',
        scenario: 'Empty Data State',
        passed: true,
        message: 'Component correctly shows empty state when no KPI data is available'
      });
    } catch (error) {
      results.push({
        component: 'OverviewKPIs',
        scenario: 'Empty Data State',
        passed: false,
        message: 'Component failed to show proper empty state',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 3: Error scenario
    mockedApiService.getDashboardOverview.mockRejectedValue(new Error('Network error'));

    try {
      this.renderWithProviders(<OverviewKPIs filters={{}} />);
      
      await waitFor(() => {
        // Should show error state with retry option
        expect(screen.getByText(/error/i) || screen.getByText(/failed/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i }) || screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      results.push({
        component: 'OverviewKPIs',
        scenario: 'Error State',
        passed: true,
        message: 'Component correctly shows error state with retry option'
      });
    } catch (error) {
      results.push({
        component: 'OverviewKPIs',
        scenario: 'Error State',
        passed: false,
        message: 'Component failed to show proper error state',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    return results;
  }

  /**
   * Test OverviewCharts component with different data scenarios
   */
  async testOverviewChartsComponent(): Promise<ComponentTestResult[]> {
    const results: ComponentTestResult[] = [];

    // Test 1: Real analytics data
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

    try {
      this.renderWithProviders(<OverviewCharts filters={{}} />);
      
      await waitFor(() => {
        // Should display charts with real data
        expect(screen.queryByText('Sample Chart Data')).not.toBeInTheDocument();
        expect(screen.queryByText('Mock Analytics')).not.toBeInTheDocument();
        // Charts should be rendered (look for chart containers or data)
        expect(document.querySelector('.recharts-wrapper')).toBeInTheDocument();
      });

      results.push({
        component: 'OverviewCharts',
        scenario: 'Real Analytics Data',
        passed: true,
        message: 'Component correctly displays real analytics data in charts'
      });
    } catch (error) {
      results.push({
        component: 'OverviewCharts',
        scenario: 'Real Analytics Data',
        passed: false,
        message: 'Component failed to display real analytics data',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 2: Empty analytics data
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

    try {
      this.renderWithProviders(<OverviewCharts filters={{}} />);
      
      await waitFor(() => {
        // Should show empty states for charts, not mock data
        expect(screen.queryByText('Default Chart Data')).not.toBeInTheDocument();
        expect(screen.getAllByText(/no.*data.*available/i).length).toBeGreaterThan(0);
      });

      results.push({
        component: 'OverviewCharts',
        scenario: 'Empty Analytics Data',
        passed: true,
        message: 'Component correctly shows empty states when no analytics data is available'
      });
    } catch (error) {
      results.push({
        component: 'OverviewCharts',
        scenario: 'Empty Analytics Data',
        passed: false,
        message: 'Component failed to show proper empty states for charts',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    return results;
  }

  /**
   * Test LeadsData component with different data scenarios
   */
  async testLeadsDataComponent(): Promise<ComponentTestResult[]> {
    const results: ComponentTestResult[] = [];

    // Test 1: Real leads data
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

    try {
      this.renderWithProviders(<LeadsData />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });

      results.push({
        component: 'LeadsData',
        scenario: 'Real Leads Data',
        passed: true,
        message: 'Component correctly displays real leads data in table'
      });
    } catch (error) {
      results.push({
        component: 'LeadsData',
        scenario: 'Real Leads Data',
        passed: false,
        message: 'Component failed to display real leads data',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 2: Empty leads data
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

    try {
      this.renderWithProviders(<LeadsData />);
      
      await waitFor(() => {
        // Should show empty state, not mock leads
        expect(screen.queryByText('Sample Lead')).not.toBeInTheDocument();
        expect(screen.queryByText('mock@example.com')).not.toBeInTheDocument();
        expect(screen.getByText(/no.*leads.*available/i) || screen.getByText(/no.*data.*available/i)).toBeInTheDocument();
      });

      results.push({
        component: 'LeadsData',
        scenario: 'Empty Leads Data',
        passed: true,
        message: 'Component correctly shows empty state when no leads are available'
      });
    } catch (error) {
      results.push({
        component: 'LeadsData',
        scenario: 'Empty Leads Data',
        passed: false,
        message: 'Component failed to show proper empty state for leads',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    return results;
  }

  /**
   * Test LeadProfileTab component with different data scenarios
   */
  async testLeadProfileTabComponent(): Promise<ComponentTestResult[]> {
    const results: ComponentTestResult[] = [];

    const mockLead = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      leadTag: 'Hot',
      businessType: 'SaaS'
    };

    // Test 1: Real profile data
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

    try {
      this.renderWithProviders(<LeadProfileTab lead={mockLead as any} />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('85/100')).toBeInTheDocument(); // Total score
        expect(screen.getByText('High interest shown in product features')).toBeInTheDocument();
      });

      results.push({
        component: 'LeadProfileTab',
        scenario: 'Real Profile Data',
        passed: true,
        message: 'Component correctly displays real lead profile and analytics data'
      });
    } catch (error) {
      results.push({
        component: 'LeadProfileTab',
        scenario: 'Real Profile Data',
        passed: false,
        message: 'Component failed to display real profile data',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Test 2: Empty profile data
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

    try {
      this.renderWithProviders(<LeadProfileTab lead={mockLead as any} />);
      
      await waitFor(() => {
        // Should show empty states, not mock data
        expect(screen.queryByText('Sample Analysis')).not.toBeInTheDocument();
        expect(screen.getByText(/no.*analytics.*data.*available/i)).toBeInTheDocument();
        expect(screen.getByText(/no.*interactions.*available/i)).toBeInTheDocument();
      });

      results.push({
        component: 'LeadProfileTab',
        scenario: 'Empty Profile Data',
        passed: true,
        message: 'Component correctly shows empty states when no profile data is available'
      });
    } catch (error) {
      results.push({
        component: 'LeadProfileTab',
        scenario: 'Empty Profile Data',
        passed: false,
        message: 'Component failed to show proper empty states for profile',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    return results;
  }

  /**
   * Run all component integration tests
   */
  async runAllComponentTests(): Promise<{
    results: ComponentTestResult[];
    overallPassed: boolean;
    summary: string;
  }> {
    console.log('🧪 Starting component integration tests...');
    
    const allResults: ComponentTestResult[] = [];

    // Run all component tests
    const kpiResults = await this.testOverviewKPIsComponent();
    const chartsResults = await this.testOverviewChartsComponent();
    const leadsResults = await this.testLeadsDataComponent();
    const profileResults = await this.testLeadProfileTabComponent();

    allResults.push(...kpiResults, ...chartsResults, ...leadsResults, ...profileResults);

    const overallPassed = allResults.every(result => result.passed);
    const passedCount = allResults.filter(result => result.passed).length;
    const summary = `Component Tests: ${passedCount}/${allResults.length} tests passed`;

    console.log('✅ Component integration tests completed');
    console.log(summary);

    return {
      results: allResults,
      overallPassed,
      summary
    };
  }
}

export const componentIntegrationTester = new ComponentIntegrationTester();
export default componentIntegrationTester;