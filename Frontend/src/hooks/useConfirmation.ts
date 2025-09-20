import { useState, useCallback } from 'react';

export interface ConfirmationOptions {
  /** Dialog title */
  title: string;
  /** Dialog description */
  description: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Type of destructive action */
  type?: 'delete' | 'remove' | 'disable' | 'reset' | 'warning';
  /** Additional details to show */
  details?: string;
}

export interface ConfirmationState {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Current confirmation options */
  options: ConfirmationOptions | null;
  /** Whether an action is loading */
  loading: boolean;
}

/**
 * Hook for managing confirmation dialogs
 * Provides a simple way to show confirmation dialogs and handle user responses
 */
export const useConfirmation = () => {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    options: null,
    loading: false,
  });

  const [resolvePromise, setResolvePromise] = useState<((confirmed: boolean) => void) | null>(null);

  /**
   * Show a confirmation dialog
   * Returns a promise that resolves to true if confirmed, false if cancelled
   */
  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        loading: false,
      });
      setResolvePromise(() => resolve);
    });
  }, []);

  /**
   * Handle user confirmation
   */
  const handleConfirm = useCallback(() => {
    setState(prev => ({ ...prev, loading: true }));
    
    // Small delay to show loading state
    setTimeout(() => {
      if (resolvePromise) {
        resolvePromise(true);
        setResolvePromise(null);
      }
      setState({
        isOpen: false,
        options: null,
        loading: false,
      });
    }, 100);
  }, [resolvePromise]);

  /**
   * Handle user cancellation
   */
  const handleCancel = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
    setState({
      isOpen: false,
      options: null,
      loading: false,
    });
  }, [resolvePromise]);

  /**
   * Close the dialog (same as cancel)
   */
  const close = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  return {
    // State
    isOpen: state.isOpen,
    options: state.options,
    loading: state.loading,
    
    // Actions
    confirm,
    handleConfirm,
    handleCancel,
    close,
  };
};

/**
 * Predefined confirmation dialogs for common operations
 */
export const confirmationPresets = {
  deleteAgent: (agentName: string): ConfirmationOptions => ({
    title: 'Delete Agent',
    description: `Are you sure you want to delete "${agentName}"?`,
    details: 'This action cannot be undone. All associated call history will be preserved, but the agent configuration will be permanently removed.',
    confirmText: 'Delete Agent',
    cancelText: 'Cancel',
    type: 'delete',
  }),

  deleteContact: (contactName: string): ConfirmationOptions => ({
    title: 'Delete Contact',
    description: `Are you sure you want to delete "${contactName}"?`,
    details: 'This action cannot be undone. The contact will be removed from all campaigns and lists.',
    confirmText: 'Delete Contact',
    cancelText: 'Cancel',
    type: 'delete',
  }),

  deleteMultipleContacts: (count: number): ConfirmationOptions => ({
    title: 'Delete Multiple Contacts',
    description: `Are you sure you want to delete ${count} contacts?`,
    details: 'This action cannot be undone. All selected contacts will be permanently removed.',
    confirmText: `Delete ${count} Contacts`,
    cancelText: 'Cancel',
    type: 'delete',
  }),

  resetAgentSettings: (agentName: string): ConfirmationOptions => ({
    title: 'Reset Agent Settings',
    description: `Reset all settings for "${agentName}" to default values?`,
    details: 'This will restore the agent to its original configuration. Custom prompts and voice settings will be lost.',
    confirmText: 'Reset Settings',
    cancelText: 'Cancel',
    type: 'reset',
  }),

  disableAgent: (agentName: string): ConfirmationOptions => ({
    title: 'Disable Agent',
    description: `Disable "${agentName}"?`,
    details: 'The agent will stop making calls and become inactive. You can re-enable it later.',
    confirmText: 'Disable Agent',
    cancelText: 'Cancel',
    type: 'disable',
  }),

  clearCallHistory: (): ConfirmationOptions => ({
    title: 'Clear Call History',
    description: 'Are you sure you want to clear all call history?',
    details: 'This action cannot be undone. All call records, transcripts, and analytics data will be permanently deleted.',
    confirmText: 'Clear History',
    cancelText: 'Cancel',
    type: 'delete',
  }),

  cancelSubscription: (): ConfirmationOptions => ({
    title: 'Cancel Subscription',
    description: 'Are you sure you want to cancel your subscription?',
    details: 'Your subscription will remain active until the end of the current billing period. You can reactivate it at any time.',
    confirmText: 'Cancel Subscription',
    cancelText: 'Keep Subscription',
    type: 'warning',
  }),
};