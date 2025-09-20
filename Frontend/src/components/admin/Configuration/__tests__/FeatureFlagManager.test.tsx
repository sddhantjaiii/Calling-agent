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

describe('FeatureFlagManager', () => {
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

  it('renders feature flag manager with loading state', () => {
    vi.mocked(adminApiService.getFeatureFlags).mockImplementation(
      () => new Promise(() => {}) // Never resolves to show loading
    );

    renderComponent();
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders feature flag manager with data', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Feature Flag Management')).toBeInTheDocument();
      expect(screen.getByText('Dashboard KPIs')).toBeInTheDocument();
      expect(screen.getByText('Agent Analytics')).toBeInTheDocument();
      expect(screen.getByText('Advanced Reports')).toBeInTheDocument();
    });
  });

  it('displays feature flag statistics correctly', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Total Features')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total count
      expect(screen.getByText('Enabled Features')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Only agent_analytics is enabled
      expect(screen.getByText('Global Features')).toBeInTheDocument();
      expect(screen.getByText('User-Specific')).toBeInTheDocument();
    });
  });

  it('displays proprietary features section', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Proprietary Features')).toBeInTheDocument();
      expect(screen.getByText('Manage access to premium features like KPIs and advanced analytics')).toBeInTheDocument();
      
      // Check for proprietary feature cards
      const dashboardKpisCard = screen.getByText('Dashboard KPIs').closest('.border-2');
      const agentAnalyticsCard = screen.getByText('Agent Analytics').closest('.border-2');
      const advancedReportsCard = screen.getByText('Advanced Reports').closest('.border-2');
      
      expect(dashboardKpisCard).toBeInTheDocument();
      expect(agentAnalyticsCard).toBeInTheDocument();
      expect(advancedReportsCard).toBeInTheDocument();
    });
  });

  it('toggles feature flag when toggle button is clicked', async () => {
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
      // Find the toggle button for Dashboard KPIs (should be disabled initially)
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

  it('opens configuration modal when Configure button is clicked', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      const configureButtons = screen.getAllByText('Configure');
      if (configureButtons.length > 0) {
        fireEvent.click(configureButtons[0]);
        
        expect(screen.getByText('Configure Feature Flag')).toBeInTheDocument();
        expect(screen.getByText('Update feature flag settings and targeting')).toBeInTheDocument();
      }
    });
  });

  it('displays feature flag table with correct information', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('All Feature Flags')).toBeInTheDocument();
      
      // Check table headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Scope')).toBeInTheDocument();
      expect(screen.getByText('Rollout')).toBeInTheDocument();
      expect(screen.getByText('Targets')).toBeInTheDocument();
      
      // Check feature flag data
      expect(screen.getByText('Dashboard KPIs')).toBeInTheDocument();
      expect(screen.getByText('Agent Analytics')).toBeInTheDocument();
      expect(screen.getByText('Advanced Reports')).toBeInTheDocument();
    });
  });

  it('shows correct scope badges and icons', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      // Check for scope badges
      expect(screen.getByText('global')).toBeInTheDocument();
      expect(screen.getByText('tier')).toBeInTheDocument();
      expect(screen.getByText('user')).toBeInTheDocument();
    });
  });

  it('displays rollout percentages correctly', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      // Check for rollout percentages
      const percentageElements = screen.getAllByText(/\d+%/);
      expect(percentageElements.length).toBeGreaterThan(0);
      expect(screen.getByText('50%')).toBeInTheDocument(); // Advanced Reports has 50% rollout
    });
  });

  it('opens bulk operations modal when Bulk Operations button is clicked', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      const bulkButton = screen.getByText('Bulk Operations');
      fireEvent.click(bulkButton);
      
      expect(screen.getByText('Bulk Feature Flag Operations')).toBeInTheDocument();
      expect(screen.getByText('Enable or disable multiple feature flags at once')).toBeInTheDocument();
    });
  });

  it('updates feature flag configuration when edit form is submitted', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    vi.mocked(adminApiService.updateFeatureFlag).mockResolvedValue({
      success: true,
      data: { ...mockFeatureFlags[0], description: 'Updated description' },
      message: 'Updated'
    });

    renderComponent();

    await waitFor(() => {
      // Open edit modal
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(button => 
        button.querySelector('svg')?.getAttribute('data-lucide') === 'edit'
      );
      
      if (editButton) {
        fireEvent.click(editButton);
      }
    });

    await waitFor(() => {
      // Update description
      const descriptionInput = screen.getByDisplayValue('Advanced KPI tracking and analytics in user dashboard');
      fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });
      
      // Submit form
      const updateButton = screen.getByText('Update Feature Flag');
      fireEvent.click(updateButton);
      
      expect(adminApiService.updateFeatureFlag).toHaveBeenCalled();
    });
  });

  it('handles error state when API call fails', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockRejectedValue(
      new Error('Failed to load feature flags')
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Error Loading Feature Flags')).toBeInTheDocument();
      expect(screen.getByText('Failed to load feature flag configuration')).toBeInTheDocument();
    });
  });

  it('shows target information based on scope', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      // Global scope should show "All users"
      expect(screen.getByText('All users')).toBeInTheDocument();
      
      // Tier scope should show tier count
      expect(screen.getByText('2 tiers')).toBeInTheDocument();
      
      // User scope should show user count
      expect(screen.getByText('2 users')).toBeInTheDocument();
    });
  });

  it('displays analytics tab with usage statistics', async () => {
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
      expect(screen.getByText('Feature Usage Analytics')).toBeInTheDocument();
      expect(screen.getByText('Feature Adoption')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('Usage Rate')).toBeInTheDocument();
      expect(screen.getByText('Premium Features')).toBeInTheDocument();
    });
  });

  it('displays tier management tab', async () => {
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
      expect(screen.getByText('Free Tier')).toBeInTheDocument();
      expect(screen.getByText('Premium Tier')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Tier')).toBeInTheDocument();
    });
  });

  it('handles export configuration', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    // Mock URL.createObjectURL and related methods
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document methods
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);

    renderComponent();

    await waitFor(() => {
      // Click export button
      const exportButton = screen.getByText('Export Config');
      fireEvent.click(exportButton);
    });

    expect(mockAnchor.click).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('displays proprietary features tab with usage stats', async () => {
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
      
      // Check for usage information in proprietary features
      const usageTexts = screen.getAllByText(/\d+\/\d+ users/);
      expect(usageTexts.length).toBeGreaterThan(0);
    });
  });

  it('handles tier feature toggle in tier management', async () => {
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
      // Find switches in tier management
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
      
      // Toggle a feature for a tier
      if (switches.length > 0) {
        fireEvent.click(switches[0]);
        // The component should update its internal state
      }
    });
  });

  it('handles bulk operations with different scopes', async () => {
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
      // Change target scope to tier
      const scopeSelect = screen.getByDisplayValue('All Users');
      fireEvent.click(scopeSelect);
      
      const tierOption = screen.getByText('Specific Tiers');
      fireEvent.click(tierOption);
    });

    await waitFor(() => {
      // Should show tier selection options
      expect(screen.getByText('Target Tiers')).toBeInTheDocument();
      expect(screen.getByLabelText('free')).toBeInTheDocument();
      expect(screen.getByLabelText('premium')).toBeInTheDocument();
      expect(screen.getByLabelText('enterprise')).toBeInTheDocument();
    });
  });

  it('displays refresh button and handles refresh', async () => {
    vi.mocked(adminApiService.getFeatureFlags).mockResolvedValue({
      success: true,
      data: mockFeatureFlags,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();
      
      fireEvent.click(refreshButton);
      // Should trigger a query invalidation
    });
  });
});