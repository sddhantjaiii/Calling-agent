import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Crown, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Search,
  Filter,
  Edit,
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface UserTier {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  limits: {
    agents: number;
    calls: number;
    contacts: number;
  };
  isActive: boolean;
}

interface UserSubscription {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  currentTier: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: Date;
  endDate?: Date;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  nextBillingDate?: Date;
  trialEndsAt?: Date;
}

interface TierChangeRequest {
  id: string;
  userId: string;
  userEmail: string;
  fromTier: string;
  toTier: string;
  requestedAt: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

const UserTierManager: React.FC = () => {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<UserTier[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [changeRequests, setChangeRequests] = useState<TierChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserSubscription | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newTier, setNewTier] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      setTiers([
        {
          id: 'free',
          name: 'Free',
          description: 'Basic features for getting started',
          price: 0,
          features: ['5 agents', '100 calls/month', '1,000 contacts'],
          limits: { agents: 5, calls: 100, contacts: 1000 },
          isActive: true
        },
        {
          id: 'pro',
          name: 'Professional',
          description: 'Advanced features for growing businesses',
          price: 49,
          features: ['25 agents', '1,000 calls/month', '10,000 contacts', 'Analytics'],
          limits: { agents: 25, calls: 1000, contacts: 10000 },
          isActive: true
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'Full platform access for large organizations',
          price: 199,
          features: ['Unlimited agents', 'Unlimited calls', 'Unlimited contacts', 'Priority support'],
          limits: { agents: -1, calls: -1, contacts: -1 },
          isActive: true
        }
      ]);

      setSubscriptions([
        {
          id: '1',
          userId: 'user1',
          userEmail: 'john@example.com',
          userName: 'John Doe',
          currentTier: 'pro',
          status: 'active',
          startDate: new Date('2024-01-15'),
          billingCycle: 'monthly',
          amount: 49,
          nextBillingDate: new Date('2024-02-15')
        },
        {
          id: '2',
          userId: 'user2',
          userEmail: 'jane@example.com',
          userName: 'Jane Smith',
          currentTier: 'free',
          status: 'trial',
          startDate: new Date('2024-01-20'),
          billingCycle: 'monthly',
          amount: 0,
          trialEndsAt: new Date('2024-02-20')
        }
      ]);

      setChangeRequests([
        {
          id: '1',
          userId: 'user3',
          userEmail: 'bob@example.com',
          fromTier: 'pro',
          toTier: 'enterprise',
          requestedAt: new Date('2024-01-25'),
          reason: 'Need unlimited agents for expansion',
          status: 'pending'
        }
      ]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load tier management data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTierChange = async (userId: string, newTierId: string) => {
    try {
      // API call to change user tier
      toast({
        title: 'Success',
        description: 'User tier updated successfully'
      });
      loadData();
      setIsEditDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user tier',
        variant: 'destructive'
      });
    }
  };

  const handleChangeRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      // API call to handle change request
      toast({
        title: 'Success',
        description: `Change request ${action}d successfully`
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} change request`,
        variant: 'destructive'
      });
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || sub.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      trial: 'secondary',
      cancelled: 'destructive',
      expired: 'outline'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const getTierBadge = (tierId: string) => {
    const tier = tiers.find(t => t.id === tierId);
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800'
    };
    
    return (
      <Badge className={colors[tierId as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {tier?.name || tierId}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading tier management...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscriptions">User Subscriptions</TabsTrigger>
          <TabsTrigger value="tiers">Tier Configuration</TabsTrigger>
          <TabsTrigger value="requests">Change Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Current Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Next Billing</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{subscription.userName}</div>
                        <div className="text-sm text-muted-foreground">{subscription.userEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getTierBadge(subscription.currentTier)}</TableCell>
                    <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">${subscription.amount}/{subscription.billingCycle}</div>
                        <div className="text-sm text-muted-foreground">
                          Started {subscription.startDate.toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {subscription.nextBillingDate ? (
                        subscription.nextBillingDate.toLocaleDateString()
                      ) : subscription.trialEndsAt ? (
                        <span className="text-orange-600">
                          Trial ends {subscription.trialEndsAt.toLocaleDateString()}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(subscription);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {tiers.map((tier) => (
              <Card key={tier.id} className={tier.id === 'enterprise' ? 'border-purple-200' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {tier.id === 'enterprise' && <Crown className="h-5 w-5 text-purple-600" />}
                      {tier.name}
                    </CardTitle>
                    <Badge variant={tier.isActive ? 'default' : 'secondary'}>
                      {tier.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-3xl font-bold">
                      ${tier.price}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </div>
                    <ul className="space-y-2">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button variant="outline" className="w-full">
                      Edit Tier
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Tier Change Requests</CardTitle>
              <CardDescription>Review and approve user tier change requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changeRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="font-medium">{request.userEmail}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTierBadge(request.fromTier)}
                          <span>→</span>
                          {getTierBadge(request.toTier)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                      <TableCell>{request.requestedAt.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleChangeRequestAction(request.id, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChangeRequestAction(request.id, 'reject')}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Tier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Tier</DialogTitle>
            <DialogDescription>
              Update the subscription tier for {selectedUser?.userName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Tier</Label>
              <div className="mt-1">
                {selectedUser && getTierBadge(selectedUser.currentTier)}
              </div>
            </div>
            <div>
              <Label htmlFor="newTier">New Tier</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name} - ${tier.price}/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedUser && handleTierChange(selectedUser.userId, newTier)}
              disabled={!newTier}
            >
              Update Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserTierManager;