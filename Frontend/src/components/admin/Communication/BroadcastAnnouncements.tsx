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
import { Search, Megaphone, Users, Calendar, Eye, Edit, Trash2 } from 'lucide-react';
import { AdminTable } from '../shared/AdminTable';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/services/adminApiService';

interface Announcement extends Record<string, unknown> {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetAudience: 'all' | 'active' | 'inactive' | 'tier-specific';
  targetTiers?: string[];
  status: 'draft' | 'scheduled' | 'published' | 'expired';
  scheduledAt?: Date;
  publishedAt?: Date;
  expiresAt?: Date;
  viewCount: number;
  adminId: string;
  adminName: string;
  createdAt: Date;
}

interface UserTier {
  id: string;
  name: string;
  userCount: number;
}

export const BroadcastAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [userTiers, setUserTiers] = useState<UserTier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state for creating/editing announcements
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'info' as const,
    priority: 'medium' as const,
    targetAudience: 'all' as const,
    targetTiers: [] as string[],
    scheduledAt: '',
    expiresAt: ''
  });

  useEffect(() => {
    loadAnnouncements();
    loadUserTiers();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockAnnouncements: Announcement[] = [
        {
          id: '1',
          title: 'System Maintenance Scheduled',
          content: 'We will be performing system maintenance on January 20th from 2:00 AM to 4:00 AM EST. During this time, the service may be temporarily unavailable.',
          type: 'warning',
          priority: 'high',
          targetAudience: 'all',
          status: 'published',
          publishedAt: new Date('2024-01-15T10:00:00Z'),
          expiresAt: new Date('2024-01-21T00:00:00Z'),
          viewCount: 1250,
          adminId: 'admin1',
          adminName: 'Admin User',
          createdAt: new Date('2024-01-15T09:30:00Z')
        },
        {
          id: '2',
          title: 'New Feature: Advanced Analytics',
          content: 'We are excited to announce the launch of our new Advanced Analytics feature for Premium users. This includes detailed call insights, performance metrics, and custom reporting.',
          type: 'success',
          priority: 'medium',
          targetAudience: 'tier-specific',
          targetTiers: ['premium', 'enterprise'],
          status: 'published',
          publishedAt: new Date('2024-01-14T15:00:00Z'),
          viewCount: 890,
          adminId: 'admin1',
          adminName: 'Admin User',
          createdAt: new Date('2024-01-14T14:30:00Z')
        },
        {
          id: '3',
          title: 'Holiday Schedule Update',
          content: 'Our support team will have limited availability during the holiday season. Please expect longer response times for non-urgent inquiries.',
          type: 'info',
          priority: 'low',
          targetAudience: 'all',
          status: 'draft',
          scheduledAt: new Date('2024-12-20T00:00:00Z'),
          viewCount: 0,
          adminId: 'admin1',
          adminName: 'Admin User',
          createdAt: new Date('2024-01-10T11:00:00Z')
        }
      ];
      setAnnouncements(mockAnnouncements);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load announcements',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserTiers = async () => {
    try {
      // Mock data - replace with actual API call
      const mockTiers: UserTier[] = [
        { id: 'free', name: 'Free', userCount: 5000 },
        { id: 'basic', name: 'Basic', userCount: 1200 },
        { id: 'premium', name: 'Premium', userCount: 800 },
        { id: 'enterprise', name: 'Enterprise', userCount: 150 }
      ];
      setUserTiers(mockTiers);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load user tiers',
        variant: 'destructive'
      });
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.content) {
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
      const response = await adminApiService.createAnnouncement({
        title: announcementForm.title,
        content: announcementForm.content,
        type: announcementForm.type,
        priority: announcementForm.priority,
        targetAudience: announcementForm.targetAudience,
        targetTiers: announcementForm.targetTiers,
        scheduledAt: announcementForm.scheduledAt ? new Date(announcementForm.scheduledAt) : undefined,
        expiresAt: announcementForm.expiresAt ? new Date(announcementForm.expiresAt) : undefined
      });

      if (response.success && response.data) {
        const newAnnouncement: Announcement = {
          ...response.data,
          viewCount: 0,
          adminId: 'current-admin',
          adminName: 'Current Admin',
          createdAt: new Date()
        };

        setAnnouncements(prev => [newAnnouncement, ...prev]);
        resetForm();
        setIsCreateOpen(false);

        toast({
          title: 'Success',
          description: 'Announcement created successfully'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;

    setLoading(true);
    try {
      // Mock API call - replace with actual implementation
      const updatedAnnouncement: Announcement = {
        ...editingAnnouncement,
        title: announcementForm.title,
        content: announcementForm.content,
        type: announcementForm.type,
        priority: announcementForm.priority,
        targetAudience: announcementForm.targetAudience,
        targetTiers: announcementForm.targetTiers,
        scheduledAt: announcementForm.scheduledAt ? new Date(announcementForm.scheduledAt) : undefined,
        expiresAt: announcementForm.expiresAt ? new Date(announcementForm.expiresAt) : undefined
      };

      setAnnouncements(prev => prev.map(a => a.id === editingAnnouncement.id ? updatedAnnouncement : a));
      resetForm();
      setEditingAnnouncement(null);

      toast({
        title: 'Success',
        description: 'Announcement updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update announcement',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    setLoading(true);
    try {
      // Mock API call - replace with actual implementation
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      
      toast({
        title: 'Success',
        description: 'Announcement deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAnnouncementForm({
      title: '',
      content: '',
      type: 'info',
      priority: 'medium',
      targetAudience: 'all',
      targetTiers: [],
      scheduledAt: '',
      expiresAt: ''
    });
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      targetAudience: announcement.targetAudience,
      targetTiers: announcement.targetTiers || [],
      scheduledAt: announcement.scheduledAt ? announcement.scheduledAt.toISOString().slice(0, 16) : '',
      expiresAt: announcement.expiresAt ? announcement.expiresAt.toISOString().slice(0, 16) : ''
    });
  };

  const getTypeColor = (type: Announcement['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: Announcement['status']) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = 
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || announcement.status === statusFilter;
    const matchesType = typeFilter === 'all' || announcement.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (value: unknown, announcement: Announcement) => (
        <div>
          <div className="font-medium">{announcement.title}</div>
          <div className="text-sm text-gray-500 truncate max-w-xs">
            {announcement.content}
          </div>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      render: (value: unknown, announcement: Announcement) => (
        <Badge className={getTypeColor(announcement.type)}>
          {announcement.type}
        </Badge>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (value: unknown, announcement: Announcement) => (
        <Badge variant="outline">
          {announcement.priority}
        </Badge>
      )
    },
    {
      key: 'audience',
      label: 'Audience',
      render: (value: unknown, announcement: Announcement) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="capitalize">{announcement.targetAudience}</span>
          {announcement.targetTiers && announcement.targetTiers.length > 0 && (
            <span className="text-sm text-gray-500">
              ({announcement.targetTiers.join(', ')})
            </span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown, announcement: Announcement) => (
        <Badge className={getStatusColor(announcement.status)}>
          {announcement.status}
        </Badge>
      )
    },
    {
      key: 'views',
      label: 'Views',
      render: (value: unknown, announcement: Announcement) => (
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4 text-gray-400" />
          {announcement.viewCount.toLocaleString()}
        </div>
      )
    },
    {
      key: 'publishedAt',
      label: 'Published',
      render: (value: unknown, announcement: Announcement) => (
        announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleDateString() : 
        announcement.scheduledAt ? `Scheduled: ${new Date(announcement.scheduledAt).toLocaleDateString()}` : 
        'Draft'
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: unknown, announcement: Announcement) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(announcement)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteAnnouncement(announcement.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search announcements..."
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isCreateOpen || !!editingAnnouncement} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingAnnouncement(null);
            resetForm();
          } else {
            setIsCreateOpen(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Megaphone className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter announcement title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={announcementForm.type} onValueChange={(value: any) => 
                    setAnnouncementForm(prev => ({ ...prev, type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={announcementForm.priority} onValueChange={(value: any) => 
                    setAnnouncementForm(prev => ({ ...prev, priority: value }))
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
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select value={announcementForm.targetAudience} onValueChange={(value: any) => 
                    setAnnouncementForm(prev => ({ ...prev, targetAudience: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="active">Active Users</SelectItem>
                      <SelectItem value="inactive">Inactive Users</SelectItem>
                      <SelectItem value="tier-specific">Specific Tiers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {announcementForm.targetAudience === 'tier-specific' && (
                <div>
                  <Label>Target Tiers</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {userTiers.map(tier => (
                      <div key={tier.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={tier.id}
                          checked={announcementForm.targetTiers.includes(tier.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setAnnouncementForm(prev => ({
                                ...prev,
                                targetTiers: [...prev.targetTiers, tier.id]
                              }));
                            } else {
                              setAnnouncementForm(prev => ({
                                ...prev,
                                targetTiers: prev.targetTiers.filter(t => t !== tier.id)
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={tier.id} className="text-sm">
                          {tier.name} ({tier.userCount} users)
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter announcement content"
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledAt">Schedule For (Optional)</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={announcementForm.scheduledAt}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={announcementForm.expiresAt}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setEditingAnnouncement(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement} 
                  disabled={loading}
                >
                  <Megaphone className="h-4 w-4 mr-2" />
                  {editingAnnouncement ? 'Update' : 'Create'} Announcement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements table */}
      <AdminTable
        data={filteredAnnouncements}
        columns={columns}
        loading={loading}
        emptyMessage="No announcements found"
      />
    </div>
  );
};