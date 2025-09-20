import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, beforeEach } from 'vitest';
import AdvancedFeatures from '../AdvancedFeatures';

// Mock the child components
vi.mock('../UserTierManager', () => ({
  default: () => <div data-testid="user-tier-manager">User Tier Manager</div>
}));

vi.mock('../BillingDisputeHandler', () => ({
  BillingDisputeHandler: () => <div data-testid="billing-dispute-handler">Billing Dispute Handler</div>
}));

vi.mock('../TrialExtensionManager', () => ({
  TrialExtensionManager: () => <div data-testid="trial-extension-manager">Trial Extension Manager</div>
}));

vi.mock('../SystemHealthMonitor', () => ({
  SystemHealthMonitor: () => <div data-testid="system-health-monitor">System Health Monitor</div>
}));

vi.mock('../IncidentTracker', () => ({
  IncidentTracker: () => <div data-testid="incident-tracker">Incident Tracker</div>
}));

vi.mock('../DataPrivacyCompliance', () => ({
  DataPrivacyCompliance: () => <div data-testid="data-privacy-compliance">Data Privacy Compliance</div>
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

describe('AdvancedFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main title and description', () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    expect(screen.getByText('Advanced Admin Features')).toBeInTheDocument();
    expect(screen.getByText('Enterprise-level tools for platform management and operations')).toBeInTheDocument();
  });

  it('renders all feature tabs', () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    expect(screen.getByText('User Tiers')).toBeInTheDocument();
    expect(screen.getByText('Billing Disputes')).toBeInTheDocument();
    expect(screen.getByText('Trial Management')).toBeInTheDocument();
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Incidents')).toBeInTheDocument();
    expect(screen.getByText('Data Privacy')).toBeInTheDocument();
  });

  it('displays the default tab (tiers) content', () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    expect(screen.getByTestId('user-tier-manager')).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    // Click on billing tab
    fireEvent.click(screen.getByRole('tab', { name: /billing disputes/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('billing-dispute-handler')).toBeInTheDocument();
    });

    // Click on trials tab
    fireEvent.click(screen.getByRole('tab', { name: /trial management/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('trial-extension-manager')).toBeInTheDocument();
    });

    // Click on health tab
    fireEvent.click(screen.getByRole('tab', { name: /system health/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('system-health-monitor')).toBeInTheDocument();
    });

    // Click on incidents tab
    fireEvent.click(screen.getByRole('tab', { name: /incidents/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('incident-tracker')).toBeInTheDocument();
    });

    // Click on privacy tab
    fireEvent.click(screen.getByRole('tab', { name: /data privacy/i }));
    
    await waitFor(() => {
      expect(screen.getByTestId('data-privacy-compliance')).toBeInTheDocument();
    });
  });

  it('displays feature badges correctly', () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('renders feature descriptions in tab content', async () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    // Check default tab content
    expect(screen.getByText('Manage subscriptions and tier assignments')).toBeInTheDocument();
    
    // Switch to billing tab and check description
    fireEvent.click(screen.getByRole('tab', { name: /billing disputes/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Handle billing issues and disputes')).toBeInTheDocument();
    });
  });

  it('applies correct CSS classes', () => {
    const { container } = renderWithQueryClient(<AdvancedFeatures className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('space-y-6', 'custom-class');
  });

  it('renders all feature icons', () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    // Check that icons are rendered (they should be in the tab triggers)
    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();
    
    // Verify tab structure
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
  });

  it('maintains tab state correctly', async () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    // Switch to incidents tab
    const incidentsTab = screen.getByRole('tab', { name: /incidents/i });
    fireEvent.click(incidentsTab);
    
    await waitFor(() => {
      expect(incidentsTab).toHaveAttribute('data-state', 'active');
    });
    
    // Switch to another tab
    const healthTab = screen.getByRole('tab', { name: /system health/i });
    fireEvent.click(healthTab);
    
    await waitFor(() => {
      expect(healthTab).toHaveAttribute('data-state', 'active');
      expect(incidentsTab).toHaveAttribute('data-state', 'inactive');
    });
  });

  it('handles keyboard navigation', async () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    const firstTab = screen.getByRole('tab', { name: /user tiers/i });
    firstTab.focus();
    
    // Use arrow key to navigate
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    
    await waitFor(() => {
      const secondTab = screen.getByRole('tab', { name: /billing disputes/i });
      expect(secondTab).toHaveFocus();
    });
  });

  it('renders with proper accessibility attributes', () => {
    renderWithQueryClient(<AdvancedFeatures />);
    
    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();
    
    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('aria-selected');
    });
    
    const tabPanels = screen.getAllByRole('tabpanel');
    expect(tabPanels.length).toBeGreaterThan(0);
  });
});