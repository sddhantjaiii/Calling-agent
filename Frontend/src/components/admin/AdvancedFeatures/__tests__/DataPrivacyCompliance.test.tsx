import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import DataPrivacyCompliance from '../DataPrivacyCompliance';

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

describe('DataPrivacyCompliance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main title and description', () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    expect(screen.getByText('Data Privacy & Compliance')).toBeInTheDocument();
    expect(screen.getByText('Manage GDPR, CCPA compliance and data protection')).toBeInTheDocument();
  });

  it('displays export and generate report buttons', () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    expect(screen.getByText('Export Report')).toBeInTheDocument();
    expect(screen.getByText('Generate Report')).toBeInTheDocument();
  });

  it('shows all compliance tabs', () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    expect(screen.getByText('Data Requests')).toBeInTheDocument();
    expect(screen.getByText('Consent Management')).toBeInTheDocument();
    expect(screen.getByText('Data Retention')).toBeInTheDocument();
    expect(screen.getByText('Compliance Reports')).toBeInTheDocument();
  });

  it('displays data requests by default', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('EXPORT')).toBeInTheDocument();
      expect(screen.getByText('DELETION')).toBeInTheDocument();
    });
  });
});  it
('shows request status badges with correct colors', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const completedBadge = screen.getByText('COMPLETED');
      expect(completedBadge).toHaveClass('bg-green-100', 'text-green-800');
      
      const pendingBadge = screen.getByText('PENDING');
      expect(pendingBadge).toHaveClass('bg-orange-100', 'text-orange-800');
    });
  });

  it('displays request type badges with correct colors', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const exportBadge = screen.getByText('EXPORT');
      expect(exportBadge).toHaveClass('bg-blue-100', 'text-blue-800');
      
      const deletionBadge = screen.getByText('DELETION');
      expect(deletionBadge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  it('filters requests by search query', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search requests...');
      fireEvent.change(searchInput, { target: { value: 'John' } });
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('filters requests by status', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.click(statusFilter);
    });

    await waitFor(() => {
      const completedOption = screen.getByText('Completed');
      fireEvent.click(completedOption);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Completed')).toBeInTheDocument();
    });
  });

  it('processes data requests', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);
    });

    // Should update request status
    await waitFor(() => {
      expect(screen.getByText('PROCESSING')).toBeInTheDocument();
    });
  });

  it('switches to consent management tab', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const consentTab = screen.getByText('Consent Management');
      fireEvent.click(consentTab);
    });

    await waitFor(() => {
      expect(screen.getByText('MARKETING')).toBeInTheDocument();
      expect(screen.getByText('ANALYTICS')).toBeInTheDocument();
      expect(screen.getByText('GRANTED')).toBeInTheDocument();
      expect(screen.getByText('WITHDRAWN')).toBeInTheDocument();
    });
  });

  it('displays consent records with correct information', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const consentTab = screen.getByText('Consent Management');
      fireEvent.click(consentTab);
    });

    await waitFor(() => {
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
      expect(screen.getByText('192.168.1.101')).toBeInTheDocument();
      expect(screen.getByText('registration')).toBeInTheDocument();
      expect(screen.getByText('settings')).toBeInTheDocument();
    });
  });

  it('shows data retention policies', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const retentionTab = screen.getByText('Data Retention');
      fireEvent.click(retentionTab);
    });

    await waitFor(() => {
      expect(screen.getByText('User Profile Data')).toBeInTheDocument();
      expect(screen.getByText('Call Recordings')).toBeInTheDocument();
      expect(screen.getByText('Auto-Delete')).toBeInTheDocument();
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });
  });

  it('displays retention policy details', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const retentionTab = screen.getByText('Data Retention');
      fireEvent.click(retentionTab);
    });

    await waitFor(() => {
      expect(screen.getByText('7 years')).toBeInTheDocument();
      expect(screen.getByText('2 years')).toBeInTheDocument();
      expect(screen.getByText('Contract performance and legitimate interest')).toBeInTheDocument();
      expect(screen.getByText('Legitimate interest for service improvement')).toBeInTheDocument();
    });
  });

  it('shows compliance reports', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const reportsTab = screen.getByText('Compliance Reports');
      fireEvent.click(reportsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('GDPR Compliance Report Q1 2024')).toBeInTheDocument();
      expect(screen.getByText('GDPR')).toBeInTheDocument();
      expect(screen.getByText('FINAL')).toBeInTheDocument();
    });
  });

  it('opens generate report modal', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Generate Compliance Report')).toBeInTheDocument();
      expect(screen.getByText('Create a new compliance report for regulatory requirements')).toBeInTheDocument();
    });
  });

  it('creates compliance report', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      const titleInput = screen.getByLabelText('Report Title');
      const descriptionInput = screen.getByLabelText('Description');

      fireEvent.change(titleInput, { target: { value: 'Test Report' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test report description' } });

      const submitButton = screen.getByText('Generate Report');
      fireEvent.click(submitButton);
    });

    // Should close modal and show new report
    await waitFor(() => {
      expect(screen.queryByText('Generate Compliance Report')).not.toBeInTheDocument();
    });
  });

  it('displays data types for requests', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      expect(screen.getByText('profile')).toBeInTheDocument();
      expect(screen.getByText('calls')).toBeInTheDocument();
      expect(screen.getByText('agents')).toBeInTheDocument();
      expect(screen.getByText('billing')).toBeInTheDocument();
    });
  });

  it('shows request completion dates', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      // Should show completion date for completed requests
      const completedElements = screen.getAllByText(/Completed:/);
      expect(completedElements.length).toBeGreaterThan(0);
    });
  });

  it('handles consent withdrawal and restoration', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const consentTab = screen.getByText('Consent Management');
      fireEvent.click(consentTab);
    });

    await waitFor(() => {
      const withdrawButton = screen.getByText('Withdraw');
      expect(withdrawButton).toBeInTheDocument();
      
      const restoreButton = screen.getByText('Restore');
      expect(restoreButton).toBeInTheDocument();
    });
  });

  it('displays report generation and download options', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      const reportsTab = screen.getByText('Compliance Reports');
      fireEvent.click(reportsTab);
    });

    await waitFor(() => {
      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.getByText('View')).toBeInTheDocument();
    });
  });

  it('validates report generation form', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      const submitButton = screen.getByText('Generate Report');
      fireEvent.click(submitButton);
    });

    // Form should not submit without required fields
    await waitFor(() => {
      expect(screen.getByText('Generate Compliance Report')).toBeInTheDocument();
    });
  });

  it('shows request reasons when available', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      expect(screen.getByText('Account closure request')).toBeInTheDocument();
    });
  });

  it('displays processing notes for completed requests', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    await waitFor(() => {
      expect(screen.getByText('GDPR data export request processed successfully')).toBeInTheDocument();
    });
  });

  it('handles report type selection', async () => {
    renderWithQueryClient(<DataPrivacyCompliance />);
    
    const generateButton = screen.getByText('Generate Report');
    fireEvent.click(generateButton);

    await waitFor(() => {
      const reportTypeSelect = screen.getByDisplayValue('GDPR Compliance');
      fireEvent.click(reportTypeSelect);
    });

    await waitFor(() => {
      const ccpaOption = screen.getByText('CCPA Compliance');
      fireEvent.click(ccpaOption);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('CCPA Compliance')).toBeInTheDocument();
    });
  });
});