import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Reports } from '../index';
import { adminApiService } from '@/services/adminApiService';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/services/adminApiService');
vi.mock('@/hooks/use-toast');

const mockToast = vi.fn();
const mockAdminApiService = adminApiService as any;

describe('Reports Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
  });

  it('renders reports dashboard with stats', () => {
    render(<Reports />);
    
    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
    expect(screen.getByText('Create, schedule, and share comprehensive platform reports')).toBeInTheDocument();
    
    // Check stats cards
    expect(screen.getByText('Total Reports')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.getByText('This Month')).toBeInTheDocument();
  });

  it('switches between different tabs', async () => {
    const user = userEvent.setup();
    render(<Reports />);
    
    // Default tab should be builder
    expect(screen.getByText('Report Builder')).toBeInTheDocument();
    
    // Switch to templates tab
    const templatesTab = screen.getByRole('tab', { name: /templates/i });
    await user.click(templatesTab);
    
    expect(screen.getByText('Report Generator')).toBeInTheDocument();
    
    // Switch to scheduler tab
    const schedulerTab = screen.getByRole('tab', { name: /scheduler/i });
    await user.click(schedulerTab);
    
    expect(screen.getByText('Report Scheduler')).toBeInTheDocument();
    
    // Switch to sharing tab
    const sharingTab = screen.getByRole('tab', { name: /sharing/i });
    await user.click(sharingTab);
    
    expect(screen.getByText('Report Sharing')).toBeInTheDocument();
  });

  it('provides quick action shortcuts', async () => {
    const user = userEvent.setup();
    render(<Reports />);
    
    // Check quick actions section
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Create Custom Report')).toBeInTheDocument();
    expect(screen.getByText('Schedule Report')).toBeInTheDocument();
    expect(screen.getByText('Quick Export')).toBeInTheDocument();
    
    // Test quick action navigation
    const customReportButton = screen.getByText('Create Custom Report');
    await user.click(customReportButton);
    
    // Should switch to builder tab
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Report Builder');
  });

  it('completes full report creation workflow', async () => {
    const user = userEvent.setup();
    
    // Mock API responses
    const mockPreviewData = {
      data: { total_users: [100, 120, 150] },
      totalRows: 3
    };
    const mockReportResult = {
      downloadUrl: 'https://example.com/report.pdf'
    };
    
    mockAdminApiService.generateReportPreview.mockResolvedValue(mockPreviewData);
    mockAdminApiService.generateReport.mockResolvedValue(mockReportResult);
    
    // Mock document methods for download
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    
    render(<Reports />);
    
    // Step 1: Configure report in builder
    await user.type(screen.getByLabelText('Report Name'), 'Integration Test Report');
    await user.type(screen.getByLabelText('Description'), 'Test report description');
    
    // Select data source
    const dataSourceSelect = screen.getByRole('combobox', { name: /data source/i });
    await user.click(dataSourceSelect);
    await user.click(screen.getByText('Users'));
    
    // Select metrics
    await waitFor(() => {
      const totalUsersCheckbox = screen.getByLabelText('Total Users');
      user.click(totalUsersCheckbox);
    });
    
    // Step 2: Generate preview
    const previewButton = screen.getByText('Preview');
    await user.click(previewButton);
    
    await waitFor(() => {
      expect(mockAdminApiService.generateReportPreview).toHaveBeenCalled();
      expect(screen.getByText('3 rows')).toBeInTheDocument();
    });
    
    // Step 3: Generate final report
    const generateButton = screen.getByText('Generate Report');
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(mockAdminApiService.generateReport).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "Report Generated",
        description: 'Report "Integration Test Report" has been generated and downloaded.'
      });
    });
    
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('completes report scheduling workflow', async () => {
    const user = userEvent.setup();
    
    const mockCreatedSchedule = {
      id: 'schedule-1',
      name: 'Weekly Report Schedule',
      isActive: true
    };
    
    mockAdminApiService.createScheduledReport.mockResolvedValue(mockCreatedSchedule);
    
    render(<Reports />);
    
    // Switch to scheduler tab
    const schedulerTab = screen.getByRole('tab', { name: /scheduler/i });
    await user.click(schedulerTab);
    
    // Configure schedule
    await user.type(screen.getByLabelText('Schedule Name'), 'Weekly Report Schedule');
    await user.type(screen.getByLabelText('Description'), 'Weekly automated report');
    await user.type(screen.getByPlaceholderText('Enter email address'), 'admin@example.com');
    
    // Create schedule
    const createButton = screen.getByText('Create Schedule');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(mockAdminApiService.createScheduledReport).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "Schedule Created",
        description: 'Report "Weekly Report Schedule" has been scheduled successfully.'
      });
    });
  });

  it('completes report sharing workflow', async () => {
    const user = userEvent.setup();
    
    const mockCreatedShare = {
      id: 'share-1',
      shareUrl: 'https://example.com/share/abc123',
      accessLevel: 'view',
      isPublic: false
    };
    
    mockAdminApiService.createReportShare.mockResolvedValue(mockCreatedShare);
    
    render(<Reports />);
    
    // Switch to sharing tab
    const sharingTab = screen.getByRole('tab', { name: /sharing/i });
    await user.click(sharingTab);
    
    // Configure share
    const emailInput = screen.getByPlaceholderText('Enter email address');
    await user.type(emailInput, 'user@example.com');
    
    // Create share
    const createButton = screen.getByText('Create Share');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(mockAdminApiService.createReportShare).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "Share Created",
        description: 'Report "undefined" has been shared successfully.'
      });
    });
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    
    mockAdminApiService.generateReportPreview.mockRejectedValue(new Error('API Error'));
    
    render(<Reports />);
    
    // Configure report
    await user.type(screen.getByLabelText('Report Name'), 'Error Test Report');
    
    // Select data source
    const dataSourceSelect = screen.getByRole('combobox', { name: /data source/i });
    await user.click(dataSourceSelect);
    await user.click(screen.getByText('Users'));
    
    // Select metrics
    await waitFor(() => {
      const totalUsersCheckbox = screen.getByLabelText('Total Users');
      user.click(totalUsersCheckbox);
    });
    
    // Try to generate preview
    const previewButton = screen.getByText('Preview');
    await user.click(previewButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Preview Failed",
        description: "Failed to generate report preview. Please try again.",
        variant: "destructive"
      });
    });
  });

  it('maintains state between tab switches', async () => {
    const user = userEvent.setup();
    render(<Reports />);
    
    // Configure report in builder
    await user.type(screen.getByLabelText('Report Name'), 'Persistent Report');
    
    // Switch to another tab
    const schedulerTab = screen.getByRole('tab', { name: /scheduler/i });
    await user.click(schedulerTab);
    
    // Switch back to builder
    const builderTab = screen.getByRole('tab', { name: /report builder/i });
    await user.click(builderTab);
    
    // Check if the report name is still there
    expect(screen.getByDisplayValue('Persistent Report')).toBeInTheDocument();
  });

  it('shows loading states during operations', async () => {
    const user = userEvent.setup();
    
    // Mock a slow API response
    mockAdminApiService.generateReportPreview.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: {}, totalRows: 0 }), 100))
    );
    
    render(<Reports />);
    
    // Configure report
    await user.type(screen.getByLabelText('Report Name'), 'Loading Test Report');
    
    // Select data source
    const dataSourceSelect = screen.getByRole('combobox', { name: /data source/i });
    await user.click(dataSourceSelect);
    await user.click(screen.getByText('Users'));
    
    // Select metrics
    await waitFor(() => {
      const totalUsersCheckbox = screen.getByLabelText('Total Users');
      user.click(totalUsersCheckbox);
    });
    
    // Generate preview
    const previewButton = screen.getByText('Preview');
    await user.click(previewButton);
    
    // Button should be disabled during loading
    expect(previewButton).toBeDisabled();
    
    // Wait for completion
    await waitFor(() => {
      expect(previewButton).not.toBeDisabled();
    });
  });

  it('validates form inputs across all tabs', async () => {
    const user = userEvent.setup();
    render(<Reports />);
    
    // Test builder validation
    const generateButton = screen.getByText('Generate Report');
    await user.click(generateButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: "Configuration Required",
      description: "Please provide a report name, data source, and at least one metric.",
      variant: "destructive"
    });
    
    // Test scheduler validation
    const schedulerTab = screen.getByRole('tab', { name: /scheduler/i });
    await user.click(schedulerTab);
    
    const createScheduleButton = screen.getByText('Create Schedule');
    await user.click(createScheduleButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: "Configuration Required",
      description: "Please provide a schedule name and report configuration.",
      variant: "destructive"
    });
  });
});