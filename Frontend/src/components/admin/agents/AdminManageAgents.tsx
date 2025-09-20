import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import { adminApiService } from '@/services/adminApiService';
import { 
  Bot, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  User, 
  MoreHorizontal,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  language: string;
  description: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  isAssigned: boolean;
  createdAt: string;
  lastActivity?: string;
  callCount?: number;
  successRate?: number;
}

interface Filters {
  search: string;
  status: string;
  type: string;
  assigned: string;
}

export default function AdminManageAgents() {
  const { user: adminUser } = useAdmin();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    type: 'all',
    assigned: 'all'
  });
  
  // Modal states
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load agents
  useEffect(() => {
    const loadAgents = async () => {
      try {
        setIsLoading(true);
        const response = await adminApiService.getAgents({ 
          limit: 1000
        });

        if (response.data) {
          const agentsData = response.data.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            type: agent.type || agent.agentType,
            status: agent.status || (agent.isActive ? 'active' : 'inactive'),
            language: agent.language || 'English',
            description: agent.description || '',
            userId: agent.userId,
            userName: agent.userName,
            userEmail: agent.userEmail,
            isAssigned: !!agent.userId,
            createdAt: agent.createdAt,
            lastActivity: agent.lastActivity,
            callCount: agent.callCount || 0,
            successRate: agent.successRate || 0
          }));
          
          setAgents(agentsData);
          setFilteredAgents(agentsData);
        }
      } catch (error) {
        console.error('Failed to load agents:', error);
        toast.error('Failed to load agents', {
          description: 'Please refresh the page and try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAgents();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...agents];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(searchLower) ||
        agent.description.toLowerCase().includes(searchLower) ||
        agent.userName?.toLowerCase().includes(searchLower) ||
        agent.userEmail?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(agent => agent.status === filters.status);
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(agent => agent.type === filters.type);
    }

    // Assignment filter
    if (filters.assigned !== 'all') {
      if (filters.assigned === 'assigned') {
        filtered = filtered.filter(agent => agent.isAssigned);
      } else if (filters.assigned === 'unassigned') {
        filtered = filtered.filter(agent => !agent.isAssigned);
      }
    }

    setFilteredAgents(filtered);
  }, [agents, filters]);

  const handleDeleteAgent = async (agent: Agent) => {
    setAgentToDelete(agent);
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDelete) return;

    setIsDeleting(true);
    try {
      await adminApiService.deleteAgent(agentToDelete.id);
      
      // Remove from local state
      setAgents(prev => prev.filter(a => a.id !== agentToDelete.id));
      
      toast.success('Agent deleted successfully', {
        description: `${agentToDelete.name} has been permanently removed.`
      });
    } catch (error) {
      console.error('Failed to delete agent:', error);
      toast.error('Failed to delete agent', {
        description: 'An error occurred while deleting the agent.'
      });
    } finally {
      setIsDeleting(false);
      setAgentToDelete(null);
    }
  };

  const handleStatusChange = async (agentId: string, newStatus: string) => {
    try {
      await adminApiService.updateAgent(agentId, { 
        isActive: newStatus === 'active' 
      });
      
      // Update local state
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, status: newStatus }
          : agent
      ));
      
      toast.success('Agent status updated');
    } catch (error) {
      console.error('Failed to update agent status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'CallAgent':
      case 'call':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Call</Badge>;
      case 'ChatAgent':
      case 'chat':
        return <Badge variant="outline" className="text-purple-600 border-purple-300">Chat</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Manage Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading agents...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Manage Agents
          </CardTitle>
          <p className="text-sm text-gray-600">
            View and manage all agents in the system. You can edit, delete, and change agent assignments.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search agents..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.type}
              onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CallAgent">Call Agents</SelectItem>
                <SelectItem value="ChatAgent">Chat Agents</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.assigned}
              onValueChange={(value) => setFilters(prev => ({ ...prev, assigned: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Agents List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredAgents.length === 0 ? (
              <div className="p-8 text-center">
                <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No agents found</h3>
                <p className="text-gray-600">
                  {filters.search || filters.status !== 'all' || filters.type !== 'all' || filters.assigned !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'No agents have been created yet.'}
                </p>
              </div>
            ) : (
              filteredAgents.map((agent) => (
                <div key={agent.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 rounded-lg p-2">
                        <Bot className="h-5 w-5 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {agent.name}
                          </h3>
                          {getStatusBadge(agent.status)}
                          {getTypeBadge(agent.type)}
                        </div>
                        
                        {agent.description && (
                          <p className="text-gray-600 mb-2 line-clamp-2">
                            {agent.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span>Language: {agent.language}</span>
                          <span>Created: {new Date(agent.createdAt).toLocaleDateString()}</span>
                          {agent.callCount !== undefined && (
                            <span>Calls: {agent.callCount}</span>
                          )}
                          {agent.successRate !== undefined && (
                            <span>Success: {agent.successRate}%</span>
                          )}
                        </div>
                        
                        {agent.isAssigned && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-green-600" />
                            <span className="text-green-700">
                              Assigned to {agent.userName || agent.userEmail}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Agent
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {agent.isAssigned ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Reassign Agent
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Assign to User
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(
                              agent.id, 
                              agent.status === 'active' ? 'inactive' : 'active'
                            )}
                          >
                            {agent.status === 'active' ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteAgent(agent)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Agent
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!agentToDelete} onOpenChange={() => setAgentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{agentToDelete?.name}"? This action cannot be undone.
              {agentToDelete?.isAssigned && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This agent is currently assigned to {agentToDelete.userName || agentToDelete.userEmail}. 
                    Deleting it will remove it from their account.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAgent}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Agent'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
