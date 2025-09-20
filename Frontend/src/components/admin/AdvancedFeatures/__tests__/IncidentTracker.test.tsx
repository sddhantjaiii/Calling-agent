import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import IncidentTracker from '../IncidentTracker';

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

describe('IncidentTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main title and description', () => {
    renderWithQueryClient(<IncidentTracker />);
    
    expect(screen.getByText('Incident Tracker')).toBeInTheDocument();
    expect(screen.getByText('Track and manage system incidents and resolutions')).toBeInTheDocument();
  });

  it('displays create incident button', () => {
    renderWithQueryClient(<IncidentTracker />);
    
    expect(screen.getByText('Create Incident')).toBeInTheDocument();
  });

  it('shows search and filter controls', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search incidents...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Severities')).toBeInTheDocument();
    });
  });

  it('displays incident cards with correct information', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('ElevenLabs API Rate Limit Exceeded')).toBeInTheDocument();
      expect(screen.getByText('Database Connection Pool Exhaustion')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });
  });

  it('filters incidents by search query', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search incidents...');
      fireEvent.change(searchInput, { target: { value: 'ElevenLabs' } });
    });

    await waitFor(() => {
      expect(screen.getByText('ElevenLabs API Rate Limit Exceeded')).toBeInTheDocument();
      expect(screen.queryByText('Database Connection Pool Exhaustion')).not.toBeInTheDocument();
    });
  });

  it('filters incidents by status', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.click(statusFilter);
    });

    await waitFor(() => {
      const resolvedOption = screen.getByText('Resolved');
      fireEvent.click(resolvedOption);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Resolved')).toBeInTheDocument();
    });
  });

  it('filters incidents by severity', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      const severityFilter = screen.getByDisplayValue('All Severities');
      fireEvent.click(severityFilter);
    });

    await waitFor(() => {
      const criticalOption = screen.getByText('Critical');
      fireEvent.click(criticalOption);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Critical')).toBeInTheDocument();
    });
  });

  it('opens create incident modal', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    const createButton = screen.getByText('Create Incident');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Create New Incident')).toBeInTheDocument();
      expect(screen.getByText('Report a new system incident for tracking and resolution')).toBeInTheDocument();
    });
  });

  it('creates a new incident', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    const createButton = screen.getByText('Create Incident');
    fireEvent.click(createButton);

    await waitFor(() => {
      const titleInput = screen.getByLabelText('Title');
      const descriptionInput = screen.getByLabelText('Description');
      const categoryInput = screen.getByLabelText('Category');

      fireEvent.change(titleInput, { target: { value: 'Test Incident' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test incident description' } });
      fireEvent.change(categoryInput, { target: { value: 'Test Category' } });

      const submitButton = screen.getByText('Create Incident');
      fireEvent.click(submitButton);
    });

    // Should close modal and show new incident
    await waitFor(() => {
      expect(screen.queryByText('Create New Incident')).not.toBeInTheDocument();
      expect(screen.getByText('Test Incident')).toBeInTheDocument();
    });
  });

  it('displays incident severity icons correctly', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      // Should show alert triangle icons for high/critical severity
      const alertIcons = document.querySelectorAll('[data-testid="alert-triangle"]');
      expect(alertIcons.length).toBeGreaterThan(0);
    });
  });

  it('shows incident status badges with correct colors', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      const investigatingBadge = screen.getByText('INVESTIGATING');
      expect(investigatingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      
      const resolvedBadge = screen.getByText('RESOLVED');
      expect(resolvedBadge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  it('displays affected services as badges', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('Voice Generation')).toBeInTheDocument();
      expect(screen.getByText('Agent Calls')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('API')).toBeInTheDocument();
    });
  });

  it('shows incident metadata correctly', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@company.com')).toBeInTheDocument();
      expect(screen.getByText(/\d+ updates/)).toBeInTheDocument();
    });
  });

  it('updates incident status', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      // Find status dropdown for investigating incident
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

  it('opens incident details modal', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('ElevenLabs API Rate Limit Exceeded')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });
  });

  it('displays incident details in modal', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Multiple users reporting failed voice generation due to API rate limits')).toBeInTheDocument();
      expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
      expect(screen.getByText('API Integration')).toBeInTheDocument();
    });
  });

  it('shows incident timeline in modal', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);
    });

    await waitFor(() => {
      const timelineTab = screen.getByText('Timeline');
      fireEvent.click(timelineTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Incident Created')).toBeInTheDocument();
      expect(screen.getByText('Assigned to John Doe')).toBeInTheDocument();
      expect(screen.getByText('Status Updated')).toBeInTheDocument();
    });
  });

  it('shows empty state when no incidents match filters', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search incidents...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    });

    await waitFor(() => {
      expect(screen.getByText('No incidents found matching your criteria')).toBeInTheDocument();
    });
  });

  it('validates create incident form', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    const createButton = screen.getByText('Create Incident');
    fireEvent.click(createButton);

    await waitFor(() => {
      const submitButton = screen.getByText('Create Incident');
      fireEvent.click(submitButton);
    });

    // Form should not submit without required fields
    await waitFor(() => {
      expect(screen.getByText('Create New Incident')).toBeInTheDocument();
    });
  });

  it('displays incident creation date correctly', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      // Should show formatted dates
      const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it('handles severity selection in create form', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    const createButton = screen.getByText('Create Incident');
    fireEvent.click(createButton);

    await waitFor(() => {
      const severitySelect = screen.getByDisplayValue('Medium');
      fireEvent.click(severitySelect);
    });

    await waitFor(() => {
      const highOption = screen.getByText('High');
      fireEvent.click(highOption);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('High')).toBeInTheDocument();
    });
  });

  it('closes incident details modal', async () => {
    renderWithQueryClient(<IncidentTracker />);
    
    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByText('View Details');
      fireEvent.click(viewDetailsButtons[0]);
    });

    await waitFor(() => {
      // Click outside or close button to close modal
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    // Modal should be closeable
    fireEvent.keyDown(document, { key: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});