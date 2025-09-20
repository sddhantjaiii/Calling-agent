import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import BillingDisputeHandler from '../BillingDisputeHandler';

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

describe('BillingDisputeHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main title and description', () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    expect(screen.getByText('Billing Dispute Handler')).toBeInTheDocument();
    expect(screen.getByText('Manage chargebacks, refunds, and billing disputes')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    // Should show loading skeletons
    const loadingElements = screen.getAllByTestId(/loading|skeleton/i);
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('renders dispute statistics badges', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      expect(screen.getByText(/Open/)).toBeInTheDocument();
      expect(screen.getByText(/Investigating/)).toBeInTheDocument();
    });
  });

  it('displays search and filter controls', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search disputes...')).toBeInTheDocument();
      expect(screen.getByText('Filter by status')).toBeInTheDocument();
      expect(screen.getByText('Filter by priority')).toBeInTheDocument();
    });
  });

  it('filters disputes by search query', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search disputes...');
      fireEvent.change(searchInput, { target: { value: 'John' } });
    });

    // Should filter results (mock data should include John Doe)
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('filters disputes by status', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.click(statusFilter);
    });

    await waitFor(() => {
      const openOption = screen.getByText('Open');
      fireEvent.click(openOption);
    });

    // Should filter by open status
    await waitFor(() => {
      expect(screen.getByDisplayValue('Open')).toBeInTheDocument();
    });
  });

  it('displays dispute cards with correct information', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      // Should show dispute information
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('CHARGEBACK')).toBeInTheDocument();
      expect(screen.getByText('INVESTIGATING')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });
  });

  it('opens dispute details modal when view details is clicked', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      const viewDetailsButton = screen.getAllByText('View Details')[0];
      fireEvent.click(viewDetailsButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Dispute Details')).toBeInTheDocument();
    });
  });

  it('updates dispute status', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      // Find status dropdown
      const statusDropdowns = screen.getAllByDisplayValue('investigating');
      if (statusDropdowns.length > 0) {
        fireEvent.click(statusDropdowns[0]);
      }
    });

    await waitFor(() => {
      const resolvedOption = screen.getByText('Resolved');
      fireEvent.click(resolvedOption);
    });

    // Status should be updated
    await waitFor(() => {
      expect(screen.getByDisplayValue('resolved')).toBeInTheDocument();
    });
  });

  it('displays dispute type badges with correct colors', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      const chargebackBadge = screen.getByText('CHARGEBACK');
      expect(chargebackBadge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  it('shows empty state when no disputes match filters', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search disputes...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    });

    await waitFor(() => {
      expect(screen.getByText('No disputes found matching your criteria')).toBeInTheDocument();
    });
  });

  it('displays transaction information correctly', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      expect(screen.getByText('USD $99.99')).toBeInTheDocument();
      expect(screen.getByText('txn_1234567890')).toBeInTheDocument();
    });
  });

  it('shows customer reason and description', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      expect(screen.getByText(/I did not authorize this charge/)).toBeInTheDocument();
      expect(screen.getByText(/Customer disputes charge claiming/)).toBeInTheDocument();
    });
  });

  it('displays attachments when available', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      expect(screen.getByText('receipt_txn_1234567890.pdf')).toBeInTheDocument();
      expect(screen.getByText('user_activity_log.csv')).toBeInTheDocument();
    });
  });

  it('handles priority filter correctly', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      const priorityFilter = screen.getByDisplayValue('All Priorities');
      fireEvent.click(priorityFilter);
    });

    await waitFor(() => {
      const highOption = screen.getByText('High');
      fireEvent.click(highOption);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('High')).toBeInTheDocument();
    });
  });

  it('displays assigned user information', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      expect(screen.getByText('support@company.com')).toBeInTheDocument();
    });
  });

  it('shows dispute timeline in details modal', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      const viewDetailsButton = screen.getAllByText('View Details')[0];
      fireEvent.click(viewDetailsButton);
    });

    await waitFor(() => {
      const timelineTab = screen.getByText('Timeline');
      fireEvent.click(timelineTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Dispute Created')).toBeInTheDocument();
      expect(screen.getByText('Assigned to Support')).toBeInTheDocument();
    });
  });

  it('handles dispute resolution', async () => {
    renderWithQueryClient(<BillingDisputeHandler />);
    
    await waitFor(() => {
      const viewDetailsButton = screen.getAllByText('View Details')[0];
      fireEvent.click(viewDetailsButton);
    });

    await waitFor(() => {
      const resolutionTab = screen.getByText('Resolution');
      fireEvent.click(resolutionTab);
    });

    await waitFor(() => {
      const resolutionSelect = screen.getByText('Select resolution type');
      fireEvent.click(resolutionSelect);
    });

    await waitFor(() => {
      const fullRefundOption = screen.getByText('Full Refund');
      fireEvent.click(fullRefundOption);
    });

    const reasonTextarea = screen.getByPlaceholderText('Explain the resolution decision...');
    fireEvent.change(reasonTextarea, { target: { value: 'Valid chargeback, issuing full refund' } });

    const resolveButton = screen.getByText('Resolve Dispute');
    fireEvent.click(resolveButton);

    // Should close modal and update dispute status
    await waitFor(() => {
      expect(screen.queryByText('Dispute Details')).not.toBeInTheDocument();
    });
  });
});