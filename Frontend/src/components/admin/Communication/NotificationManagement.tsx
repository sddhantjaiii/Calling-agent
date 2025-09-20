import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, BellOff, Settings, AlertTriangle, Info, CheckCircle, XCircle, Users, Activity, Shield } from 'lucide-react';
import { AdminTable } from '../shared/AdminTable';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/services/adminApiService';

interface NotificationSetting extends Record<string, unknown> {
  id: string;
  category: 'system' | 'security' | 'user-activity' | 'support' | 'billing';
  name: string;
  description: string;
  enabled: boolean;
  channels: NotificationChannel[];
  conditions: NotificationCondition[];
  adminId?: string;
  adminName?: string;
}

interface NotificationChannel {
  type: 'email' | 'in-app' | 'sms' | 'webhook';
  enabled: boolean;
  config?: Record<string, any>;
}

interface NotificationCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number;
}

interface NotificationHistory extends Record<string, unknown> {
  id: string;
  settingId: string;
  settingName: string;
  category: string;
  title: string;
  message: string;
  channels: string[];
  status: 'sent' | 'failed' | 'pending';
  recipientCount: number;
  sentAt: Date;
  error?: string;
}

export const NotificationManagement: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadNotificationSettings();
    loadNotificationHistory();
  }, []);

  const loadNotificationSettings = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockSettings: NotificationSetting[] = [
        {
          id: '1',
          category: 'system',
          name: 'System Maintenance Alerts',
          description: 'Notifications about scheduled maintenance and system downtime',
          enabled: true,
          channels: [
            { type: 'email', enabled: true },
            { type: 'in-app', enabled: true },
            { type: 'sms', enabled: false },
            { type: 'webhook', enabled: false }
          ],
          conditions: []
        },
        {
          id: '2',
          category: 'security',
          name: 'Failed Login Attempts',
          description: 'Alert when there are multiple failed login attempts',
          enabled: true,
          channels: [
            { type: 'email', enabled: true },
            { type: 'in-app', enabled: true },
            { type: 'sms', enabled: true },
            { type: 'webhook', enabled: false }
          ],
          conditions: [
            { field: 'failed_attempts', operator: 'greater_than', value: 5 }
          ]
        },
        {
          id: '3',
          category: 'user-activity',
          name: 'New User Registrations',
          description: 'Notifications when new users register',
          enabled: true,
          channels: [
            { type: 'email', enabled: true },
            { type: 'in-app', enabled: true },
            { type: 'sms', enabled: false },
            { type: 'webhook', enabled: true }
          ],
          conditions: []
        },
        {
          id: '4',
          category: 'support',
          name: 'High Priority Tickets',
          description: 'Immediate alerts for urgent support tickets',
          enabled: true,
          channels: [
            { type: 'email', enabled: true },
            { type: 'in-app', enabled: true },
            { type: 'sms', enabled: true },
            { type: 'webhook', enabled: false }
          ],
          conditions: [
            { field: 'priority', operator: 'equals', value: 'urgent' }
          ]
        },
        {
          id: '5',
          category: 'billing',
          name: 'Payment Failures',
          description: 'Notifications about failed payments and billing issues',
          enabled: true,
          channels: [
            { type: 'email', enabled: true },
            { type: 'in-app', enabled: true },
            { type: 'sms', enabled: false },
            { type: 'webhook', enabled: true }
          ],
          conditions: []
        }
      ];
      setSettings(mockSettings);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationHistory = async () => {
    try {
      // Mock data - replace with actual API call
      const mockHistory: NotificationHistory[] = [
        {
          id: '1',
          settingId: '2',
          settingName: 'Failed Login Attempts',
          category: 'security',
          title: 'Multiple Failed Login Attempts Detected',
          message: 'User john@example.com has 6 failed login attempts in the last 10 minutes.',
          channels: ['email', 'in-app', 'sms'],
          status: 'sent',
          recipientCount: 3,
          sentAt: new Date('2024-01-15T10:30:00Z')
        },
        {
          id: '2',
          settingId: '3',
          settingName: 'New User Registrations',
          category: 'user-activity',
          title: 'New User Registration',
          message: 'A new user has registered: Jane Smith (jane@example.com)',
          channels: ['email', 'in-app', 'webhook'],
          status: 'sent',
          recipientCount: 2,
          sentAt: new Date('2024-01-15T09:15:00Z')
        },
        {
          id: '3',
          settingId: '4',
          settingName: 'High Priority Tickets',
          category: 'support',
          title: 'Urgent Support Ticket Created',
          message: 'Ticket TKT-2024-001 has been marked as urgent and requires immediate attention.',
          channels: ['email', 'in-app', 'sms'],
          status: 'failed',
          recipientCount: 0,
          sentAt: new Date('2024-01-15T08:45:00Z'),
          error: 'SMS service temporarily unavailable'
        }
      ];
      setHistory(mockHistory);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load notification history',
        variant: 'destructive'
      });
    }
  };

  const handleToggleSetting = async (settingId: string, enabled: boolean) => {
    setLoading(true);
    try {
      // Use actual API call
      const response = await adminApiService.updateNotificationSetting(settingId, { enabled });

      if (response.success) {
        setSettings(prev => prev.map(s => 
          s.id === settingId ? { ...s, enabled } : s
        ));

        toast({
          title: 'Success',
          description: `Notification setting ${enabled ? 'enabled' : 'disabled'}`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification setting',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChannel = async (settingId: string, channelType: string, enabled: boolean) => {
    setLoading(true);
    try {
      // Get current setting
      const currentSetting = settings.find(s => s.id === settingId);
      if (!currentSetting) return;

      const updatedChannels = currentSetting.channels.map(c => 
        c.type === channelType ? { ...c, enabled } : c
      );

      // Use actual API call
      const response = await adminApiService.updateNotificationSetting(settingId, { 
        enabled: currentSetting.enabled,
        channels: updatedChannels 
      });

      if (response.success) {
        setSettings(prev => prev.map(s => 
          s.id === settingId 
            ? { ...s, channels: updatedChannels }
            : s
        ));

        toast({
          title: 'Success',
          description: `${channelType} notifications ${enabled ? 'enabled' : 'disabled'}`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification channel',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async (settingId: string) => {
    setLoading(true);
    try {
      const response = await adminApiService.testNotification(settingId);

      if (response.success && response.data) {
        const { channels } = response.data;
        const successCount = channels.filter(c => c.success).length;
        const failedCount = channels.filter(c => !c.success).length;

        toast({
          title: 'Test Notification Results',
          description: `${successCount} channels succeeded, ${failedCount} failed`,
          variant: failedCount > 0 ? 'destructive' : 'default'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test notification',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'user-activity':
        return <Users className="h-4 w-4" />;
      case 'support':
        return <AlertTriangle className="h-4 w-4" />;
      case 'billing':
        return <Activity className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'system':
        return 'bg-blue-100 text-blue-800';
      case 'security':
        return 'bg-red-100 text-red-800';
      case 'user-activity':
        return 'bg-green-100 text-green-800';
      case 'support':
        return 'bg-yellow-100 text-yellow-800';
      case 'billing':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  const filteredSettings = settings.filter(setting => {
    const matchesCategory = categoryFilter === 'all' || setting.category === categoryFilter;
    return matchesCategory;
  });

  const filteredHistory = history.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesCategory && matchesStatus;
  });

  const settingsColumns = [
    {
      key: 'name',
      label: 'Notification',
      render: (value: unknown, setting: NotificationSetting) => (
        <div className="flex items-center gap-3">
          {getCategoryIcon(setting.category)}
          <div>
            <div className="font-medium">{setting.name}</div>
            <div className="text-sm text-gray-500">{setting.description}</div>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (value: unknown, setting: NotificationSetting) => (
        <Badge className={getCategoryColor(setting.category)}>
          {setting.category.replace('-', ' ')}
        </Badge>
      )
    },
    {
      key: 'channels',
      label: 'Channels',
      render: (value: unknown, setting: NotificationSetting) => (
        <div className="flex gap-1">
          {setting.channels.map(channel => (
            <Badge 
              key={channel.type}
              variant={channel.enabled ? 'default' : 'secondary'}
              className="text-xs"
            >
              {channel.type}
            </Badge>
          ))}
        </div>
      )
    },
    {
      key: 'enabled',
      label: 'Status',
      render: (value: unknown, setting: NotificationSetting) => (
        <div className="flex items-center gap-2">
          {setting.enabled ? (
            <Bell className="h-4 w-4 text-green-500" />
          ) : (
            <BellOff className="h-4 w-4 text-gray-400" />
          )}
          <Switch
            checked={setting.enabled}
            onCheckedChange={(enabled) => handleToggleSetting(setting.id, enabled)}
          />
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: unknown, setting: NotificationSetting) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleTestNotification(setting.id)}
          disabled={!setting.enabled || loading}
        >
          Test
        </Button>
      )
    }
  ];

  const historyColumns = [
    {
      key: 'title',
      label: 'Notification',
      render: (value: unknown, item: NotificationHistory) => (
        <div>
          <div className="font-medium">{item.title}</div>
          <div className="text-sm text-gray-500 truncate max-w-xs">
            {item.message}
          </div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (value: unknown, item: NotificationHistory) => (
        <Badge className={getCategoryColor(item.category)}>
          {item.category.replace('-', ' ')}
        </Badge>
      )
    },
    {
      key: 'channels',
      label: 'Channels',
      render: (value: unknown, item: NotificationHistory) => (
        <div className="flex gap-1">
          {item.channels.map(channel => (
            <Badge key={channel} variant="outline" className="text-xs">
              {channel}
            </Badge>
          ))}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown, item: NotificationHistory) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(item.status)}
          <span className="capitalize">{item.status}</span>
          {item.error && (
            <span className="text-xs text-red-500" title={item.error}>
              (Error)
            </span>
          )}
        </div>
      )
    },
    {
      key: 'recipients',
      label: 'Recipients',
      render: (value: unknown, item: NotificationHistory) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-gray-400" />
          {item.recipientCount}
        </div>
      )
    },
    {
      key: 'sentAt',
      label: 'Sent At',
      render: (value: unknown, item: NotificationHistory) => (
        new Date(item.sentAt).toLocaleString()
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant={activeTab === 'settings' ? 'default' : 'outline'}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'outline'}
            onClick={() => setActiveTab('history')}
          >
            <Bell className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="user-activity">User Activity</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
            </SelectContent>
          </Select>
          
          {activeTab === 'history' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Settings overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Active Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {settings.filter(s => s.enabled).length}
                </div>
                <div className="text-sm text-gray-500">
                  of {settings.length} total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {settings.filter(s => s.category === 'security' && s.enabled).length}
                </div>
                <div className="text-sm text-gray-500">
                  security notifications
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {settings.filter(s => 
                    (s.category === 'security' || s.category === 'system') && s.enabled
                  ).length}
                </div>
                <div className="text-sm text-gray-500">
                  critical notifications
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings table */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminTable
                data={filteredSettings}
                columns={settingsColumns}
                loading={loading}
                emptyMessage="No notification settings found"
              />
            </CardContent>
          </Card>

          {/* Channel configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Channel Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {filteredSettings.map(setting => (
                <div key={setting.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(setting.category)}
                    <div className="flex-1">
                      <div className="font-medium">{setting.name}</div>
                      <div className="text-sm text-gray-500">{setting.description}</div>
                    </div>
                    <Switch
                      checked={setting.enabled}
                      onCheckedChange={(enabled) => handleToggleSetting(setting.id, enabled)}
                    />
                  </div>
                  
                  {setting.enabled && (
                    <div className="ml-7 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {setting.channels.map(channel => (
                        <div key={channel.type} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm capitalize">{channel.type}</Label>
                          </div>
                          <Switch
                            checked={channel.enabled}
                            onCheckedChange={(enabled) => 
                              handleToggleChannel(setting.id, channel.type, enabled)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Separator />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* History overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {history.filter(h => h.status === 'sent').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {history.filter(h => h.status === 'failed').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {history.filter(h => h.status === 'pending').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Recipients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {history.reduce((sum, h) => sum + h.recipientCount, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History table */}
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
            </CardHeader>
            <CardContent>
              <AdminTable
                data={filteredHistory}
                columns={historyColumns}
                loading={loading}
                emptyMessage="No notification history found"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};