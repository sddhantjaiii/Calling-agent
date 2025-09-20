import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserEditModal from '../UserEditModal';
import { adminApiService } from '../../../../services/adminApiService';
import type { AdminUserListItem } from '../../../../types/admin';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    updateUser: vi.fn(),
  },
}));

// Mock UI components
vi.mock('../../../ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ className }: { className?: string }) => (
    <div className={className} data-testid="loading-spinner">Loading...</div>
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

const mockProps = {
  user: mockUser,
  isOpen: true,
  onClose: vi.fn(),
  onUserUpdated: vi.fn(),
};

describe('UserEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API response
    (adminApiService.updateUser as any).mockResolvedValue({
      success: true,
      data: { ...mockUser, name: 'Updated Name' },
    });
  });

  it('renders modal when open', () => {
    render(<UserEditModal {...mockProps} />);
    
    expect(screen.getByText('Edit User')).toBeInTheDocument();
    expect(screen.getByText('Update user information and settings')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<UserEditModal {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
  });

  it('initializes form with user data', () => {
    render(<UserEditModal {...mockProps} />);
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
    expect(screen.getByDisplayValue('pro')).toBeInTheDocument();
  });

  it('displays user role badge as read-only', () => {
    render(<UserEditModal {...mockProps} />);
    
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('Role cannot be changed from the admin panel')).toBeInTheDocument();
  });

  it('displays user statistics', () => {
    render(<UserEditModal {...mockProps} />);
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Agent count
    expect(screen.getByText('150')).toBeInTheDocument(); // Call count
    expect(screen.getByText('75.50')).toBeInTheDocument(); // Credits used
  });

  it('handles form input changes', () => {
    render(<UserEditModal {...mockProps} />);
    
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    
    expect(nameInput).toHaveValue('Jane Doe');
  });

  it('handles status toggle', () => {
    render(<UserEditModal {...mockProps} />);
    
    const statusSwitch = screen.getByRole('switch');
    expect(statusSwitch).toBeChecked();
    
    fireEvent.click(statusSwitch);
    expect(statusSwitch).not.toBeChecked();
    
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<UserEditModal {...mockProps} />);
    
    // Clear required fields
    const nameInput = screen.getByDisplayValue('John Doe');
    const emailInput = screen.getByDisplayValue('john@example.com');
    
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.change(emailInput, { target: { value: '' } });
    
    // Submit form
    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
    
    // API should not be called
    expect(adminApiService.updateUser).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    render(<UserEditModal {...mockProps} />);
    
    const emailInput = screen.getByDisplayValue('john@example.com');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('validates phone number format', async () => {
    render(<UserEditModal {...mockProps} />);
    
    const phoneInput = screen.getByDisplayValue('+1234567890');
    fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } });
    
    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid phone number')).toBeInTheDocument();
    });
  });

  it('submits form successfully', async () => {
    render(<UserEditModal {...mockProps} />);
    
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    
    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(adminApiService.updateUser).toHaveBeenCalledWith('1', {
        name: 'Updated Name',
        email: 'john@example.com',
        isActive: true,
        phone: '+1234567890',
        subscriptionTier: 'pro',
      });
    });
    
    expect(mockProps.onUserUpdated).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    // Mock delayed API response
    (adminApiService.updateUser as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<UserEditModal {...mockProps} />);
    
    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('shows success message after successful update', async () => {
    render(<UserEditModal {...mockProps} />);
    
    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('User updated successfully!')).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    (adminApiService.updateUser as any).mockRejectedValue(
      new Error('Failed to update user')
    );
    
    render(<UserEditModal {...mockProps} />);
    
    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to update user')).toBeInTheDocument();
    });
  });

  it('handles subscription tier changes', () => {
    render(<UserEditModal {...mockProps} />);
    
    const tierSelect = screen.getByDisplayValue('pro');
    fireEvent.change(tierSelect, { target: { value: 'enterprise' } });
    
    expect(tierSelect).toHaveValue('enterprise');
  });

  it('closes modal when cancel is clicked', () => {
    render(<UserEditModal {...mockProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('closes modal when X button is clicked', () => {
    render(<UserEditModal {...mockProps} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('clears validation errors when input changes', async () => {
    render(<UserEditModal {...mockProps} />);
    
    // Clear name to trigger validation error
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: '' } });
    
    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
    
    // Fix the name
    fireEvent.change(nameInput, { target: { value: 'Fixed Name' } });
    
    // Error should be cleared
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('handles admin user role display', () => {
    const adminUser = { ...mockUser, role: 'admin' };
    render(<UserEditModal {...mockProps} user={adminUser} />);
    
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('auto-closes modal after successful update', async () => {
    vi.useFakeTimers();
    
    render(<UserEditModal {...mockProps} />);
    
    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('User updated successfully!')).toBeInTheDocument();
    });
    
    // Fast-forward time
    vi.advanceTimersByTime(1500);
    
    expect(mockProps.onClose).toHaveBeenCalled();
    
    vi.useRealTimers();
  });
});