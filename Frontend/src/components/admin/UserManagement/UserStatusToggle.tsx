import React, { useState } from 'react';
import { UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/alert-dialog';
import LoadingSpinner from '../../ui/LoadingSpinner';
import type { AdminUserListItem } from '../../../types/admin';
import { adminApiService } from '../../../services/adminApiService';

interface UserStatusToggleProps {
  user: AdminUserListItem;
  onStatusChanged: (user: AdminUserListItem, newStatus: boolean) => void;
  variant?: 'switch' | 'button';
  size?: 'sm' | 'md' | 'lg';
}

export function UserStatusToggle({ 
  user, 
  onStatusChanged, 
  variant = 'switch',
  size = 'md'
}: UserStatusToggleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle status toggle
  const handleStatusToggle = async (newStatus: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApiService.toggleUserStatus(user.id, newStatus);

      if (response.success && response.data) {
        // Update the user status in the parent component
        const updatedUser: AdminUserListItem = {
          ...user,
          isActive: newStatus,
        };
        onStatusChanged(updatedUser, newStatus);
      } else {
        throw new Error(response.error?.message || 'Failed to update user status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
      console.error('Error updating user status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get status info
  const getStatusInfo = () => {
    if (user.isActive) {
      return {
        label: 'Active',
        color: 'default' as const,
        icon: UserCheck,
        description: 'User has full access to the platform',
      };
    } else {
      return {
        label: 'Inactive',
        color: 'secondary' as const,
        icon: UserX,
        description: 'User access is disabled',
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Switch variant
  if (variant === 'switch') {
    return (
      <div className="flex items-center space-x-3">
        <Switch
          checked={user.isActive}
          onCheckedChange={handleStatusToggle}
          disabled={loading}
        />
        <div className="flex items-center space-x-2">
          <Badge variant={statusInfo.color}>
            {loading ? (
              <LoadingSpinner className="mr-1 h-3 w-3" />
            ) : (
              <StatusIcon className="mr-1 h-3 w-3" />
            )}
            {statusInfo.label}
          </Badge>
          {error && (
            <span className="text-xs text-red-600" title={error}>
              Error
            </span>
          )}
        </div>
      </div>
    );
  }

  // Button variant with confirmation dialog
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={user.isActive ? "destructive" : "default"}
          size={size}
          disabled={loading}
        >
          {loading ? (
            <LoadingSpinner className="mr-2 h-4 w-4" />
          ) : user.isActive ? (
            <UserX className="mr-2 h-4 w-4" />
          ) : (
            <UserCheck className="mr-2 h-4 w-4" />
          )}
          {user.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
            {user.isActive ? 'Deactivate User' : 'Activate User'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to {user.isActive ? 'deactivate' : 'activate'}{' '}
              <strong>{user.name || user.email}</strong>?
            </p>
            
            {user.isActive ? (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Deactivating this user will:</strong>
                </p>
                <ul className="text-sm text-red-700 mt-1 space-y-1">
                  <li>• Prevent them from logging into the platform</li>
                  <li>• Stop all their active agents from making calls</li>
                  <li>• Disable access to their dashboard and data</li>
                  <li>• Preserve their data for potential reactivation</li>
                </ul>
              </div>
            ) : (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Activating this user will:</strong>
                </p>
                <ul className="text-sm text-green-700 mt-1 space-y-1">
                  <li>• Restore their access to the platform</li>
                  <li>• Allow them to use their agents again</li>
                  <li>• Enable full dashboard functionality</li>
                  <li>• Resume normal platform operations</li>
                </ul>
              </div>
            )}

            {/* User Stats */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-2">User Statistics:</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{user.agentCount}</p>
                  <p className="text-xs text-gray-500">Agents</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{user.callCount}</p>
                  <p className="text-xs text-gray-500">Calls</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    ${user.creditsUsed.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Credits Used</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {error}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleStatusToggle(!user.isActive)}
            className={user.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {loading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              <>
                {user.isActive ? (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    Deactivate User
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Activate User
                  </>
                )}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default UserStatusToggle;