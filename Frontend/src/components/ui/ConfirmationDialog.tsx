import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';
import { Trash2, UserMinus, Settings, AlertTriangle } from 'lucide-react';

export interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Function to call when dialog state changes */
  onOpenChange: (open: boolean) => void;
  /** Function to call when user confirms */
  onConfirm: () => void;
  /** Dialog title */
  title: string;
  /** Dialog description */
  description: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Type of destructive action for appropriate styling and icon */
  type?: 'delete' | 'remove' | 'disable' | 'reset' | 'warning';
  /** Whether the action is loading */
  loading?: boolean;
  /** Additional details to show */
  details?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  loading = false,
  details,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'delete':
      case 'remove':
        return <Trash2 className="h-6 w-6 text-destructive" />;
      case 'disable':
        return <UserMinus className="h-6 w-6 text-orange-500" />;
      case 'reset':
        return <Settings className="h-6 w-6 text-orange-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-orange-500" />;
    }
  };

  const getConfirmButtonVariant = () => {
    switch (type) {
      case 'delete':
      case 'remove':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle className="text-left">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            {description}
            {details && (
              <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                {details}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={
              getConfirmButtonVariant() === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
            }
          >
            {loading ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationDialog;