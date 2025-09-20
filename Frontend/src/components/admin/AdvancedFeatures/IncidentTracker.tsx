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
  AlertTriangle, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  Plus,
  Search,
  Filter,
  Calendar,
  MessageSquare,
  FileText
} from 'lucide-react';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignedTo?: string;
  reportedBy: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  category: string;
  affectedServices: string[];
  timeline: IncidentTimelineEntry[];
  tags: string[];
}

interface IncidentTimelineEntry {
  id: string;
  timestamp: Date;
  action: string;
  description: string;
  user: string;
  type: 'status_change' | 'comment' | 'assignment' | 'resolution';
}

interface CreateIncidentData {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  affectedServices: string[];
  assignedTo?: string;
}

const IncidentTracker: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockIncidents: Incident[] = [
      {
        id: '1',
        title: 'ElevenLabs API Rate Limit Exceeded',
        description: 'Multiple users reporting failed voice generation due to API rate limits',
        severity: 'high',
        status: 'investigating',
        assignedTo: 'john.doe@company.com',
        reportedBy: 'system@company.com',
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(Date.now() - 1800000),
        category: 'API Integration',
        affectedServices: ['Voice Generation', 'Agent Calls'],
        tags: ['elevenlabs', 'rate-limit', 'api'],
        timeline: [
          {
            id: '1',
            timestamp: new Date(Date.now() - 3600000),
            action: 'Incident Created',
            description: 'Automated alert triggered due to high error rate',
            user: 'system@company.com',
            type: 'status_change'
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 3000000),
            action: 'Assigned to John Doe',
            description: 'Incident assigned for investigation',
            user: 'admin@company.com',
            type: 'assignment'
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 1800000),
            action: 'Status Updated',
            description: 'Changed status to investigating after initial analysis',
            user: 'john.doe@company.com',
            type: 'status_change'
          }
        ]
      },
      {
        id: '2',
        title: 'Database Connection Pool Exhaustion',
        description: 'High traffic causing database connection pool to reach maximum capacity',
        severity: 'critical',
        status: 'resolved',
        assignedTo: 'jane.smith@company.com',
        reportedBy: 'monitoring@company.com',
        createdAt: new Date(Date.now() - 7200000),
        updatedAt: new Date(Date.now() - 3600000),
        resolvedAt: new Date(Date.now() - 3600000),
        category: 'Infrastructure',
        affectedServices: ['Database', 'API', 'Dashboard'],
        tags: ['database', 'performance', 'connections'],
        timeline: [
          {
            id: '1',
            timestamp: new Date(Date.now() - 7200000),
            action: 'Incident Created',
            description: 'Database connection alerts triggered',
            user: 'monitoring@company.com',
            type: 'status_change'
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 6600000),
            action: 'Investigating',
            description: 'Started investigation into connection pool issues',
            user: 'jane.smith@company.com',
            type: 'status_change'
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 3600000),
            action: 'Resolved',
            description: 'Increased connection pool size and optimized queries',
            user: 'jane.smith@company.com',
            type: 'resolution'
          }
        ]
      }
    ];

    setIncidents(mockIncidents);
    setFilteredIncidents(mockIncidents);
    setLoading(false);
  }, []);

  // Filter incidents based on search and filters
  useEffect(() => {
    let filtered = incidents;

    if (searchQuery) {
      filtered = filtered.filter(incident =>
        incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(incident => incident.status === statusFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(incident => incident.severity === severityFilter);
    }

    setFilteredIncidents(filtered);
  }, [incidents, searchQuery, statusFilter, severityFilter]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'investigating':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleCreateIncident = async (data: CreateIncidentData) => {
    try {
      const newIncident: Incident = {
        id: Date.now().toString(),
        ...data,
        status: 'open',
        reportedBy: 'admin@company.com', // Current user
        createdAt: new Date(),
        updatedAt: new Date(),
        timeline: [
          {
            id: '1',
            timestamp: new Date(),
            action: 'Incident Created',
            description: 'Incident manually created by admin',
            user: 'admin@company.com',
            type: 'status_change'
          }
        ],
        tags: []
      };

      setIncidents(prev => [newIncident, ...prev]);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create incident:', error);
    }
  };

  const updateIncidentStatus = async (incidentId: string, newStatus: string) => {
    try {
      setIncidents(prev => prev.map(incident => {
        if (incident.id === incidentId) {
          const updatedIncident = {
            ...incident,
            status: newStatus as any,
            updatedAt: new Date(),
            ...(newStatus === 'resolved' && { resolvedAt: new Date() }),
            timeline: [
              ...incident.timeline,
              {
                id: Date.now().toString(),
                timestamp: new Date(),
                action: `Status changed to ${newStatus}`,
                description: `Incident status updated to ${newStatus}`,
                user: 'admin@company.com',
                type: 'status_change' as const
              }
            ]
          };
          
          if (selectedIncident?.id === incidentId) {
            setSelectedIncident(updatedIncident);
          }
          
          return updatedIncident;
        }
        return incident;
      }));
    } catch (error) {
      console.error('Failed to update incident status:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
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
          <h2 className="text-2xl font-bold">Incident Tracker</h2>
          <p className="text-gray-600">Track and manage system incidents and resolutions</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Incident</DialogTitle>
              <DialogDescription>
                Report a new system incident for tracking and resolution
              </DialogDescription>
            </DialogHeader>
            <CreateIncidentForm onSubmit={handleCreateIncident} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search incidents..."
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>No incidents found matching your criteria</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredIncidents.map((incident) => (
            <Card key={incident.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityIcon(incident.severity)}
                      <h3 className="font-semibold text-lg">{incident.title}</h3>
                      <Badge className={getSeverityColor(incident.severity)}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(incident.status)}>
                        {incident.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-3">{incident.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {incident.assignedTo || 'Unassigned'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {incident.createdAt.toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {incident.timeline.length} updates
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {incident.affectedServices.map((service) => (
                        <Badge key={service} variant="outline" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIncident(incident)}
                    >
                      View Details
                    </Button>
                    {incident.status !== 'resolved' && incident.status !== 'closed' && (
                      <Select
                        value={incident.status}
                        onValueChange={(value) => updateIncidentStatus(incident.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="investigating">Investigating</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Incident Details Modal */}
      {selectedIncident && (
        <IncidentDetailsModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdate={(updatedIncident) => {
            setIncidents(prev => prev.map(inc => 
              inc.id === updatedIncident.id ? updatedIncident : inc
            ));
            setSelectedIncident(updatedIncident);
          }}
        />
      )}
    </div>
  );
};

// Create Incident Form Component
const CreateIncidentForm: React.FC<{ onSubmit: (data: CreateIncidentData) => void }> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<CreateIncidentData>({
    title: '',
    description: '',
    severity: 'medium',
    category: '',
    affectedServices: [],
    assignedTo: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="severity">Severity</Label>
          <Select value={formData.severity} onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value as any }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            placeholder="e.g., API Integration, Infrastructure"
            required
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit">Create Incident</Button>
      </DialogFooter>
    </form>
  );
};

// Incident Details Modal Component
const IncidentDetailsModal: React.FC<{
  incident: Incident;
  onClose: () => void;
  onUpdate: (incident: Incident) => void;
}> = ({ incident, onClose, onUpdate }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getSeverityIcon(incident.severity)}
            {incident.title}
          </DialogTitle>
          <div className="flex gap-2">
            <Badge className={getSeverityColor(incident.severity)}>
              {incident.severity.toUpperCase()}
            </Badge>
            <Badge className={getStatusColor(incident.status)}>
              {incident.status.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Description</Label>
                <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
              </div>
              <div>
                <Label>Assigned To</Label>
                <p className="text-sm text-gray-600 mt-1">{incident.assignedTo || 'Unassigned'}</p>
              </div>
              <div>
                <Label>Category</Label>
                <p className="text-sm text-gray-600 mt-1">{incident.category}</p>
              </div>
              <div>
                <Label>Created</Label>
                <p className="text-sm text-gray-600 mt-1">{incident.createdAt.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <Label>Affected Services</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {incident.affectedServices.map((service) => (
                  <Badge key={service} variant="outline">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <div className="space-y-4">
              {incident.timeline.map((entry) => (
                <div key={entry.id} className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{entry.action}</h4>
                      <span className="text-sm text-gray-500">
                        {entry.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                    <p className="text-xs text-gray-500 mt-1">by {entry.user}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to get severity icon (defined outside component to avoid re-creation)
const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
    case 'high':
      return <AlertTriangle className="h-4 w-4" />;
    case 'medium':
      return <Clock className="h-4 w-4" />;
    case 'low':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

// Helper function to get severity color
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'low':
      return 'bg-blue-100 text-blue-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'critical':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'bg-red-100 text-red-800';
    case 'investigating':
      return 'bg-yellow-100 text-yellow-800';
    case 'resolved':
      return 'bg-green-100 text-green-800';
    case 'closed':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default IncidentTracker;