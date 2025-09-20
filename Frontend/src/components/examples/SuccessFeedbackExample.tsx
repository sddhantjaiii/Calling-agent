import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { useSuccessFeedback } from '../../contexts/SuccessFeedbackContext';
import { confirmationPresets } from '../../hooks/useConfirmation';

/**
 * Example component demonstrating success feedback functionality
 * This shows how to use toast notifications, confirmations, and visual feedback
 */
const SuccessFeedbackExample: React.FC = () => {
  const { showSuccess, confirm, withSuccess, showLoading, updateToSuccess } = useSuccessFeedback();
  const [isLoading, setIsLoading] = useState(false);

  // Simulate async operations
  const simulateAsyncOperation = (duration: number = 2000): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(resolve, duration);
    });
  };

  // Example: Basic success notifications
  const handleBasicSuccess = () => {
    showSuccess.generic('Operation completed successfully!');
  };

  const handleAgentCreated = () => {
    showSuccess.agent.created('My Test Agent', {
      description: 'Agent is configured and ready to make calls',
      action: {
        label: 'View Agent',
        onClick: () => console.log('Navigate to agent details'),
      },
    });
  };

  const handleContactUploaded = () => {
    showSuccess.contact.uploaded(25, {
      description: 'All contacts have been validated and added to your list',
      action: {
        label: 'View Contacts',
        onClick: () => console.log('Navigate to contacts'),
      },
    });
  };

  const handleCreditsPurchased = () => {
    showSuccess.billing.creditsPurchased(1000, {
      description: 'Credits are now available for use',
      action: {
        label: 'View Balance',
        onClick: () => console.log('Navigate to billing'),
      },
    });
  };

  // Example: Confirmation dialogs
  const handleDeleteAgent = async () => {
    const confirmed = await confirm(confirmationPresets.deleteAgent('Test Agent'));
    if (confirmed) {
      showSuccess.agent.deleted('Test Agent');
    }
  };

  const handleDeleteContacts = async () => {
    const confirmed = await confirm(confirmationPresets.deleteMultipleContacts(5));
    if (confirmed) {
      showSuccess.contact.deleted('5 contacts');
    }
  };

  const handleResetSettings = async () => {
    const confirmed = await confirm(confirmationPresets.resetAgentSettings('Test Agent'));
    if (confirmed) {
      showSuccess.settings.updated({
        message: 'Agent settings reset successfully',
        description: 'All settings have been restored to default values',
      });
    }
  };

  // Example: Loading states with success feedback
  const handleAsyncOperation = async () => {
    setIsLoading(true);
    try {
      await withSuccess(
        () => simulateAsyncOperation(3000),
        'Data synchronized successfully!',
        {
          loadingMessage: 'Synchronizing data...',
          description: 'All your data is now up to date',
        }
      );
    } catch (error) {
      console.error('Operation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Example: Manual loading toast management
  const handleManualLoading = async () => {
    const loadingToast = showLoading('Processing your request...');
    
    try {
      await simulateAsyncOperation(2000);
      updateToSuccess(loadingToast, 'Request processed successfully!', {
        description: 'Your changes have been applied',
      });
    } catch (error) {
      // Error would be handled by error boundary/handler
      console.error('Operation failed:', error);
    }
  };

  // Example: Copy to clipboard feedback
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText('Sample text copied to clipboard');
      showSuccess.data.copied({
        message: 'Text copied to clipboard',
        description: 'You can now paste it anywhere',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Success Feedback Examples</h2>
        <p className="text-muted-foreground">
          Demonstration of success notifications, confirmations, and visual feedback
        </p>
      </div>

      {/* Basic Success Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Success Notifications</CardTitle>
          <CardDescription>
            Show success messages for completed operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleBasicSuccess} variant="outline">
              Generic Success
            </Button>
            <Button onClick={handleAgentCreated} variant="outline">
              Agent Created
            </Button>
            <Button onClick={handleContactUploaded} variant="outline">
              Contacts Uploaded
            </Button>
            <Button onClick={handleCreditsPurchased} variant="outline">
              Credits Purchased
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Confirmation Dialogs */}
      <Card>
        <CardHeader>
          <CardTitle>Confirmation Dialogs</CardTitle>
          <CardDescription>
            Show confirmation dialogs for destructive operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleDeleteAgent} variant="destructive">
              Delete Agent
            </Button>
            <Button onClick={handleDeleteContacts} variant="destructive">
              Delete Contacts
            </Button>
            <Button onClick={handleResetSettings} variant="outline">
              Reset Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States & Async Operations</CardTitle>
          <CardDescription>
            Show loading indicators and success feedback for async operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={handleAsyncOperation} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Processing...' : 'Async with Success'}
            </Button>
            <Button onClick={handleManualLoading} variant="outline">
              Manual Loading Toast
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Utility Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Utility Actions</CardTitle>
          <CardDescription>
            Common utility actions with success feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleCopyToClipboard} variant="outline">
              Copy to Clipboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuccessFeedbackExample;