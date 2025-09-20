import React, { useState, useEffect } from 'react';
import { X, DollarSign, Plus, Minus, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import LoadingSpinner from '../../ui/LoadingSpinner';
import type { AdminUserListItem, CreditAdjustmentRequest } from '../../../types/admin';
import { adminApiService } from '../../../services/adminApiService';

interface CreditAdjustModalProps {
  user: AdminUserListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onCreditAdjusted: (user: AdminUserListItem, newBalance: number) => void;
}

interface CreditFormData {
  amount: string;
  type: 'add' | 'subtract';
  reason: string;
}

export function CreditAdjustModal({ 
  user, 
  isOpen, 
  onClose, 
  onCreditAdjusted 
}: CreditAdjustModalProps) {
  const [formData, setFormData] = useState<CreditFormData>({
    amount: '',
    type: 'add',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        amount: '',
        type: 'add',
        reason: '',
      });
      setError(null);
      setSuccess(null);
      setValidationErrors({});
    }
  }, [isOpen, user]);

  // Validate form data
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const amount = parseFloat(formData.amount);
    if (!formData.amount.trim()) {
      errors.amount = 'Amount is required';
    } else if (isNaN(amount) || amount <= 0) {
      errors.amount = 'Please enter a valid positive amount';
    } else if (amount > 10000) {
      errors.amount = 'Amount cannot exceed $10,000';
    }

    if (!formData.reason.trim()) {
      errors.reason = 'Reason is required for audit purposes';
    } else if (formData.reason.trim().length < 10) {
      errors.reason = 'Please provide a more detailed reason (minimum 10 characters)';
    }

    // Check if subtraction would result in negative balance
    if (formData.type === 'subtract' && user) {
      const currentBalance = user.credits || (user as any).credit_balance || 0;
      if (amount > currentBalance) {
        errors.amount = `Cannot subtract more than current balance ($${currentBalance.toFixed(2)})`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const amount = parseFloat(formData.amount);
      const request: CreditAdjustmentRequest = {
        userId: user.id,
        amount: amount,
        type: formData.type,
        reason: formData.reason.trim(),
      };

      const response = await adminApiService.adjustUserCredits(request);

      if (response.success && response.data) {
        const newBalance = response.data.newBalance;
        setSuccess(
          `Successfully ${formData.type === 'add' ? 'added' : 'subtracted'} $${amount.toFixed(2)}. ` +
          `New balance: $${newBalance.toFixed(2)}`
        );
        
        // Update the user in the parent component
        onCreditAdjusted(user, newBalance);

        // Close modal after a brief success message
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(response.error?.message || 'Failed to adjust credits');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust credits');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof CreditFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Handle type change
  const handleTypeChange = (type: 'add' | 'subtract') => {
    setFormData(prev => ({
      ...prev,
      type,
    }));
    
    // Clear amount validation error when type changes
    if (validationErrors.amount) {
      setValidationErrors(prev => ({
        ...prev,
        amount: '',
      }));
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Calculate new balance preview
  const getNewBalancePreview = (): number | null => {
    if (!user || !formData.amount) return null;
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount)) return null;
    
    const currentBalance = user.credits || (user as any).credit_balance || 0;
    return formData.type === 'add' 
      ? currentBalance + amount 
      : currentBalance - amount;
  };

  if (!isOpen || !user) return null;

  const newBalance = getNewBalancePreview();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Adjust Credits
              </h2>
              <p className="text-sm text-gray-500">
                Add or subtract credits for {user.name || user.email}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Success Message */}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Current Balance */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Current Balance</Label>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(user.credits || (user as any).credit_balance || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-400" />
              </div>
            </div>

            {/* Operation Type */}
            <div className="space-y-2">
              <Label>Operation Type</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={formData.type === 'add' ? 'default' : 'outline'}
                  onClick={() => handleTypeChange('add')}
                  className="flex-1"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Credits
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'subtract' ? 'default' : 'outline'}
                  onClick={() => handleTypeChange('subtract')}
                  className="flex-1"
                >
                  <Minus className="mr-2 h-4 w-4" />
                  Subtract Credits
                </Button>
              </div>
            </div>

            {/* Amount Field */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount to {formData.type === 'add' ? 'Add' : 'Subtract'} *
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10000"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  className={`pl-10 ${validationErrors.amount ? 'border-red-500' : ''}`}
                />
              </div>
              {validationErrors.amount && (
                <p className="text-xs text-red-600">{validationErrors.amount}</p>
              )}
            </div>

            {/* New Balance Preview */}
            {newBalance !== null && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-blue-900">
                    New Balance Preview
                  </Label>
                  <Badge 
                    variant={newBalance >= 0 ? 'default' : 'destructive'}
                    className="text-sm font-bold"
                  >
                    {formatCurrency(newBalance)}
                  </Badge>
                </div>
              </div>
            )}

            {/* Reason Field */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Adjustment *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                placeholder="Provide a detailed reason for this credit adjustment (required for audit trail)"
                rows={3}
                className={validationErrors.reason ? 'border-red-500' : ''}
              />
              {validationErrors.reason && (
                <p className="text-xs text-red-600">{validationErrors.reason}</p>
              )}
              <p className="text-xs text-gray-500">
                This reason will be logged in the audit trail for compliance purposes.
              </p>
            </div>

            {/* Warning for Subtraction */}
            {formData.type === 'subtract' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Subtracting credits will immediately reduce the user's available balance. 
                  This action cannot be undone automatically.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.amount || !formData.reason}
                className="min-w-[120px]"
                variant={formData.type === 'subtract' ? 'destructive' : 'default'}
              >
                {loading ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Processing...
                  </>
                ) : (
                  <>
                    {formData.type === 'add' ? (
                      <Plus className="mr-2 h-4 w-4" />
                    ) : (
                      <Minus className="mr-2 h-4 w-4" />
                    )}
                    {formData.type === 'add' ? 'Add Credits' : 'Subtract Credits'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreditAdjustModal;