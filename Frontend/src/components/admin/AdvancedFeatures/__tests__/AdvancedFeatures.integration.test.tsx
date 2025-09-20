import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import AdvancedFeatures from '../AdvancedFeatures';

// Mock all child components with realistic implementations
vi.mock('../UserTierManager', () => ({
  default: () => (
    <div data-testid="user-tier-manager">
      <h3>User Tier Management</h3>
      <div>Manage user subscriptions and tiers</div>
      <button>Upgrade User</button>
      <button>Downgrade User</button>
    </div>
  )
}));

vi.mock('../BillingDisputeHandler', () => ({
  default: () => (
    <div data-testid="billing-dispute-handler">
      <h3>Billing Dispute Management</h3>
      <div>Handle chargebacks and refunds</div>
      <button>Process Dispute</button>
      <button>Resolve Chargeback</button>
    </div>
  )
}));

vi.mock('../TrialExtensionManager', () => ({
  default: () => (
    <div data-testid="trial-extension-manager">
      <h3>Trial Extension Management</h3>
      <div>Manage trial extensions and conversions</div>
      <button>Extend Trial</button>
      <button>Convert to Paid</button>
    </div>
  )
}));

vi.mock('../SystemHealthMonitor', () => ({
  default: () => (
    <div data-testid="system-health-monitor">
      <h3>System Health Monitoring</h3>
      <div>Monitor system performance and alerts</div>
      <button>View Alerts</button>
      <button>Configure Thresholds</button>
    </div>
  )
}));

vi.mock('../IncidentTracker', () => ({
  default: () => (
    <div data-testid="incident-tracker">
      <h3>Incident Tracking</h3>
      <div>Track and resolve system incidents</div>
      <button>Create Incident</button>
      <button>Resolve Incident</button>
    </div>
  )
}));

vi.mock('../DataPrivacyCompliance', () => ({
  default: () => (
    <div data-testid="data-privacy-compliance">
      <h3>Data Privacy & Compliance</h3>
      <div>Manage GDPR and data protection</div>
      <button>Export Data</button>
      <button>Delete Data</button>
    </div>
  )
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
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

describe('AdvancedFeatures Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all feature components and allows navigation between them', async () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    // Should start with User Tiers tab active
    expect(screen.getByTestId('user-tier-manager')).toBeInTheDocument();
    expect(screen.getByText('User Tier Management')).toBeInTheDocument();
    expect(screen.getByText('Upgrade User')).toBeInTheDocument();

    // Navigate to Billing Disputes
    fireEvent.click(screen.getByRole('tab', { name: /billing disputes/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('billing-dispute-handler')).toBeInTheDocument();
      expect(screen.getByText('Billing Dispute Management')).toBeInTheDocument();
      expect(screen.getByText('Process Dispute')).toBeInTheDocument();
    });

    // Navigate to Trial Management
    fireEvent.click(screen.getByRole('tab', { name: /trial management/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('trial-extension-manager')).toBeInTheDocument();
      expect(screen.getByText('Trial Extension Management')).toBeInTheDocument();
      expect(screen.getByText('Extend Trial')).toBeInTheDocument();
    });

    // Navigate to System Health
    fireEvent.click(screen.getByRole('tab', { name: /system health/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('system-health-monitor')).toBeInTheDocument();
      expect(screen.getByText('System Health Monitoring')).toBeInTheDocument();
      expect(screen.getByText('View Alerts')).toBeInTheDocument();
    });

    // Navigate to Incidents
    fireEvent.click(screen.getByRole('tab', { name: /incidents/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('incident-tracker')).toBeInTheDocument();
      expect(screen.getByText('Incident Tracking')).toBeInTheDocument();
      expect(screen.getByText('Create Incident')).toBeInTheDocument();
    });

    // Navigate to Data Privacy
    fireEvent.click(screen.getByRole('tab', { name: /data privacy/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('data-privacy-compliance')).toBeInTheDocument();
      expect(screen.getByText('Data Privacy & Compliance')).toBeInTheDocument();
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });
  });

  it('maintains proper tab state and accessibility', async () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);

    // Check initial state
    const tiersTab = screen.getByRole('tab', { name: /user tiers/i });
    expect(tiersTab).toHaveAttribute('data-state', 'active');

    // Switch tabs and verify state changes
    const billingTab = screen.getByRole('tab', { name: /billing disputes/i });
    fireEvent.click(billingTab);

    await waitFor(() => {
      expect(billingTab).toHaveAttribute('data-state', 'active');
      expect(tiersTab).toHaveAttribute('data-state', 'inactive');
    });

    // Verify tab panels have correct attributes
    const tabPanels = screen.getAllByRole('tabpanel');
    expect(tabPanels.length).toBeGreaterThan(0);
    
    tabPanels.forEach(panel => {
      expect(panel).toHaveAttribute('data-state');
    });
  });

  it('displays feature descriptions and badges correctly', () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    // Check main title and description
    expect(screen.getByText('Advanced Admin Features')).toBeInTheDocument();
    expect(screen.getByText('Enterprise-level tools for platform management and operations')).toBeInTheDocument();
    
    // Check Enterprise badge
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    
    // Check feature descriptions in cards
    expect(screen.getByText('Manage subscriptions and tier assignments')).toBeInTheDocument();
  });

  it('handles keyboard navigation between tabs', async () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    const firstTab = screen.getByRole('tab', { name: /user tiers/i });
    firstTab.focus();
    
    // Navigate with arrow keys
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    
    await waitFor(() => {
      const secondTab = screen.getByRole('tab', { name: /billing disputes/i });
      expect(secondTab).toHaveFocus();
    });

    // Navigate back with left arrow
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    
    await waitFor(() => {
      expect(firstTab).toHaveFocus();
    });
  });

  it('supports custom className prop', () => {
    const { container } = renderWithQueryClient(
      <AdvancedFeatures className="custom-advanced-features" />
    );
    
    expect(container.firstChild).toHaveClass('space-y-6', 'custom-advanced-features');
  });

  it('renders feature icons in tab triggers', () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();
    
    // Each tab should have an icon (we can't easily test for specific icons, but we can verify structure)
    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      expect(tab).toHaveClass('flex', 'flex-col', 'items-center');
    });
  });

  it('displays feature badges with correct styling', async () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    // Switch to different tabs to see their badges
    const tabs = [
      { name: /user tiers/i, badge: 'Premium' },
      { name: /billing disputes/i, badge: 'Support' },
      { name: /trial management/i, badge: 'Growth' },
      { name: /system health/i, badge: 'Critical' },
      { name: /incidents/i, badge: 'Operations' },
      { name: /data privacy/i, badge: 'Legal' }
    ];

    for (const tab of tabs) {
      fireEvent.click(screen.getByRole('tab', { name: tab.name }));
      
      await waitFor(() => {
        expect(screen.getByText(tab.badge)).toBeInTheDocument();
      });
    }
  });

  it('maintains component isolation between tabs', async () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    // Verify that only the active tab's component is rendered
    expect(screen.getByTestId('user-tier-manager')).toBeInTheDocument();
    expect(screen.queryByTestId('billing-dispute-handler')).not.toBeInTheDocument();
    
    // Switch tabs
    fireEvent.click(screen.getByRole('tab', { name: /billing disputes/i }));
    
    await waitFor(() => {
      expect(screen.queryByTestId('user-tier-manager')).not.toBeInTheDocument();
      expect(screen.getByTestId('billing-dispute-handler')).toBeInTheDocument();
    });
  });

  it('handles rapid tab switching without errors', async () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    const tabs = screen.getAllByRole('tab');
    
    // Rapidly switch between tabs
    for (let i = 0; i < 3; i++) {
      for (const tab of tabs) {
        fireEvent.click(tab);
        // Small delay to simulate real user interaction
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    // Should end up on the last tab without errors
    await waitFor(() => {
      expect(screen.getByTestId('data-privacy-compliance')).toBeInTheDocument();
    });
  });

  it('preserves tab content structure across switches', async () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    // Switch to a tab and verify its content
    fireEvent.click(screen.getByRole('tab', { name: /system health/i }));
    
    await waitFor(() => {
      expect(screen.getByText('System Health Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Monitor system performance and alerts')).toBeInTheDocument();
    });
    
    // Switch away and back
    fireEvent.click(screen.getByRole('tab', { name: /user tiers/i }));
    fireEvent.click(screen.getByRole('tab', { name: /system health/i }));
    
    // Content should be preserved
    await waitFor(() => {
      expect(screen.getByText('System Health Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Monitor system performance and alerts')).toBeInTheDocument();
    });
  });
});