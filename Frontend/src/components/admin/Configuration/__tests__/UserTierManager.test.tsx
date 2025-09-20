import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserTierManager from '../UserTierManager';

// Mock the toast hook
vi.mock('../../../ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('UserTierManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(<UserTierManager />);
  };

  it('renders user tier manager', () => {
    renderComponent();
    
    expect(screen.getByText('User Tier Management')).toBeInTheDocument();
    expect(screen.getByText('Manage subscription tiers and feature access')).toBeInTheDocument();
  });

  it('displays summary cards with correct values', () => {
    renderComponent();

    expect(screen.getByText('Total Tiers')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Free, Premium, Enterprise
    expect(screen.getByText('Active Tiers')).toBeInTheDocument();
    expect(screen.getByText('Free Users')).toBeInTheDocument();
    expect(screen.getByText('Revenue/Month')).toBeInTheDocument();
  });

  it('displays tier overview cards', () => {
    renderComponent();

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    
    // Check pricing
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('shows tier limits and features', () => {
    renderComponent();

    // Check limits
    expect(screen.getByText('• 100 contacts')).toBeInTheDocument();
    expect(screen.getByText('• 1,000 contacts')).toBeInTheDocument();
    expect(screen.getByText('• 10,000 contacts')).toBeInTheDocument();
    
    // Check features
    expect(screen.getByText('• Basic agents')).toBeInTheDocument();
    expect(screen.getByText('• Advanced agents')).toBeInTheDocument();
    expect(screen.getByText('• All features')).toBeInTheDocument();
  });

  it('opens create tier modal when Add Tier button is clicked', () => {
    renderComponent();

    const addButton = screen.getByText('Add Tier');
    fireEvent.click(addButton);
    
    expect(screen.getByText('Create New Tier')).toBeInTheDocument();
    expect(screen.getByText('Create a new subscription tier with custom features and limits')).toBeInTheDocument();
  });

  it('opens edit tier modal when Edit button is clicked', () => {
    renderComponent();

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]); // Click first edit button
    
    expect(screen.getByText('Edit Tier')).toBeInTheDocument();
    expect(screen.getByText('Update tier configuration and features')).toBeInTheDocument();
  });

  it('displays detailed tiers table', () => {
    renderComponent();

    expect(screen.getByText('All Tiers')).toBeInTheDocument();
    expect(screen.getByText('Detailed view of all subscription tiers and their configurations')).toBeInTheDocument();
    
    // Check table headers
    expect(screen.getByText('Tier')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Calls/Month')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});  i
t('fills form when editing a tier', () => {
    renderComponent();

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]); // Edit Free tier
    
    // Should populate form with Free tier data
    expect(screen.getByDisplayValue('Free')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Basic features for getting started')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // Price
    expect(screen.getByDisplayValue('100')).toBeInTheDocument(); // Contacts
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // Agents
    expect(screen.getByDisplayValue('50')).toBeInTheDocument(); // Calls per month
  });

  it('validates form inputs', () => {
    renderComponent();

    const addButton = screen.getByText('Add Tier');
    fireEvent.click(addButton);
    
    // Fill out form
    const nameInput = screen.getByPlaceholderText('Enter tier name');
    const priceInput = screen.getByPlaceholderText('0.00');
    
    fireEvent.change(nameInput, { target: { value: 'Test Tier' } });
    fireEvent.change(priceInput, { target: { value: '19.99' } });
    
    expect(nameInput).toHaveValue('Test Tier');
    expect(priceInput).toHaveValue(19.99);
  });

  it('handles numeric input validation', () => {
    renderComponent();

    const addButton = screen.getByText('Add Tier');
    fireEvent.click(addButton);
    
    const priceInput = screen.getByPlaceholderText('0.00');
    const contactsInput = screen.getByLabelText('Contact Limit');
    
    // Test invalid input
    fireEvent.change(priceInput, { target: { value: 'invalid' } });
    expect(priceInput).toHaveValue(0);
    
    // Test valid input
    fireEvent.change(contactsInput, { target: { value: '500' } });
    expect(contactsInput).toHaveValue(500);
  });

  it('toggles tier active status', () => {
    renderComponent();

    const addButton = screen.getByText('Add Tier');
    fireEvent.click(addButton);
    
    const activeSwitch = screen.getByLabelText('Active tier');
    expect(activeSwitch).toBeChecked(); // Should be checked by default
    
    fireEvent.click(activeSwitch);
    expect(activeSwitch).not.toBeChecked();
  });

  it('saves tier when form is submitted', () => {
    const mockToast = vi.fn();
    vi.mocked(require('../../../ui/use-toast').useToast).mockReturnValue({
      toast: mockToast
    });

    renderComponent();

    const addButton = screen.getByText('Add Tier');
    fireEvent.click(addButton);
    
    // Fill out form
    const nameInput = screen.getByPlaceholderText('Enter tier name');
    fireEvent.change(nameInput, { target: { value: 'Test Tier' } });
    
    // Submit form
    const createButton = screen.getByText('Create Tier');
    fireEvent.click(createButton);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Tier Updated',
      description: 'User tier has been updated successfully.',
    });
  });

  it('closes modal when Cancel button is clicked', () => {
    renderComponent();

    const addButton = screen.getByText('Add Tier');
    fireEvent.click(addButton);
    
    expect(screen.getByText('Create New Tier')).toBeInTheDocument();
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(screen.queryByText('Create New Tier')).not.toBeInTheDocument();
  });

  it('disables delete button for Free tier', () => {
    renderComponent();

    // Find the delete button in the Free tier row
    const tableRows = screen.getAllByRole('row');
    const freeRow = tableRows.find(row => row.textContent?.includes('Free'));
    
    if (freeRow) {
      const deleteButton = freeRow.querySelector('button[disabled]');
      expect(deleteButton).toBeInTheDocument();
    }
  });

  it('shows correct tier badges and icons', () => {
    renderComponent();

    // Check for tier badges in overview cards
    const badges = screen.getAllByText('Free');
    expect(badges.length).toBeGreaterThan(0);
    
    const premiumBadges = screen.getAllByText('Premium');
    expect(premiumBadges.length).toBeGreaterThan(0);
    
    const enterpriseBadges = screen.getAllByText('Enterprise');
    expect(enterpriseBadges.length).toBeGreaterThan(0);
  });

  it('displays feature count in table', () => {
    renderComponent();

    expect(screen.getByText('3 features')).toBeInTheDocument(); // Free tier
    expect(screen.getByText('4 features')).toBeInTheDocument(); // Premium tier
  });

  it('shows pricing correctly in table', () => {
    renderComponent();

    expect(screen.getByText('Free')).toBeInTheDocument(); // Free tier price
    expect(screen.getByText('$29.99/mo')).toBeInTheDocument(); // Premium tier price
    expect(screen.getByText('$99.99/mo')).toBeInTheDocument(); // Enterprise tier price
  });

  it('formats large numbers with commas', () => {
    renderComponent();

    expect(screen.getByText('1,000')).toBeInTheDocument(); // Premium contacts
    expect(screen.getByText('10,000')).toBeInTheDocument(); // Enterprise contacts and calls
  });
});