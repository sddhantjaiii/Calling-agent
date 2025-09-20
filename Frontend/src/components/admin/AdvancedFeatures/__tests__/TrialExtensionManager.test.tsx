import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import TrialExtensionManager from '../TrialExtensionManager';

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

describe('TrialExtensionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main title and description', () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    expect(screen.getByText('Trial Extension Manager')).toBeInTheDocument();
    expect(screen.getByText('Manage trial extensions and track conversion opportunities')).toBeInTheDocument();
  });

  it('displays analytics cards', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Active Trials')).toBeInTheDocument();
      expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
      expect(screen.getByText('Pending Extensions')).toBeInTheDocument();
      expect(screen.getByText('Avg Trial Duration')).toBeInTheDocument();
    });
  });

  it('shows analytics values correctly', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument(); // Active trials
      expect(screen.getByText('23.5%')).toBeInTheDocument(); // Conversion rate
      expect(screen.getByText('3')).toBeInTheDocument(); // Pending extensions
      expect(screen.getByText('16.2 days')).toBeInTheDocument(); // Avg duration
    });
  });

  it('displays trial users tab by default', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Carol Davis')).toBeInTheDocument();
    });
  });
});  i
t('shows user status badges with correct colors', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const activeBadge = screen.getByText('ACTIVE');
      expect(activeBadge).toHaveClass('bg-green-100', 'text-green-800');
      
      const expiredBadge = screen.getByText('EXPIRED');
      expect(expiredBadge).toHaveClass('bg-red-100', 'text-red-800');
      
      const extendedBadge = screen.getByText('EXTENDED');
      expect(extendedBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  it('displays conversion probabilities with correct colors', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('85% conversion probability')).toBeInTheDocument();
      expect(screen.getByText('35% conversion probability')).toBeInTheDocument();
      expect(screen.getByText('92% conversion probability')).toBeInTheDocument();
    });
  });

  it('shows user usage statistics', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Agents created
      expect(screen.getByText('45')).toBeInTheDocument(); // Calls made
      expect(screen.getByText('120')).toBeInTheDocument(); // Credits used
    });
  });

  it('displays extension usage correctly', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('0 / 2 used')).toBeInTheDocument();
      expect(screen.getByText('1 / 2 used')).toBeInTheDocument();
    });
  });

  it('filters users by search query', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search users...');
      fireEvent.change(searchInput, { target: { value: 'Alice' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });
  });

  it('filters users by status', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.click(statusFilter);
    });

    await waitFor(() => {
      const activeOption = screen.getByText('Active');
      fireEvent.click(activeOption);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Active')).toBeInTheDocument();
    });
  });

  it('opens extension request modal', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const requestButton = screen.getByText('Request Extension');
      fireEvent.click(requestButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Request Trial Extension')).toBeInTheDocument();
      expect(screen.getByText('Create a new trial extension request for a user')).toBeInTheDocument();
    });
  });

  it('switches to extension requests tab', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const extensionsTab = screen.getByText('Extension Requests');
      fireEvent.click(extensionsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Carol Davis')).toBeInTheDocument();
      expect(screen.getByText('David Wilson')).toBeInTheDocument();
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });
  });

  it('approves extension requests', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const extensionsTab = screen.getByText('Extension Requests');
      fireEvent.click(extensionsTab);
    });

    await waitFor(() => {
      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);
    });

    // Should update the extension status
    await waitFor(() => {
      expect(screen.getAllByText('APPROVED')).toHaveLength(2);
    });
  });

  it('rejects extension requests', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const extensionsTab = screen.getByText('Extension Requests');
      fireEvent.click(extensionsTab);
    });

    await waitFor(() => {
      const rejectButton = screen.getByText('Reject');
      fireEvent.click(rejectButton);
    });

    // Should update the extension status
    await waitFor(() => {
      expect(screen.getByText('REJECTED')).toBeInTheDocument();
    });
  });

  it('displays analytics tab with conversion factors', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const analyticsTab = screen.getByText('Analytics');
      fireEvent.click(analyticsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Conversion Factors')).toBeInTheDocument();
      expect(screen.getByText('High API Usage')).toBeInTheDocument();
      expect(screen.getByText('Multiple Agents Created')).toBeInTheDocument();
      expect(screen.getByText('Extended Trial')).toBeInTheDocument();
    });
  });

  it('shows extension statistics in analytics', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const analyticsTab = screen.getByText('Analytics');
      fireEvent.click(analyticsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Extension Statistics')).toBeInTheDocument();
      expect(screen.getByText('Pending Requests')).toBeInTheDocument();
      expect(screen.getByText('Approved Extensions')).toBeInTheDocument();
      expect(screen.getByText('Rejected Requests')).toBeInTheDocument();
    });
  });

  it('calculates approval rate correctly', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const analyticsTab = screen.getByText('Analytics');
      fireEvent.click(analyticsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Approval Rate')).toBeInTheDocument();
      expect(screen.getByText('86%')).toBeInTheDocument(); // 12/(12+2) * 100
    });
  });

  it('creates extension request with form validation', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const requestButton = screen.getByText('Request Extension');
      fireEvent.click(requestButton);
    });

    await waitFor(() => {
      const userSelect = screen.getByText('Choose a user');
      fireEvent.click(userSelect);
    });

    await waitFor(() => {
      const userOption = screen.getByText(/Alice Johnson/);
      fireEvent.click(userOption);
    });

    const reasonTextarea = screen.getByPlaceholderText('Explain why this extension is needed...');
    fireEvent.change(reasonTextarea, { target: { value: 'User needs more time for evaluation' } });

    const submitButton = screen.getByText('Request Extension');
    fireEvent.click(submitButton);

    // Should close modal and create request
    await waitFor(() => {
      expect(screen.queryByText('Request Trial Extension')).not.toBeInTheDocument();
    });
  });

  it('shows days remaining calculation', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/\d+ days/)).toBeInTheDocument();
    });
  });

  it('displays user notes as badges', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      expect(screen.getByText('High engagement user')).toBeInTheDocument();
      expect(screen.getByText('Requested demo call')).toBeInTheDocument();
      expect(screen.getByText('Power user')).toBeInTheDocument();
    });
  });

  it('shows extend trial button for expired users', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const extendButtons = screen.getAllByText('Extend Trial');
      expect(extendButtons.length).toBeGreaterThan(0);
    });
  });

  it('handles extension days selection', async () => {
    renderWithQueryClient(<TrialExtensionManager />);
    
    await waitFor(() => {
      const requestButton = screen.getByText('Request Extension');
      fireEvent.click(requestButton);
    });

    await waitFor(() => {
      const daysSelect = screen.getByDisplayValue('7 days');
      fireEvent.click(daysSelect);
    });

    await waitFor(() => {
      const fourteenDaysOption = screen.getByText('14 days');
      fireEvent.click(fourteenDaysOption);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('14 days')).toBeInTheDocument();
    });
  });
});