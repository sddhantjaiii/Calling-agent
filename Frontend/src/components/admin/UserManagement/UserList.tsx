import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, MoreHorizontal, UserCheck, UserX, CreditCard, Eye } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../../ui/dropdown-menu';
import { Checkbox } from '../../ui/checkbox';
import { AdminTable } from '../shared/AdminTable';
import LoadingSpinner from '../../ui/LoadingSpinner';
import EmptyState from '../../ui/EmptyState';
import type { AdminUserListItem, AdminUserFilters } from '../../../types/admin';
import { adminApiService } from '../../../services/adminApiService';

interface UserListProps {
  onUserSelect: (user: AdminUserListItem) => void;
  onUserEdit: (user: AdminUserListItem) => void;
  onCreditAdjust: (user: AdminUserListItem) => void;
  onUserStatusToggle: (user: AdminUserListItem) => void;
}

export function UserList({ 
  onUserSelect, 
  onUserEdit, 
  onCreditAdjust, 
  onUserStatusToggle 
}: UserListProps) {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<AdminUserFilters>({});
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const pageSize = 20;

  // Load users data
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApiService.getUsers({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        sortBy: sortColumn,
        sortOrder: sortDirection,
        ...filters,
      });

      if (response.success && response.data) {
        // Handle the response format from backend
        if ('users' in response.data && Array.isArray(response.data.users)) {
          setUsers(response.data.users);
          setTotalPages(response.data.totalPages || 1);
          setTotalUsers(response.data.total || 0);
        } else if (Array.isArray(response.data)) {
          // Fallback for direct array format
          setUsers(response.data);
          setTotalPages(1);
          setTotalUsers(response.data.length);
        } else {
          // Fallback for unexpected response format
          setUsers([]);
          setTotalPages(1);
          setTotalUsers(0);
        }
      } else {
        throw new Error('Failed to load users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load users on component mount and when dependencies change
  useEffect(() => {
    loadUsers();
  }, [currentPage, searchQuery, filters, sortColumn, sortDirection]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle sorting
  const handleSort = (column: string, direction: 'ASC' | 'DESC') => {
    setSortColumn(column);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  // Handle user selection
  const handleUserSelect = (userId: string, selected: boolean) => {
    setSelectedUsers(prev => 
      selected 
        ? [...prev, userId]
        : prev.filter(id => id !== userId)
    );
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    setSelectedUsers(selected ? users.map(user => user.id) : []);
  };

  // Handle bulk operations
  const handleBulkStatusToggle = async (activate: boolean) => {
    try {
      setLoading(true);
      
      // Process selected users
      const promises = selectedUsers.map(async (userId) => {
        const user = users.find(u => u.id === userId);
        if (user) {
          await adminApiService.updateUser(userId, { 
            isActive: activate 
          });
        }
      });

      await Promise.all(promises);
      
      // Reload users and clear selection
      await loadUsers();
      setSelectedUsers([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk operation failed');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return 'Never';
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return 'Invalid Date';
      return parsedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Table columns configuration
  const columns = useMemo(() => [
    {
      key: 'select',
      label: '',
      className: 'w-12',
      render: (_: unknown, user: AdminUserListItem) => (
        <Checkbox
          checked={selectedUsers.includes(user.id)}
          onCheckedChange={(checked) => 
            handleUserSelect(user.id, checked as boolean)
          }
        />
      ),
    },
    {
      key: 'name',
      label: 'User',
      sortable: true,
      render: (_: unknown, user: AdminUserListItem) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
            <span className="text-sm font-medium text-teal-800">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">
              {user.name || 'Unknown User'}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={value === 'admin' ? 'destructive' : 'secondary'}>
          {String(value).toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (value: unknown, user: AdminUserListItem) => {
        // Handle both camelCase and snake_case field names
        const isActive = value ?? (user as any).is_active ?? (user as any).isActive;
        return (
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      key: 'agentCount',
      label: 'Agents',
      sortable: true,
      className: 'text-center',
    },
    {
      key: 'callCount',
      label: 'Calls',
      sortable: true,
      className: 'text-center',
    },
    {
      key: 'creditsUsed',
      label: 'Credits Used',
      sortable: true,
      className: 'text-right',
      render: (value: unknown) => formatCurrency(Number(value) || 0),
    },
    {
      key: 'created_at',
      label: 'Registered',
      sortable: true,
      render: (value: unknown, user: AdminUserListItem) => {
        const date = value || (user as any).created_at || (user as any).registrationDate;
        return formatDate(date);
      },
    },
    {
      key: 'last_login',
      label: 'Last Login',
      sortable: true,
      render: (value: unknown, user: AdminUserListItem) => {
        const date = value || (user as any).last_login || (user as any).lastLogin;
        return formatDate(date);
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'w-20',
      render: (_: unknown, user: AdminUserListItem) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onUserSelect(user)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUserEdit(user)}>
              <UserCheck className="mr-2 h-4 w-4" />
              Edit User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreditAdjust(user)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Adjust Credits
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUserStatusToggle(user)}>
              {((user as any).is_active ?? (user as any).isActive) ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [selectedUsers, onUserSelect, onUserEdit, onCreditAdjust, onUserStatusToggle]);

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading users</div>
          <div className="text-sm text-gray-500 mb-4">{error}</div>
          <Button onClick={loadUsers} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {selectedUsers.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusToggle(true)}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusToggle(false)}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Deactivate
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Users ({totalUsers})
              </h3>
              <p className="text-sm text-gray-500">
                Manage platform users and their access
              </p>
            </div>
            
            <div className="flex items-center">
              <Checkbox
                checked={selectedUsers.length === users.length && users.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="ml-2 text-sm text-gray-500">Select all</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
            <p className="mt-2 text-sm text-gray-500">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-sm text-gray-500 mb-4">No users match your current search and filter criteria.</p>
            <Button onClick={() => {
              setSearchQuery('');
              setFilters({});
            }}>
              Clear filters
            </Button>
          </div>
        ) : (
          <AdminTable
            columns={columns as any}
            data={users as any}
            onSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                {Math.min(currentPage * pageSize, totalUsers)} of {totalUsers} users
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserList;