import React, { useState } from 'react';
import { Users } from 'lucide-react';
import UserList from './UserList';
import UserDetails from './UserDetails';
import UserEditModal from './UserEditModal';
import CreditAdjustModal from './CreditAdjustModal';
import UserStatusToggle from './UserStatusToggle';
import type { AdminUserListItem } from '../../../types/admin';

export function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);
  const [creditAdjustUser, setCreditAdjustUser] = useState<AdminUserListItem | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  // Handle user selection for details view
  const handleUserSelect = (user: AdminUserListItem) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  // Handle user edit
  const handleUserEdit = (user: AdminUserListItem) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  // Handle credit adjustment
  const handleCreditAdjust = (user: AdminUserListItem) => {
    setCreditAdjustUser(user);
    setShowCreditModal(true);
  };

  // Handle user status toggle
  const handleUserStatusToggle = (user: AdminUserListItem) => {
    // The UserStatusToggle component handles the actual toggle
    // This is just for consistency with the interface
    console.log('Status toggle for user:', user.id);
  };

  // Handle user updated
  const handleUserUpdated = (updatedUser: AdminUserListItem) => {
    // Update the selected user if it's the same one
    if (selectedUser && selectedUser.id === updatedUser.id) {
      setSelectedUser(updatedUser);
    }
    
    // Close the edit modal
    setShowEditModal(false);
    setEditingUser(null);
  };

  // Handle credit adjusted
  const handleCreditAdjusted = (user: AdminUserListItem, newBalance: number) => {
    // Update the selected user if it's the same one
    if (selectedUser && selectedUser.id === user.id) {
      setSelectedUser({
        ...selectedUser,
        credits: newBalance,
      });
    }
    
    // Close the credit modal
    setShowCreditModal(false);
    setCreditAdjustUser(null);
  };

  // Handle status changed
  const handleStatusChanged = (updatedUser: AdminUserListItem, newStatus: boolean) => {
    // Update the selected user if it's the same one
    if (selectedUser && selectedUser.id === updatedUser.id) {
      setSelectedUser({
        ...selectedUser,
        isActive: newStatus,
      });
    }
  };

  // Close modals
  const closeUserDetails = () => {
    setShowUserDetails(false);
    setSelectedUser(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const closeCreditModal = () => {
    setShowCreditModal(false);
    setCreditAdjustUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <Users className="h-8 w-8 text-teal-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">
              Manage platform users, their access, and account settings
            </p>
          </div>
        </div>
      </div>

      {/* User List */}
      <UserList
        onUserSelect={handleUserSelect}
        onUserEdit={handleUserEdit}
        onCreditAdjust={handleCreditAdjust}
        onUserStatusToggle={handleUserStatusToggle}
      />

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetails
          user={selectedUser}
          isOpen={showUserDetails}
          onClose={closeUserDetails}
          onEdit={handleUserEdit}
          onCreditAdjust={handleCreditAdjust}
        />
      )}

      {/* User Edit Modal */}
      {editingUser && (
        <UserEditModal
          user={editingUser}
          isOpen={showEditModal}
          onClose={closeEditModal}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {/* Credit Adjust Modal */}
      {creditAdjustUser && (
        <CreditAdjustModal
          user={creditAdjustUser}
          isOpen={showCreditModal}
          onClose={closeCreditModal}
          onCreditAdjusted={handleCreditAdjusted}
        />
      )}
    </div>
  );
}

export default UserManagement;