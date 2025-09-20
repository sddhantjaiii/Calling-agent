import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import LoadingSpinner from '../../ui/LoadingSpinner';
import type { AdminUserListItem } from '../../../types/admin';
import { adminApiService } from '../../../services/adminApiService';

interface UserEditModalProps {
  user: AdminUserListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: AdminUserListItem) => void;
}

interface UserFormData {
  name: string;
  email: string;
  isActive: boolean;
  phone?: string;
  subscriptionTier?: string;
}

export function UserEditModal({ 
  user, 
  isOpen, 
  onClose, 
  onUserUpdated 
}: UserEditModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    isActive: true,
    phone: '',
    subscriptionTier: 'free',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        isActive: (user as any).is_active ?? user.isActive ?? true,
        phone: user.phone || '',
        subscriptionTier: user.subscriptionTier || 'free',
      });
      setError(null);
      setSuccess(false);
      setValidationErrors({});
    }
  }, [user]);

  // Validate form data
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
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
      setSuccess(false);

      const response = await adminApiService.updateUser(user.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        isActive: formData.isActive,
        phone: formData.phone?.trim() || undefined,
        subscriptionTier: formData.subscriptionTier,
      });

      if (response.success && response.data) {
        setSuccess(true);
        
        // Update the user in the parent component
        const updatedUser: AdminUserListItem = {
          ...user,
          ...response.data,
        };
        onUserUpdated(updatedUser);

        // Close modal after a brief success message
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(response.error?.message || 'Failed to update user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof UserFormData, value: string | boolean) => {
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

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Edit User
              </h2>
              <p className="text-sm text-gray-500">
                Update user information and settings
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
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  User updated successfully!
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

            {/* User Role Badge */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">User Role</Label>
                <p className="text-xs text-gray-500">
                  Role cannot be changed from the admin panel
                </p>
              </div>
              <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                {user.role?.toUpperCase()}
              </Badge>
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                className={validationErrors.name ? 'border-red-500' : ''}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-600">{validationErrors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className={validationErrors.email ? 'border-red-500' : ''}
              />
              {validationErrors.email && (
                <p className="text-xs text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number (optional)"
                className={validationErrors.phone ? 'border-red-500' : ''}
              />
              {validationErrors.phone && (
                <p className="text-xs text-red-600">{validationErrors.phone}</p>
              )}
            </div>

            {/* Subscription Tier */}
            <div className="space-y-2">
              <Label htmlFor="subscriptionTier">Subscription Tier</Label>
              <select
                id="subscriptionTier"
                value={formData.subscriptionTier}
                onChange={(e) => handleInputChange('subscriptionTier', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Account Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Account Status</Label>
                <p className="text-xs text-gray-500">
                  Enable or disable user access to the platform
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Badge variant={formData.isActive ? 'default' : 'secondary'}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* User Statistics (Read-only) */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">User Statistics</Label>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{user.agentCount || (user as any).agent_count || 0}</p>
                  <p className="text-xs text-gray-500">Agents</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{user.callCount || (user as any).call_count || 0}</p>
                  <p className="text-xs text-gray-500">Calls</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    ${(user.creditsUsed || (user as any).credits_used || user.credits || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Credits Used</p>
                </div>
              </div>
            </div>

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
                disabled={loading}
                className="min-w-[100px]"
              >
                {loading ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
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

export default UserEditModal;