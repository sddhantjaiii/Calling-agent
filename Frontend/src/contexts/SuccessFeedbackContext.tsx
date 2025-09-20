import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { successFeedback, visualFeedback, withSuccessFeedback, SuccessOptions } from '../utils/successFeedback';
import { useConfirmation, ConfirmationOptions } from '../hooks/useConfirmation';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

interface SuccessFeedbackContextType {
  // Success feedback methods
  showSuccess: typeof successFeedback;
  
  // Visual feedback methods
  showLoading: typeof visualFeedback.loading;
  updateToSuccess: typeof visualFeedback.updateToSuccess;
  dismiss: typeof visualFeedback.dismiss;
  dismissAll: typeof visualFeedback.dismissAll;
  
  // Confirmation methods
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  
  // Utility methods
  withSuccess: typeof withSuccessFeedback;
}

const SuccessFeedbackContext = createContext<SuccessFeedbackContextType | undefined>(undefined);

interface SuccessFeedbackProviderProps {
  children: ReactNode;
}

export const SuccessFeedbackProvider: React.FC<SuccessFeedbackProviderProps> = ({ children }) => {
  const confirmation = useConfirmation();

  const contextValue: SuccessFeedbackContextType = {
    // Success feedback methods
    showSuccess: successFeedback,
    
    // Visual feedback methods
    showLoading: visualFeedback.loading,
    updateToSuccess: visualFeedback.updateToSuccess,
    dismiss: visualFeedback.dismiss,
    dismissAll: visualFeedback.dismissAll,
    
    // Confirmation methods
    confirm: confirmation.confirm,
    
    // Utility methods
    withSuccess: withSuccessFeedback,
  };

  return (
    <SuccessFeedbackContext.Provider value={contextValue}>
      {children}
      
      {/* Confirmation Dialog */}
      {confirmation.options && (
        <ConfirmationDialog
          open={confirmation.isOpen}
          onOpenChange={(open) => !open && confirmation.handleCancel()}
          onConfirm={confirmation.handleConfirm}
          title={confirmation.options.title}
          description={confirmation.options.description}
          confirmText={confirmation.options.confirmText}
          cancelText={confirmation.options.cancelText}
          type={confirmation.options.type}
          details={confirmation.options.details}
          loading={confirmation.loading}
        />
      )}
    </SuccessFeedbackContext.Provider>
  );
};

/**
 * Hook to use success feedback functionality
 */
export const useSuccessFeedback = (): SuccessFeedbackContextType => {
  const context = useContext(SuccessFeedbackContext);
  if (!context) {
    throw new Error('useSuccessFeedback must be used within a SuccessFeedbackProvider');
  }
  return context;
};

/**
 * Higher-order component to wrap components with success feedback
 */
export const withSuccessFeedbackProvider = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => (
    <SuccessFeedbackProvider>
      <Component {...props} />
    </SuccessFeedbackProvider>
  );
};