import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Configuration from '../index';

// Mock all the configuration components
vi.mock('../APIKeyManager', () => ({
  default: () => <div data-testid="api-key-manager">API Key Manager</div>
}));

vi.mock('../FeatureFlagManager', () => ({
  default: () => <div data-testid="feature-flag-manager">Feature Flag Manager</div>
}));

vi.mock('../SystemSettings', () => ({
  default: () => <div data-testid="system-settings">System Settings</div>
}));

vi.mock('../UserTierManager', () => ({
  default: () => <div data-testid="user-tier-manager">User Tier Manager</div>
}));

describe('Configuration', () => {
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
        <Configuration />
      </QueryClientProvider>
    );
  };

  it('renders configuration management header', () => {
    renderComponent();
    
    expect(screen.getByText('Configuration Management')).toBeInTheDocument();
    expect(screen.getByText('Manage system configuration, API keys, feature flags, and user tiers')).toBeInTheDocument();
    expect(screen.getByText('Super Admin Access')).toBeInTheDocument();
  });

  it('renders all configuration tabs', () => {
    renderComponent();
    
    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('Feature Flags')).toBeInTheDocument();
    expect(screen.getByText('System Settings')).toBeInTheDocument();
    expect(screen.getByText('User Tiers')).toBeInTheDocument();
  });

  it('shows API Keys tab by default', () => {
    renderComponent();
    
    expect(screen.getByTestId('api-key-manager')).toBeInTheDocument();
    expect(screen.getByText('Manage ElevenLabs API keys and user assignments')).toBeInTheDocument();
  });

  it('switches to Feature Flags tab when clicked', () => {
    renderComponent();
    
    const featureFlagsTab = screen.getByText('Feature Flags');
    fireEvent.click(featureFlagsTab);
    
    expect(screen.getByTestId('feature-flag-manager')).toBeInTheDocument();
    expect(screen.getByText('Control proprietary features and user access')).toBeInTheDocument();
  });

  it('switches to System Settings tab when clicked', () => {
    renderComponent();
    
    const systemSettingsTab = screen.getByText('System Settings');
    fireEvent.click(systemSettingsTab);
    
    expect(screen.getByTestId('system-settings')).toBeInTheDocument();
    expect(screen.getByText('Configure platform-wide settings and parameters')).toBeInTheDocument();
  });

  it('switches to User Tiers tab when clicked', () => {
    renderComponent();
    
    const userTiersTab = screen.getByText('User Tiers');
    fireEvent.click(userTiersTab);
    
    expect(screen.getByTestId('user-tier-manager')).toBeInTheDocument();
    expect(screen.getByText('Manage subscription tiers and feature access')).toBeInTheDocument();
  });

  it('displays correct icons for each tab', () => {
    renderComponent();
    
    // Check that tabs have icons (we can't easily test the specific icons, but we can check they exist)
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    
    tabs.forEach(tab => {
      const icon = tab.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  it('applies custom className when provided', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Configuration className="custom-class" />
      </QueryClientProvider>
    );
    
    const container = screen.getByText('Configuration Management').closest('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('shows shield icon for super admin access', () => {
    renderComponent();
    
    const shieldIcon = screen.getByText('Super Admin Access').previousElementSibling;
    expect(shieldIcon).toBeInTheDocument();
    expect(shieldIcon?.tagName).toBe('svg');
  });

  it('maintains tab state when switching between tabs', () => {
    renderComponent();
    
    // Start with API Keys
    expect(screen.getByTestId('api-key-manager')).toBeInTheDocument();
    
    // Switch to Feature Flags
    fireEvent.click(screen.getByText('Feature Flags'));
    expect(screen.getByTestId('feature-flag-manager')).toBeInTheDocument();
    
    // Switch back to API Keys
    fireEvent.click(screen.getByText('API Keys'));
    expect(screen.getByTestId('api-key-manager')).toBeInTheDocument();
  });

  it('renders tab content within cards', () => {
    renderComponent();
    
    // Each tab content should be wrapped in a Card component
    const cardHeaders = screen.getAllByRole('banner'); // Card headers typically have banner role
    expect(cardHeaders.length).toBeGreaterThan(0);
  });

  it('shows correct tab descriptions', () => {
    renderComponent();
    
    // API Keys tab description (default)
    expect(screen.getByText('Manage ElevenLabs API keys and user assignments')).toBeInTheDocument();
    
    // Switch to other tabs and check descriptions
    fireEvent.click(screen.getByText('Feature Flags'));
    expect(screen.getByText('Control proprietary features and user access')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('System Settings'));
    expect(screen.getByText('Configure platform-wide settings and parameters')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('User Tiers'));
    expect(screen.getByText('Manage subscription tiers and feature access')).toBeInTheDocument();
  });
});