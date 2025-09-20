import { toast } from 'sonner';
import { CheckCircle, Trash2, UserPlus, UserMinus, Phone, CreditCard, Upload, Download, Settings, Eye, Edit3, Copy } from 'lucide-react';

/**
 * Success feedback utility for providing consistent success notifications
 * and visual feedback across the application
 */

export interface SuccessOptions {
  /** Custom message to display */
  message?: string;
  /** Duration in milliseconds (default: 4000) */
  duration?: number;
  /** Show action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Custom icon */
  icon?: React.ReactNode;
  /** Additional description */
  description?: string;
}

export interface ConfirmationOptions {
  /** Title of the confirmation dialog */
  title: string;
  /** Description of the action */
  description: string;
  /** Confirm button text (default: "Confirm") */
  confirmText?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Type of destructive action */
  type?: 'delete' | 'remove' | 'disable' | 'reset';
}

/**
 * Success feedback for different types of operations
 */
export const successFeedback = {
  // Agent operations
  agent: {
    created: (agentName?: string, options?: SuccessOptions) => {
      toast.success(
        options?.message || `Agent "${agentName || 'New agent'}" created successfully`,
        {
          icon: <UserPlus className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || 'Your AI agent is ready to start making calls',
          action: options?.action,
        }
      );
    },
    
    updated: (agentName?: string, options?: SuccessOptions) => {
      toast.success(
        options?.message || `Agent "${agentName || 'Agent'}" updated successfully`,
        {
          icon: <Edit3 className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || 'Changes have been saved',
          action: options?.action,
        }
      );
    },
    
    deleted: (agentName?: string, options?: SuccessOptions) => {
      toast.success(
        options?.message || `Agent "${agentName || 'Agent'}" deleted successfully`,
        {
          icon: <Trash2 className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || 'Agent has been permanently removed',
          action: options?.action,
        }
      );
    },
    
    tested: (agentName?: string, options?: SuccessOptions) => {
      toast.success(
        options?.message || `Agent "${agentName || 'Agent'}" connection test successful`,
        {
          icon: <CheckCircle className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || 'Agent is ready to make calls',
          action: options?.action,
        }
      );
    },
  },

  // Contact operations
  contact: {
    created: (contactName?: string, options?: SuccessOptions) => {
      toast.success(
        options?.message || `Contact "${contactName || 'New contact'}" added successfully`,
        {
          icon: <UserPlus className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || 'Contact is now available for campaigns',
          action: options?.action,
        }
      );
    },
    
    updated: (contactName?: string, options?: SuccessOptions) => {
      toast.success(
        options?.message || `Contact "${contactName || 'Contact'}" updated successfully`,
        {
          icon: <Edit3 className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || 'Changes have been saved',
          action: options?.action,
        }
      );
    },
    
    deleted: (contactName?: string, options?: SuccessOptions) => {
      toast.success(
        options?.message || `Contact "${contactName || 'Contact'}" deleted successfully`,
        {
          icon: <Trash2 className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || 'Contact has been removed from your list',
          action: options?.action,
        }
      );
    },
    
    uploaded: (count: number, options?: SuccessOptions) => {
      toast.success(
        options?.message || `${count} contacts uploaded successfully`,
        {
          icon: <Upload className="h-4 w-4" />,
          duration: options?.duration || 5000,
          description: options?.description || 'All contacts are now available for campaigns',
          action: options?.action,
        }
      );
    },
    
    exported: (count: number, options?: SuccessOptions) => {
      toast.success(
        options?.message || `${count} contacts exported successfully`,
        {
          icon: <Download className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || 'File has been downloaded to your device',
          action: options?.action,
        }
      );
    },
  },

  // Call operations
  call: {
    initiated: (phoneNumber?: string, options?: SuccessOptions) => {
      toast.success(
        options?.message || `Call initiated to ${phoneNumber || 'contact'}`,
        {
          icon: <Phone className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || 'Your AI agent is now calling',
          action: options?.action,
        }
      );
    },
    
    completed: (duration?: string, options?: SuccessOptions) => {
      toast.success(
        options?.message || `Call completed successfully`,
        {
          icon: <CheckCircle className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || duration ? `Duration: ${duration}` : 'Call has been recorded and processed',
          action: options?.action,
        }
      );
    },
  },

  // Billing operations
  billing: {
    creditsPurchased: (amount: number, options?: SuccessOptions) => {
      toast.success(
        options?.message || `${amount} credits purchased successfully`,
        {
          icon: <CreditCard className="h-4 w-4" />,
          duration: options?.duration || 5000,
          description: options?.description || 'Credits have been added to your account',
          action: options?.action,
        }
      );
    },
    
    paymentProcessed: (options?: SuccessOptions) => {
      toast.success(
        options?.message || 'Payment processed successfully',
        {
          icon: <CheckCircle className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || 'Your transaction has been completed',
          action: options?.action,
        }
      );
    },
  },

  // Data operations
  data: {
    saved: (options?: SuccessOptions) => {
      toast.success(
        options?.message || 'Data saved successfully',
        {
          icon: <CheckCircle className="h-4 w-4" />,
          duration: options?.duration || 3000,
          description: options?.description || 'Your changes have been saved',
          action: options?.action,
        }
      );
    },
    
    loaded: (options?: SuccessOptions) => {
      toast.success(
        options?.message || 'Data loaded successfully',
        {
          icon: <CheckCircle className="h-4 w-4" />,
          duration: options?.duration || 3000,
          description: options?.description || 'Latest data has been retrieved',
          action: options?.action,
        }
      );
    },
    
    refreshed: (options?: SuccessOptions) => {
      toast.success(
        options?.message || 'Data refreshed successfully',
        {
          icon: <CheckCircle className="h-4 w-4" />,
          duration: options?.duration || 3000,
          description: options?.description || 'You are viewing the latest information',
          action: options?.action,
        }
      );
    },
    
    copied: (options?: SuccessOptions) => {
      toast.success(
        options?.message || 'Copied to clipboard',
        {
          icon: <Copy className="h-4 w-4" />,
          duration: options?.duration || 2000,
          description: options?.description,
          action: options?.action,
        }
      );
    },
  },

  // Settings operations
  settings: {
    updated: (options?: SuccessOptions) => {
      toast.success(
        options?.message || 'Settings updated successfully',
        {
          icon: <Settings className="h-4 w-4" />,
          duration: options?.duration || 4000,
          description: options?.description || 'Your preferences have been saved',
          action: options?.action,
        }
      );
    },
  },

  // Generic success
  generic: (message: string, options?: SuccessOptions) => {
    toast.success(message, {
      icon: options?.icon || <CheckCircle className="h-4 w-4" />,
      duration: options?.duration || 4000,
      description: options?.description,
      action: options?.action,
    });
  },
};

/**
 * Show confirmation dialog for destructive actions
 * Returns a promise that resolves to true if confirmed, false if cancelled
 */
export const showConfirmation = (options: ConfirmationOptions): Promise<boolean> => {
  return new Promise((resolve) => {
    const getIcon = () => {
      switch (options.type) {
        case 'delete':
        case 'remove':
          return <Trash2 className="h-4 w-4 text-destructive" />;
        case 'disable':
          return <UserMinus className="h-4 w-4 text-warning" />;
        case 'reset':
          return <Settings className="h-4 w-4 text-warning" />;
        default:
          return <CheckCircle className="h-4 w-4 text-warning" />;
      }
    };

    toast(options.title, {
      description: options.description,
      icon: getIcon(),
      duration: Infinity, // Keep open until user responds
      action: {
        label: options.confirmText || 'Confirm',
        onClick: () => resolve(true),
      },
      cancel: {
        label: options.cancelText || 'Cancel',
        onClick: () => resolve(false),
      },
    });
  });
};

/**
 * Visual feedback for form submissions and loading states
 */
export const visualFeedback = {
  /**
   * Show loading state with optional message
   */
  loading: (message: string = 'Processing...', options?: { duration?: number }) => {
    return toast.loading(message, {
      duration: options?.duration || Infinity,
    });
  },

  /**
   * Update existing toast to success state
   */
  updateToSuccess: (toastId: string | number, message: string, options?: SuccessOptions) => {
    toast.success(message, {
      id: toastId,
      icon: options?.icon || <CheckCircle className="h-4 w-4" />,
      duration: options?.duration || 4000,
      description: options?.description,
      action: options?.action,
    });
  },

  /**
   * Dismiss a specific toast
   */
  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss();
  },
};

/**
 * Utility for chaining operations with success feedback
 */
export const withSuccessFeedback = async <T,>(
  operation: () => Promise<T>,
  successMessage: string,
  options?: SuccessOptions & { loadingMessage?: string }
): Promise<T> => {
  const loadingToast = visualFeedback.loading(options?.loadingMessage || 'Processing...');
  
  try {
    const result = await operation();
    visualFeedback.updateToSuccess(loadingToast, successMessage, options);
    return result;
  } catch (error) {
    visualFeedback.dismiss(loadingToast);
    throw error; // Re-throw to let error handler deal with it
  }
};