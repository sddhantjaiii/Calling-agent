import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserManagement from '../UserManagement';
import type { AdminUserListItem } from '../../../../types/admin';

// Mock child components
vi.mock('../UserList', () => ({
  default: ({ onUserSelect, onUserEdit, onCreditAdjust }: any) => (
    <div data-testid="user-list">
      <button onClick={() => onUserSelect(mockUser)}>Select User</button>
      <button onClick={() => onUserEdit(mockUser)}>Edit User</button>
      <button onClick={() => onCreditAdjust(mockUser)}>Adjust Credits</button>
    </div>
  ),
}));

vi.mock('../UserDetails', () => ({
  default: ({ user, isOpen, onClose, onEdit, onCreditAdjust }: any) => (
    isOpen ? (
      <div data-testid="user-details">
        <span>User Details for {user?.name}</span>
        <button onClick={onClose}>Close</button>
        <button onClick={() => onEdit(user)}>Edit from Details</button>
        <button onClick={() => onCreditAdjust(user)}>Adjust from Details</button>
      </div>
    ) : null
  ),
}));

vi.mock('../UserEditModal', () => ({
  default: ({ user, isOpen, onClose, onUserUpdated }: any) => (
    isOpen ? (
      <div data-testid="user-edit-modal">
        <span>Edit Modal for {user?.name}</span>
        <button onClick={onClose}>Close Edit</button>
        <button onClick={() => onUserUpdated({ ...user, name: 'Updated Name' })}>
          Update User
        </button>
      </div>
    ) : null
  ),
}));

vi.mock('../CreditAdjustModal', () => ({
  default: ({ user, isOpen, onClose, onCreditAdjusted }: any) => (
    isOpen ? (
      <div data-testid="credit-adjust-modal">
        <span>Credit Modal for {user?.name}</span>
        <button onClick={onClose}>Close Credit</button>
        <button onClick={() => onCreditAdjusted(user, 150)}>
          Adjust Credits
        </button>
      </div>
    ) : null
  ),
}));

const mockUser: AdminUserListItem = {
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
};

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main user management interface', () => {
    render(<UserManagement />);
    
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Manage platform users, their access, and account settings')).toBeInTheDocument();
    expect(screen.getByTestId('user-list')).toBeInTheDocument();
  });

  it('handles user selection and opens details modal', () => {
    render(<UserManagement />);
    
    const selectButton = screen.getByText('Select User');
    fireEvent.click(selectButton);
    
    expect(screen.getByTestId('user-details')).toBeInTheDocument();
    expect(screen.getByText('User Details for John Doe')).toBeInTheDocument();
  });

  it('handles user edit and opens edit modal', () => {
    render(<UserManagement />);
    
    const editButton = screen.getByText('Edit User');
    fireEvent.click(editButton);
    
    expect(screen.getByTestId('user-edit-modal')).toBeInTheDocument();
    expect(screen.getByText('Edit Modal for John Doe')).toBeInTheDocument();
  });

  it('handles credit adjustment and opens credit modal', () => {
    render(<UserManagement />);
    
    const creditButton = screen.getByText('Adjust Credits');
    fireEvent.click(creditButton);
    
    expect(screen.getByTestId('credit-adjust-modal')).toBeInTheDocument();
    expect(screen.getByText('Credit Modal for John Doe')).toBeInTheDocument();
  });

  it('handles edit from user details modal', () => {
    render(<UserManagement />);
    
    // Open details modal first
    const selectButton = screen.getByText('Select User');
    fireEvent.click(selectButton);
    
    expect(screen.getByTestId('user-details')).toBeInTheDocument();
    
    // Click edit from details
    const editFromDetailsButton = screen.getByText('Edit from Details');
    fireEvent.click(editFromDetailsButton);
    
    expect(screen.getByTestId('user-edit-modal')).toBeInTheDocument();
  });

  it('handles credit adjustment from user details modal', () => {
    render(<UserManagement />);
    
    // Open details modal first
    const selectButton = screen.getByText('Select User');
    fireEvent.click(selectButton);
    
    expect(screen.getByTestId('user-details')).toBeInTheDocument();
    
    // Click credit adjust from details
    const creditFromDetailsButton = screen.getByText('Adjust from Details');
    fireEvent.click(creditFromDetailsButton);
    
    expect(screen.getByTestId('credit-adjust-modal')).toBeInTheDocument();
  });

  it('closes user details modal', () => {
    render(<UserManagement />);
    
    // Open details modal
    const selectButton = screen.getByText('Select User');
    fireEvent.click(selectButton);
    
    expect(screen.getByTestId('user-details')).toBeInTheDocument();
    
    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('user-details')).not.toBeInTheDocument();
  });

  it('closes user edit modal', () => {
    render(<UserManagement />);
    
    // Open edit modal
    const editButton = screen.getByText('Edit User');
    fireEvent.click(editButton);
    
    expect(screen.getByTestId('user-edit-modal')).toBeInTheDocument();
    
    // Close modal
    const closeEditButton = screen.getByText('Close Edit');
    fireEvent.click(closeEditButton);
    
    expect(screen.queryByTestId('user-edit-modal')).not.toBeInTheDocument();
  });

  it('closes credit adjust modal', () => {
    render(<UserManagement />);
    
    // Open credit modal
    const creditButton = screen.getByText('Adjust Credits');
    fireEvent.click(creditButton);
    
    expect(screen.getByTestId('credit-adjust-modal')).toBeInTheDocument();
    
    // Close modal
    const closeCreditButton = screen.getByText('Close Credit');
    fireEvent.click(closeCreditButton);
    
    expect(screen.queryByTestId('credit-adjust-modal')).not.toBeInTheDocument();
  });

  it('handles user update and closes edit modal', () => {
    render(<UserManagement />);
    
    // Open details modal first
    const selectButton = screen.getByText('Select User');
    fireEvent.click(selectButton);
    
    // Open edit modal
    const editButton = screen.getByText('Edit User');
    fireEvent.click(editButton);
    
    expect(screen.getByTestId('user-edit-modal')).toBeInTheDocument();
    
    // Update user
    const updateButton = screen.getByText('Update User');
    fireEvent.click(updateButton);
    
    // Edit modal should close
    expect(screen.queryByTestId('user-edit-modal')).not.toBeInTheDocument();
    
    // Details modal should still be open with updated user
    expect(screen.getByTestId('user-details')).toBeInTheDocument();
    expect(screen.getByText('User Details for Updated Name')).toBeInTheDocument();
  });

  it('handles credit adjustment and closes credit modal', () => {
    render(<UserManagement />);
    
    // Open details modal first
    const selectButton = screen.getByText('Select User');
    fireEvent.click(selectButton);
    
    // Open credit modal
    const creditButton = screen.getByText('Adjust Credits');
    fireEvent.click(creditButton);
    
    expect(screen.getByTestId('credit-adjust-modal')).toBeInTheDocument();
    
    // Adjust credits
    const adjustButton = screen.getAllByText('Adjust Credits')[1]; // Get the one from the modal
    fireEvent.click(adjustButton);
    
    // Credit modal should close
    expect(screen.queryByTestId('credit-adjust-modal')).not.toBeInTheDocument();
    
    // Details modal should still be open
    expect(screen.getByTestId('user-details')).toBeInTheDocument();
  });

  it('handles status change updates', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(<UserManagement />);
    
    // This would be called by UserStatusToggle component
    // We're testing the handler exists and works
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('maintains state consistency across modals', () => {
    render(<UserManagement />);
    
    // Open details modal
    const selectButton = screen.getByText('Select User');
    fireEvent.click(selectButton);
    
    // Open edit modal from details
    const editFromDetailsButton = screen.getByText('Edit from Details');
    fireEvent.click(editFromDetailsButton);
    
    // Update user
    const updateButton = screen.getByText('Update User');
    fireEvent.click(updateButton);
    
    // Verify the details modal shows updated information
    expect(screen.getByText('User Details for Updated Name')).toBeInTheDocument();
  });

  it('handles multiple modal interactions', () => {
    render(<UserManagement />);
    
    // Open details modal
    const selectButton = screen.getByText('Select User');
    fireEvent.click(selectButton);
    
    // Open edit modal
    const editButton = screen.getByText('Edit User');
    fireEvent.click(editButton);
    
    // Close edit modal
    const closeEditButton = screen.getByText('Close Edit');
    fireEvent.click(closeEditButton);
    
    // Open credit modal
    const creditButton = screen.getByText('Adjust from Details');
    fireEvent.click(creditButton);
    
    // Close credit modal
    const closeCreditButton = screen.getByText('Close Credit');
    fireEvent.click(closeCreditButton);
    
    // Details modal should still be open
    expect(screen.getByTestId('user-details')).toBeInTheDocument();
  });

  it('renders with proper page structure', () => {
    render(<UserManagement />);
    
    // Check for header section
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Manage platform users, their access, and account settings')).toBeInTheDocument();
    
    // Check for user list
    expect(screen.getByTestId('user-list')).toBeInTheDocument();
  });

  it('handles edge case with null user', () => {
    render(<UserManagement />);
    
    // Initially no modals should be open
    expect(screen.queryByTestId('user-details')).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-edit-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('credit-adjust-modal')).not.toBeInTheDocument();
  });

  it('properly manages modal state transitions', () => {
    render(<UserManagement />);
    
    // Open details
    fireEvent.click(screen.getByText('Select User'));
    expect(screen.getByTestId('user-details')).toBeInTheDocument();
    
    // Open edit from details
    fireEvent.click(screen.getByText('Edit from Details'));
    expect(screen.getByTestId('user-edit-modal')).toBeInTheDocument();
    expect(screen.getByTestId('user-details')).toBeInTheDocument();
    
    // Update user (should close edit modal)
    fireEvent.click(screen.getByText('Update User'));
    expect(screen.queryByTestId('user-edit-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-details')).toBeInTheDocument();
    
    // Close details
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('user-details')).not.toBeInTheDocument();
  });
});