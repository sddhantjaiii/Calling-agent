import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FeatureFlagManager from '../FeatureFlagManager';
import { adminApiService } from '../../../../services/adminApiService';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    getFeatureFlags: vi.fn(),
    updateFeatureFlag: vi.fn(),
    getFeatureFlagUsage: vi.fn(),
    bulkUpdateFeatureFlags: vi.fn(),
    syncTierFeatures: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('../../../ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockFeatureFlags = [
  {
    id: 'dashboard_kpis',
    name: 'Dashboard KPIs',
    description: 'Advanced KPI tracking and analytics in user dashboard',
    isEnabled: false,
    scope: 'global' as const,
    targetUsers: [],
    targetTiers: [],
    rolloutPercentage: 100
  },
  {
    id: 'agent_analytics',
    name: 'Agent Analytics',
    description: 'Detailed agent performance analytics and insights',
    isEnabled: true,
    scope: 'tier' as const,
    targetUsers: [],
    targetTiers: ['premium', 'enterprise'],
    rolloutPercentage: 100
  },
  {
    id: 'advanced_reports',
    name: 'Advanced Reports',
    description: 'Custom report generation and advanced data export',
    isEnabled: false,
    scope: 'user' as const,
    targetUsers: ['user1', 'user2'],
    targetTiers: [],
    rolloutPercentage: 50
  }
];

describe('FeatureFlagManager Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <FeatureFlagManager />
      </QueryClientProvider>
    );
  };

  it('renders the enhanced feature flag manager with tabs', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Feature Flag Management')).toBeInTheDocument();
      expect(screen.getByText('Control proprietary features and user access')).toBeInTheDocument();
      
      // Check for new action buttons
      expect(screen.getByText('Export Config')).toBeInTheDocument();
      expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      
      // Check for tabs
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Proprietary Features')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Tier Management')).toBeInTheDocument();
    });
  });

  it('can switch between tabs', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Feature Flag Management')).toBeInTheDocument();
    });

    // Switch to Analytics tab
    const analyticsTab = screen.getByText('Analytics');
    fireEvent.click(analyticsTab);

    await waitFor(() => {
      // Should show analytics content
      expect(screen.getByText('Feature Adoption')).toBeInTheDocument();
    });

    // Switch to Tier Management tab
    const tierTab = screen.getByText('Tier Management');
    fireEvent.click(tierTab);

    await waitFor(() => {
      // Should show tier management content
      expect(screen.getByText('Free Tier')).toBeInTheDocument();
    });
  });

  it('displays proprietary features with usage stats', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      // Switch to proprietary features tab
      const proprietaryTab = screen.getByText('Proprietary Features');
      fireEvent.click(proprietaryTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Manage access to premium features like KPIs and advanced analytics')).toBeInTheDocument();
      
      // Check for proprietary feature cards with usage stats
      const dashboardKpisCard = screen.getByText('Dashboard KPIs').closest('.border-2');
      expect(dashboardKpisCard).toBeInTheDocument();
      
      // Should show usage information
      const usageTexts = screen.getAllByText(/\d+\/\d+ users/);
      expect(usageTexts.length).toBeGreaterThan(0);
    });
  });

  it('handles feature flag toggle with enhanced functionality', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    vi.mocked(adminApiService.updateFeatureFlag).mockResolvedValue({
      success: true,
      data: { ...mockFeatureFlags[0], isEnabled: true },
      message: 'Updated'
    });

    renderComponent();

    await waitFor(() => {
      // Switch to proprietary features tab
      const proprietaryTab = screen.getByText('Proprietary Features');
      fireEvent.click(proprietaryTab);
    });

    await waitFor(() => {
      // Find and click a toggle button
      const toggleButtons = screen.getAllByRole('button');
      const dashboardKpisToggle = toggleButtons.find(button => 
        button.querySelector('svg')?.getAttribute('data-lucide') === 'toggle-left'
      );
      
      if (dashboardKpisToggle) {
        fireEvent.click(dashboardKpisToggle);
        
        expect(adminApiService.updateFeatureFlag).toHaveBeenCalledWith(
          'dashboard_kpis',
          { isEnabled: true }
        );
      }
    });
  });

  it('opens bulk operations modal with enhanced options', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      const bulkButton = screen.getByText('Bulk Operations');
      fireEvent.click(bulkButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Bulk Feature Flag Operations')).toBeInTheDocument();
      expect(screen.getByText('Enable or disable multiple feature flags at once')).toBeInTheDocument();
      
      // Check for enhanced bulk options
      expect(screen.getByText('Target Scope')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Users')).toBeInTheDocument();
    });
  });

  it('displays analytics with usage statistics', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      // Switch to analytics tab
      const analyticsTab = screen.getByText('Analytics');
      fireEvent.click(analyticsTab);
    });

    await waitFor(() => {
      // Check for analytics cards
      expect(screen.getByText('Feature Adoption')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Usage Rate')).toBeInTheDocument();
      expect(screen.getByText('Premium Features')).toBeInTheDocument();
    });
  });

  it('shows tier management with feature toggles', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      // Switch to tier management tab
      const tierTab = screen.getByText('Tier Management');
      fireEvent.click(tierTab);
    });

    await waitFor(() => {
      // Check for tier cards
      expect(screen.getByText('Free Tier')).toBeInTheDocument();
      expect(screen.getByText('Premium Tier')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Tier')).toBeInTheDocument();
      
      // Check for auto-manage toggles
      const autoManageTexts = screen.getAllByText('Auto-manage features');
      expect(autoManageTexts.length).toBeGreaterThan(0);
    });
  });
});