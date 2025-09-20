import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ReportSharing from '../ReportSharing';
import { adminApiService } from '@/services/adminApiService';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/services/adminApiService');
vi.mock('@/hooks/use-toast');

const mockToast = vi.fn();
const mockAdminApiService = adminApiService as any;

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
});

describe('ReportSharing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
  });

  it('renders sharing interface', () => {
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    expect(screen.getByText('Report Sharing')).toBeInTheDocument();
    expect(screen.getByText('Share reports securely with team members and stakeholders')).toBeInTheDocument();
    expect(screen.getByText('Create Share')).toBeInTheDocument();
    expect(screen.getByText('Manage Shares')).toBeInTheDocument();
  });

  it('allows configuring share settings', async () => {
    const user = userEvent.setup();
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Change share type
    const shareTypeSelect = screen.getByRole('combobox', { name: /share type/i });
    await user.click(shareTypeSelect);
    await user.click(screen.getByText('Email Share'));
    
    // Change access level
    const accessLevelSelect = screen.getByRole('combobox', { name: /access level/i });
    await user.click(accessLevelSelect);
    await user.click(screen.getByText('View & Download'));
    
    // Toggle public access
    const publicToggle = screen.getByLabelText('Make publicly accessible');
    await user.click(publicToggle);
    
    expect(shareTypeSelect).toBeInTheDocument();
    expect(accessLevelSelect).toBeInTheDocument();
    expect(publicToggle).toBeInTheDocument();
  });

  it('shows access control options for private sharing', async () => {
    const user = userEvent.setup();
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Ensure private sharing is selected (default)
    expect(screen.getByText('Allowed Users')).toBeInTheDocument();
    expect(screen.getByText('Allowed Domains')).toBeInTheDocument();
  });

  it('hides access control options for public sharing', async () => {
    const user = userEvent.setup();
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Toggle to public
    const publicToggle = screen.getByLabelText('Make publicly accessible');
    await user.click(publicToggle);
    
    await waitFor(() => {
      expect(screen.queryByText('Allowed Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Allowed Domains')).not.toBeInTheDocument();
    });
  });

  it('allows adding and removing allowed users', async () => {
    const user = userEvent.setup();
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Add user email
    const emailInput = screen.getByPlaceholderText('Enter email address');
    await user.type(emailInput, 'user@example.com');
    expect(emailInput).toHaveValue('user@example.com');
    
    // Add another user
    const addUserButton = screen.getByText('Add User');
    await user.click(addUserButton);
    
    const emailInputs = screen.getAllByPlaceholderText('Enter email address');
    expect(emailInputs).toHaveLength(2);
    
    await user.type(emailInputs[1], 'admin@example.com');
    expect(emailInputs[1]).toHaveValue('admin@example.com');
    
    // Remove a user
    const removeButtons = screen.getAllByText('×');
    await user.click(removeButtons[0]);
    
    await waitFor(() => {
      const remainingInputs = screen.getAllByPlaceholderText('Enter email address');
      expect(remainingInputs).toHaveLength(1);
    });
  });

  it('allows adding and removing allowed domains', async () => {
    const user = userEvent.setup();
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Add domain
    const addDomainButton = screen.getByText('Add Domain');
    await user.click(addDomainButton);
    
    const domainInput = screen.getByPlaceholderText('Enter domain (e.g., company.com)');
    await user.type(domainInput, 'example.com');
    expect(domainInput).toHaveValue('example.com');
    
    // Add another domain
    await user.click(addDomainButton);
    
    const domainInputs = screen.getAllByPlaceholderText('Enter domain (e.g., company.com)');
    expect(domainInputs).toHaveLength(2);
    
    // Remove a domain
    const removeButtons = screen.getAllByText('×');
    await user.click(removeButtons[removeButtons.length - 1]); // Click last remove button
    
    await waitFor(() => {
      const remainingInputs = screen.getAllByPlaceholderText('Enter domain (e.g., company.com)');
      expect(remainingInputs).toHaveLength(1);
    });
  });

  it('shows email configuration for email share type', async () => {
    const user = userEvent.setup();
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Change to email share
    const shareTypeSelect = screen.getByRole('combobox', { name: /share type/i });
    await user.click(shareTypeSelect);
    await user.click(screen.getByText('Email Share'));
    
    await waitFor(() => {
      expect(screen.getByLabelText('Email Subject')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Message')).toBeInTheDocument();
    });
  });

  it('creates share successfully', async () => {
    const user = userEvent.setup();
    const mockCreatedShare = {
      id: 'share-1',
      shareUrl: 'https://example.com/share/abc123',
      accessLevel: 'view',
      isPublic: false
    };
    
    mockAdminApiService.createReportShare.mockResolvedValue(mockCreatedShare);
    
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Configure share with valid user
    const emailInput = screen.getByPlaceholderText('Enter email address');
    await user.type(emailInput, 'user@example.com');
    
    // Create share
    const createButton = screen.getByText('Create Share');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(mockAdminApiService.createReportShare).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "Share Created",
        description: 'Report "Test Report" has been shared successfully.'
      });
    });
  });

  it('validates access control for private sharing', async () => {
    const user = userEvent.setup();
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Try to create share without users or domains
    const createButton = screen.getByText('Create Share');
    await user.click(createButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: "Access Control Required",
      description: "Please specify allowed users or domains for private sharing.",
      variant: "destructive"
    });
  });

  it('loads and displays shared reports in manage tab', async () => {
    const user = userEvent.setup();
    const mockSharedReports = [
      {
        id: 'share-1',
        reportName: 'Test Report',
        shareType: 'link',
        accessLevel: 'view',
        isPublic: false,
        requiresAuth: true,
        shareUrl: 'https://example.com/share/abc123',
        accessCount: 5,
        lastAccessed: new Date('2024-01-15T10:00:00Z'),
        allowedUsers: ['user@example.com'],
        createdAt: new Date('2024-01-01T00:00:00Z')
      }
    ];
    
    mockAdminApiService.getReportShares.mockResolvedValue(mockSharedReports);
    
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Switch to manage tab
    const manageTab = screen.getByText('Manage Shares');
    await user.click(manageTab);
    
    await waitFor(() => {
      expect(mockAdminApiService.getReportShares).toHaveBeenCalledWith('report-1');
      expect(screen.getByText('Test Report')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Access count
    });
  });

  it('copies share URL to clipboard', async () => {
    const user = userEvent.setup();
    const mockSharedReports = [
      {
        id: 'share-1',
        reportName: 'Test Report',
        shareType: 'link',
        accessLevel: 'view',
        isPublic: false,
        requiresAuth: true,
        shareUrl: 'https://example.com/share/abc123',
        accessCount: 5,
        allowedUsers: ['user@example.com'],
        createdAt: new Date()
      }
    ];
    
    mockAdminApiService.getReportShares.mockResolvedValue(mockSharedReports);
    
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Switch to manage tab
    const manageTab = screen.getByText('Manage Shares');
    await user.click(manageTab);
    
    await waitFor(() => {
      expect(screen.getByText('Test Report')).toBeInTheDocument();
    });
    
    // Copy URL
    const copyButtons = screen.getAllByRole('button');
    const copyButton = copyButtons.find(button => 
      button.querySelector('svg.lucide-copy')
    );
    await user.click(copyButton!);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/share/abc123');
    expect(mockToast).toHaveBeenCalledWith({
      title: "URL Copied",
      description: "Share URL has been copied to clipboard."
    });
  });

  it('revokes share', async () => {
    const user = userEvent.setup();
    const mockSharedReports = [
      {
        id: 'share-1',
        reportName: 'Test Report',
        shareType: 'link',
        accessLevel: 'view',
        isPublic: false,
        requiresAuth: true,
        shareUrl: 'https://example.com/share/abc123',
        accessCount: 5,
        allowedUsers: ['user@example.com'],
        createdAt: new Date()
      }
    ];
    
    mockAdminApiService.getReportShares.mockResolvedValue(mockSharedReports);
    mockAdminApiService.revokeReportShare.mockResolvedValue(undefined);
    
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Switch to manage tab
    const manageTab = screen.getByText('Manage Shares');
    await user.click(manageTab);
    
    await waitFor(() => {
      expect(screen.getByText('Test Report')).toBeInTheDocument();
    });
    
    // Revoke share
    const buttons = screen.getAllByRole('button');
    const revokeButton = buttons.find(button => 
      button.querySelector('svg.lucide-triangle-alert')
    );
    await user.click(revokeButton!);
    
    await waitFor(() => {
      expect(mockAdminApiService.revokeReportShare).toHaveBeenCalledWith('share-1');
      expect(mockToast).toHaveBeenCalledWith({
        title: "Share Revoked",
        description: "Report share has been revoked."
      });
    });
  });

  it('sends email share notification', async () => {
    const user = userEvent.setup();
    const mockSharedReports = [
      {
        id: 'share-1',
        reportName: 'Test Report',
        shareType: 'email',
        accessLevel: 'view',
        isPublic: false,
        requiresAuth: true,
        shareUrl: 'https://example.com/share/abc123',
        accessCount: 0,
        allowedUsers: ['user@example.com'],
        createdAt: new Date()
      }
    ];
    
    mockAdminApiService.getReportShares.mockResolvedValue(mockSharedReports);
    mockAdminApiService.sendReportShareEmail.mockResolvedValue(undefined);
    
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Switch to manage tab
    const manageTab = screen.getByText('Manage Shares');
    await user.click(manageTab);
    
    await waitFor(() => {
      expect(screen.getByText('Test Report')).toBeInTheDocument();
    });
    
    // Send email
    const buttons = screen.getAllByRole('button');
    const emailButton = buttons.find(button => 
      button.querySelector('svg.lucide-mail')
    );
    await user.click(emailButton!);
    
    await waitFor(() => {
      expect(mockAdminApiService.sendReportShareEmail).toHaveBeenCalledWith('share-1', {
        subject: undefined,
        message: undefined
      });
      expect(mockToast).toHaveBeenCalledWith({
        title: "Email Sent",
        description: "Share notification email has been sent."
      });
    });
  });

  it('shows empty state when no shares exist', async () => {
    const user = userEvent.setup();
    mockAdminApiService.getReportShares.mockResolvedValue([]);
    
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Switch to manage tab
    const manageTab = screen.getByText('Manage Shares');
    await user.click(manageTab);
    
    await waitFor(() => {
      expect(screen.getByText('No shared reports')).toBeInTheDocument();
      expect(screen.getByText('Create your first report share to collaborate with others')).toBeInTheDocument();
    });
  });

  it('shows embed code for embed share type', async () => {
    const user = userEvent.setup();
    const mockSharedReports = [
      {
        id: 'share-1',
        reportName: 'Test Report',
        shareType: 'embed',
        accessLevel: 'view',
        isPublic: true,
        requiresAuth: false,
        shareUrl: 'https://example.com/share/abc123',
        embedCode: '<iframe src="https://example.com/embed/abc123"></iframe>',
        accessCount: 10,
        createdAt: new Date()
      }
    ];
    
    mockAdminApiService.getReportShares.mockResolvedValue(mockSharedReports);
    
    render(<ReportSharing reportId="report-1" reportName="Test Report" />);
    
    // Switch to manage tab
    const manageTab = screen.getByText('Manage Shares');
    await user.click(manageTab);
    
    await waitFor(() => {
      expect(screen.getByText('Test Report')).toBeInTheDocument();
      expect(screen.getByText('Embed Code:')).toBeInTheDocument();
      expect(screen.getByText('<iframe src="https://example.com/embed/abc123"></iframe>')).toBeInTheDocument();
    });
  });
});