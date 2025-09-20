import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SystemSettings from '../SystemSettings';
import { adminApiService } from '../../../../services/adminApiService';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    getSystemConfig: vi.fn(),
    updateSystemConfig: vi.fn(),
    getSystemAnalytics: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('../../../ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockSystemConfig = {
  creditRates: {
    pricePerCredit: 0.01,
    minimumPurchase: 100,
    currency: 'USD',
  },
  contactLimits: {
    freeUser: 100,
    paidUser: 1000,
    premiumUser: 10000,
  },
  systemMaintenance: {
    enabled: false,
    message: '',
    scheduledStart: undefined,
    scheduledEnd: undefined,
  },
};

const mockServiceProviders = [
  {
    id: '1',
    name: 'ElevenLabs',
    type: 'voice',
    enabled: true,
    priority: 1,
    status: 'healthy',
    lastChecked: new Date(),
    responseTime: 150,
    uptime: 99.9,
    config: {},
  },
  {
    id: '2',
    name: 'Stripe',
    type: 'payment',
    enabled: true,
    priority: 1,
    status: 'healthy',
    lastChecked: new Date(),
    responseTime: 200,
    uptime: 99.8,
    config: {},
  },
];

const mockBackupStatus = [
  {
    id: '1',
    type: 'full',
    status: 'completed',
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: new Date('2024-01-01T11:00:00Z'),
    size: 1024 * 1024 * 100, // 100MB
    location: 's3://backups/backup-1.sql',
  },
  {
    id: '2',
    type: 'incremental',
    status: 'running',
    startTime: new Date('2024-01-02T10:00:00Z'),
    size: 1024 * 1024 * 10, // 10MB
    location: 's3://backups/backup-2.sql',
  },
];

describe('SystemSettings', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(adminApiService.getSystemConfig).mockResolvedValue({
      success: true,
      data: mockSystemConfig,
      message: 'Success'
    });
    
    vi.mocked(adminApiService.getSystemAnalytics).mockImplementation((params: any) => {
      if (params.type === 'service-providers') {
        return Promise.resolve({ data: mockServiceProviders });
      }
      if (params.type === 'backup-status') {
        return Promise.resolve({ data: mockBackupStatus });
      }
      return Promise.resolve({ data: {} });
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SystemSettings />
      </QueryClientProvider>
    );
  };

  it('renders system settings with tabbed interface', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('System Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure platform-wide settings and parameters')).toBeInTheDocument();
      
      // Check tabs are present
      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
      expect(screen.getByText('Backup & Recovery')).toBeInTheDocument();
      expect(screen.getByText('System Limits')).toBeInTheDocument();
      expect(screen.getByText('Maintenance')).toBeInTheDocument();
    });
  });

  it('displays summary cards with correct values', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Credit Price')).toBeInTheDocument();
      expect(screen.getByText('$0.010')).toBeInTheDocument();
      expect(screen.getByText('Free User Limit')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Service Providers')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Mode')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  it('displays general configuration in default tab', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Credit Rates & Pricing')).toBeInTheDocument();
      expect(screen.getByText('Contact Upload Limits')).toBeInTheDocument();
      
      // Check form fields
      expect(screen.getByLabelText('Price per Credit')).toBeInTheDocument();
      expect(screen.getByLabelText('Minimum Purchase')).toBeInTheDocument();
      expect(screen.getByLabelText('Currency')).toBeInTheDocument();
      expect(screen.getByLabelText('Free User Limit')).toBeInTheDocument();
      expect(screen.getByLabelText('Paid User Limit')).toBeInTheDocument();
      expect(screen.getByLabelText('Premium User Limit')).toBeInTheDocument();
    });
  });

  it('displays service providers when switching to providers tab', async () => {
    renderComponent();

    // Switch to providers tab
    fireEvent.click(screen.getByText('Service Providers'));

    await waitFor(() => {
      expect(screen.getByText('Service Provider Management')).toBeInTheDocument();
      expect(screen.getByText('ElevenLabs')).toBeInTheDocument();
      expect(screen.getByText('Stripe')).toBeInTheDocument();
      expect(screen.getByText('voice')).toBeInTheDocument();
      expect(screen.getByText('payment')).toBeInTheDocument();
    });
  });

  it('displays backup status when switching to backup tab', async () => {
    renderComponent();

    // Switch to backup tab
    fireEvent.click(screen.getByText('Backup & Recovery'));

    await waitFor(() => {
      expect(screen.getByText('Backup & Recovery Management')).toBeInTheDocument();
      expect(screen.getByText('Recent Backups')).toBeInTheDocument();
      expect(screen.getByText('full backup')).toBeInTheDocument();
      expect(screen.getByText('incremental backup')).toBeInTheDocument();
      expect(screen.getByText('Full Backup')).toBeInTheDocument();
      expect(screen.getByText('Incremental Backup')).toBeInTheDocument();
    });
  });

  it('displays system limits when switching to limits tab', async () => {
    renderComponent();

    // Switch to limits tab
    fireEvent.click(screen.getByText('System Limits'));

    await waitFor(() => {
      expect(screen.getByText('System Limits & Quotas')).toBeInTheDocument();
      expect(screen.getByText('Maximum Concurrent Calls')).toBeInTheDocument();
      expect(screen.getByText('Maximum Users per Tier')).toBeInTheDocument();
      expect(screen.getByText('Rate Limits')).toBeInTheDocument();
    });
  });

  it('displays maintenance configuration when switching to maintenance tab', async () => {
    renderComponent();

    // Switch to maintenance tab
    fireEvent.click(screen.getByText('Maintenance'));

    await waitFor(() => {
      expect(screen.getByText('System Maintenance')).toBeInTheDocument();
      expect(screen.getByText('Configure system maintenance mode and operational tools')).toBeInTheDocument();
      expect(screen.getByLabelText('Enable maintenance mode')).toBeInTheDocument();
    });
  });

  it('updates credit rate when input changes', async () => {
    renderComponent();

    await waitFor(() => {
      const priceInput = screen.getByDisplayValue('0.01');
      fireEvent.change(priceInput, { target: { value: '0.02' } });
      
      expect(priceInput).toHaveValue(0.02);
    });
  });

  it('updates contact limits when inputs change', async () => {
    renderComponent();

    await waitFor(() => {
      const freeUserInput = screen.getByDisplayValue('100');
      fireEvent.change(freeUserInput, { target: { value: '200' } });
      
      expect(freeUserInput).toHaveValue(200);
    });
  });

  it('toggles maintenance mode and shows message field', async () => {
    renderComponent();

    // Switch to maintenance tab
    fireEvent.click(screen.getByText('Maintenance'));

    await waitFor(() => {
      const maintenanceSwitch = screen.getByLabelText('Enable maintenance mode');
      fireEvent.click(maintenanceSwitch);
      
      // Should show maintenance message field when enabled
      expect(screen.getByPlaceholderText('Enter message to display to users during maintenance...')).toBeInTheDocument();
    });
  });

  it('handles backup operations', async () => {
    renderComponent();

    // Switch to backup tab
    fireEvent.click(screen.getByText('Backup & Recovery'));

    await waitFor(() => {
      const fullBackupButton = screen.getByText('Full Backup');
      const incrementalBackupButton = screen.getByText('Incremental Backup');
      
      expect(fullBackupButton).toBeInTheDocument();
      expect(incrementalBackupButton).toBeInTheDocument();
      
      // Test clicking backup buttons
      fireEvent.click(fullBackupButton);
      fireEvent.click(incrementalBackupButton);
    });
  });

  it('handles system limits configuration', async () => {
    renderComponent();

    // Switch to limits tab
    fireEvent.click(screen.getByText('System Limits'));

    await waitFor(() => {
      const concurrentCallsInput = screen.getByDisplayValue('1000');
      fireEvent.change(concurrentCallsInput, { target: { value: '2000' } });
      expect(concurrentCallsInput).toHaveValue(2000);
    });
  });

  it('saves configuration when Save Changes button is clicked', async () => {
    vi.mocked(adminApiService.updateSystemConfig).mockResolvedValue({
      success: true,
      data: mockSystemConfig,
      message: 'Updated'
    });

    renderComponent();

    await waitFor(() => {
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      expect(adminApiService.updateSystemConfig).toHaveBeenCalled();
    });
  });

  it('resets form when Reset button is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      // Change a value
      const priceInput = screen.getByDisplayValue('0.01');
      fireEvent.change(priceInput, { target: { value: '0.02' } });
      
      // Reset form
      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);
      
      // Should revert to original value
      expect(screen.getByDisplayValue('0.01')).toBeInTheDocument();
    });
  });

  it('displays loading state', () => {
    vi.mocked(adminApiService.getSystemConfig).mockImplementation(
      () => new Promise(() => {}) // Never resolves to show loading
    );

    renderComponent();
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('handles error state when API call fails', async () => {
    vi.mocked(adminApiService.getSystemConfig).mockRejectedValue(
      new Error('Failed to load system settings')
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Error Loading System Settings')).toBeInTheDocument();
      expect(screen.getByText('Failed to load system configuration')).toBeInTheDocument();
    });
  });

  it('formats backup file sizes correctly', async () => {
    renderComponent();

    // Switch to backup tab
    fireEvent.click(screen.getByText('Backup & Recovery'));

    await waitFor(() => {
      expect(screen.getByText('100 MB')).toBeInTheDocument();
      expect(screen.getByText('10 MB')).toBeInTheDocument();
    });
  });

  it('displays service provider status badges', async () => {
    renderComponent();

    // Switch to providers tab
    fireEvent.click(screen.getByText('Service Providers'));

    await waitFor(() => {
      const healthyBadges = screen.getAllByText('healthy');
      expect(healthyBadges.length).toBe(2);
    });
  });

  it('handles service provider toggle', async () => {
    renderComponent();

    // Switch to providers tab
    fireEvent.click(screen.getByText('Service Providers'));

    await waitFor(() => {
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
      
      // Test toggling a switch
      fireEvent.click(switches[0]);
    });
  });

  it('validates numeric inputs correctly', async () => {
    renderComponent();

    await waitFor(() => {
      const priceInput = screen.getByDisplayValue('0.01');
      
      // Test invalid input
      fireEvent.change(priceInput, { target: { value: 'invalid' } });
      expect(priceInput).toHaveValue(0); // Should default to 0 for invalid input
      
      // Test valid input
      fireEvent.change(priceInput, { target: { value: '0.05' } });
      expect(priceInput).toHaveValue(0.05);
    });
  });

  it('shows correct step and min values for numeric inputs', async () => {
    renderComponent();

    await waitFor(() => {
      const priceInput = screen.getByDisplayValue('0.01');
      expect(priceInput).toHaveAttribute('step', '0.001');
      expect(priceInput).toHaveAttribute('min', '0');
      
      const minimumPurchaseInput = screen.getByDisplayValue('100');
      expect(minimumPurchaseInput).toHaveAttribute('min', '1');
    });
  });

  it('displays loading state on save button when saving', async () => {
    vi.mocked(adminApiService.updateSystemConfig).mockImplementation(
      () => new Promise(() => {}) // Never resolves to show loading
    );

    renderComponent();

    await waitFor(() => {
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  it('handles currency selection', async () => {
    renderComponent();

    await waitFor(() => {
      const currencySelect = screen.getByLabelText('Currency');
      expect(currencySelect).toBeInTheDocument();
      
      // Should show USD as selected
      expect(screen.getByText('USD')).toBeInTheDocument();
    });
  });
});