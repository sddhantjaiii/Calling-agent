import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BulkAgentActions } from '../BulkAgentActions';
import { adminApiService } from '../../../../services/adminApiService';
import type { BulkAgentActionResponse } from '../../../../types/admin';

// Mock the admin API service
vi.mock('../../../../services/adminApiService', () => ({
  adminApiService: {
    bulkAgentAction: vi.fn(),
  },
}));

// Mock UI components
vi.mock('../../../ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => <div data-testid="loading-spinner">{size}</div>,
}));

const mockAgentIds = ['agent1', 'agent2', 'agent3'];

const mockSuccessResponse: BulkAgentActionResponse = {
  successful: 3,
  failed: [],
};

const mockPartialFailureResponse: BulkAgentActionResponse = {
  successful: 2,
  failed: [
    {
      agentId: 'agent3',
      error: 'Agent not found',
    },
  ],
};

describe('BulkAgentActions', () => {
  const defaultProps = {
    agentIds: mockAgentIds,
    open: true,
    onClose: vi.fn(),
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with agent count', () => {
    render(<BulkAgentActions {...defaultProps} />);
    
    expect(screen.getByText('Bulk Agent Actions')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('agents selected')).toBeInTheDocument();
  });

  it('shows action selection options', () => {
    render(<BulkAgentActions {...defaultProps} />);
    
    expect(screen.getByText('Select Action')).toBeInTheDocument();
    expect(screen.getByText('Activate Agents')).toBeInTheDocument();
    expect(screen.getByText('Deactivate Agents')).toBeInTheDocument();
    expect(screen.getByText('Delete Agents')).toBeInTheDocument();
  });

  it('handles action selection', () => {
    render(<BulkAgentActions {...defaultProps} />);
    
    const activateCard = screen.getByText('Activate Agents').closest('.cursor-pointer');
    fireEvent.click(activateCard!);
    
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('This will activate 3 agents.')).toBeInTheDocument();
  });

  it('shows delete confirmation warning', () => {
    render(<BulkAgentActions {...defaultProps} />);
    
    const deleteCard = screen.getByText('Delete Agents').closest('.cursor-pointer');
    fireEvent.click(deleteCard!);
    
    expect(screen.getByText('This will permanently delete 3 agents. This action cannot be undone.')).toBeInTheDocument();
  });

  it('executes bulk action successfully', async () => {
    vi.mocked(adminApiService.bulkAgentAction).mockResolvedValue({
      success: true,
      data: mockSuccessResponse,
    });

    render(<BulkAgentActions {...defaultProps} />);
    
    // Select activate action
    const activateCard = screen.getByText('Activate Agents').closest('.cursor-pointer');
    fireEvent.click(activateCard!);
    
    // Execute action
    const executeButton = screen.getByText('Execute Activate Agents');
    fireEvent.click(executeButton);
    
    // Should show processing state
    expect(screen.getByText('Processing activate...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Action Complete')).toBeInTheDocument();
      expect(screen.getByText('Successful').parentElement?.querySelector('.text-2xl')).toHaveTextContent('3');
      expect(screen.getByText('Failed').parentElement?.querySelector('.text-2xl')).toHaveTextContent('0');
    });
    
    expect(adminApiService.bulkAgentAction).toHaveBeenCalledWith({
      agentIds: mockAgentIds,
      action: 'activate',
    });
  });

  it('handles partial failure response', async () => {
    vi.mocked(adminApiService.bulkAgentAction).mockResolvedValue({
      success: true,
      data: mockPartialFailureResponse,
    });

    render(<BulkAgentActions {...defaultProps} />);
    
    // Select and execute action
    const activateCard = screen.getByText('Activate Agents').closest('.cursor-pointer');
    fireEvent.click(activateCard!);
    
    const executeButton = screen.getByText('Execute Activate Agents');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Action Complete')).toBeInTheDocument();
      expect(screen.getByText('Successful').parentElement?.querySelector('.text-2xl')).toHaveTextContent('2');
      expect(screen.getByText('Failed').parentElement?.querySelector('.text-2xl')).toHaveTextContent('1');
      expect(screen.getByText('Failed Operations')).toBeInTheDocument();
      expect(screen.getByText('Agent ID: agent3')).toBeInTheDocument();
      expect(screen.getByText('Agent not found')).toBeInTheDocument();
    });
  });

  it('handles API error', async () => {
    vi.mocked(adminApiService.bulkAgentAction).mockRejectedValue(new Error('API Error'));

    render(<BulkAgentActions {...defaultProps} />);
    
    // Select and execute action
    const activateCard = screen.getByText('Activate Agents').closest('.cursor-pointer');
    fireEvent.click(activateCard!);
    
    const executeButton = screen.getByText('Execute Activate Agents');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Action Complete')).toBeInTheDocument();
      expect(screen.getByText('Successful').parentElement?.querySelector('.text-2xl')).toHaveTextContent('0');
      expect(screen.getByText('Failed').parentElement?.querySelector('.text-2xl')).toHaveTextContent('3');
    });
  });

  it('calls onComplete when done button is clicked', async () => {
    vi.mocked(adminApiService.bulkAgentAction).mockResolvedValue({
      success: true,
      data: mockSuccessResponse,
    });

    render(<BulkAgentActions {...defaultProps} />);
    
    // Execute action
    const activateCard = screen.getByText('Activate Agents').closest('.cursor-pointer');
    fireEvent.click(activateCard!);
    
    const executeButton = screen.getByText('Execute Activate Agents');
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
    
    const doneButton = screen.getByText('Done');
    fireEvent.click(doneButton);
    
    expect(defaultProps.onComplete).toHaveBeenCalledWith(mockSuccessResponse);
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<BulkAgentActions {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('resets state when dialog is closed and reopened', () => {
    const { rerender } = render(<BulkAgentActions {...defaultProps} />);
    
    // Select an action
    const activateCard = screen.getByText('Activate Agents').closest('.cursor-pointer');
    fireEvent.click(activateCard!);
    
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    
    // Close dialog
    rerender(<BulkAgentActions {...defaultProps} open={false} />);
    
    // Reopen dialog
    rerender(<BulkAgentActions {...defaultProps} open={true} />);
    
    // Should be back to initial state
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    expect(screen.getByText('Select Action')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<BulkAgentActions {...defaultProps} open={false} />);
    
    expect(screen.queryByText('Bulk Agent Actions')).not.toBeInTheDocument();
  });

  it('shows progress during execution', async () => {
    // Mock a slow response to test progress
    vi.mocked(adminApiService.bulkAgentAction).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ success: true, data: mockSuccessResponse }), 1000)
      )
    );

    render(<BulkAgentActions {...defaultProps} />);
    
    const activateCard = screen.getByText('Activate Agents').closest('.cursor-pointer');
    fireEvent.click(activateCard!);
    
    const executeButton = screen.getByText('Execute Activate Agents');
    fireEvent.click(executeButton);
    
    // Should show progress bar
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles different action types correctly', () => {
    render(<BulkAgentActions {...defaultProps} />);
    
    // Test deactivate action
    const deactivateCard = screen.getByText('Deactivate Agents').closest('.cursor-pointer');
    fireEvent.click(deactivateCard!);
    
    expect(screen.getByText('This will deactivate 3 agents.')).toBeInTheDocument();
    expect(screen.getByText('Execute Deactivate Agents')).toBeInTheDocument();
  });
});