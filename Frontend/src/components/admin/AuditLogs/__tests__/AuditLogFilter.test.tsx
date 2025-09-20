import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuditLogFilter } from '../AuditLogFilter';
import type { AuditLogFilters } from '../../../../types/admin';

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'LLL dd, y') return 'Jan 01, 2024';
    if (formatStr === 'MMM dd') return 'Jan 01';
    return 'Jan 01, 2024';
  }),
}));

describe('AuditLogFilter', () => {
  const mockOnFiltersChange = vi.fn();
  const defaultFilters: AuditLogFilters = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders filter component with all filter options', () => {
    render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Admin User ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Action Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Resource Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Target User ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByLabelText('Search in Details')).toBeInTheDocument();
  });

  it('displays active filter count', () => {
    const filtersWithValues: AuditLogFilters = {
      adminUserId: 'admin-123',
      action: 'user.create',
      success: true,
    };

    render(
      <AuditLogFilter
        filters={filtersWithValues}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument(); // Badge showing count
  });

  it('handles admin user ID filter changes', () => {
    render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const adminUserInput = screen.getByLabelText('Admin User ID');
    fireEvent.change(adminUserInput, { target: { value: 'admin-456' } });

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      adminUserId: 'admin-456',
    });
  });

  it('handles action type filter changes', () => {
    render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const actionSelect = screen.getByLabelText('Action Type');
    fireEvent.click(actionSelect);

    const userCreateOption = screen.getByText('user.create');
    fireEvent.click(userCreateOption);

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      action: 'user.create',
    });
  });

  it('handles resource type filter changes', () => {
    render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const resourceSelect = screen.getByLabelText('Resource Type');
    fireEvent.click(resourceSelect);

    const userOption = screen.getByText('USER');
    fireEvent.click(userOption);

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      resourceType: 'user',
    });
  });

  it('handles target user ID filter changes', () => {
    render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const targetUserInput = screen.getByLabelText('Target User ID');
    fireEvent.change(targetUserInput, { target: { value: 'user-789' } });

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      targetUserId: 'user-789',
    });
  });

  it('handles success status filter changes', () => {
    render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.click(statusSelect);

    const successOption = screen.getByText('Success');
    fireEvent.click(successOption);

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      success: true,
    });
  });

  it('handles search filter changes', () => {
    render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const searchInput = screen.getByLabelText('Search in Details');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      search: 'test search',
    });
  });

  it('handles date range filter', () => {
    render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const dateRangeButton = screen.getByText('Pick a date range');
    fireEvent.click(dateRangeButton);

    // Calendar should be visible
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('clears all filters', () => {
    const filtersWithValues: AuditLogFilters = {
      adminUserId: 'admin-123',
      action: 'user.create',
      success: true,
      search: 'test',
    };

    render(
      <AuditLogFilter
        filters={filtersWithValues}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('displays active filters as badges', () => {
    const filtersWithValues: AuditLogFilters = {
      adminUserId: 'admin-123',
      action: 'user.create',
      resourceType: 'user',
      success: true,
    };

    render(
      <AuditLogFilter
        filters={filtersWithValues}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    expect(screen.getByText('Admin: admin-123')).toBeInTheDocument();
    expect(screen.getByText('Action: user.create')).toBeInTheDocument();
    expect(screen.getByText('Resource: user')).toBeInTheDocument();
    expect(screen.getByText('Status: Success')).toBeInTheDocument();
  });

  it('removes individual active filters', () => {
    const filtersWithValues: AuditLogFilters = {
      adminUserId: 'admin-123',
      action: 'user.create',
    };

    render(
      <AuditLogFilter
        filters={filtersWithValues}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    // Find the X button for the admin filter badge
    const adminBadge = screen.getByText('Admin: admin-123');
    const removeButton = adminBadge.parentElement?.querySelector('button');
    
    if (removeButton) {
      fireEvent.click(removeButton);
      
      const applyButton = screen.getByText('Apply Filters');
      fireEvent.click(applyButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        action: 'user.create',
      });
    }
  });

  it('updates local filters when props change', () => {
    const { rerender } = render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const newFilters: AuditLogFilters = {
      adminUserId: 'admin-456',
    };

    rerender(
      <AuditLogFilter
        filters={newFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const adminUserInput = screen.getByLabelText('Admin User ID') as HTMLInputElement;
    expect(adminUserInput.value).toBe('admin-456');
  });

  it('handles empty string values correctly', () => {
    render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const adminUserInput = screen.getByLabelText('Admin User ID');
    fireEvent.change(adminUserInput, { target: { value: '' } });

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    // Empty string should be converted to undefined
    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('shows all action type options', () => {
    render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const actionSelect = screen.getByLabelText('Action Type');
    fireEvent.click(actionSelect);

    // Check for some expected action types
    expect(screen.getByText('user.create')).toBeInTheDocument();
    expect(screen.getByText('user.update')).toBeInTheDocument();
    expect(screen.getByText('user.delete')).toBeInTheDocument();
    expect(screen.getByText('agent.create')).toBeInTheDocument();
    expect(screen.getByText('system.config.update')).toBeInTheDocument();
  });

  it('shows all resource type options', () => {
    render(
      <AuditLogFilter
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );

    const resourceSelect = screen.getByLabelText('Resource Type');
    fireEvent.click(resourceSelect);

    // Check for some expected resource types
    expect(screen.getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('AGENT')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM')).toBeInTheDocument();
    expect(screen.getByText('API_KEY')).toBeInTheDocument();
  });
});