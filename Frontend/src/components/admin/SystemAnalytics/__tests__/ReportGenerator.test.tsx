import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReportGenerator } from '../ReportGenerator';

// Mock LoadingSpinner
vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size, className }: any) => (
    <div data-testid="loading-spinner" className={className}>
      Loading {size}
    </div>
  )
}));

const mockData = {
  users: { total: 1000, active: 800 },
  agents: { total: 500, active: 400 },
  calls: { total: 10000, successRate: 95 },
  revenue: { total: 50000, monthly: 8000 }
};

const mockFilters = {
  dateRange: {
    from: new Date('2024-01-01'),
    to: new Date('2024-01-31')
  }
};

describe('ReportGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders report generator header', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    expect(screen.getByText('Report Generator')).toBeInTheDocument();
    expect(screen.getByText('Create custom reports and export platform analytics')).toBeInTheDocument();
  });

  it('renders navigation tabs', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    expect(screen.getByRole('button', { name: 'Templates' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom Report' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generated Reports' })).toBeInTheDocument();
  });

  it('displays report templates by default', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    expect(screen.getByText('Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('User Analytics Report')).toBeInTheDocument();
    expect(screen.getByText('Agent Performance Report')).toBeInTheDocument();
    expect(screen.getByText('Financial Report')).toBeInTheDocument();
    expect(screen.getByText('System Health Report')).toBeInTheDocument();
  });

  it('switches to custom report tab', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Custom Report' }));
    
    expect(screen.getByText('Report Configuration')).toBeInTheDocument();
    expect(screen.getByText('Select Metrics')).toBeInTheDocument();
  });

  it('switches to generated reports tab', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Generated Reports' }));
    
    expect(screen.getAllByText('Generated Reports')).toHaveLength(2); // Button and header
    expect(screen.getByText('No reports generated yet')).toBeInTheDocument();
  });

  it('generates template report', async () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    const generateButtons = screen.getAllByText('Generate Report');
    fireEvent.click(generateButtons[0]);
    
    // Should show loading state
    expect(screen.getAllByText('Generating...')).toHaveLength(5); // All templates show loading
    expect(document.querySelectorAll('.animate-spin')).toHaveLength(5);
    
    // Wait for generation to complete
    await waitFor(() => {
      expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders custom report configuration form', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Custom Report' }));
    
    expect(screen.getByLabelText('Report Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByText('Export Format')).toBeInTheDocument();
    expect(screen.getByLabelText('Include charts and visualizations')).toBeInTheDocument();
  });

  it('renders metric selection categories', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Custom Report' }));
    
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Calls')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('handles custom report form input', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Custom Report' }));
    
    const nameInput = screen.getByLabelText('Report Name');
    fireEvent.change(nameInput, { target: { value: 'My Custom Report' } });
    expect(nameInput).toHaveValue('My Custom Report');
    
    const descriptionInput = screen.getByLabelText('Description');
    fireEvent.change(descriptionInput, { target: { value: 'Custom report description' } });
    expect(descriptionInput).toHaveValue('Custom report description');
  });

  it('handles metric selection', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Custom Report' }));
    
    // Select some metrics
    const totalUsersCheckbox = screen.getByLabelText('Total Users');
    fireEvent.click(totalUsersCheckbox);
    expect(totalUsersCheckbox).toBeChecked();
    
    const totalAgentsCheckbox = screen.getByLabelText('Total Agents');
    fireEvent.click(totalAgentsCheckbox);
    expect(totalAgentsCheckbox).toBeChecked();
  });

  it('disables generate button when form is incomplete', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Custom Report' }));
    
    const generateButton = screen.getByRole('button', { name: 'Generate Custom Report' });
    expect(generateButton).toBeDisabled();
  });

  it('enables generate button when form is complete', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Custom Report' }));
    
    // Fill in required fields
    const nameInput = screen.getByLabelText('Report Name');
    fireEvent.change(nameInput, { target: { value: 'Test Report' } });
    
    // Select a metric
    const totalUsersCheckbox = screen.getByLabelText('Total Users');
    fireEvent.click(totalUsersCheckbox);
    
    const generateButton = screen.getByRole('button', { name: 'Generate Custom Report' });
    expect(generateButton).not.toBeDisabled();
  });

  it('generates custom report', async () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Custom Report' }));
    
    // Fill in form
    const nameInput = screen.getByLabelText('Report Name');
    fireEvent.change(nameInput, { target: { value: 'Test Report' } });
    
    const totalUsersCheckbox = screen.getByLabelText('Total Users');
    fireEvent.click(totalUsersCheckbox);
    
    const generateButton = screen.getByRole('button', { name: 'Generate Custom Report' });
    fireEvent.click(generateButton);
    
    // Should show loading state
    expect(screen.getByText('Generating Report...')).toBeInTheDocument();
    
    // Wait for generation to complete
    await waitFor(() => {
      expect(screen.queryByText('Generating Report...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Form should be reset
    expect(nameInput).toHaveValue('');
  });

  it('shows generated reports after creation', async () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    // Generate a template report first
    const generateButtons = screen.getAllByText('Generate Report');
    fireEvent.click(generateButtons[0]);
    
    // Wait for generation
    await waitFor(() => {
      expect(screen.queryByText('Generating...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Switch to generated reports tab
    fireEvent.click(screen.getByRole('button', { name: 'Generated Reports' }));
    
    // Should show the generated report
    expect(screen.getByText('Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('2.3 MB')).toBeInTheDocument();
  });

  it('handles format selection', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Custom Report' }));
    
    // Format selector should be present
    const formatSelect = screen.getByRole('combobox');
    expect(formatSelect).toBeInTheDocument();
  });

  it('handles include charts checkbox', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Custom Report' }));
    
    const chartsCheckbox = screen.getByLabelText('Include charts and visualizations');
    expect(chartsCheckbox).toBeChecked(); // Should be checked by default
    
    fireEvent.click(chartsCheckbox);
    expect(chartsCheckbox).not.toBeChecked();
  });

  it('shows report templates with correct badges', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    expect(screen.getAllByText('PDF')).toHaveLength(3); // Multiple PDF templates
    expect(screen.getAllByText('EXCEL')).toHaveLength(2); // Multiple Excel templates
  });

  it('shows metric badges in templates', () => {
    render(<ReportGenerator data={mockData} filters={mockFilters} />);
    
    // Should show some metric badges and "+X more" indicators
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});