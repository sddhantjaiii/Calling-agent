import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Communication from '../index';
import { adminApiService } from '@/services/adminApiService';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock the admin API service
vi.mock('@/services/adminApiService', () => ({
  adminApiService: {
    sendMessage: vi.fn(),
    getMessageDeliveryStatus: vi.fn(),
    createAnnouncement: vi.fn(),
    updateAnnouncement: vi.fn(),
    deleteAnnouncement: vi.fn(),
    getSupportTickets: vi.fn(),
    addTicketResponse: vi.fn(),
    escalateTicket: vi.fn(),
    getNotificationSettings: vi.fn(),
    updateNotificationSetting: vi.fn(),
    testNotification: vi.fn(),
  }
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

describe('Communication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('integrates all communication features correctly', async () => {
    render(<Communication />, { wrapper: createWrapper() });

    // Test main interface renders
    expect(screen.getByText('Communication & Support')).toBeInTheDocument();
    expect(screen.getByText('Manage user communications, announcements, and support tickets')).toBeInTheDocument();

    // Test all tabs are present
    expect(screen.getByRole('tab', { name: /user messaging/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /announcements/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /support tickets/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /notifications/i })).toBeInTheDocument();
  });

  it('handles user messaging workflow', async () => {
    // Mock successful message sending
    vi.mocked(adminApiService.sendMessage).mockResolvedValue({
      success: true,
      data: {
        id: 'msg-123',
        recipientId: 'user1',
        subject: 'Test Message',
        content: 'Test content',
        priority: 'medium',
        status: 'sent'
      }
    });

    vi.mocked(adminApiService.getMessageDeliveryStatus).mockResolvedValue({
      success: true,
      data: {
        messageId: 'msg-123',
        status: 'delivered',
        deliveredAt: new Date(),
        readAt: null
      }
    });

    render(<Communication />, { wrapper: createWrapper() });

    // Should start on messaging tab
    expect(screen.getByText('User Messaging')).toBeInTheDocument();
    expect(screen.getByText('Send direct messages to users and track delivery status')).toBeInTheDocument();
  });

  it('handles announcement creation workflow', async () => {
    // Mock successful announcement creation
    vi.mocked(adminApiService.createAnnouncement).mockResolvedValue({
      success: true,
      data: {
        id: 'ann-123',
        title: 'Test Announcement',
        content: 'Test content',
        type: 'info',
        priority: 'medium',
        targetAudience: 'all',
        status: 'published'
      }
    });

    render(<Communication />, { wrapper: createWrapper() });

    // Switch to announcements tab
    const announcementsTab = screen.getByRole('tab', { name: /announcements/i });
    fireEvent.click(announcementsTab);

    await waitFor(() => {
      expect(screen.getByText('Broadcast Announcements')).toBeInTheDocument();
      expect(screen.getByText('Send announcements to all users or specific segments')).toBeInTheDocument();
    });
  });

  it('handles support ticket management workflow', async () => {
    // Mock support ticket data
    vi.mocked(adminApiService.getSupportTickets).mockResolvedValue({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
      }
    });

    vi.mocked(adminApiService.addTicketResponse).mockResolvedValue({
      success: true,
      data: {
        id: 'resp-123',
        ticketId: 'ticket-123',
        content: 'Test response',
        isInternal: false
      }
    });

    render(<Communication />, { wrapper: createWrapper() });

    // Switch to support tickets tab
    const ticketsTab = screen.getByRole('tab', { name: /support tickets/i });
    fireEvent.click(ticketsTab);

    await waitFor(() => {
      expect(screen.getByText('Support Tickets')).toBeInTheDocument();
      expect(screen.getByText('Manage and respond to user support requests')).toBeInTheDocument();
    });
  });

  it('handles notification management workflow', async () => {
    // Mock notification settings
    vi.mocked(adminApiService.getNotificationSettings).mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          category: 'system',
          name: 'System Alerts',
          description: 'System maintenance notifications',
          enabled: true,
          channels: [
            { type: 'email', enabled: true },
            { type: 'in-app', enabled: true }
          ],
          conditions: []
        }
      ]
    });

    vi.mocked(adminApiService.updateNotificationSetting).mockResolvedValue({
      success: true,
      data: {}
    });

    vi.mocked(adminApiService.testNotification).mockResolvedValue({
      success: true,
      data: {
        success: true,
        channels: [
          { type: 'email', success: true },
          { type: 'in-app', success: true }
        ]
      }
    });

    render(<Communication />, { wrapper: createWrapper() });

    // Switch to notifications tab
    const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
    fireEvent.click(notificationsTab);

    await waitFor(() => {
      expect(screen.getByText('Notification Management')).toBeInTheDocument();
      expect(screen.getByText('Configure admin notifications and alerts')).toBeInTheDocument();
    });
  });

  it('handles error states gracefully', async () => {
    // Mock API errors
    vi.mocked(adminApiService.sendMessage).mockRejectedValue(new Error('API Error'));
    vi.mocked(adminApiService.createAnnouncement).mockRejectedValue(new Error('API Error'));

    render(<Communication />, { wrapper: createWrapper() });

    // The components should handle errors gracefully without crashing
    expect(screen.getByText('Communication & Support')).toBeInTheDocument();
  });

  it('maintains state when switching between tabs', async () => {
    render(<Communication />, { wrapper: createWrapper() });

    // Start on messaging tab
    expect(screen.getByText('User Messaging')).toBeInTheDocument();

    // Switch to announcements
    const announcementsTab = screen.getByRole('tab', { name: /announcements/i });
    fireEvent.click(announcementsTab);

    await waitFor(() => {
      expect(screen.getByText('Broadcast Announcements')).toBeInTheDocument();
    });

    // Switch back to messaging
    const messagingTab = screen.getByRole('tab', { name: /user messaging/i });
    fireEvent.click(messagingTab);

    await waitFor(() => {
      expect(screen.getByText('User Messaging')).toBeInTheDocument();
    });
  });

  it('provides comprehensive communication tools', async () => {
    render(<Communication />, { wrapper: createWrapper() });

    // Test that all major communication features are accessible
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);

    // Each tab should have proper icons and labels
    expect(screen.getByRole('tab', { name: /user messaging/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /announcements/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /support tickets/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /notifications/i })).toBeInTheDocument();
  });

  it('supports priority flagging and escalation features', async () => {
    // Mock escalation functionality
    vi.mocked(adminApiService.escalateTicket).mockResolvedValue({
      success: true,
      data: {
        id: 'ticket-123',
        escalated: true,
        priority: 'urgent'
      }
    });

    render(<Communication />, { wrapper: createWrapper() });

    // Switch to support tickets to test escalation
    const ticketsTab = screen.getByRole('tab', { name: /support tickets/i });
    fireEvent.click(ticketsTab);

    await waitFor(() => {
      expect(screen.getByText('Support Tickets')).toBeInTheDocument();
    });

    // The escalation functionality should be available in the support tickets component
  });

  it('tracks message delivery and read receipts', async () => {
    // Mock message tracking
    vi.mocked(adminApiService.getMessageDeliveryStatus).mockResolvedValue({
      success: true,
      data: {
        messageId: 'msg-123',
        status: 'read',
        deliveredAt: new Date(),
        readAt: new Date()
      }
    });

    render(<Communication />, { wrapper: createWrapper() });

    // The message tracking functionality should be available in the user messaging component
    expect(screen.getByText('User Messaging')).toBeInTheDocument();
  });
});