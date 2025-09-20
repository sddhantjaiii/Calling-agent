import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import { adminApiService } from '@/services/adminApiService';
import { Users, Bot, ArrowRight, Check, X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  agentCount: number;
  isActive: boolean;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  isAssigned: boolean;
}

interface AgentAssignment {
  agentId: string;
  currentUserId?: string;
  newUserId: string;
}

interface AdminAssignAgentProps {
  onAssignmentComplete?: () => void;
}

export default function AdminAssignAgent({ onAssignmentComplete }: AdminAssignAgentProps) {
  const { user: adminUser } = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignments, setAssignments] = useState<AgentAssignment[]>([]);

  // Load users and agents
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const [usersResponse, agentsResponse] = await Promise.all([
          adminApiService.getUsers({ limit: 1000 }),
          adminApiService.getAgents({ limit: 1000 })
        ]);

        if (usersResponse.data) {
          let usersData: any[] = [];
          
          // Handle PaginatedResponse structure (data.users array) - the actual API returns a nested structure
          const responseData = usersResponse.data as any;
          if (responseData.users && Array.isArray(responseData.users)) {
            usersData = responseData.users;
          } else if (Array.isArray(responseData)) {
            usersData = responseData;
          }
          
          setUsers(usersData.map((user: any) => ({
            id: user.id,
            email: user.email,
            name: user.name || user.email,
            agentCount: user.agentCount || 0,
            isActive: user.isActive !== false
          })));
        }

        if (agentsResponse.data) {
          let agentsData: any[] = [];
          
          // Handle PaginatedResponse structure (data.agents array) - the actual API returns a nested structure
          const responseData = agentsResponse.data as any;
          if (responseData.agents && Array.isArray(responseData.agents)) {
            agentsData = responseData.agents;
          } else if (Array.isArray(responseData)) {
            agentsData = responseData;
          }
          
          setAgents(agentsData.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            type: agent.agent_type || agent.type,
            status: agent.is_active ? 'active' : 'inactive',
            userId: agent.user_id,
            userName: agent.user_name,
            userEmail: agent.user_email,
            isAssigned: !!agent.user_id
          })));
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load data', {
          description: 'Please refresh the page and try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Get available agents (all active agents that can be assigned to users)
  const availableAgents = agents.filter(agent => 
    agent.status === 'active' 
    // Admin can assign any active agent to any user
  );
  
  // Get active users
  const activeUsers = users.filter(user => user.isActive);

  // Get selected agent details
  const selectedAgentData = agents.find(agent => agent.id === selectedAgent);
  const selectedUserData = users.find(user => user.id === selectedUser);

  const handleAddAssignment = () => {
    if (!selectedAgent || !selectedUser) {
      toast.error('Please select both an agent and a user');
      return;
    }

    // Check if this agent is already in assignments
    const existingAssignmentIndex = assignments.findIndex(a => a.agentId === selectedAgent);
    
    if (existingAssignmentIndex >= 0) {
      // Update existing assignment
      const updatedAssignments = [...assignments];
      updatedAssignments[existingAssignmentIndex] = {
        agentId: selectedAgent,
        currentUserId: selectedAgentData?.userId,
        newUserId: selectedUser
      };
      setAssignments(updatedAssignments);
    } else {
      // Add new assignment
      setAssignments(prev => [...prev, {
        agentId: selectedAgent,
        currentUserId: selectedAgentData?.userId,
        newUserId: selectedUser
      }]);
    }

    // Clear selections
    setSelectedAgent('');
    setSelectedUser('');
    
    toast.success('Assignment added to queue', {
      description: 'Click "Apply All Assignments" to save changes.'
    });
  };

  const handleRemoveAssignment = (agentId: string) => {
    setAssignments(prev => prev.filter(a => a.agentId !== agentId));
    toast.info('Assignment removed from queue');
  };

  const handleApplyAssignments = async () => {
    if (assignments.length === 0) {
      toast.error('No assignments to apply');
      return;
    }

    setIsAssigning(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process assignments one by one to show progress
      for (const assignment of assignments) {
        try {
          await adminApiService.assignAgent(assignment.agentId, assignment.newUserId);
          successCount++;
        } catch (error) {
          console.error(`Failed to assign agent ${assignment.agentId}:`, error);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0 && errorCount === 0) {
        toast.success('All assignments completed successfully', {
          description: `${successCount} agent${successCount > 1 ? 's' : ''} assigned.`
        });
        setAssignments([]);
        onAssignmentComplete?.();
        
        // Reload data to reflect changes
        window.location.reload();
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning('Assignments partially completed', {
          description: `${successCount} succeeded, ${errorCount} failed.`
        });
      } else {
        toast.error('All assignments failed', {
          description: 'Please check the console for error details.'
        });
      }
    } catch (error) {
      console.error('Assignment batch error:', error);
      toast.error('Failed to apply assignments', {
        description: 'An unexpected error occurred.'
      });
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Agents to Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading agents and users...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Agents to Users
          </CardTitle>
          <p className="text-sm text-gray-600">
            Select an agent and user to create an assignment. You can queue multiple assignments and apply them all at once.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Agent Selection */}
            <div className="space-y-2">
              <Label htmlFor="agent-select" className="text-sm font-medium">
                Select Agent
              </Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger id="agent-select">
                  <SelectValue placeholder="Choose an agent to assign" />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{agent.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {agent.isAssigned ? `(Assigned to ${agent.userName || agent.userEmail})` : '(Unassigned)'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Selection */}
            <div className="space-y-2">
              <Label htmlFor="user-select" className="text-sm font-medium">
                Select User
              </Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {activeUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{user.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({user.agentCount} agents)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignment Preview */}
          {selectedAgent && selectedUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <div className="font-medium text-blue-900">
                      {selectedAgentData?.name}
                    </div>
                    <div className="text-blue-600 text-xs">
                      {selectedAgentData?.isAssigned ? 'Reassign from' : 'Assign to'} {selectedUserData?.name}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-900">
                      {selectedUserData?.name}
                    </div>
                    <div className="text-blue-600 text-xs">
                      {selectedUserData?.email}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleAddAssignment}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Check className="h-3 w-3" />
                  Add to Queue
                </Button>
              </div>
            </div>
          )}

          {/* Assignment Queue */}
          {assignments.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Queued Assignments ({assignments.length})
              </h3>
              <div className="space-y-2 mb-4">
                {assignments.map((assignment) => {
                  const agent = agents.find(a => a.id === assignment.agentId);
                  const user = users.find(u => u.id === assignment.newUserId);
                  const currentUser = assignment.currentUserId 
                    ? users.find(u => u.id === assignment.currentUserId)
                    : null;

                  return (
                    <div
                      key={assignment.agentId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4 text-sm">
                        <Bot className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="font-medium">{agent?.name}</div>
                          <div className="text-gray-600 text-xs">
                            {currentUser ? `Reassign from ${currentUser.name}` : 'Assign'} to {user?.name}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRemoveAssignment(assignment.agentId)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              
              <Button
                onClick={handleApplyAssignments}
                disabled={isAssigning}
                className="w-full flex items-center justify-center gap-2"
              >
                {isAssigning ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isAssigning ? 'Applying Assignments...' : `Apply All Assignments (${assignments.length})`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Assignments Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Agent Assignments</CardTitle>
          <p className="text-sm text-gray-600">
            Overview of all agents and their current user assignments.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Bot className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-sm text-gray-600">
                      {agent.type} • {agent.status}
                    </div>
                  </div>
                </div>
                <div className="text-sm">
                  {agent.isAssigned ? (
                    <div className="text-right">
                      <div className="font-medium text-green-700">
                        {agent.userName || 'Assigned User'}
                      </div>
                      <div className="text-green-600 text-xs">
                        {agent.userEmail}
                      </div>
                    </div>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      Unassigned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
