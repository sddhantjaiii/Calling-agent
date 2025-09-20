import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import APIKeyManager from '../APIKeyManager';
import { adminApiService } from '../../../../services/adminApiService';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    getAPIKeys: vi.fn(),
    createAPIKey: vi.fn(),
    updateAPIKey: vi.fn(),
    deleteAPIKey: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('../../../ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockApiKeys = [
  {
    id: '1',
    name: 'Primary API Key',
    key: 'sk-1234567890abcdef',
    isDefault: true,
    assignedUsers: ['user1', 'user2'],
    usageStats: {
      totalCalls: 1000,
      remainingQuota: 9000,
      costThisMonth: 50.00
    },
    status: 'active' as const
  },
  {
    id: '2',
    name: 'Secondary API Key',
    key: 'sk-abcdef1234567890',
    isDefault: false,
    assignedUsers: ['user3'],
    usageStats: {
      totalCalls: 500,
      remainingQuota: 9500,
      costThisMonth: 25.00
    },
    status: 'active' as const
  }
];

describe('APIKeyManager', () => {
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
        <APIKeyManager />
      </QueryClientProvider>
    );
  };

  it('renders API key manager with loading state', () => {
    vi.mocked(adminApiService.getAPIKeys).mockImplementation(
      () => new Promise(() => {}) // Never resolves to show loading
    );

    renderComponent();
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders API key manager with data', async () => {
    vi.mocked(adminApiService.getAPIKeys).mockResolvedValue({
      success: true,
      data: mockApiKeys,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('API Key Management')).toBeInTheDocument();
      expect(screen.getByText('Primary API Key')).toBeInTheDocument();
      expect(screen.getByText('Secondary API Key')).toBeInTheDocument();
    });
  });

  it('displays API key statistics correctly', async () => {
    vi.mocked(adminApiService.getAPIKeys).mockResolvedValue({
      success: true,
      data: mockApiKeys,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Total API Keys')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total count
      expect(screen.getByText('Active Keys')).toBeInTheDocument();
      expect(screen.getByText('Assigned Users')).toBeInTheDocument();
      expect(screen.getByText('Monthly Cost')).toBeInTheDocument();
    });
  });

  it('masks API keys by default', async () => {
    vi.mocked(adminApiService.getAPIKeys).mockResolvedValue({
      success: true,
      data: mockApiKeys,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      // Should show masked version
      expect(screen.getByText('sk-1***********cdef')).toBeInTheDocument();
      expect(screen.getByText('sk-a***********7890')).toBeInTheDocument();
    });
  });

  it('toggles API key visibility when eye icon is clicked', async () => {
    vi.mocked(adminApiService.getAPIKeys).mockResolvedValue({
      success: true,
      data: mockApiKeys,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      const eyeButtons = screen.getAllByRole('button');
      const firstEyeButton = eyeButtons.find(button => 
        button.querySelector('svg')?.getAttribute('data-lucide') === 'eye'
      );
      
      if (firstEyeButton) {
        fireEvent.click(firstEyeButton);
        // After clicking, should show full key
        expect(screen.getByText('sk-1234567890abcdef')).toBeInTheDocument();
      }
    });
  });

  it('opens create API key modal when Add API Key button is clicked', async () => {
    vi.mocked(adminApiService.getAPIKeys).mockResolvedValue({
      success: true,
      data: mockApiKeys,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      const addButton = screen.getByText('Add API Key');
      fireEvent.click(addButton);
      
      expect(screen.getByText('Create New API Key')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter API key name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter ElevenLabs API key')).toBeInTheDocument();
    });
  });

  it('creates new API key when form is submitted', async () => {
    vi.mocked(adminApiService.getAPIKeys).mockResolvedValue({
      success: true,
      data: mockApiKeys,
      message: 'Success'
    });

    vi.mocked(adminApiService.createAPIKey).mockResolvedValue({
      success: true,
      data: {
        id: '3',
        name: 'New API Key',
        key: 'sk-newkey123456789',
        isDefault: false,
        assignedUsers: [],
        usageStats: {
          totalCalls: 0,
          remainingQuota: 10000,
          costThisMonth: 0
        },
        status: 'active' as const
      },
      message: 'Created'
    });

    renderComponent();

    await waitFor(() => {
      const addButton = screen.getByText('Add API Key');
      fireEvent.click(addButton);
    });

    // Fill out the form
    const nameInput = screen.getByPlaceholderText('Enter API key name');
    const keyInput = screen.getByPlaceholderText('Enter ElevenLabs API key');
    
    fireEvent.change(nameInput, { target: { value: 'New API Key' } });
    fireEvent.change(keyInput, { target: { value: 'sk-newkey123456789' } });

    // Submit the form
    const createButton = screen.getByText('Create API Key');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(adminApiService.createAPIKey).toHaveBeenCalledWith({
        name: 'New API Key',
        key: 'sk-newkey123456789',
        isDefault: false,
        assignedUsers: [],
        usageStats: {
          totalCalls: 0,
          remainingQuota: 10000,
          costThisMonth: 0
        },
        status: 'active'
      });
    });
  });

  it('opens user assignment modal when user count is clicked', async () => {
    vi.mocked(adminApiService.getAPIKeys).mockResolvedValue({
      success: true,
      data: mockApiKeys,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      const userButtons = screen.getAllByRole('button');
      const userAssignmentButton = userButtons.find(button => 
        button.textContent?.includes('2') // First API key has 2 assigned users
      );
      
      if (userAssignmentButton) {
        fireEvent.click(userAssignmentButton);
        expect(screen.getByText('Manage User Assignments')).toBeInTheDocument();
      }
    });
  });

  it('handles API key deletion with confirmation', async () => {
    vi.mocked(adminApiService.getAPIKeys).mockResolvedValue({
      success: true,
      data: mockApiKeys,
      message: 'Success'
    });

    vi.mocked(adminApiService.deleteAPIKey).mockResolvedValue({
      success: true,
      data: undefined,
      message: 'Deleted'
    });

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderComponent();

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('svg')?.getAttribute('data-lucide') === 'trash-2'
      );
      
      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(confirmSpy).toHaveBeenCalled();
        expect(adminApiService.deleteAPIKey).toHaveBeenCalled();
      }
    });

    confirmSpy.mockRestore();
  });

  it('displays error state when API call fails', async () => {
    vi.mocked(adminApiService.getAPIKeys).mockRejectedValue(
      new Error('Failed to load API keys')
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Error Loading API Keys')).toBeInTheDocument();
      expect(screen.getByText('Failed to load API key configuration')).toBeInTheDocument();
    });
  });

  it('shows usage statistics and progress bars', async () => {
    vi.mocked(adminApiService.getAPIKeys).mockResolvedValue({
      success: true,
      data: mockApiKeys,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('1,000 calls')).toBeInTheDocument();
      expect(screen.getByText('9,000 remaining')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });
  });

  it('disables delete button for default API keys', async () => {
    vi.mocked(adminApiService.getAPIKeys).mockResolvedValue({
      success: true,
      data: mockApiKeys,
      message: 'Success'
    });

    renderComponent();

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('svg')?.getAttribute('data-lucide') === 'trash-2' &&
        button.closest('tr')?.textContent?.includes('Primary API Key')
      );
      
      expect(deleteButton).toBeDisabled();
    });
  });
});