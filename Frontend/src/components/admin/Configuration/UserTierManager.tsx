import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Crown, 
  Users, 
  DollarSign, 
  Settings,
  Edit,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
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
import { useToast } from '../../ui/use-toast';
import { AdminCard } from '../shared/AdminCard';
// import { AdminTable } from '../shared/AdminTable';

interface UserTierManagerProps {
  className?: string;
}

interface UserTier {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  limits: {
    contacts: number;
    agents: number;
    callsPerMonth: number;
  };
  isActive: boolean;
}

interface TierFormData {
  name: string;
  description: string;
  price: number;
  features: string[];
  limits: {
    contacts: number;
    agents: number;
    callsPerMonth: number;
  };
  isActive: boolean;
}

export const UserTierManager: React.FC<UserTierManagerProps> = ({ className }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<UserTier | null>(null);
  const [formData, setFormData] = useState<TierFormData>({
    name: '',
    description: '',
    price: 0,
    features: [],
    limits: {
      contacts: 0,
      agents: 0,
      callsPerMonth: 0
    },
    isActive: true
  });

  const { toast } = useToast();

  // Mock data for user tiers
  const mockTiers: UserTier[] = [
    {
      id: '1',
      name: 'Free',
      description: 'Basic features for getting started',
      price: 0,
      features: ['Basic agents', 'Limited calls', 'Email support'],
      limits: {
        contacts: 100,
        agents: 1,
        callsPerMonth: 50
      },
      isActive: true
    },
    {
      id: '2',
      name: 'Premium',
      description: 'Advanced features for growing businesses',
      price: 29.99,
      features: ['Advanced agents', 'Unlimited calls', 'Priority support', 'Analytics'],
      limits: {
        contacts: 1000,
        agents: 5,
        callsPerMonth: 1000
      },
      isActive: true
    },
    {
      id: '3',
      name: 'Enterprise',
      description: 'Full-featured solution for large organizations',
      price: 99.99,
      features: ['All features', 'Custom integrations', 'Dedicated support', 'White-label'],
      limits: {
        contacts: 10000,
        agents: 25,
        callsPerMonth: 10000
      },
      isActive: true
    }
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      features: [],
      limits: {
        contacts: 0,
        agents: 0,
        callsPerMonth: 0
      },
      isActive: true
    });
    setSelectedTier(null);
  };

  const handleEditTier = (tier: UserTier) => {
    setSelectedTier(tier);
    setFormData({
      name: tier.name,
      description: tier.description,
      price: tier.price,
      features: tier.features,
      limits: tier.limits,
      isActive: tier.isActive
    });
    setShowEditModal(true);
  };

  const handleSave = () => {
    // In real implementation, this would call the API
    toast({
      title: 'Tier Updated',
      description: 'User tier has been updated successfully.',
    });
    setShowEditModal(false);
    setShowCreateModal(false);
    resetForm();
  };

  const getTierIcon = (tierName: string) => {
    switch (tierName.toLowerCase()) {
      case 'free':
        return <Users className="h-4 w-4" />;
      case 'premium':
        return <Crown className="h-4 w-4" />;
      case 'enterprise':
        return <Settings className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getTierBadge = (tierName: string) => {
    const variants = {
      free: 'secondary',
      premium: 'default',
      enterprise: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[tierName.toLowerCase() as keyof typeof variants] || 'secondary'}>
        {tierName}
      </Badge>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Tier Management</h2>
          <p className="text-gray-600">Manage subscription tiers and feature access</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tier
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminCard
          title="Total Tiers"
          value={mockTiers.length.toString()}
          icon={Crown}
          trend={{ value: 0, isPositive: true }}
        />
        <AdminCard
          title="Active Tiers"
          value={mockTiers.filter(tier => tier.isActive).length.toString()}
          icon={CheckCircle}
          trend={{ value: 0, isPositive: true }}
        />
        <AdminCard
          title="Free Users"
          value="1,234"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <AdminCard
          title="Revenue/Month"
          value="$12,450"
          icon={DollarSign}
          trend={{ value: 8.5, isPositive: true }}
        />
      </div>

      {/* Tiers Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockTiers.map((tier) => (
          <Card key={tier.id} className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getTierIcon(tier.name)}
                  <CardTitle>{tier.name}</CardTitle>
                </div>
                {getTierBadge(tier.name)}
              </div>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {tier.price === 0 ? 'Free' : `$${tier.price}`}
                </div>
                {tier.price > 0 && (
                  <div className="text-sm text-gray-500">per month</div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Limits:</div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>• {tier.limits.contacts.toLocaleString()} contacts</div>
                  <div>• {tier.limits.agents} agents</div>
                  <div>• {tier.limits.callsPerMonth.toLocaleString()} calls/month</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Features:</div>
                <div className="space-y-1">
                  {tier.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      • {feature}
                    </div>
                  ))}
                  {tier.features.length > 3 && (
                    <div className="text-sm text-gray-500">
                      +{tier.features.length - 3} more features
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Badge variant={tier.isActive ? 'default' : 'secondary'}>
                  {tier.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTier(tier)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Tiers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tiers</CardTitle>
          <CardDescription>
            Detailed view of all subscription tiers and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead>Calls/Month</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTierIcon(tier.name)}
                        <div>
                          <div className="font-medium">{tier.name}</div>
                          <div className="text-sm text-gray-500">{tier.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {tier.price === 0 ? 'Free' : `$${tier.price}/mo`}
                      </div>
                    </TableCell>
                    <TableCell>{tier.limits.contacts.toLocaleString()}</TableCell>
                    <TableCell>{tier.limits.agents}</TableCell>
                    <TableCell>{tier.limits.callsPerMonth.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {tier.features.length} features
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tier.isActive ? 'default' : 'secondary'}>
                        {tier.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTier(tier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={tier.name.toLowerCase() === 'free'}
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
 {/* Create/Edit Tier Modal */}
      <Dialog open={showCreateModal || showEditModal} onOpenChange={() => {
        setShowCreateModal(false);
        setShowEditModal(false);
        resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {showCreateModal ? 'Create New Tier' : 'Edit Tier'}
            </DialogTitle>
            <DialogDescription>
              {showCreateModal 
                ? 'Create a new subscription tier with custom features and limits'
                : 'Update tier configuration and features'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tier-name">Tier Name</Label>
                <Input
                  id="tier-name"
                  placeholder="Enter tier name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="tier-price">Monthly Price ($)</Label>
                <Input
                  id="tier-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tier-description">Description</Label>
              <Textarea
                id="tier-description"
                placeholder="Enter tier description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contacts-limit">Contact Limit</Label>
                <Input
                  id="contacts-limit"
                  type="number"
                  min="0"
                  value={formData.limits.contacts}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: {
                      ...formData.limits,
                      contacts: parseInt(e.target.value) || 0
                    }
                  })}
                />
              </div>

              <div>
                <Label htmlFor="agents-limit">Agent Limit</Label>
                <Input
                  id="agents-limit"
                  type="number"
                  min="0"
                  value={formData.limits.agents}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: {
                      ...formData.limits,
                      agents: parseInt(e.target.value) || 0
                    }
                  })}
                />
              </div>

              <div>
                <Label htmlFor="calls-limit">Calls per Month</Label>
                <Input
                  id="calls-limit"
                  type="number"
                  min="0"
                  value={formData.limits.callsPerMonth}
                  onChange={(e) => setFormData({
                    ...formData,
                    limits: {
                      ...formData.limits,
                      callsPerMonth: parseInt(e.target.value) || 0
                    }
                  })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="tier-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="tier-active">Active tier</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {showCreateModal ? 'Create Tier' : 'Update Tier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserTierManager;