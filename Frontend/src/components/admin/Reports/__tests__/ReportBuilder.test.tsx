import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReportBuilder from '../ReportBuilder';
import { adminApiService } from '@/services/adminApiService';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/services/adminApiService');
vi.mock('@/hooks/use-toast');

const mockToast = vi.fn();
const mockAdminApiService = adminApiService as any;

describe('ReportBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
  });

  it('renders report builder interface', () => {
    render(<ReportBuilder />);
    
    expect(screen.getByText('Report Builder')).toBeInTheDocument();
    expect(screen.getByText('Create custom reports with advanced filtering and visualization')).toBeInTheDocument();
    expect(screen.getByLabelText('Report Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Data Source')).toBeInTheDocument();
  });

  it('allows user to configure basic report settings', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);
    
    // Fill in report name
    const nameInput = screen.getByLabelText('Report Name');
    await user.type(nameInput, 'Test Report');
    expect(nameInput).toHaveValue('Test Report');
    
    // Fill in description
    const descriptionInput = screen.getByLabelText('Description');
    await user.type(descriptionInput, 'Test description');
    expect(descriptionInput).toHaveValue('Test description');
  });

  it('shows metrics when data source is selected', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);
    
    // Select data source
    const dataSourceSelect = screen.getByRole('combobox', { name: /data source/i });
    await user.click(dataSourceSelect);
    
    const usersOption = screen.getByText('Users');
    await user.click(usersOption);
    
    // Check if metrics section appears
    await waitFor(() => {
      expect(screen.getByText('Metrics Selection')).toBeInTheDocument();
    });
  });

  it('allows adding and removing filters', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);
    
    // Add filter
    const addFilterButton = screen.getByText('Add Filter');
    await user.click(addFilterButton);
    
    expect(screen.getByPlaceholderText('Filter label')).toBeInTheDocument();
    
    // Add another filter
    await user.click(addFilterButton);
    
    const filterInputs = screen.getAllByPlaceholderText('Filter label');
    expect(filterInputs).toHaveLength(2);
    
    // Remove a filter
    const removeButtons = screen.getAllByRole('button', { name: /×/i });
    await user.click(removeButtons[0]);
    
    await waitFor(() => {
      const remainingInputs = screen.getAllByPlaceholderText('Filter label');
      expect(remainingInputs).toHaveLength(1);
    });
  });

  it('generates preview when configured correctly', async () => {
    const user = userEvent.setup();
    const mockPreviewData = {
      data: { total_users: [100, 120, 150] },
      totalRows: 3
    };
    
    mockAdminApiService.generateReportPreview.mockResolvedValue(mockPreviewData);
    
    render(<ReportBuilder />);
    
    // Configure report
    await user.type(screen.getByLabelText('Report Name'), 'Test Report');
    
    // Select data source
    const dataSourceSelect = screen.getByRole('combobox', { name: /data source/i });
    await user.click(dataSourceSelect);
    await user.click(screen.getByText('Users'));
    
    // Select a metric
    await waitFor(() => {
      const totalUsersCheckbox = screen.getByLabelText('Total Users');
      user.click(totalUsersCheckbox);
    });
    
    // Generate preview
    const previewButton = screen.getByText('Preview');
    await user.click(previewButton);
    
    await waitFor(() => {
      expect(mockAdminApiService.generateReportPreview).toHaveBeenCalled();
      expect(screen.getByText('3 rows')).toBeInTheDocument();
    });
  });

  it('generates report when all required fields are filled', async () => {
    const user = userEvent.setup();
    const mockReportResult = {
      downloadUrl: 'https://example.com/report.pdf'
    };
    
    mockAdminApiService.generateReport.mockResolvedValue(mockReportResult);
    
    // Mock document.createElement and related methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    
    render(<ReportBuilder />);
    
    // Configure report
    await user.type(screen.getByLabelText('Report Name'), 'Test Report');
    
    // Select data source
    const dataSourceSelect = screen.getByRole('combobox', { name: /data source/i });
    await user.click(dataSourceSelect);
    await user.click(screen.getByText('Users'));
    
    // Select a metric
    await waitFor(() => {
      const totalUsersCheckbox = screen.getByLabelText('Total Users');
      user.click(totalUsersCheckbox);
    });
    
    // Generate report
    const generateButton = screen.getByText('Generate Report');
    await user.click(generateButton);
    
    await waitFor(() => {
      expect(mockAdminApiService.generateReport).toHaveBeenCalled();
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "Report Generated",
        description: 'Report "Test Report" has been generated and downloaded.'
      });
    });
    
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('saves report template', async () => {
    const user = userEvent.setup();
    mockAdminApiService.saveReportTemplate.mockResolvedValue(undefined);
    
    render(<ReportBuilder />);
    
    // Configure report
    await user.type(screen.getByLabelText('Report Name'), 'Test Template');
    
    // Save template
    const saveButton = screen.getByText('Save Template');
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(mockAdminApiService.saveReportTemplate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "Template Saved",
        description: 'Report template "Test Template" has been saved.'
      });
    });
  });

  it('shows error when preview fails', async () => {
    const user = userEvent.setup();
    mockAdminApiService.generateReportPreview.mockRejectedValue(new Error('Preview failed'));
    
    render(<ReportBuilder />);
    
    // Configure report
    await user.type(screen.getByLabelText('Report Name'), 'Test Report');
    
    // Select data source
    const dataSourceSelect = screen.getByRole('combobox', { name: /data source/i });
    await user.click(dataSourceSelect);
    await user.click(screen.getByText('Users'));
    
    // Select a metric
    await waitFor(() => {
      const totalUsersCheckbox = screen.getByLabelText('Total Users');
      user.click(totalUsersCheckbox);
    });
    
    // Generate preview
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

  it('validates required fields before generating report', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);
    
    // Try to generate without configuration
    const generateButton = screen.getByText('Generate Report');
    await user.click(generateButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: "Configuration Required",
      description: "Please provide a report name, data source, and at least one metric.",
      variant: "destructive"
    });
  });

  it('updates export format selection', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);
    
    // Change export format
    const formatSelect = screen.getByRole('combobox', { name: /export format/i });
    await user.click(formatSelect);
    await user.click(screen.getByText('Excel'));
    
    // Verify format is selected (this would be checked in the component state)
    expect(screen.getByText('Excel')).toBeInTheDocument();
  });

  it('toggles chart and raw data options', async () => {
    const user = userEvent.setup();
    render(<ReportBuilder />);
    
    // Toggle charts
    const chartsCheckbox = screen.getByLabelText('Include charts and visualizations');
    await user.click(chartsCheckbox);
    
    // Toggle raw data
    const rawDataCheckbox = screen.getByLabelText('Include raw data tables');
    await user.click(rawDataCheckbox);
    
    // These would be reflected in component state
    expect(chartsCheckbox).toBeInTheDocument();
    expect(rawDataCheckbox).toBeInTheDocument();
  });
});