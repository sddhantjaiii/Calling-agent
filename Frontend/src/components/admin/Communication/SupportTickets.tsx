import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Ticket, Clock, AlertTriangle, CheckCircle, MessageSquare, User, Calendar } from 'lucide-react';
import { AdminTable } from '../shared/AdminTable';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/services/adminApiService';

interface SupportTicket extends Record<string, unknown> {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'feature-request' | 'bug-report' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'waiting-user' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedToName?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  responses: TicketResponse[];
  escalated: boolean;
  tags: string[];
}

interface TicketResponse {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorType: 'user' | 'admin';
  content: string;
  isInternal: boolean;
  createdAt: Date;
  attachments?: string[];
}

interface Admin {
  id: string;
  name: string;
  email: string;
}

export const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [isResponseOpen, setIsResponseOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state for ticket responses
  const [responseForm, setResponseForm] = useState({
    content: '',
    isInternal: false,
    status: '' as SupportTicket['status'] | '',
    assignTo: '',
    priority: '' as SupportTicket['priority'] | ''
  });

  useEffect(() => {
    loadTickets();
    loadAdmins();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockTickets: SupportTicket[] = [
        {
          id: '1',
          ticketNumber: 'TKT-2024-001',
          userId: 'user1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          subject: 'Unable to create new agent',
          description: 'I am getting an error when trying to create a new agent. The error message says "Failed to connect to ElevenLabs API".',
          category: 'technical',
          priority: 'high',
          status: 'open',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          updatedAt: new Date('2024-01-15T10:00:00Z'),
          responses: [],
          escalated: false,
          tags: ['api-error', 'elevenlabs']
        },
        {
          id: '2',
          ticketNumber: 'TKT-2024-002',
          userId: 'user2',
          userName: 'Jane Smith',
          userEmail: 'jane@example.com',
          subject: 'Billing inquiry about credit charges',
          description: 'I was charged for credits but I did not make any calls. Can you please check my account?',
          category: 'billing',
          priority: 'medium',
          status: 'in-progress',
          assignedTo: 'admin1',
          assignedToName: 'Admin User',
          createdAt: new Date('2024-01-14T15:30:00Z'),
          updatedAt: new Date('2024-01-15T09:00:00Z'),
          responses: [
            {
              id: 'resp1',
              ticketId: '2',
              authorId: 'admin1',
              authorName: 'Admin User',
              authorType: 'admin',
              content: 'I have reviewed your account and found some test calls that were made. Let me investigate further.',
              isInternal: false,
              createdAt: new Date('2024-01-15T09:00:00Z')
            }
          ],
          escalated: false,
          tags: ['billing', 'credits']
        },
        {
          id: '3',
          ticketNumber: 'TKT-2024-003',
          userId: 'user3',
          userName: 'Bob Johnson',
          userEmail: 'bob@example.com',
          subject: 'Feature request: Bulk contact import',
          description: 'It would be great to have a feature to import contacts in bulk from CSV files.',
          category: 'feature-request',
          priority: 'low',
          status: 'resolved',
          assignedTo: 'admin2',
          assignedToName: 'Admin Two',
          createdAt: new Date('2024-01-10T11:00:00Z'),
          updatedAt: new Date('2024-01-12T16:00:00Z'),
          resolvedAt: new Date('2024-01-12T16:00:00Z'),
          responses: [
            {
              id: 'resp2',
              ticketId: '3',
              authorId: 'admin2',
              authorName: 'Admin Two',
              authorType: 'admin',
              content: 'Thank you for the suggestion! This feature is now available in the contacts section.',
              isInternal: false,
              createdAt: new Date('2024-01-12T16:00:00Z')
            }
          ],
          escalated: false,
          tags: ['feature-request', 'contacts']
        }
      ];
      setTickets(mockTickets);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load support tickets',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      // Mock data - replace with actual API call
      const mockAdmins: Admin[] = [
        { id: 'admin1', name: 'Admin User', email: 'admin@example.com' },
        { id: 'admin2', name: 'Admin Two', email: 'admin2@example.com' },
        { id: 'admin3', name: 'Admin Three', email: 'admin3@example.com' }
      ];
      setAdmins(mockAdmins);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load admins',
        variant: 'destructive'
      });
    }
  };

  const handleTicketResponse = async () => {
    if (!selectedTicket || !responseForm.content) {
      toast({
        title: 'Error',
        description: 'Please enter a response',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Use actual API call
      const response = await adminApiService.addTicketResponse(selectedTicket.id, {
        content: responseForm.content,
        isInternal: responseForm.isInternal,
        status: responseForm.status,
        priority: responseForm.priority,
        assignTo: responseForm.assignTo
      });

      if (response.success && response.data) {
        const newResponse: TicketResponse = {
          id: response.data.id,
          ticketId: selectedTicket.id,
          authorId: 'current-admin',
          authorName: 'Current Admin',
          authorType: 'admin',
          content: responseForm.content,
          isInternal: responseForm.isInternal,
          createdAt: new Date()
        };

        const updatedTicket: SupportTicket = {
          ...selectedTicket,
          responses: [...selectedTicket.responses, newResponse],
          status: responseForm.status || selectedTicket.status,
          priority: responseForm.priority || selectedTicket.priority,
          assignedTo: responseForm.assignTo || selectedTicket.assignedTo,
          assignedToName: responseForm.assignTo ? admins.find(a => a.id === responseForm.assignTo)?.name : selectedTicket.assignedToName,
          updatedAt: new Date(),
          resolvedAt: responseForm.status === 'resolved' ? new Date() : selectedTicket.resolvedAt
        };

        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
        setSelectedTicket(updatedTicket);
        setResponseForm({ content: '', isInternal: false, status: '', assignTo: '', priority: '' });
        setIsResponseOpen(false);

        toast({
          title: 'Success',
          description: 'Response added successfully'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add response',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEscalateTicket = async (ticketId: string) => {
    setLoading(true);
    try {
      // Use actual API call
      const response = await adminApiService.escalateTicket(ticketId, 'Escalated by admin');

      if (response.success && response.data) {
        setTickets(prev => prev.map(t =>
          t.id === ticketId
            ? { ...t, escalated: true, priority: 'urgent', updatedAt: new Date() }
            : t
        ));

        toast({
          title: 'Success',
          description: 'Ticket escalated successfully'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to escalate ticket',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'waiting-user':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4" />;
      case 'in-progress':
        return <Clock className="h-4 w-4" />;
      case 'waiting-user':
        return <AlertTriangle className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    const matchesAssignee = assigneeFilter === 'all' ||
      (assigneeFilter === 'unassigned' && !ticket.assignedTo) ||
      ticket.assignedTo === assigneeFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignee;
  });

  const columns = [
    {
      key: 'ticketNumber',
      label: 'Ticket #',
      render: (value: unknown, ticket: SupportTicket) => (
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-gray-400" />
          <span className="font-mono text-sm">{ticket.ticketNumber}</span>
          {ticket.escalated && (
            <AlertTriangle className="h-4 w-4 text-red-500" title="Escalated" />
          )}
        </div>
      )
    },
    {
      key: 'user',
      label: 'User',
      render: (value: unknown, ticket: SupportTicket) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium">{ticket.userName}</div>
            <div className="text-sm text-gray-500">{ticket.userEmail}</div>
          </div>
        </div>
      )
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (value: unknown, ticket: SupportTicket) => (
        <div>
          <div className="font-medium truncate max-w-xs" title={ticket.subject}>
            {ticket.subject}
          </div>
          <div className="text-sm text-gray-500 capitalize">
            {ticket.category.replace('-', ' ')}
          </div>
        </div>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (value: unknown, ticket: SupportTicket) => (
        <Badge className={getPriorityColor(ticket.priority)}>
          {ticket.priority}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown, ticket: SupportTicket) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(ticket.status)}
          <Badge className={getStatusColor(ticket.status)}>
            {ticket.status.replace('-', ' ')}
          </Badge>
        </div>
      )
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      render: (value: unknown, ticket: SupportTicket) => (
        ticket.assignedToName || <span className="text-gray-400">Unassigned</span>
      )
    },
    {
      key: 'responses',
      label: 'Responses',
      render: (value: unknown, ticket: SupportTicket) => (
        <div className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          {ticket.responses.length}
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value: unknown, ticket: SupportTicket) => (
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-gray-400" />
          {new Date(ticket.createdAt).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: unknown, ticket: SupportTicket) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTicket(ticket)}
          >
            View
          </Button>
          {!ticket.escalated && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEscalateTicket(ticket.id)}
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="waiting-user">Waiting User</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="feature-request">Feature Request</SelectItem>
              <SelectItem value="bug-report">Bug Report</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {admins.map(admin => (
                <SelectItem key={admin.id} value={admin.id}>
                  {admin.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets table */}
      <AdminTable
        data={filteredTickets}
        columns={columns}
        loading={loading}
        emptyMessage="No support tickets found"
      />

      {/* Ticket details dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  {selectedTicket.ticketNumber} - {selectedTicket.subject}
                  {selectedTicket.escalated && (
                    <Badge className="bg-red-100 text-red-800">Escalated</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Ticket info */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Ticket Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Status:</span>
                        <Badge className={getStatusColor(selectedTicket.status)}>
                          {selectedTicket.status.replace('-', ' ')}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Priority:</span>
                        <Badge className={getPriorityColor(selectedTicket.priority)}>
                          {selectedTicket.priority}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Category:</span>
                        <span className="text-sm capitalize">{selectedTicket.category.replace('-', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Assigned To:</span>
                        <span className="text-sm">{selectedTicket.assignedToName || 'Unassigned'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">User Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Name:</span>
                        <span className="text-sm">{selectedTicket.userName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Email:</span>
                        <span className="text-sm">{selectedTicket.userEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Created:</span>
                        <span className="text-sm">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Updated:</span>
                        <span className="text-sm">{new Date(selectedTicket.updatedAt).toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Original description */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  </CardContent>
                </Card>

                {/* Responses */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Responses ({selectedTicket.responses.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedTicket.responses.map(response => (
                      <div key={response.id} className="border-l-2 border-gray-200 pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={response.authorType === 'admin' ? 'default' : 'secondary'}>
                              {response.authorName}
                            </Badge>
                            {response.isInternal && (
                              <Badge variant="outline" className="text-xs">Internal</Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(response.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{response.content}</p>
                      </div>
                    ))}

                    {selectedTicket.responses.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No responses yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* Response form */}
                <div className="flex gap-2">
                  <Button onClick={() => setIsResponseOpen(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Response
                  </Button>
                  {!selectedTicket.escalated && selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                    <Button
                      variant="outline"
                      onClick={() => handleEscalateTicket(selectedTicket.id)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Escalate
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Response dialog */}
      <Dialog open={isResponseOpen} onOpenChange={setIsResponseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Response</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="response">Response</Label>
              <Textarea
                id="response"
                value={responseForm.content}
                onChange={(e) => setResponseForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter your response"
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Update Status (Optional)</Label>
                <Select value={responseForm.status} onValueChange={(value: any) =>
                  setResponseForm(prev => ({ ...prev, status: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Keep current status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="waiting-user">Waiting User</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Update Priority (Optional)</Label>
                <Select value={responseForm.priority} onValueChange={(value: any) =>
                  setResponseForm(prev => ({ ...prev, priority: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Keep current priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="assignTo">Assign To (Optional)</Label>
              <Select value={responseForm.assignTo} onValueChange={(value) =>
                setResponseForm(prev => ({ ...prev, assignTo: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Keep current assignment" />
                </SelectTrigger>
                <SelectContent>
                  {admins.map(admin => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="internal"
                checked={responseForm.isInternal}
                onCheckedChange={(checked) =>
                  setResponseForm(prev => ({ ...prev, isInternal: !!checked }))
                }
              />
              <Label htmlFor="internal" className="text-sm">
                Internal note (not visible to user)
              </Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsResponseOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleTicketResponse} disabled={loading}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Add Response
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};