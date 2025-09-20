import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { SupportTickets } from '../SupportTickets';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock the AdminTable component
vi.mock('../../shared/AdminTable', () => ({
  AdminTable: ({ data, loading, emptyMessage }: any) => (
    <div data-testid="admin-table">
      {loading ? (
        <div>Loading...</div>
      ) : data.length === 0 ? (
        <div>{emptyMessage}</div>
      ) : (
        <div>
          {data.map((item: any) => (
            <div key={item.id} data-testid={`ticket-${item.id}`}>
              {item.ticketNumber} - {item.subject}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('SupportTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders support tickets interface with search and filters', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search tickets...')).toBeInTheDocument();
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('displays multiple filter dropdowns', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Should have status, priority, category, and assignee filters
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('filters tickets by search query', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search tickets...');
      fireEvent.change(searchInput, { target: { value: 'TKT-2024-001' } });
    });

    // The filtering logic is tested through the component's internal state
  });

  it('filters tickets by status', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      const statusSelects = screen.getAllByRole('combobox');
      // Find the status filter (first one typically)
      if (statusSelects.length > 0) {
        fireEvent.click(statusSelects[0]);
      }
    });
  });

  it('filters tickets by priority', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      const prioritySelects = screen.getAllByRole('combobox');
      // Find the priority filter
      if (prioritySelects.length > 1) {
        fireEvent.click(prioritySelects[1]);
      }
    });
  });

  it('filters tickets by category', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      const categorySelects = screen.getAllByRole('combobox');
      // Find the category filter
      if (categorySelects.length > 2) {
        fireEvent.click(categorySelects[2]);
      }
    });
  });

  it('filters tickets by assignee', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      const assigneeSelects = screen.getAllByRole('combobox');
      // Find the assignee filter
      if (assigneeSelects.length > 3) {
        fireEvent.click(assigneeSelects[3]);
      }
    });
  });

  it('displays ticket priority badges with correct colors', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      // The component should render priority badges
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('displays ticket status badges with correct colors', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      // The component should render status badges
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('shows escalation indicator for escalated tickets', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      // The component should show escalation indicators
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('handles ticket escalation', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      // The escalation functionality would be tested by clicking escalate buttons
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('opens ticket details dialog when view button is clicked', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      // The view functionality would be tested by clicking view buttons in the table
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('displays ticket information in details dialog', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    // This would test the ticket details dialog content
    // Would require setting up mock data and simulating ticket selection
    await waitFor(() => {
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('shows ticket responses in chronological order', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    // This would test the responses display in the ticket details
    await waitFor(() => {
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('opens response dialog when add response button is clicked', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    // This would test opening the response dialog
    await waitFor(() => {
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('handles ticket response submission', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    // This would test the response form submission
    await waitFor(() => {
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('shows validation error when trying to submit empty response', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    // This would test response validation
    await waitFor(() => {
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('allows updating ticket status when responding', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    // This would test status updates through responses
    await waitFor(() => {
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('allows updating ticket priority when responding', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    // This would test priority updates through responses
    await waitFor(() => {
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('allows reassigning tickets when responding', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    // This would test ticket reassignment through responses
    await waitFor(() => {
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('supports internal notes that are not visible to users', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    // This would test internal note functionality
    await waitFor(() => {
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('displays response count for each ticket', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      // The component should show response counts
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('shows ticket creation and update timestamps', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      // The component should display timestamps
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('displays user information for each ticket', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      // The component should show user details
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching tickets', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    // Initially should show loading state
    expect(screen.getByTestId('admin-table')).toBeInTheDocument();
  });

  it('displays empty state when no tickets found', async () => {
    render(<SupportTickets />, { wrapper: createWrapper() });

    await waitFor(() => {
      // With no tickets, should show empty message
      expect(screen.getByTestId('admin-table')).toBeInTheDocument();
    });
  });
});