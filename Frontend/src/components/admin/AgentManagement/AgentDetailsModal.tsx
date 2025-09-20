import React, { useState, useEffect } from 'react';
import { X, Edit, Save, User, Phone, Activity, Settings, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Switch } from '../../ui/switch';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { adminApiService } from '../../../services/adminApiService';
import type { AdminAgentListItem } from '../../../types/admin';

interface AgentDetailsModalProps {
  agent: AdminAgentListItem;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface AgentUpdateData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export const AgentDetailsModal: React.FC<AgentDetailsModalProps> = ({
  agent,
  open,
  onClose,
  onUpdate
}) => {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [editData, setEditData] = useState<AgentUpdateData>({
    name: agent.name,
    description: agent.description || '',
    is_active: agent.status === 'active'
  });

  // Reset edit data when agent changes
  useEffect(() => {
    setEditData({
      name: agent.name,
      description: agent.description || '',
      is_active: agent.status === 'active'
    });
    setEditMode(false);
    setError(null);
  }, [agent]);

  // Handle save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await adminApiService.updateAgent(agent.id, editData);
      
      if (response.success) {
        setEditMode(false);
        onUpdate();
      } else {
        throw new Error(response.error?.message || 'Failed to update agent');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancel = () => {
    setEditData({
      name: agent.name,
      description: agent.description || '',
      is_active: agent.status === 'active'
    });
    setEditMode(false);
    setError(null);
  };

  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Agent Details: {agent.name}
            </div>
            <div className="flex items-center gap-2">
              {!editMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="owner">Owner</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Agent Name</label>
                    {editMode ? (
                      <Input
                        value={editData.name || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter agent name"
                      />
                    ) : (
                      <div className="text-sm mt-1">{agent.name}</div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    {editMode ? (
                      <Textarea
                        value={editData.description || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter agent description"
                        rows={3}
                      />
                    ) : (
                      <div className="text-sm mt-1">{agent.description || 'No description'}</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Status</label>
                    {editMode ? (
                      <Switch
                        checked={editData.is_active}
                        onCheckedChange={(checked) => setEditData(prev => ({ ...prev, is_active: checked }))}
                      />
                    ) : (
                      <Badge variant={agent.status === 'active' ? 'success' : 'secondary'}>
                        {agent.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Agent ID</label>
                    <div className="text-sm mt-1 font-mono">{agent.id}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <div className="text-sm mt-1">
                      <Badge variant={agent.type === 'call' ? 'default' : 'secondary'}>
                        {agent.type === 'call' ? 'Call Agent' : 'Chat Agent'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status & Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Health Status</span>
                    <Badge 
                      variant={
                        agent.healthStatus === 'healthy' ? 'success' :
                        agent.healthStatus === 'warning' ? 'warning' : 'destructive'
                      }
                    >
                      {agent.healthStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">ElevenLabs Status</span>
                    <Badge 
                      variant={
                        agent.elevenlabsStatus === 'active' ? 'success' :
                        agent.elevenlabsStatus === 'error' ? 'destructive' : 'secondary'
                      }
                    >
                      {agent.elevenlabsStatus || 'Unknown'}
                    </Badge>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Created</label>
                    <div className="text-sm mt-1">{formatDate(agent.created_at)}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Last Updated</label>
                    <div className="text-sm mt-1">{formatDate(agent.updated_at)}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Last Call</label>
                    <div className="text-sm mt-1">
                      {agent.lastCallAt ? formatDate(agent.lastCallAt) : 'Never'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="configuration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Agent Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Configuration details would be loaded from ElevenLabs API</p>
                  <p className="text-sm">This includes voice settings, LLM configuration, and conversation flow</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Call Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{agent.callCount || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Calls</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">85%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Avg Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold">2.5m</div>
                    <div className="text-sm text-muted-foreground">Average Call</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Detailed performance charts and analytics would be displayed here</p>
                  <p className="text-sm">Including call volume trends, success rates over time, and error analysis</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="owner" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Owner Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">User Name</label>
                  <div className="text-sm mt-1">{agent.userName}</div>
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <div className="text-sm mt-1">{agent.userEmail}</div>
                </div>

                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <div className="text-sm mt-1 font-mono">{agent.user_id}</div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    View User Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};