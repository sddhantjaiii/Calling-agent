import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserList from '../UserList';
import { adminApiService } from '../../../../services/adminApiService';
import type { AdminUserListItem } from '../../../../types/admin';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    getUsers: vi.fn(),
    updateUser: vi.fn(),
  },
}));

// Mock UI components
vi.mock('../../../ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('../../../ui/EmptyState', () => ({
  EmptyState: ({ title, description, action }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  ),
}));

const mockUsers: AdminUserListItem[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
    isActive: true,
    agentCount: 3,
    callCount: 150,
    creditsUsed: 75.50,
    lastLogin: new Date('2024-01-15'),
    registrationDate: new Date('2024-01-01'),
    credits: 100,
    phone: '+1234567890',
    subscriptionTier: 'pro',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'admin',
    isActive: false,
    agentCount: 1,
    callCount: 25,
    creditsUsed: 12.25,
    lastLogin: new Date('2024-01-10'),
    registrationDate: new Date('2023-12-15'),
    credits: 50,
    phone: '+0987654321',
    subscriptionTier: 'basic',
  },
];

const mockProps = {
  onUserSelect: vi.fn(),
  onUserEdit: vi.fn(),
  onCreditAdjust: vi.fn(),
  onUserStatusToggle: vi.fn(),
};

describe('UserList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API response
    (adminApiService.getUsers as any).mockResolvedValue({
      success: true,
      data: mockUsers,
      pagination: {
        total: 2,
        totalPages: 1,
        currentPage: 1,
        limit: 20,
      },
    });
  });

  it('renders loading state initially', async () => {
    render(<UserList {...mockProps} />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('renders user list after loading', async () => {
    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Users (2)')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('displays user information correctly', async () => {
    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Check user details
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Agent count
    expect(screen.getByText('150')).toBeInTheDocument(); // Call count
    expect(screen.getByText('$75.50')).toBeInTheDocument(); // Credits used
  });

  it('handles search functionality', async () => {
    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Users (2)')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search users by name or email...');
    fireEvent.change(searchInput, { target: { value: 'john' } });

    expect(searchInput).toHaveValue('john');
  });

  it('handles user selection', async () => {
    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the checkbox for the first user
    const checkboxes = screen.getAllByRole('checkbox');
    const userCheckbox = checkboxes.find(checkbox => 
      checkbox.getAttribute('aria-checked') === 'false'
    );
    
    if (userCheckbox) {
      fireEvent.click(userCheckbox);
    }

    // Check if bulk actions appear
    await waitFor(() => {
      expect(screen.getByText(/selected/)).toBeInTheDocument();
    });
  });

  it('handles user actions from dropdown menu', async () => {
    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the actions dropdown
    const actionButtons = screen.getAllByRole('button');
    const dropdownButton = actionButtons.find(button => 
      button.querySelector('svg') // Looking for the MoreHorizontal icon
    );
    
    if (dropdownButton) {
      fireEvent.click(dropdownButton);
      
      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument();
      });

      // Click on View Details
      fireEvent.click(screen.getByText('View Details'));
      expect(mockProps.onUserSelect).toHaveBeenCalledWith(mockUsers[0]);
    }
  });

  it('handles bulk status toggle', async () => {
    (adminApiService.updateUser as any).mockResolvedValue({
      success: true,
      data: { ...mockUsers[0], isActive: false },
    });

    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select a user
    const checkboxes = screen.getAllByRole('checkbox');
    const userCheckbox = checkboxes.find(checkbox => 
      checkbox.getAttribute('aria-checked') === 'false'
    );
    
    if (userCheckbox) {
      fireEvent.click(userCheckbox);
    }

    await waitFor(() => {
      expect(screen.getByText(/selected/)).toBeInTheDocument();
    });

    // Click deactivate button
    const deactivateButton = screen.getByText('Deactivate');
    fireEvent.click(deactivateButton);

    await waitFor(() => {
      expect(adminApiService.updateUser).toHaveBeenCalled();
    });
  });

  it('handles API errors gracefully', async () => {
    (adminApiService.getUsers as any).mockRejectedValue(
      new Error('Failed to load users')
    );

    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading users')).toBeInTheDocument();
      expect(screen.getByText('Failed to load users')).toBeInTheDocument();
    });

    // Check for retry button
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
  });

  it('displays empty state when no users found', async () => {
    (adminApiService.getUsers as any).mockResolvedValue({
      success: true,
      data: [],
      pagination: {
        total: 0,
        totalPages: 0,
        currentPage: 1,
        limit: 20,
      },
    });

    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('handles sorting', async () => {
    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Users (2)')).toBeInTheDocument();
    });

    // Find a sortable column header and click it
    const nameHeader = screen.getByText('User');
    fireEvent.click(nameHeader);

    // Verify API was called with sort parameters
    await waitFor(() => {
      expect(adminApiService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'name',
          sortOrder: 'ASC',
        })
      );
    });
  });

  it('handles pagination', async () => {
    (adminApiService.getUsers as any).mockResolvedValue({
      success: true,
      data: mockUsers,
      pagination: {
        total: 50,
        totalPages: 3,
        currentPage: 1,
        limit: 20,
      },
    });

    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Users (50)')).toBeInTheDocument();
    });

    // Check pagination controls
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    
    // Click next page
    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      expect(adminApiService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });

  it('displays user status badges correctly', async () => {
    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Check for status badges
    const activeBadges = screen.getAllByText('Active');
    const inactiveBadges = screen.getAllByText('Inactive');
    
    expect(activeBadges.length).toBeGreaterThan(0);
    expect(inactiveBadges.length).toBeGreaterThan(0);
  });

  it('formats currency correctly', async () => {
    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('$75.50')).toBeInTheDocument();
      expect(screen.getByText('$12.25')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    render(<UserList {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
      expect(screen.getByText('Dec 15, 2023')).toBeInTheDocument();
    });
  });
});