import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CreditAdjustModal from '../CreditAdjustModal';
import { adminApiService } from '../../../../services/adminApiService';
import type { AdminUserListItem } from '../../../../types/admin';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    adjustUserCredits: vi.fn(),
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
  onCreditAdjusted: vi.fn(),
};

describe('CreditAdjustModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API response
    (adminApiService.adjustUserCredits as any).mockResolvedValue({
      success: true,
      data: {
        newBalance: 150,
        transactionId: 'txn_123',
        message: 'Credits adjusted successfully',
      },
    });
  });

  it('renders modal when open', () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    expect(screen.getByText('Adjust Credits')).toBeInTheDocument();
    expect(screen.getByText('Add or subtract credits for John Doe')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CreditAdjustModal {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Adjust Credits')).not.toBeInTheDocument();
  });

  it('displays current balance', () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    expect(screen.getByText('Current Balance')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('defaults to add credits mode', () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const addButton = screen.getByText('Add Credits');
    const subtractButton = screen.getByText('Subtract Credits');
    
    // Add button should be selected (default variant)
    expect(addButton).toHaveClass('bg-primary'); // or whatever the default button class is
    expect(subtractButton).not.toHaveClass('bg-primary');
  });

  it('switches between add and subtract modes', () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const subtractButton = screen.getByText('Subtract Credits');
    fireEvent.click(subtractButton);
    
    expect(screen.getByText('Amount to Subtract *')).toBeInTheDocument();
    
    const addButton = screen.getByText('Add Credits');
    fireEvent.click(addButton);
    
    expect(screen.getByText('Amount to Add *')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const submitButton = screen.getByText('Add Credits');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Amount is required')).toBeInTheDocument();
      expect(screen.getByText('Reason is required for audit purposes')).toBeInTheDocument();
    });
    
    expect(adminApiService.adjustUserCredits).not.toHaveBeenCalled();
  });

  it('validates amount format', async () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: 'invalid' } });
    
    const submitButton = screen.getByText('Add Credits');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid positive amount')).toBeInTheDocument();
    });
  });

  it('validates maximum amount', async () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '15000' } });
    
    const submitButton = screen.getByText('Add Credits');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Amount cannot exceed $10,000')).toBeInTheDocument();
    });
  });

  it('validates minimum reason length', async () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    const reasonInput = screen.getByPlaceholderText(/Provide a detailed reason/);
    
    fireEvent.change(amountInput, { target: { value: '50' } });
    fireEvent.change(reasonInput, { target: { value: 'short' } });
    
    const submitButton = screen.getByText('Add Credits');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please provide a more detailed reason (minimum 10 characters)')).toBeInTheDocument();
    });
  });

  it('prevents subtracting more than current balance', async () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    // Switch to subtract mode
    const subtractButton = screen.getByText('Subtract Credits');
    fireEvent.click(subtractButton);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '150' } }); // More than $100 balance
    
    const submitButton = screen.getByText('Subtract Credits');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Cannot subtract more than current balance ($100.00)')).toBeInTheDocument();
    });
  });

  it('shows balance preview', () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '50' } });
    
    expect(screen.getByText('New Balance Preview')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });

  it('shows balance preview for subtraction', () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    // Switch to subtract mode
    const subtractButton = screen.getByText('Subtract Credits');
    fireEvent.click(subtractButton);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '25' } });
    
    expect(screen.getByText('$75.00')).toBeInTheDocument();
  });

  it('submits credit addition successfully', async () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    const reasonInput = screen.getByPlaceholderText(/Provide a detailed reason/);
    
    fireEvent.change(amountInput, { target: { value: '50' } });
    fireEvent.change(reasonInput, { target: { value: 'Promotional credit bonus for loyal customer' } });
    
    const submitButton = screen.getByText('Add Credits');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(adminApiService.adjustUserCredits).toHaveBeenCalledWith({
        userId: '1',
        amount: 50,
        type: 'add',
        reason: 'Promotional credit bonus for loyal customer',
      });
    });
    
    expect(mockProps.onCreditAdjusted).toHaveBeenCalledWith(mockUser, 150);
  });

  it('submits credit subtraction successfully', async () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    // Switch to subtract mode
    const subtractButton = screen.getByText('Subtract Credits');
    fireEvent.click(subtractButton);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    const reasonInput = screen.getByPlaceholderText(/Provide a detailed reason/);
    
    fireEvent.change(amountInput, { target: { value: '25' } });
    fireEvent.change(reasonInput, { target: { value: 'Refund for billing error correction' } });
    
    const submitButtonAfterSwitch = screen.getByText('Subtract Credits');
    fireEvent.click(submitButtonAfterSwitch);
    
    await waitFor(() => {
      expect(adminApiService.adjustUserCredits).toHaveBeenCalledWith({
        userId: '1',
        amount: 25,
        type: 'subtract',
        reason: 'Refund for billing error correction',
      });
    });
  });

  it('shows loading state during submission', async () => {
    // Mock delayed API response
    (adminApiService.adjustUserCredits as any).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<CreditAdjustModal {...mockProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    const reasonInput = screen.getByPlaceholderText(/Provide a detailed reason/);
    
    fireEvent.change(amountInput, { target: { value: '50' } });
    fireEvent.change(reasonInput, { target: { value: 'Test reason for credit adjustment' } });
    
    const submitButton = screen.getByText('Add Credits');
    fireEvent.click(submitButton);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('shows success message after successful adjustment', async () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    const reasonInput = screen.getByPlaceholderText(/Provide a detailed reason/);
    
    fireEvent.change(amountInput, { target: { value: '50' } });
    fireEvent.change(reasonInput, { target: { value: 'Test reason for credit adjustment' } });
    
    const submitButton = screen.getByText('Add Credits');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Successfully added \$50\.00/)).toBeInTheDocument();
      expect(screen.getByText(/New balance: \$150\.00/)).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    (adminApiService.adjustUserCredits as any).mockRejectedValue(
      new Error('Failed to adjust credits')
    );
    
    render(<CreditAdjustModal {...mockProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    const reasonInput = screen.getByPlaceholderText(/Provide a detailed reason/);
    
    fireEvent.change(amountInput, { target: { value: '50' } });
    fireEvent.change(reasonInput, { target: { value: 'Test reason for credit adjustment' } });
    
    const submitButton = screen.getByText('Add Credits');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to adjust credits')).toBeInTheDocument();
    });
  });

  it('shows warning for subtraction', () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    // Switch to subtract mode
    const subtractButton = screen.getByText('Subtract Credits');
    fireEvent.click(subtractButton);
    
    expect(screen.getByText('Warning:')).toBeInTheDocument();
    expect(screen.getByText(/Subtracting credits will immediately reduce/)).toBeInTheDocument();
  });

  it('closes modal when cancel is clicked', () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('closes modal when X button is clicked', () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('clears validation errors when input changes', async () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    // Trigger validation error
    const submitButton = screen.getByText('Add Credits');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Amount is required')).toBeInTheDocument();
    });
    
    // Fix the amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '50' } });
    
    // Error should be cleared
    expect(screen.queryByText('Amount is required')).not.toBeInTheDocument();
  });

  it('auto-closes modal after successful adjustment', async () => {
    vi.useFakeTimers();
    
    render(<CreditAdjustModal {...mockProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    const reasonInput = screen.getByPlaceholderText(/Provide a detailed reason/);
    
    fireEvent.change(amountInput, { target: { value: '50' } });
    fireEvent.change(reasonInput, { target: { value: 'Test reason for credit adjustment' } });
    
    const submitButton = screen.getByText('Add Credits');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Successfully added/)).toBeInTheDocument();
    });
    
    // Fast-forward time
    vi.advanceTimersByTime(2000);
    
    expect(mockProps.onClose).toHaveBeenCalled();
    
    vi.useRealTimers();
  });

  it('disables submit button when form is invalid', () => {
    render(<CreditAdjustModal {...mockProps} />);
    
    const submitButton = screen.getByText('Add Credits');
    expect(submitButton).toBeDisabled();
    
    // Add amount but no reason
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '50' } });
    
    expect(submitButton).toBeDisabled();
    
    // Add reason
    const reasonInput = screen.getByPlaceholderText(/Provide a detailed reason/);
    fireEvent.change(reasonInput, { target: { value: 'Valid reason' } });
    
    expect(submitButton).not.toBeDisabled();
  });
});