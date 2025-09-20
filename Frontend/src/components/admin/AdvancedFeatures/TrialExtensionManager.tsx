import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Clock, 
  User, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Users,
  Activity
} from 'lucide-react';

interface TrialUser {
  id: string;
  name: string;
  email: string;
  trialStartDate: Date;
  trialEndDate: Date;
  trialStatus: 'active' | 'expired' | 'extended' | 'converted';
  extensionsUsed: number;
  maxExtensions: number;
  usage: {
    agentsCreated: number;
    callsMade: number;
    creditsUsed: number;
    lastActivity: Date;
  };
  conversionProbability: number;
  notes: string[];
}

interface TrialExtension {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  extensionDays: number;
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  requestDate: Date;
  approvalDate?: Date;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

interface TrialAnalytics {
  totalTrialUsers: number;
  activeTrials: number;
  expiredTrials: number;
  conversionRate: number;
  averageTrialDuration: number;
  extensionRequests: {
    pending: number;
    approved: number;
    rejected: number;
  };
  topConversionFactors: Array<{
    factor: string;
    impact: number;
  }>;
}

const TrialExtensionManager: React.FC = () => {
  const [trialUsers, setTrialUsers] = useState<TrialUser[]>([]);
  const [extensions, setExtensions] = useState<TrialExtension[]>([]);
  const [analytics, setAnalytics] = useState<TrialAnalytics | null>(null);
  const [selectedUser, setSelectedUser] = useState<TrialUser | null>(null);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrialData();
  }, []);

  const fetchTrialData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockTrialUsers: TrialUser[] = [
        {
          id: '1',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          trialStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          trialEndDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          trialStatus: 'active',
          extensionsUsed: 0,
          maxExtensions: 2,
          usage: {
            agentsCreated: 3,
            callsMade: 45,
            creditsUsed: 120,
            lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          conversionProbability: 85,
          notes: ['High engagement user', 'Requested demo call']
        },
        {
          id: '2',
          name: 'Bob Smith',
          email: 'bob@company.com',
          trialStartDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          trialEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          trialStatus: 'expired',
          extensionsUsed: 1,
          maxExtensions: 2,
          usage: {
            agentsCreated: 1,
            callsMade: 8,
            creditsUsed: 25,
            lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          },
          conversionProbability: 35,
          notes: ['Low usage', 'Needs follow-up']
        },
        {
          id: '3',
          name: 'Carol Davis',
          email: 'carol@startup.io',
          trialStartDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          trialEndDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          trialStatus: 'extended',
          extensionsUsed: 1,
          maxExtensions: 2,
          usage: {
            agentsCreated: 5,
            callsMade: 120,
            creditsUsed: 350,
            lastActivity: new Date(Date.now() - 30 * 60 * 1000)
          },
          conversionProbability: 92,
          notes: ['Power user', 'Likely to convert', 'Requested enterprise features']
        }
      ];

      const mockExtensions: TrialExtension[] = [
        {
          id: '1',
          userId: '3',
          userName: 'Carol Davis',
          userEmail: 'carol@startup.io',
          extensionDays: 14,
          reason: 'User needs more time to evaluate enterprise features',
          requestedBy: 'sales@company.com',
          approvedBy: 'admin@company.com',
          requestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          approvalDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'High-value prospect, approved for extended evaluation'
        },
        {
          id: '2',
          userId: '4',
          userName: 'David Wilson',
          userEmail: 'david@tech.com',
          extensionDays: 7,
          reason: 'Technical evaluation still in progress',
          requestedBy: 'support@company.com',
          requestDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          status: 'pending'
        }
      ];

      const mockAnalytics: TrialAnalytics = {
        totalTrialUsers: 156,
        activeTrials: 45,
        expiredTrials: 89,
        conversionRate: 23.5,
        averageTrialDuration: 16.2,
        extensionRequests: {
          pending: 3,
          approved: 12,
          rejected: 2
        },
        topConversionFactors: [
          { factor: 'High API Usage', impact: 78 },
          { factor: 'Multiple Agents Created', impact: 65 },
          { factor: 'Extended Trial', impact: 58 },
          { factor: 'Demo Call Completed', impact: 45 }
        ]
      };

      setTrialUsers(mockTrialUsers);
      setExtensions(mockExtensions);
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to fetch trial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'extended':
        return 'bg-blue-100 text-blue-800';
      case 'converted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConversionProbabilityColor = (probability: number) => {
    if (probability >= 70) return 'text-green-600';
    if (probability >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleExtensionRequest = async (userId: string, days: number, reason: string) => {
    try {
      const user = trialUsers.find(u => u.id === userId);
      if (!user) return;

      const newExtension: TrialExtension = {
        id: Date.now().toString(),
        userId,
        userName: user.name,
        userEmail: user.email,
        extensionDays: days,
        reason,
        requestedBy: 'admin@company.com',
        requestDate: new Date(),
        status: 'pending'
      };

      setExtensions(prev => [newExtension, ...prev]);
      setIsExtensionModalOpen(false);
    } catch (error) {
      console.error('Failed to create extension request:', error);
    }
  };

  const handleExtensionApproval = async (extensionId: string, approved: boolean, notes?: string) => {
    try {
      setExtensions(prev => prev.map(ext => {
        if (ext.id === extensionId) {
          const updatedExtension = {
            ...ext,
            status: (approved ? 'approved' : 'rejected') as 'approved' | 'rejected',
            approvedBy: 'admin@company.com',
            approvalDate: new Date(),
            notes
          };

          // If approved, update the user's trial end date
          if (approved) {
            setTrialUsers(prevUsers => prevUsers.map(user => {
              if (user.id === ext.userId) {
                const newEndDate = new Date(user.trialEndDate);
                newEndDate.setDate(newEndDate.getDate() + ext.extensionDays);
                return {
                  ...user,
                  trialEndDate: newEndDate,
                  trialStatus: 'extended' as const,
                  extensionsUsed: user.extensionsUsed + 1
                };
              }
              return user;
            }));
          }

          return updatedExtension;
        }
        return ext;
      }));
    } catch (error) {
      console.error('Failed to process extension:', error);
    }
  };

  const filteredUsers = trialUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.trialStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Trial Extension Manager</h2>
          <p className="text-gray-600">Manage trial extensions and track conversion opportunities</p>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeTrials}</div>
              <p className="text-xs text-muted-foreground">
                of {analytics.totalTrialUsers} total users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.conversionRate}%</div>
              <p className="text-xs text-muted-foreground">
                +2.1% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Extensions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.extensionRequests.pending}</div>
              <p className="text-xs text-muted-foreground">
                Require approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Trial Duration</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.averageTrialDuration} days</div>
              <p className="text-xs text-muted-foreground">
                Including extensions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Trial Users</TabsTrigger>
          <TabsTrigger value="extensions">Extension Requests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="extended">Extended</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={isExtensionModalOpen} onOpenChange={setIsExtensionModalOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Request Extension
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Trial Extension</DialogTitle>
                      <DialogDescription>
                        Create a new trial extension request for a user
                      </DialogDescription>
                    </DialogHeader>
                    <ExtensionRequestForm
                      users={trialUsers}
                      onSubmit={handleExtensionRequest}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{user.name}</h3>
                        <Badge className={getStatusColor(user.trialStatus)}>
                          {user.trialStatus.toUpperCase()}
                        </Badge>
                        <span className={`text-sm font-medium ${getConversionProbabilityColor(user.conversionProbability)}`}>
                          {user.conversionProbability}% conversion probability
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{user.email}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Days Remaining:</span>
                          <div className="font-medium">
                            {getDaysRemaining(user.trialEndDate)} days
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Agents Created:</span>
                          <div className="font-medium">{user.usage.agentsCreated}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Calls Made:</span>
                          <div className="font-medium">{user.usage.callsMade}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Credits Used:</span>
                          <div className="font-medium">{user.usage.creditsUsed}</div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="text-sm text-gray-500">Extensions: </span>
                        <span className="text-sm font-medium">
                          {user.extensionsUsed} / {user.maxExtensions} used
                        </span>
                      </div>

                      {user.notes.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {user.notes.map((note, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {note}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        View Details
                      </Button>
                      {user.trialStatus === 'expired' && user.extensionsUsed < user.maxExtensions && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsExtensionModalOpen(true);
                          }}
                        >
                          Extend Trial
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="extensions" className="space-y-4">
          <div className="space-y-4">
            {extensions.map((extension) => (
              <Card key={extension.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{extension.userName}</h3>
                        <Badge className={getStatusColor(extension.status)}>
                          {extension.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{extension.userEmail}</p>
                      <p className="text-sm mb-2">
                        <span className="font-medium">Extension:</span> {extension.extensionDays} days
                      </p>
                      <p className="text-sm mb-2">
                        <span className="font-medium">Reason:</span> {extension.reason}
                      </p>
                      <p className="text-sm text-gray-500">
                        Requested by {extension.requestedBy} on {extension.requestDate.toLocaleDateString()}
                      </p>
                      {extension.approvalDate && (
                        <p className="text-sm text-gray-500">
                          {extension.status === 'approved' ? 'Approved' : 'Rejected'} by {extension.approvedBy} on {extension.approvalDate.toLocaleDateString()}
                        </p>
                      )}
                      {extension.notes && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Notes:</span> {extension.notes}
                        </p>
                      )}
                    </div>

                    {extension.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleExtensionApproval(extension.id, true)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtensionApproval(extension.id, false)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Factors</CardTitle>
                  <CardDescription>
                    Top factors that influence trial-to-paid conversion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.topConversionFactors.map((factor, index) => (
                      <div key={factor.factor} className="flex items-center justify-between">
                        <span className="text-sm">{factor.factor}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${factor.impact}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{factor.impact}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Extension Statistics</CardTitle>
                  <CardDescription>
                    Overview of trial extension requests and outcomes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending Requests</span>
                      <Badge variant="outline">{analytics.extensionRequests.pending}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Approved Extensions</span>
                      <Badge className="bg-green-100 text-green-800">{analytics.extensionRequests.approved}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Rejected Requests</span>
                      <Badge className="bg-red-100 text-red-800">{analytics.extensionRequests.rejected}</Badge>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Approval Rate</span>
                        <span className="text-sm font-medium">
                          {Math.round((analytics.extensionRequests.approved / (analytics.extensionRequests.approved + analytics.extensionRequests.rejected)) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Extension Request Form Component
const ExtensionRequestForm: React.FC<{
  users: TrialUser[];
  onSubmit: (userId: string, days: number, reason: string) => void;
}> = ({ users, onSubmit }) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [extensionDays, setExtensionDays] = useState(7);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId && reason) {
      onSubmit(selectedUserId, extensionDays, reason);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="user">Select User</Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a user" />
          </SelectTrigger>
          <SelectContent>
            {users.filter(u => u.trialStatus !== 'converted').map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.email}) - {user.trialStatus}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="days">Extension Days</Label>
        <Select value={extensionDays.toString()} onValueChange={(value) => setExtensionDays(parseInt(value))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="14">14 days</SelectItem>
            <SelectItem value="21">21 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="reason">Reason for Extension</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this extension is needed..."
          required
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={!selectedUserId || !reason}>
          Request Extension
        </Button>
      </DialogFooter>
    </form>
  );
};

export default TrialExtensionManager;