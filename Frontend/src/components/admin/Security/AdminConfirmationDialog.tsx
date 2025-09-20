import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';
import { adminSecurityService } from '@/services/adminSecurityService';

export interface AdminConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  actionType: 'destructive' | 'sensitive' | 'critical';
  requirePassword?: boolean;
  requireConfirmationText?: string;
  additionalWarnings?: string[];
  resourceDetails?: {
    type: string;
    name: string;
    id: string;
  };
}

export const AdminConfirmationDialog: React.FC<AdminConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionType,
  requirePassword = false,
  requireConfirmationText,
  additionalWarnings = [],
  resourceDetails
}) => {
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getActionIcon = () => {
    switch (actionType) {
      case 'destructive':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'sensitive':
        return <Shield className="h-6 w-6 text-yellow-500" />;
      case 'critical':
        return <Lock className="h-6 w-6 text-red-600" />;
      default:
        return <Shield className="h-6 w-6 text-blue-500" />;
    }
  };

  const getActionColor = () => {
    switch (actionType) {
      case 'destructive':
        return 'destructive';
      case 'sensitive':
        return 'default';
      case 'critical':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const isConfirmationValid = () => {
    if (requirePassword && !password.trim()) {
      return false;
    }
    
    if (requireConfirmationText && confirmationText !== requireConfirmationText) {
      return false;
    }
    
    return true;
  };

  const handleConfirm = async () => {
    if (!isConfirmationValid()) {
      setError('Please complete all required fields correctly');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Log the admin action attempt
      await adminSecurityService.logAdminAction(
        'confirmation_dialog_action',
        resourceDetails?.type || 'unknown',
        resourceDetails?.id,
        {
          actionType,
          title,
          requirePassword,
          requireConfirmationText: !!requireConfirmationText
        }
      );

      // Validate password if required
      if (requirePassword) {
        await adminSecurityService.secureAdminRequest('POST', '/admin/security/validate-password', {
          password
        });
      }

      // Execute the confirmed action
      await onConfirm();
      
      // Clear form and close
      setPassword('');
      setConfirmationText('');
      onClose();
    } catch (error: any) {
      console.error('Admin action confirmation failed:', error);
      setError(error.message || 'Action failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmationText('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getActionIcon()}
            {title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resource Details */}
          {resourceDetails && (
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-700">Target Resource:</div>
              <div className="text-sm text-gray-600">
                <div>Type: {resourceDetails.type}</div>
                <div>Name: {resourceDetails.name}</div>
                <div>ID: {resourceDetails.id}</div>
              </div>
            </div>
          )}

          {/* Additional Warnings */}
          {additionalWarnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {additionalWarnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Password Confirmation */}
          {requirePassword && (
            <div className="space-y-2">
              <Label htmlFor="admin-password">
                Confirm your admin password to proceed
              </Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Text Confirmation */}
          {requireConfirmationText && (
            <div className="space-y-2">
              <Label htmlFor="confirmation-text">
                Type <code className="bg-gray-100 px-1 rounded">{requireConfirmationText}</code> to confirm
              </Label>
              <Input
                id="confirmation-text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={`Type "${requireConfirmationText}" here`}
              />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={getActionColor()}
            onClick={handleConfirm}
            disabled={!isConfirmationValid() || isLoading}
          >
            {isLoading ? 'Processing...' : 'Confirm Action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Hook for using confirmation dialogs
export const useAdminConfirmation = () => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    props: Omit<AdminConfirmationDialogProps, 'isOpen' | 'onClose'> | null;
  }>({
    isOpen: false,
    props: null
  });

  const showConfirmation = (props: Omit<AdminConfirmationDialogProps, 'isOpen' | 'onClose'>) => {
    return new Promise<void>((resolve, reject) => {
      setDialogState({
        isOpen: true,
        props: {
          ...props,
          onConfirm: async () => {
            try {
              await props.onConfirm();
              resolve();
            } catch (error) {
              reject(error);
            }
          }
        }
      });
    });
  };

  const closeConfirmation = () => {
    setDialogState({
      isOpen: false,
      props: null
    });
  };

  const ConfirmationDialog = () => {
    if (!dialogState.props) return null;

    return (
      <AdminConfirmationDialog
        {...dialogState.props}
        isOpen={dialogState.isOpen}
        onClose={closeConfirmation}
      />
    );
  };

  return {
    showConfirmation,
    ConfirmationDialog
  };
};