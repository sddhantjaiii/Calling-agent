import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Eye, 
  EyeOff, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Activity, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Settings
} from 'lucide-react';

import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../../ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../ui/select';
import { useToast } from '../../ui/use-toast';
import { AdminCard } from '../shared/AdminCard';
// import { AdminTable } from '../shared/AdminTable';

import { adminApiService } from '../../../services/adminApiService';
import type { APIKeyConfig } from '../../../types/admin';

interface APIKeyManagerProps {
  className?: string;
}

interface APIKeyFormData {
  name: string;
  key: string;
  isDefault: boolean;
  assignedUsers: string[];
}

interface UserAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: APIKeyConfig | null;
  onAssignmentUpdate: (keyId: string, userIds: string[]) => void;
}

const UserAssignmentModal: React.FC<UserAssignmentModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onAssignmentUpdate
}) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Mock users data - in real implementation, this would come from API
  const mockUsers = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
  ];

  useEffect(() => {
    if (apiKey) {
      setSelectedUsers(apiKey.assignedUsers);
    }
  }, [apiKey]);

  const handleSave = () => {
    if (apiKey) {
      onAssignmentUpdate(apiKey.id, selectedUsers);
      toast({
        title: 'User Assignment Updated',
        description: `API key "${apiKey.name}" user assignments have been updated.`,
      });
      onClose();
    }
  };

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage User Assignments</DialogTitle>
          <DialogDescription>
            Assign users to API key: {apiKey?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="user-search">Search Users</Label>
            <Input
              id="user-search"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="max-h-64 overflow-y-auto border rounded-md">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-2 p-3 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  id={`user-${user.id}`}
                  checked={selectedUsers.includes(user.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers([...selectedUsers, user.id]);
                    } else {
                      setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </label>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-600">
            {selectedUsers.length} user(s) selected
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const APIKeyManager: React.FC<APIKeyManagerProps> = ({ className }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserAssignmentModal, setShowUserAssignmentModal] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<APIKeyConfig | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<APIKeyFormData>({
    name: '',
    key: '',
    isDefault: false,
    assignedUsers: []
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch API keys
  const { data: apiKeysResponse, isLoading, error } = useQuery({
    queryKey: ['admin', 'api-keys'],
    queryFn: () => adminApiService.getAPIKeys(),
  });

  const apiKeys = apiKeysResponse?.data || [];

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: (keyData: Omit<APIKeyConfig, 'id'>) => 
      adminApiService.createAPIKey(keyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] });
      setShowCreateModal(false);
      resetForm();
      toast({
        title: 'API Key Created',
        description: 'New API key has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update API key mutation
  const updateApiKeyMutation = useMutation({
    mutationFn: ({ keyId, config }: { keyId: string; config: Partial<APIKeyConfig> }) =>
      adminApiService.updateAPIKey(keyId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] });
      setShowEditModal(false);
      resetForm();
      toast({
        title: 'API Key Updated',
        description: 'API key has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: (keyId: string) => adminApiService.deleteAPIKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] });
      toast({
        title: 'API Key Deleted',
        description: 'API key has been deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      key: '',
      isDefault: false,
      assignedUsers: []
    });
    setSelectedApiKey(null);
  };

  const handleCreateApiKey = () => {
    createApiKeyMutation.mutate({
      ...formData,
      usageStats: {
        totalCalls: 0,
        remainingQuota: 10000,
        costThisMonth: 0
      },
      status: 'active'
    });
  };

  const handleUpdateApiKey = () => {
    if (selectedApiKey) {
      updateApiKeyMutation.mutate({
        keyId: selectedApiKey.id,
        config: formData
      });
    }
  };

  const handleDeleteApiKey = (keyId: string) => {
    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      deleteApiKeyMutation.mutate(keyId);
    }
  };

  const handleEditApiKey = (apiKey: APIKeyConfig) => {
    setSelectedApiKey(apiKey);
    setFormData({
      name: apiKey.name,
      key: apiKey.key,
      isDefault: apiKey.isDefault,
      assignedUsers: apiKey.assignedUsers
    });
    setShowEditModal(true);
  };

  const handleUserAssignment = (apiKey: APIKeyConfig) => {
    setSelectedApiKey(apiKey);
    setShowUserAssignmentModal(true);
  };

  const handleUserAssignmentUpdate = (keyId: string, userIds: string[]) => {
    updateApiKeyMutation.mutate({
      keyId,
      config: { assignedUsers: userIds }
    });
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      error: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" data-testid="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading API Keys</h3>
        <p className="text-gray-600">Failed to load API key configuration</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Key Management</h2>
          <p className="text-gray-600">Manage ElevenLabs API keys and user assignments</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add API Key
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminCard
          title="Total API Keys"
          value={apiKeys.length.toString()}
          icon={Settings}
          trend={{ value: 0, isPositive: true }}
        />
        <AdminCard
          title="Active Keys"
          value={apiKeys.filter(key => key.status === 'active').length.toString()}
          icon={CheckCircle}
          trend={{ value: 0, isPositive: true }}
        />
        <AdminCard
          title="Assigned Users"
          value={apiKeys.reduce((sum, key) => sum + key.assignedUsers.length, 0).toString()}
          icon={Users}
          trend={{ value: 0, isPositive: true }}
        />
        <AdminCard
          title="Monthly Cost"
          value={`$${apiKeys.reduce((sum, key) => sum + key.usageStats.costThisMonth, 0).toFixed(2)}`}
          icon={DollarSign}
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage ElevenLabs API keys, user assignments, and usage monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Assigned Users</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {visibleKeys.has(apiKey.id) ? apiKey.key : maskApiKey(apiKey.key)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {visibleKeys.has(apiKey.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(apiKey.status)}
                        {getStatusBadge(apiKey.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {apiKey.isDefault && (
                        <Badge variant="outline">Default</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUserAssignment(apiKey)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        {apiKey.assignedUsers.length}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {apiKey.usageStats.totalCalls.toLocaleString()} calls
                        </div>
                        <Progress 
                          value={(apiKey.usageStats.totalCalls / (apiKey.usageStats.totalCalls + apiKey.usageStats.remainingQuota)) * 100} 
                          className="h-2"
                        />
                        <div className="text-xs text-gray-500">
                          {apiKey.usageStats.remainingQuota.toLocaleString()} remaining
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span>${apiKey.usageStats.costThisMonth.toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditApiKey(apiKey)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteApiKey(apiKey.id)}
                          disabled={apiKey.isDefault}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create API Key Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Add a new ElevenLabs API key to the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter API key name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="key">API Key</Label>
              <Textarea
                id="key"
                placeholder="Enter ElevenLabs API key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="default"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
              <Label htmlFor="default">Set as default for new users</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateApiKey}
              disabled={!formData.name || !formData.key || createApiKeyMutation.isPending}
            >
              {createApiKeyMutation.isPending ? 'Creating...' : 'Create API Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit API Key Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Update API key configuration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter API key name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-key">API Key</Label>
              <Textarea
                id="edit-key"
                placeholder="Enter ElevenLabs API key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-default"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
              <Label htmlFor="edit-default">Set as default for new users</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateApiKey}
              disabled={!formData.name || !formData.key || updateApiKeyMutation.isPending}
            >
              {updateApiKeyMutation.isPending ? 'Updating...' : 'Update API Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Assignment Modal */}
      <UserAssignmentModal
        isOpen={showUserAssignmentModal}
        onClose={() => setShowUserAssignmentModal(false)}
        apiKey={selectedApiKey}
        onAssignmentUpdate={handleUserAssignmentUpdate}
      />
    </div>
  );
};

export default APIKeyManager;