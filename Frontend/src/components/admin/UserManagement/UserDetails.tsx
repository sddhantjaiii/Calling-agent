import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Calendar, 
  CreditCard, 
  Phone, 
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { AdminCard } from '../shared/AdminCard';
import type { AdminUserDetails, AdminUserListItem, ActivityItem, AgentSummary } from '../../../types/admin';
import { adminApiService } from '../../../services/adminApiService';

interface UserDetailsProps {
  user: AdminUserListItem;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (user: AdminUserListItem) => void;
  onCreditAdjust: (user: AdminUserListItem) => void;
}

export function UserDetails({ 
  user, 
  isOpen, 
  onClose, 
  onEdit, 
  onCreditAdjust 
}: UserDetailsProps) {
  const [userDetails, setUserDetails] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load detailed user information
  const loadUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApiService.getUser(user.id);
      
      if (response.success && response.data) {
        setUserDetails(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to load user details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  // Load user details when modal opens
  useEffect(() => {
    if (isOpen && user.id) {
      loadUserDetails();
    }
  }, [isOpen, user.id]);

  // Format date for display
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
                <span className="text-lg font-medium text-teal-800">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {user.name || 'Unknown User'}
                </h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <Badge variant={user.isActive ? 'default' : 'secondary'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => onEdit(user)}>
                Edit User
              </Button>
              <Button variant="outline" onClick={() => onCreditAdjust(user)}>
                Adjust Credits
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
                <span className="ml-2 text-sm text-gray-500">Loading user details...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Error Loading Details
                </h3>
                <p className="text-sm text-gray-500 mb-4">{error}</p>
                <Button onClick={loadUserDetails} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : userDetails ? (
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="agents">Agents</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="mr-2 h-5 w-5" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                        <p className="text-sm text-gray-900">{userDetails.user.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-sm text-gray-900">{userDetails.user.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Role</label>
                        <Badge variant={userDetails.user.role === 'admin' ? 'destructive' : 'secondary'}>
                          {userDetails.user.role?.toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <Badge variant={userDetails.user.isActive ? 'default' : 'secondary'}>
                          {userDetails.user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Registration Date</label>
                        <p className="text-sm text-gray-900">
                          {formatDate(user.registrationDate)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Last Login</label>
                        <p className="text-sm text-gray-900">
                          {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AdminCard
                      title="Total Agents"
                      value={userDetails.statistics?.agentCount || userDetails.statistics?.totalAgents || 0}
                      icon={Activity}
                    />
                    <AdminCard
                      title="Total Calls"
                      value={userDetails.statistics?.totalCalls || 0}
                      icon={Phone}
                    />
                    <AdminCard
                      title="Credits Used"
                      value={formatCurrency(userDetails.statistics?.totalCreditsUsed || 0)}
                      icon={CreditCard}
                    />
                    <AdminCard
                      title="Success Rate"
                      value={`${userDetails.statistics?.successRate || 0}%`}
                      icon={TrendingUp}
                    />
                  </div>

                  {/* Additional Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Average Call Duration</label>
                        <p className="text-sm text-gray-900">
                          {formatDuration(userDetails.statistics?.averageCallDuration || 0)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Credits Remaining</label>
                        <p className="text-sm text-gray-900">
                          {formatCurrency(userDetails.user.credits || 0)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Agents Tab */}
                <TabsContent value="agents" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>User's Agents ({userDetails.agents.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {userDetails.agents.length === 0 ? (
                        <div className="text-center py-8">
                          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Agents
                          </h3>
                          <p className="text-sm text-gray-500">
                            This user hasn't created any agents yet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userDetails.agents.map((agent: AgentSummary) => (
                            <div
                              key={agent.id}
                              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <Activity className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {agent.name}
                                  </h4>
                                  <p className="text-xs text-gray-500">
                                    {agent.type} • {agent.callCount} calls
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                                  {agent.status}
                                </Badge>
                                {agent.lastUsed && (
                                  <span className="text-xs text-gray-500">
                                    Last used: {formatDate(agent.lastUsed)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Clock className="mr-2 h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {userDetails.recentActivity.length === 0 ? (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Recent Activity
                          </h3>
                          <p className="text-sm text-gray-500">
                            No recent activity found for this user.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {userDetails.recentActivity.map((activity: ActivityItem) => (
                            <div
                              key={activity.id}
                              className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg"
                            >
                              <div className="flex-shrink-0">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900">
                                  {activity.description}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(activity.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <AdminCard
                      title="Current Credits"
                      value={formatCurrency(userDetails.user.credits || 0)}
                      icon={CreditCard}
                    />
                    <AdminCard
                      title="Total Spent"
                      value={formatCurrency(userDetails.statistics?.totalCreditsUsed || 0)}
                      icon={TrendingUp}
                    />
                    <AdminCard
                      title="Average per Call"
                      value={formatCurrency(
                        (userDetails.statistics?.totalCalls || 0) > 0
                          ? (userDetails.statistics?.totalCreditsUsed || 0) / (userDetails.statistics?.totalCalls || 1)
                          : 0
                      )}
                      icon={Activity}
                    />
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Billing Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Subscription Tier</label>
                          <p className="text-sm text-gray-900">
                            {userDetails.user.subscriptionTier || 'Free'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Payment Status</label>
                          <Badge variant="default">Active</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDetails;