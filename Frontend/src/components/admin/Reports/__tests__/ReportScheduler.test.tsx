import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReportScheduler from '../ReportScheduler';
import { adminApiService } from '@/services/adminApiService';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/services/adminApiService');
vi.mock('@/hooks/use-toast');

const mockToast = vi.fn();
const mockAdminApiService = adminApiService as any;

const mockReportConfig = {
  id: 'report-1',
  name: 'Test Report',
  dataSource: 'users',
  metrics: ['total_users']
};

describe('ReportScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
  });

  it('renders scheduler interface', () => {
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    expect(screen.getByText('Report Scheduler')).toBeInTheDocument();
    expect(screen.getByText('Schedule automated report generation and delivery')).toBeInTheDocument();
    expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    expect(screen.getByText('Manage Schedules')).toBeInTheDocument();
  });

  it('allows configuring schedule settings', async () => {
    const user = userEvent.setup();
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Fill in schedule name
    const nameInput = screen.getByLabelText('Schedule Name');
    await user.type(nameInput, 'Weekly User Report');
    expect(nameInput).toHaveValue('Weekly User Report');
    
    // Fill in description
    const descriptionInput = screen.getByLabelText('Description');
    await user.type(descriptionInput, 'Weekly user analytics report');
    expect(descriptionInput).toHaveValue('Weekly user analytics report');
    
    // Change frequency
    const frequencySelect = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencySelect);
    await user.click(screen.getByText('Monthly'));
    
    // Set time
    const timeInput = screen.getByLabelText('Time');
    await user.clear(timeInput);
    await user.type(timeInput, '14:30');
    expect(timeInput).toHaveValue('14:30');
  });

  it('shows day of week selector for weekly frequency', async () => {
    const user = userEvent.setup();
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Set frequency to weekly (default)
    expect(screen.getByText('Day of Week')).toBeInTheDocument();
    
    // Change day of week
    const daySelect = screen.getByRole('combobox', { name: /day of week/i });
    await user.click(daySelect);
    await user.click(screen.getByText('Friday'));
  });

  it('shows day of month selector for monthly frequency', async () => {
    const user = userEvent.setup();
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Change to monthly frequency
    const frequencySelect = screen.getByRole('combobox', { name: /frequency/i });
    await user.click(frequencySelect);
    await user.click(screen.getByText('Monthly'));
    
    await waitFor(() => {
      expect(screen.getByText('Day of Month')).toBeInTheDocument();
    });
    
    // Set day of month
    const dayInput = screen.getByLabelText('Day of Month');
    await user.clear(dayInput);
    await user.type(dayInput, '15');
    expect(dayInput).toHaveValue('15');
  });

  it('allows adding and removing email recipients', async () => {
    const user = userEvent.setup();
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Add first recipient
    const emailInput = screen.getByPlaceholderText('Enter email address');
    await user.type(emailInput, 'admin@example.com');
    expect(emailInput).toHaveValue('admin@example.com');
    
    // Add another recipient
    const addRecipientButton = screen.getByText('Add Recipient');
    await user.click(addRecipientButton);
    
    const emailInputs = screen.getAllByPlaceholderText('Enter email address');
    expect(emailInputs).toHaveLength(2);
    
    await user.type(emailInputs[1], 'manager@example.com');
    expect(emailInputs[1]).toHaveValue('manager@example.com');
    
    // Remove a recipient
    const removeButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(removeButtons[0]);
    
    await waitFor(() => {
      const remainingInputs = screen.getAllByPlaceholderText('Enter email address');
      expect(remainingInputs).toHaveLength(1);
    });
  });

  it('creates schedule successfully', async () => {
    const user = userEvent.setup();
    const mockCreatedSchedule = {
      id: 'schedule-1',
      name: 'Test Schedule',
      isActive: true
    };
    
    mockAdminApiService.createScheduledReport.mockResolvedValue(mockCreatedSchedule);
    
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Configure schedule
    await user.type(screen.getByLabelText('Schedule Name'), 'Test Schedule');
    await user.type(screen.getByPlaceholderText('Enter email address'), 'test@example.com');
    
    // Create schedule
    const createButton = screen.getByText('Create Schedule');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(mockAdminApiService.createScheduledReport).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "Schedule Created",
        description: 'Report "Test Schedule" has been scheduled successfully.'
      });
    });
  });

  it('validates required fields before creating schedule', async () => {
    const user = userEvent.setup();
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Try to create without name
    const createButton = screen.getByText('Create Schedule');
    await user.click(createButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: "Configuration Required",
      description: "Please provide a schedule name and report configuration.",
      variant: "destructive"
    });
  });

  it('validates email recipients', async () => {
    const user = userEvent.setup();
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Configure with invalid email
    await user.type(screen.getByLabelText('Schedule Name'), 'Test Schedule');
    await user.type(screen.getByPlaceholderText('Enter email address'), 'invalid-email');
    
    const createButton = screen.getByText('Create Schedule');
    await user.click(createButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: "Recipients Required",
      description: "Please provide at least one valid email recipient.",
      variant: "destructive"
    });
  });

  it('loads and displays scheduled reports in manage tab', async () => {
    const user = userEvent.setup();
    const mockScheduledReports = [
      {
        id: 'schedule-1',
        name: 'Weekly Report',
        description: 'Weekly user report',
        schedule: {
          frequency: 'weekly',
          time: '09:00',
          dayOfWeek: 1,
          timezone: 'UTC'
        },
        recipients: ['admin@example.com'],
        isActive: true,
        status: 'active',
        lastRun: new Date('2024-01-15T09:00:00Z'),
        nextRun: new Date('2024-01-22T09:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        createdBy: 'admin'
      }
    ];
    
    mockAdminApiService.getScheduledReports.mockResolvedValue(mockScheduledReports);
    
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Switch to manage tab
    const manageTab = screen.getByText('Manage Schedules');
    await user.click(manageTab);
    
    await waitFor(() => {
      expect(mockAdminApiService.getScheduledReports).toHaveBeenCalled();
      expect(screen.getByText('Weekly Report')).toBeInTheDocument();
      expect(screen.getByText('Weekly user report')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
  });

  it('toggles schedule status', async () => {
    const user = userEvent.setup();
    const mockScheduledReports = [
      {
        id: 'schedule-1',
        name: 'Weekly Report',
        description: 'Weekly user report',
        schedule: {
          frequency: 'weekly',
          time: '09:00',
          dayOfWeek: 1,
          timezone: 'UTC'
        },
        recipients: ['admin@example.com'],
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        createdBy: 'admin'
      }
    ];
    
    mockAdminApiService.getScheduledReports.mockResolvedValue(mockScheduledReports);
    mockAdminApiService.updateScheduledReport.mockResolvedValue(undefined);
    
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Switch to manage tab
    const manageTab = screen.getByText('Manage Schedules');
    await user.click(manageTab);
    
    await waitFor(() => {
      expect(screen.getByText('Weekly Report')).toBeInTheDocument();
    });
    
    // Toggle status (pause)
    const buttons = screen.getAllByRole('button');
    const pauseButton = buttons.find(button => 
      button.querySelector('svg.lucide-pause')
    );
    await user.click(pauseButton!);
    
    await waitFor(() => {
      expect(mockAdminApiService.updateScheduledReport).toHaveBeenCalledWith('schedule-1', { isActive: false });
      expect(mockToast).toHaveBeenCalledWith({
        title: "Schedule Paused",
        description: "Report schedule has been paused."
      });
    });
  });

  it('runs schedule manually', async () => {
    const user = userEvent.setup();
    const mockScheduledReports = [
      {
        id: 'schedule-1',
        name: 'Weekly Report',
        description: 'Weekly user report',
        schedule: {
          frequency: 'weekly',
          time: '09:00',
          dayOfWeek: 1,
          timezone: 'UTC'
        },
        recipients: ['admin@example.com'],
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        createdBy: 'admin'
      }
    ];
    
    mockAdminApiService.getScheduledReports.mockResolvedValue(mockScheduledReports);
    mockAdminApiService.runScheduledReport.mockResolvedValue(undefined);
    
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Switch to manage tab
    const manageTab = screen.getByText('Manage Schedules');
    await user.click(manageTab);
    
    await waitFor(() => {
      expect(screen.getByText('Weekly Report')).toBeInTheDocument();
    });
    
    // Run manually
    const buttons = screen.getAllByRole('button');
    const runButton = buttons.find(button => 
      button.querySelector('svg.lucide-mail')
    );
    await user.click(runButton!);
    
    await waitFor(() => {
      expect(mockAdminApiService.runScheduledReport).toHaveBeenCalledWith('schedule-1');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Report Triggered",
        description: "Report generation has been triggered manually."
      });
    });
  });

  it('deletes schedule', async () => {
    const user = userEvent.setup();
    const mockScheduledReports = [
      {
        id: 'schedule-1',
        name: 'Weekly Report',
        description: 'Weekly user report',
        schedule: {
          frequency: 'weekly',
          time: '09:00',
          dayOfWeek: 1,
          timezone: 'UTC'
        },
        recipients: ['admin@example.com'],
        isActive: true,
        status: 'active',
        createdAt: new Date(),
        createdBy: 'admin'
      }
    ];
    
    mockAdminApiService.getScheduledReports.mockResolvedValue(mockScheduledReports);
    mockAdminApiService.deleteScheduledReport.mockResolvedValue(undefined);
    
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Switch to manage tab
    const manageTab = screen.getByText('Manage Schedules');
    await user.click(manageTab);
    
    await waitFor(() => {
      expect(screen.getByText('Weekly Report')).toBeInTheDocument();
    });
    
    // Delete schedule
    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons.find(button => 
      button.querySelector('svg.lucide-trash-2')
    );
    await user.click(deleteButton!);
    
    await waitFor(() => {
      expect(mockAdminApiService.deleteScheduledReport).toHaveBeenCalledWith('schedule-1');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Schedule Deleted",
        description: "Scheduled report has been deleted."
      });
    });
  });

  it('shows empty state when no schedules exist', async () => {
    const user = userEvent.setup();
    mockAdminApiService.getScheduledReports.mockResolvedValue([]);
    
    render(<ReportScheduler reportConfig={mockReportConfig} />);
    
    // Switch to manage tab
    const manageTab = screen.getByText('Manage Schedules');
    await user.click(manageTab);
    
    await waitFor(() => {
      expect(screen.getByText('No scheduled reports')).toBeInTheDocument();
      expect(screen.getByText('Create your first scheduled report to automate report delivery')).toBeInTheDocument();
    });
  });
});