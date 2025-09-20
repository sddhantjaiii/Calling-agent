import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Communication from '../index';

// Mock the sub-components
vi.mock('../UserMessaging', () => ({
  UserMessaging: () => <div data-testid="user-messaging">User Messaging Component</div>
}));

vi.mock('../BroadcastAnnouncements', () => ({
  BroadcastAnnouncements: () => <div data-testid="broadcast-announcements">Broadcast Announcements Component</div>
}));

vi.mock('../SupportTickets', () => ({
  SupportTickets: () => <div data-testid="support-tickets">Support Tickets Component</div>
}));

vi.mock('../NotificationManagement', () => ({
  NotificationManagement: () => <div data-testid="notification-management">Notification Management Component</div>
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

describe('Communication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders communication header and tabs', () => {
    render(<Communication />, { wrapper: createWrapper() });

    expect(screen.getByText('Communication & Support')).toBeInTheDocument();
    expect(screen.getByText('Manage user communications, announcements, and support tickets')).toBeInTheDocument();
    
    // Check all tabs are present
    expect(screen.getByText('User Messaging')).toBeInTheDocument();
    expect(screen.getByText('Announcements')).toBeInTheDocument();
    expect(screen.getByText('Support Tickets')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows user messaging tab by default', () => {
    render(<Communication />, { wrapper: createWrapper() });

    expect(screen.getByTestId('user-messaging')).toBeInTheDocument();
    expect(screen.queryByTestId('broadcast-announcements')).not.toBeInTheDocument();
    expect(screen.queryByTestId('support-tickets')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notification-management')).not.toBeInTheDocument();
  });

  it('switches to announcements tab when clicked', async () => {
    render(<Communication />, { wrapper: createWrapper() });

    const announcementsTab = screen.getByRole('tab', { name: /announcements/i });
    fireEvent.click(announcementsTab);

    await waitFor(() => {
      expect(screen.getByTestId('broadcast-announcements')).toBeInTheDocument();
      expect(screen.queryByTestId('user-messaging')).not.toBeInTheDocument();
    });
  });

  it('switches to support tickets tab when clicked', async () => {
    render(<Communication />, { wrapper: createWrapper() });

    const ticketsTab = screen.getByRole('tab', { name: /support tickets/i });
    fireEvent.click(ticketsTab);

    await waitFor(() => {
      expect(screen.getByTestId('support-tickets')).toBeInTheDocument();
      expect(screen.queryByTestId('user-messaging')).not.toBeInTheDocument();
    });
  });

  it('switches to notifications tab when clicked', async () => {
    render(<Communication />, { wrapper: createWrapper() });

    const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
    fireEvent.click(notificationsTab);

    await waitFor(() => {
      expect(screen.getByTestId('notification-management')).toBeInTheDocument();
      expect(screen.queryByTestId('user-messaging')).not.toBeInTheDocument();
    });
  });

  it('displays correct card titles and descriptions for each tab', async () => {
    render(<Communication />, { wrapper: createWrapper() });

    // Check messaging tab
    expect(screen.getByText('User Messaging')).toBeInTheDocument();
    expect(screen.getByText('Send direct messages to users and track delivery status')).toBeInTheDocument();

    // Switch to announcements
    const announcementsTab = screen.getByRole('tab', { name: /announcements/i });
    fireEvent.click(announcementsTab);

    await waitFor(() => {
      expect(screen.getByText('Broadcast Announcements')).toBeInTheDocument();
      expect(screen.getByText('Send announcements to all users or specific segments')).toBeInTheDocument();
    });

    // Switch to tickets
    const ticketsTab = screen.getByRole('tab', { name: /support tickets/i });
    fireEvent.click(ticketsTab);

    await waitFor(() => {
      expect(screen.getByText('Support Tickets')).toBeInTheDocument();
      expect(screen.getByText('Manage and respond to user support requests')).toBeInTheDocument();
    });

    // Switch to notifications
    const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
    fireEvent.click(notificationsTab);

    await waitFor(() => {
      expect(screen.getByText('Notification Management')).toBeInTheDocument();
      expect(screen.getByText('Configure admin notifications and alerts')).toBeInTheDocument();
    });
  });

  it('has proper tab icons', () => {
    render(<Communication />, { wrapper: createWrapper() });

    // Check that tabs have icons (we can't easily test the specific icons, but we can check they exist)
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    
    // Each tab should have an icon and text
    tabs.forEach(tab => {
      expect(tab).toHaveClass('flex', 'items-center', 'gap-2');
    });
  });
});