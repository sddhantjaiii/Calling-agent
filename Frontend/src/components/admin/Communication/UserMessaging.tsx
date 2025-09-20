import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Send, MessageSquare, Clock, CheckCircle, XCircle, User } from 'lucide-react';
import { AdminTable } from '../shared/AdminTable';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/services/adminApiService';

interface Message extends Record<string, unknown> {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  adminId: string;
  adminName: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

export const UserMessaging: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state for composing messages
  const [messageForm, setMessageForm] = useState({
    recipientId: '',
    subject: '',
    content: '',
    priority: 'medium' as const
  });

  useEffect(() => {
    loadMessages();
    loadUsers();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockMessages: Message[] = [
        {
          id: '1',
          recipientId: 'user1',
          recipientName: 'John Doe',
          recipientEmail: 'john@example.com',
          subject: 'Account Verification Required',
          content: 'Please verify your account to continue using our services.',
          priority: 'high',
          status: 'read',
          sentAt: new Date('2024-01-15T10:00:00Z'),
          deliveredAt: new Date('2024-01-15T10:01:00Z'),
          readAt: new Date('2024-01-15T10:30:00Z'),
          adminId: 'admin1',
          adminName: 'Admin User'
        },
        {
          id: '2',
          recipientId: 'user2',
          recipientName: 'Jane Smith',
          recipientEmail: 'jane@example.com',
          subject: 'Credit Balance Update',
          content: 'Your credit balance has been updated. Please check your account.',
          priority: 'medium',
          status: 'delivered',
          sentAt: new Date('2024-01-14T15:30:00Z'),
          deliveredAt: new Date('2024-01-14T15:31:00Z'),
          adminId: 'admin1',
          adminName: 'Admin User'
        }
      ];
      setMessages(mockMessages);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Mock data - replace with actual API call
      const mockUsers: User[] = [
        { id: 'user1', name: 'John Doe', email: 'john@example.com', status: 'active' },
        { id: 'user2', name: 'Jane Smith', email: 'jane@example.com', status: 'active' },
        { id: 'user3', name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive' }
      ];
      setUsers(mockUsers);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    }
  };

  const handleSendMessage = async () => {
    if (!messageForm.recipientId || !messageForm.subject || !messageForm.content) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Use actual API call
      const response = await adminApiService.sendMessage({
        recipientId: messageForm.recipientId,
        subject: messageForm.subject,
        content: messageForm.content,
        priority: messageForm.priority
      });

      if (response.success && response.data) {
        const recipient = users.find(u => u.id === messageForm.recipientId);
        const newMessage: Message = {
          id: response.data.id,
          recipientId: messageForm.recipientId,
          recipientName: recipient?.name || 'Unknown',
          recipientEmail: recipient?.email || 'Unknown',
          subject: messageForm.subject,
          content: messageForm.content,
          priority: messageForm.priority,
          status: 'sent',
          sentAt: new Date(),
          adminId: 'current-admin',
          adminName: 'Current Admin'
        };

        setMessages(prev => [newMessage, ...prev]);
        setMessageForm({ recipientId: '', subject: '', content: '', priority: 'medium' });
        setIsComposeOpen(false);

        toast({
          title: 'Success',
          description: 'Message sent successfully'
        });

        // Track delivery status
        trackMessageDelivery(response.data.id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const trackMessageDelivery = async (messageId: string) => {
    try {
      // Poll for delivery status updates
      const checkStatus = async () => {
        const statusResponse = await adminApiService.getMessageDeliveryStatus(messageId);
        if (statusResponse.success && statusResponse.data) {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId 
              ? { 
                  ...msg, 
                  status: statusResponse.data.status,
                  deliveredAt: statusResponse.data.deliveredAt ? new Date(statusResponse.data.deliveredAt) : undefined,
                  readAt: statusResponse.data.readAt ? new Date(statusResponse.data.readAt) : undefined
                }
              : msg
          ));
        }
      };

      // Check immediately and then every 30 seconds for 5 minutes
      checkStatus();
      const interval = setInterval(checkStatus, 30000);
      setTimeout(() => clearInterval(interval), 300000); // Stop after 5 minutes
    } catch (error) {
      console.error('Failed to track message delivery:', error);
    }
  };

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sent':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'read':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: Message['priority']) => {
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

  const filteredMessages = messages.filter(message => {
    const matchesSearch = 
      message.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || message.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || message.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const columns = [
    {
      key: 'recipient',
      label: 'Recipient',
      render: (value: unknown, message: Message) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium">{message.recipientName}</div>
            <div className="text-sm text-gray-500">{message.recipientEmail}</div>
          </div>
        </div>
      )
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (value: unknown, message: Message) => (
        <div className="max-w-xs truncate" title={message.subject}>
          {message.subject}
        </div>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (value: unknown, message: Message) => (
        <Badge className={getPriorityColor(message.priority)}>
          {message.priority}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown, message: Message) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(message.status)}
          <span className="capitalize">{message.status}</span>
        </div>
      )
    },
    {
      key: 'sentAt',
      label: 'Sent At',
      render: (value: unknown, message: Message) => (
        message.sentAt ? new Date(message.sentAt).toLocaleString() : '-'
      )
    },
    {
      key: 'readAt',
      label: 'Read At',
      render: (value: unknown, message: Message) => (
        message.readAt ? new Date(message.readAt).toLocaleString() : '-'
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with compose button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search messages..."
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
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
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
        </div>
        
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <Button>
              <MessageSquare className="h-4 w-4 mr-2" />
              Compose Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Compose Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient</Label>
                <Select value={messageForm.recipientId} onValueChange={(value) => 
                  setMessageForm(prev => ({ ...prev, recipientId: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={messageForm.priority} onValueChange={(value: any) => 
                  setMessageForm(prev => ({ ...prev, priority: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter message subject"
                />
              </div>
              
              <div>
                <Label htmlFor="content">Message</Label>
                <Textarea
                  id="content"
                  value={messageForm.content}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter your message"
                  rows={6}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendMessage} disabled={loading}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages table */}
      <AdminTable
        data={filteredMessages}
        columns={columns}
        loading={loading}
        emptyMessage="No messages found"
      />
    </div>
  );
};