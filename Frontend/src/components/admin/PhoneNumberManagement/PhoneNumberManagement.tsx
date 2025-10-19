import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Phone, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  UserCheck, 
  UserX,
  Power,
  PowerOff,
  Eye,
  Users
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { toast } from 'sonner';
import { adminApiService } from '../../../services/adminApiService';
import type { PhoneNumber, PhoneNumberStats, AssignableUser } from '../../../types/admin';
import Pagination from '../../ui/pagination';

interface PhoneNumberManagementProps {
  className?: string;
}

interface PhoneNumberFormData {
  name: string;
  phone_number: string;
  elevenlabs_phone_number_id: string;
  assigned_to_user_id: string | null;
}

const PhoneNumberManagement: React.FC<PhoneNumberManagementProps> = ({ className = '' }) => {
  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<PhoneNumber | null>(null);
  const [formData, setFormData] = useState<PhoneNumberFormData>({
    name: '',
    phone_number: '',
    elevenlabs_phone_number_id: '',
    assigned_to_user_id: null,
  });

  const queryClient = useQueryClient();
  const itemsPerPage = 10;

  // Queries
  const {
    data: phoneNumbersData,
    isLoading: isLoadingPhoneNumbers,
    error: phoneNumbersError
  } = useQuery({
    queryKey: ['admin-phone-numbers', currentPage, searchTerm, statusFilter, assignmentFilter],
    queryFn: () => adminApiService.getPhoneNumbers(currentPage, itemsPerPage, {
      search: searchTerm || undefined,
      is_active: statusFilter === 'all' ? undefined : statusFilter,
      assigned_to: assignmentFilter === 'all' ? undefined : assignmentFilter,
    }),
    staleTime: 30000, // 30 seconds
  });

  const {
    data: statsData,
    isLoading: isLoadingStats
  } = useQuery({
    queryKey: ['admin-phone-number-stats'],
    queryFn: () => adminApiService.getPhoneNumberStats(),
    staleTime: 60000, // 1 minute
  });

  const {
    data: assignableUsersData,
    isLoading: isLoadingUsers
  } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => adminApiService.getAssignableUsers(),
    staleTime: 300000, // 5 minutes
    enabled: isCreateDialogOpen || isEditDialogOpen || isAssignDialogOpen,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: PhoneNumberFormData) => adminApiService.createPhoneNumber(data),
    onSuccess: () => {
      toast.success('Phone number created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-phone-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-phone-number-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create phone number');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PhoneNumberFormData> }) =>
      adminApiService.updatePhoneNumber(id, data),
    onSuccess: () => {
      toast.success('Phone number updated successfully');
      setIsEditDialogOpen(false);
      setSelectedPhoneNumber(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-phone-numbers'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update phone number');
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string | null }) =>
      adminApiService.assignPhoneNumber(id, userId),
    onSuccess: () => {
      toast.success('Phone number assignment updated successfully');
      setIsAssignDialogOpen(false);
      setSelectedPhoneNumber(null);
      queryClient.invalidateQueries({ queryKey: ['admin-phone-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-phone-number-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update assignment');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      adminApiService.togglePhoneNumberStatus(id, activate),
    onSuccess: (_, variables) => {
      toast.success(`Phone number ${variables.activate ? 'activated' : 'deactivated'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-phone-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-phone-number-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update phone number status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApiService.deletePhoneNumber(id),
    onSuccess: () => {
      toast.success('Phone number deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-phone-numbers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-phone-number-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete phone number');
    },
  });

  // Handlers
  const resetForm = () => {
    setFormData({
      name: '',
      phone_number: '',
      elevenlabs_phone_number_id: '',
      assigned_to_user_id: null,
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.phone_number || !formData.elevenlabs_phone_number_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    const submitData = {
      ...formData,
      assigned_to_user_id: formData.assigned_to_user_id === 'unassigned' ? null : formData.assigned_to_user_id,
    };
    createMutation.mutate(submitData);
  };

  const handleEdit = (phoneNumber: PhoneNumber) => {
    setSelectedPhoneNumber(phoneNumber);
    setFormData({
      name: phoneNumber.name,
      phone_number: phoneNumber.phone_number,
      elevenlabs_phone_number_id: phoneNumber.elevenlabs_phone_number_id,
      assigned_to_user_id: phoneNumber.assigned_to_user_id,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedPhoneNumber || !formData.name || !formData.phone_number || !formData.elevenlabs_phone_number_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    const submitData = {
      ...formData,
      assigned_to_user_id: formData.assigned_to_user_id === 'unassigned' ? null : formData.assigned_to_user_id,
    };
    updateMutation.mutate({
      id: selectedPhoneNumber.id,
      data: submitData,
    });
  };

  const handleAssign = (phoneNumber: PhoneNumber) => {
    setSelectedPhoneNumber(phoneNumber);
    setIsAssignDialogOpen(true);
  };

  const handleAssignSubmit = (userId: string | null) => {
    if (!selectedPhoneNumber) return;
    const actualUserId = userId === 'unassign' ? null : userId;
    assignMutation.mutate({
      id: selectedPhoneNumber.id,
      userId: actualUserId,
    });
  };

  const handleToggleActive = (phoneNumber: PhoneNumber) => {
    toggleActiveMutation.mutate({
      id: phoneNumber.id,
      activate: !phoneNumber.is_active,
    });
  };

  const handleDelete = (phoneNumber: PhoneNumber) => {
    if (window.confirm(`Are you sure you want to delete "${phoneNumber.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(phoneNumber.id);
    }
  };

  const phoneNumbers = phoneNumbersData?.data || [];
  const pagination = phoneNumbersData?.pagination;
  const stats = statsData?.data || null;
  const assignableUsers = assignableUsersData?.data || [];

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, assignmentFilter]);

  if (phoneNumbersError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading phone numbers: {(phoneNumbersError as Error).message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phone Number Management</h1>
          <p className="text-gray-600 mt-1">
            Manage phone numbers for batch calling functionality
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Phone Number
            </Button>
          </DialogTrigger>
          <CreatePhoneNumberDialog
            formData={formData}
            setFormData={setFormData}
            assignableUsers={assignableUsers}
            isLoading={createMutation.isPending}
            onSubmit={handleCreate}
            onCancel={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}
          />
        </Dialog>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Numbers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
              <div className="text-sm text-gray-600">Inactive</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
              <div className="text-sm text-gray-600">Assigned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.unassigned}</div>
              <div className="text-sm text-gray-600">Unassigned</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or phone number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assignment">Assignment</Label>
              <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All assignments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignments</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setAssignmentFilter('all');
                }}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone Numbers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>ElevenLabs ID</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPhoneNumbers ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                      <span className="ml-2">Loading phone numbers...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : phoneNumbers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No phone numbers found
                  </TableCell>
                </TableRow>
              ) : (
                phoneNumbers.map((phoneNumber) => (
                  <TableRow key={phoneNumber.id}>
                    <TableCell className="font-medium">{phoneNumber.name}</TableCell>
                    <TableCell>{phoneNumber.phone_number}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {phoneNumber.elevenlabs_phone_number_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      {phoneNumber.assigned_user_name ? (
                        <div>
                          <div className="font-medium">{phoneNumber.assigned_user_name}</div>
                          <div className="text-sm text-gray-500">{phoneNumber.assigned_user_email}</div>
                        </div>
                      ) : (
                        <Badge variant="secondary">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={phoneNumber.is_active ? 'success' : 'destructive'}>
                        {phoneNumber.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{phoneNumber.created_by_admin_name}</div>
                        <div className="text-sm text-gray-500">{phoneNumber.created_by_admin_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(phoneNumber.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(phoneNumber)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssign(phoneNumber)}
                        >
                          <Users className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(phoneNumber)}
                          className={phoneNumber.is_active ? 'text-red-600' : 'text-green-600'}
                        >
                          {phoneNumber.is_active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(phoneNumber)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <EditPhoneNumberDialog
          formData={formData}
          setFormData={setFormData}
          assignableUsers={assignableUsers}
          isLoading={updateMutation.isPending}
          onSubmit={handleUpdate}
          onCancel={() => {
            setIsEditDialogOpen(false);
            setSelectedPhoneNumber(null);
            resetForm();
          }}
        />
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <AssignPhoneNumberDialog
          phoneNumber={selectedPhoneNumber}
          assignableUsers={assignableUsers}
          isLoading={assignMutation.isPending}
          onSubmit={handleAssignSubmit}
          onCancel={() => {
            setIsAssignDialogOpen(false);
            setSelectedPhoneNumber(null);
          }}
        />
      </Dialog>
    </div>
  );
};

// Create Phone Number Dialog Component
interface CreatePhoneNumberDialogProps {
  formData: PhoneNumberFormData;
  setFormData: React.Dispatch<React.SetStateAction<PhoneNumberFormData>>;
  assignableUsers: AssignableUser[];
  isLoading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

const CreatePhoneNumberDialog: React.FC<CreatePhoneNumberDialogProps> = ({
  formData,
  setFormData,
  assignableUsers,
  isLoading,
  onSubmit,
  onCancel,
}) => (
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Add New Phone Number</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label htmlFor="create-name">Name *</Label>
        <Input
          id="create-name"
          placeholder="e.g. Main Support Line"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="create-phone">Phone Number *</Label>
        <Input
          id="create-phone"
          placeholder="e.g. +1234567890"
          value={formData.phone_number}
          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="create-elevenlabs">ElevenLabs Phone ID *</Label>
        <Input
          id="create-elevenlabs"
          placeholder="e.g. phnum_7201k7xjteyhfpb9w6f600kbyryj"
          value={formData.elevenlabs_phone_number_id}
          onChange={(e) => setFormData({ ...formData, elevenlabs_phone_number_id: e.target.value })}
        />
        <p className="text-sm text-gray-500 mt-1">
          The ElevenLabs phone number identifier
        </p>
      </div>
      <div>
        <Label htmlFor="create-assign">Assign To User (Optional)</Label>
        <Select
          value={formData.assigned_to_user_id || ''}
          onValueChange={(value) => 
            setFormData({ ...formData, assigned_to_user_id: value || null })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Leave unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Leave unassigned</SelectItem>
            {assignableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel} disabled={isLoading}>
        Cancel
      </Button>
      <Button onClick={onSubmit} disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Phone Number'}
      </Button>
    </DialogFooter>
  </DialogContent>
);

// Edit Phone Number Dialog Component
const EditPhoneNumberDialog: React.FC<CreatePhoneNumberDialogProps> = ({
  formData,
  setFormData,
  assignableUsers,
  isLoading,
  onSubmit,
  onCancel,
}) => (
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Edit Phone Number</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label htmlFor="edit-name">Name *</Label>
        <Input
          id="edit-name"
          placeholder="e.g. Main Support Line"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="edit-phone">Phone Number *</Label>
        <Input
          id="edit-phone"
          placeholder="e.g. +1234567890"
          value={formData.phone_number}
          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="edit-elevenlabs">ElevenLabs Phone ID *</Label>
        <Input
          id="edit-elevenlabs"
          placeholder="e.g. phnum_7201k7xjteyhfpb9w6f600kbyryj"
          value={formData.elevenlabs_phone_number_id}
          onChange={(e) => setFormData({ ...formData, elevenlabs_phone_number_id: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="edit-assign">Assign To User</Label>
        <Select
          value={formData.assigned_to_user_id || 'unassigned'}
          onValueChange={(value) => 
            setFormData({ ...formData, assigned_to_user_id: value === 'unassigned' ? null : value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assignableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel} disabled={isLoading}>
        Cancel
      </Button>
      <Button onClick={onSubmit} disabled={isLoading}>
        {isLoading ? 'Updating...' : 'Update Phone Number'}
      </Button>
    </DialogFooter>
  </DialogContent>
);

// Assignment Dialog Component
interface AssignPhoneNumberDialogProps {
  phoneNumber: PhoneNumber | null;
  assignableUsers: AssignableUser[];
  isLoading: boolean;
  onSubmit: (userId: string | null) => void;
  onCancel: () => void;
}

const AssignPhoneNumberDialog: React.FC<AssignPhoneNumberDialogProps> = ({
  phoneNumber,
  assignableUsers,
  isLoading,
  onSubmit,
  onCancel,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    phoneNumber?.assigned_to_user_id || null
  );

  useEffect(() => {
    setSelectedUserId(phoneNumber?.assigned_to_user_id || null);
  }, [phoneNumber]);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Assign Phone Number</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label>Phone Number</Label>
          <div className="p-3 bg-gray-50 rounded border">
            <div className="font-medium">{phoneNumber?.name}</div>
            <div className="text-sm text-gray-600">{phoneNumber?.phone_number}</div>
          </div>
        </div>
        <div>
          <Label htmlFor="assign-user">Assign To User</Label>
          <Select
            value={selectedUserId || 'unassigned'}
            onValueChange={(value) => setSelectedUserId(value === 'unassigned' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select user or leave unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {assignableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit(selectedUserId)} disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Assignment'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default PhoneNumberManagement;
