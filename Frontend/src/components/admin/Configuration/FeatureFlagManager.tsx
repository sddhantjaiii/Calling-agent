import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Flag, 
  Edit, 
  Users, 
  Globe, 
  Target,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle,
  Settings,
  Percent,
  TrendingUp,
  Activity,
  UserCheck,
  Crown,
  BarChart3,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';
import { Slider } from '../../ui/slider';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../../ui/tabs';
import { Progress } from '../../ui/progress';
import { useToast } from '../../ui/use-toast';
import { AdminCard } from '../shared/AdminCard';

import { adminApiService } from '../../../services/adminApiService';
import type { FeatureFlagConfig, ProprietaryFeature } from '../../../types/admin';

interface FeatureFlagManagerProps {
  className?: string;
}

interface FeatureFlagFormData {
  name: string;
  description: string;
  isEnabled: boolean;
  scope: 'global' | 'user' | 'tier';
  targetUsers: string[];
  targetTiers: string[];
  rolloutPercentage: number;
}

interface FeatureUsageStats {
  flagId: string;
  totalUsers: number;
  activeUsers: number;
  usagePercentage: number;
  lastUsed: Date;
  usageByTier: Record<string, number>;
  usageByDay: Array<{ date: string; count: number }>;
}

interface TierFeatureConfig {
  tier: string;
  features: string[];
  userCount: number;
  isAutoManaged: boolean;
}

interface BulkFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkUpdate: (updates: Array<{ flagId: string; isEnabled: boolean; targetUsers?: string[]; targetTiers?: string[] }>) => void;
}

interface FeatureAnalyticsProps {
  featureFlags: FeatureFlagConfig[];
  usageStats: FeatureUsageStats[];
}

const FeatureAnalytics: React.FC<FeatureAnalyticsProps> = ({ featureFlags, usageStats }) => {
  const totalFeatures = featureFlags.length;
  const enabledFeatures = featureFlags.filter(f => f.isEnabled).length;
  const totalUsers = usageStats.reduce((sum, stat) => sum + stat.totalUsers, 0);
  const activeUsers = usageStats.reduce((sum, stat) => sum + stat.activeUsers, 0);

  return (
    <div className="space-y-6">
      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminCard
          title="Feature Adoption"
          value={`${Math.round((enabledFeatures / totalFeatures) * 100)}%`}
          icon={TrendingUp}
          trend={{ value: 5, isPositive: true }}
        />
        <AdminCard
          title="Active Users"
          value={activeUsers.toString()}
          icon={UserCheck}
          trend={{ value: 12, isPositive: true }}
        />
        <AdminCard
          title="Usage Rate"
          value={`${Math.round((activeUsers / Math.max(totalUsers, 1)) * 100)}%`}
          icon={Activity}
          trend={{ value: 8, isPositive: true }}
        />
        <AdminCard
          title="Premium Features"
          value={featureFlags.filter(f => f.scope === 'tier').length.toString()}
          icon={Crown}
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Feature Usage Details */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Usage Analytics</CardTitle>
          <CardDescription>
            Detailed usage statistics for each feature flag
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usageStats.map((stat) => {
              const flag = featureFlags.find(f => f.id === stat.flagId);
              if (!flag) return null;

              return (
                <div key={stat.flagId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{flag.name}</h4>
                      <p className="text-sm text-gray-600">{flag.description}</p>
                    </div>
                    <Badge variant={flag.isEnabled ? 'default' : 'secondary'}>
                      {flag.isEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total Users</div>
                      <div className="text-2xl font-bold">{stat.totalUsers}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Active Users</div>
                      <div className="text-2xl font-bold">{stat.activeUsers}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Usage Rate</div>
                      <div className="text-2xl font-bold">{stat.usagePercentage}%</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm text-gray-600 mb-2">Usage Progress</div>
                    <Progress value={stat.usagePercentage} className="w-full" />
                  </div>

                  {Object.keys(stat.usageByTier).length > 0 && (
                    <div className="mt-4">
                      <div className="text-sm text-gray-600 mb-2">Usage by Tier</div>
                      <div className="flex space-x-4">
                        {Object.entries(stat.usageByTier).map(([tier, count]) => (
                          <div key={tier} className="text-center">
                            <div className="text-sm font-medium capitalize">{tier}</div>
                            <div className="text-lg font-bold">{count}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const BulkFeatureModal: React.FC<BulkFeatureModalProps> = ({
  isOpen,
  onClose,
  onBulkUpdate
}) => {
  const [selectedFlags, setSelectedFlags] = useState<Array<{ flagId: string; name: string; isEnabled: boolean }>>([]);
  const [bulkAction, setBulkAction] = useState<'enable' | 'disable'>('enable');
  const [targetScope, setTargetScope] = useState<'all' | 'tier' | 'user'>('all');
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Mock feature flags for bulk operations
  const mockFlags = [
    { flagId: 'dashboard_kpis', name: 'Dashboard KPIs', isEnabled: false },
    { flagId: 'agent_analytics', name: 'Agent Analytics', isEnabled: true },
    { flagId: 'advanced_reports', name: 'Advanced Reports', isEnabled: false },
  ];

  const handleBulkUpdate = () => {
    const updates = selectedFlags.map(flag => ({
      flagId: flag.flagId,
      isEnabled: bulkAction === 'enable',
      ...(targetScope === 'tier' && { targetTiers: selectedTiers }),
      ...(targetScope === 'user' && { targetUsers: selectedUsers })
    }));
    onBulkUpdate(updates);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Feature Flag Operations</DialogTitle>
          <DialogDescription>
            Enable or disable multiple feature flags at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Action</Label>
            <Select value={bulkAction} onValueChange={(value: 'enable' | 'disable') => setBulkAction(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enable">Enable Selected Features</SelectItem>
                <SelectItem value="disable">Disable Selected Features</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Target Scope</Label>
            <Select value={targetScope} onValueChange={(value: 'all' | 'tier' | 'user') => setTargetScope(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="tier">Specific Tiers</SelectItem>
                <SelectItem value="user">Specific Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetScope === 'tier' && (
            <div>
              <Label>Target Tiers</Label>
              <div className="space-y-2">
                {['free', 'premium', 'enterprise'].map(tier => (
                  <div key={tier} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`bulk-tier-${tier}`}
                      checked={selectedTiers.includes(tier)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTiers([...selectedTiers, tier]);
                        } else {
                          setSelectedTiers(selectedTiers.filter(t => t !== tier));
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`bulk-tier-${tier}`} className="capitalize">
                      {tier}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {targetScope === 'user' && (
            <div>
              <Label>Target Users</Label>
              <Input
                placeholder="Enter user IDs or emails (comma-separated)"
                value={selectedUsers.join(', ')}
                onChange={(e) => setSelectedUsers(e.target.value.split(',').map(u => u.trim()).filter(Boolean))}
              />
            </div>
          )}

          <div>
            <Label>Select Feature Flags</Label>
            <div className="max-h-64 overflow-y-auto border rounded-md">
              {mockFlags.map((flag) => (
                <div
                  key={flag.flagId}
                  className="flex items-center space-x-2 p-3 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    id={`flag-${flag.flagId}`}
                    checked={selectedFlags.some(f => f.flagId === flag.flagId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFlags([...selectedFlags, flag]);
                      } else {
                        setSelectedFlags(selectedFlags.filter(f => f.flagId !== flag.flagId));
                      }
                    }}
                    className="rounded"
                  />
                  <label htmlFor={`flag-${flag.flagId}`} className="flex-1 cursor-pointer">
                    <div className="font-medium">{flag.name}</div>
                    <div className="text-sm text-gray-500">
                      Currently: {flag.isEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {selectedFlags.length} feature flag(s) selected
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleBulkUpdate} disabled={selectedFlags.length === 0}>
            {bulkAction === 'enable' ? 'Enable' : 'Disable'} Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TierFeatureManagement: React.FC<{ featureFlags: FeatureFlagConfig[] }> = ({ featureFlags }) => {
  const [tierConfigs, setTierConfigs] = useState<TierFeatureConfig[]>([
    { tier: 'free', features: [], userCount: 0, isAutoManaged: true },
    { tier: 'premium', features: ['dashboard_kpis'], userCount: 0, isAutoManaged: true },
    { tier: 'enterprise', features: ['dashboard_kpis', 'agent_analytics', 'advanced_reports'], userCount: 0, isAutoManaged: true }
  ]);

  const handleTierFeatureToggle = (tier: string, featureId: string, enabled: boolean) => {
    setTierConfigs(configs => 
      configs.map(config => {
        if (config.tier === tier) {
          const features = enabled 
            ? [...config.features, featureId]
            : config.features.filter(f => f !== featureId);
          return { ...config, features };
        }
        return config;
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tierConfigs.map((config) => (
          <Card key={config.tier} className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{config.tier} Tier</CardTitle>
                <Badge variant={config.isAutoManaged ? 'default' : 'secondary'}>
                  {config.isAutoManaged ? 'Auto' : 'Manual'}
                </Badge>
              </div>
              <CardDescription>
                {config.userCount} users • {config.features.length} features enabled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {featureFlags.map((flag) => {
                  const isEnabled = config.features.includes(flag.id);
                  const isRestricted = flag.id === 'advanced_reports' && config.tier !== 'enterprise';
                  
                  return (
                    <div key={flag.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{flag.name}</div>
                        <div className="text-xs text-gray-500">{flag.description}</div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        disabled={isRestricted}
                        onCheckedChange={(checked) => handleTierFeatureToggle(config.tier, flag.id, checked)}
                      />
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span>Auto-manage features</span>
                  <Switch
                    checked={config.isAutoManaged}
                    onCheckedChange={(checked) => {
                      setTierConfigs(configs => 
                        configs.map(c => c.tier === config.tier ? { ...c, isAutoManaged: checked } : c)
                      );
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const FeatureFlagManager: React.FC<FeatureFlagManagerProps> = ({ className }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlagConfig | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [formData, setFormData] = useState<FeatureFlagFormData>({
    name: '',
    description: '',
    isEnabled: false,
    scope: 'global',
    targetUsers: [],
    targetTiers: [],
    rolloutPercentage: 100
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch feature flags
  const { data: featureFlagsResponse, isLoading, error } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: () => adminApiService.getFeatureFlags(),
  });

  const featureFlags = featureFlagsResponse?.data || [];

  // Mock usage statistics (in real implementation, this would come from API)
  const mockUsageStats: FeatureUsageStats[] = [
    {
      flagId: 'dashboard_kpis',
      totalUsers: 150,
      activeUsers: 89,
      usagePercentage: 59,
      lastUsed: new Date(),
      usageByTier: { premium: 45, enterprise: 44 },
      usageByDay: []
    },
    {
      flagId: 'agent_analytics',
      totalUsers: 75,
      activeUsers: 52,
      usagePercentage: 69,
      lastUsed: new Date(),
      usageByTier: { premium: 28, enterprise: 24 },
      usageByDay: []
    },
    {
      flagId: 'advanced_reports',
      totalUsers: 25,
      activeUsers: 18,
      usagePercentage: 72,
      lastUsed: new Date(),
      usageByTier: { enterprise: 18 },
      usageByDay: []
    }
  ];

  // Proprietary features configuration
  const proprietaryFeatures: ProprietaryFeature[] = [
    {
      id: 'dashboard_kpis',
      name: 'Dashboard KPIs',
      description: 'Advanced KPI tracking and analytics in user dashboard',
      defaultEnabled: false,
      tierRestrictions: ['premium', 'enterprise']
    },
    {
      id: 'agent_analytics',
      name: 'Agent Analytics',
      description: 'Detailed agent performance analytics and insights',
      defaultEnabled: false,
      tierRestrictions: ['premium', 'enterprise']
    },
    {
      id: 'advanced_reports',
      name: 'Advanced Reports',
      description: 'Custom report generation and advanced data export',
      defaultEnabled: false,
      tierRestrictions: ['enterprise']
    }
  ];

  // Update feature flag mutation
  const updateFeatureFlagMutation = useMutation({
    mutationFn: ({ flagId, config }: { flagId: string; config: Partial<FeatureFlagConfig> }) =>
      adminApiService.updateFeatureFlag(flagId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] });
      setShowEditModal(false);
      resetForm();
      toast({
        title: 'Feature Flag Updated',
        description: 'Feature flag has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isEnabled: false,
      scope: 'global',
      targetUsers: [],
      targetTiers: [],
      rolloutPercentage: 100
    });
    setSelectedFlag(null);
  };

  const handleToggleFlag = (flagId: string, isEnabled: boolean) => {
    updateFeatureFlagMutation.mutate({
      flagId,
      config: { isEnabled }
    });
  };

  const handleEditFlag = (flag: FeatureFlagConfig) => {
    setSelectedFlag(flag);
    setFormData({
      name: flag.name,
      description: flag.description,
      isEnabled: flag.isEnabled,
      scope: flag.scope,
      targetUsers: flag.targetUsers || [],
      targetTiers: flag.targetTiers || [],
      rolloutPercentage: flag.rolloutPercentage || 100
    });
    setShowEditModal(true);
  };

  const handleUpdateFlag = () => {
    if (selectedFlag) {
      updateFeatureFlagMutation.mutate({
        flagId: selectedFlag.id,
        config: formData
      });
    }
  };

  const handleBulkUpdate = (updates: Array<{ flagId: string; isEnabled: boolean; targetUsers?: string[]; targetTiers?: string[] }>) => {
    updates.forEach(update => {
      const config: Partial<FeatureFlagConfig> = { 
        isEnabled: update.isEnabled,
        ...(update.targetUsers && { targetUsers: update.targetUsers }),
        ...(update.targetTiers && { targetTiers: update.targetTiers })
      };
      
      updateFeatureFlagMutation.mutate({
        flagId: update.flagId,
        config
      });
    });
    toast({
      title: 'Bulk Update Complete',
      description: `Updated ${updates.length} feature flags with new targeting rules.`,
    });
  };

  const handleExportFeatureConfig = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      featureFlags: featureFlags.map(flag => ({
        ...flag,
        usageStats: mockUsageStats.find(stat => stat.flagId === flag.id)
      })),
      proprietaryFeatures,
      summary: {
        totalFeatures: featureFlags.length,
        enabledFeatures: featureFlags.filter(f => f.isEnabled).length,
        totalUsers: mockUsageStats.reduce((sum, stat) => sum + stat.totalUsers, 0),
        activeUsers: mockUsageStats.reduce((sum, stat) => sum + stat.activeUsers, 0)
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-flags-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Configuration Exported',
      description: 'Feature flag configuration has been exported successfully.',
    });
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'global':
        return <Globe className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'tier':
        return <Target className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getScopeBadge = (scope: string) => {
    const variants = {
      global: 'default',
      user: 'secondary',
      tier: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[scope as keyof typeof variants] || 'secondary'}>
        {scope}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Feature Flags</h3>
        <p className="text-gray-600">Failed to load feature flag configuration</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feature Flag Management</h2>
          <p className="text-gray-600">Control proprietary features and user access</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportFeatureConfig}>
            <Download className="h-4 w-4 mr-2" />
            Export Config
          </Button>
          <Button variant="outline" onClick={() => setShowBulkModal(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Bulk Operations
          </Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="proprietary">Proprietary Features</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tiers">Tier Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AdminCard
              title="Total Features"
              value={featureFlags.length.toString()}
              icon={Flag}
              trend={{ value: 0, isPositive: true }}
            />
            <AdminCard
              title="Enabled Features"
              value={featureFlags.filter(flag => flag.isEnabled).length.toString()}
              icon={CheckCircle}
              trend={{ value: 0, isPositive: true }}
            />
            <AdminCard
              title="Global Features"
              value={featureFlags.filter(flag => flag.scope === 'global').length.toString()}
              icon={Globe}
              trend={{ value: 0, isPositive: true }}
            />
            <AdminCard
              title="User-Specific"
              value={featureFlags.filter(flag => flag.scope === 'user').length.toString()}
              icon={Users}
              trend={{ value: 0, isPositive: true }}
            />
          </div>

          {/* All Feature Flags Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Feature Flags</CardTitle>
              <CardDescription>
                Complete list of feature flags and their configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Rollout</TableHead>
                      <TableHead>Targets</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {featureFlags.map((flag) => (
                      <TableRow key={flag.id}>
                        <TableCell className="font-medium">{flag.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{flag.description}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleFlag(flag.id, !flag.isEnabled)}
                            >
                              {flag.isEnabled ? (
                                <ToggleRight className="h-5 w-5 text-green-500" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-gray-400" />
                              )}
                            </Button>
                            <Badge variant={flag.isEnabled ? 'default' : 'secondary'}>
                              {flag.isEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getScopeIcon(flag.scope)}
                            {getScopeBadge(flag.scope)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Percent className="h-4 w-4 text-gray-400" />
                            <span>{flag.rolloutPercentage || 100}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {flag.scope === 'user' && (
                              <span>{flag.targetUsers?.length || 0} users</span>
                            )}
                            {flag.scope === 'tier' && (
                              <span>{flag.targetTiers?.length || 0} tiers</span>
                            )}
                            {flag.scope === 'global' && (
                              <span>All users</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditFlag(flag)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proprietary" className="space-y-6">
          {/* Proprietary Features Section */}
          <Card>
            <CardHeader>
              <CardTitle>Proprietary Features</CardTitle>
              <CardDescription>
                Manage access to premium features like KPIs and advanced analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {proprietaryFeatures.map((feature) => {
                  const flag = featureFlags.find(f => f.id === feature.id);
                  const isEnabled = flag?.isEnabled || false;
                  const usageStats = mockUsageStats.find(stat => stat.flagId === feature.id);
                  
                  return (
                    <Card key={feature.id} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{feature.name}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleFlag(feature.id, !isEnabled)}
                          >
                            {isEnabled ? (
                              <ToggleRight className="h-5 w-5 text-green-500" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        <CardDescription>{feature.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Status:</span>
                            <Badge variant={isEnabled ? 'default' : 'secondary'}>
                              {isEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Default:</span>
                            <span className="text-gray-600">
                              {feature.defaultEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Tiers:</span>
                            <div className="flex space-x-1">
                              {feature.tierRestrictions.map(tier => (
                                <Badge key={tier} variant="outline" className="text-xs">
                                  {tier}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {usageStats && (
                            <div className="flex items-center justify-between text-sm">
                              <span>Usage:</span>
                              <span className="text-gray-600">
                                {usageStats.activeUsers}/{usageStats.totalUsers} users
                              </span>
                            </div>
                          )}
                          {flag && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => handleEditFlag(flag)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Configure
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <FeatureAnalytics featureFlags={featureFlags} usageStats={mockUsageStats} />
        </TabsContent>

        <TabsContent value="tiers" className="space-y-6">
          <TierFeatureManagement featureFlags={featureFlags} />
        </TabsContent>
      </Tabs>



      {/* Edit Feature Flag Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Feature Flag</DialogTitle>
            <DialogDescription>
              Update feature flag settings and targeting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-enabled"
                checked={formData.isEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
              />
              <Label htmlFor="edit-enabled">Enable this feature flag</Label>
            </div>

            <div>
              <Label>Scope</Label>
              <Select 
                value={formData.scope} 
                onValueChange={(value: 'global' | 'user' | 'tier') => 
                  setFormData({ ...formData, scope: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (All Users)</SelectItem>
                  <SelectItem value="user">Specific Users</SelectItem>
                  <SelectItem value="tier">User Tiers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.scope !== 'global' && (
              <div>
                <Label>Rollout Percentage</Label>
                <div className="space-y-2">
                  <Slider
                    value={[formData.rolloutPercentage]}
                    onValueChange={(value) => setFormData({ ...formData, rolloutPercentage: value[0] })}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-sm text-gray-600 text-center">
                    {formData.rolloutPercentage}% of targeted users
                  </div>
                </div>
              </div>
            )}

            {formData.scope === 'tier' && (
              <div>
                <Label>Target Tiers</Label>
                <div className="space-y-2">
                  {['free', 'premium', 'enterprise'].map(tier => (
                    <div key={tier} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`tier-${tier}`}
                        checked={formData.targetTiers.includes(tier)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              targetTiers: [...formData.targetTiers, tier]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              targetTiers: formData.targetTiers.filter(t => t !== tier)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={`tier-${tier}`} className="capitalize">
                        {tier}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateFlag}
              disabled={updateFeatureFlagMutation.isPending}
            >
              {updateFeatureFlagMutation.isPending ? 'Updating...' : 'Update Feature Flag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Operations Modal */}
      <BulkFeatureModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onBulkUpdate={handleBulkUpdate}
      />
    </div>
  );
};

export default FeatureFlagManager;