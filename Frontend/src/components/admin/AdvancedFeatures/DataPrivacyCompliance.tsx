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
  Shield, 
  Download, 
  Trash2, 
  FileText, 
  Clock, 
  User, 
  CheckCircle, 
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  Eye,
  Lock,
  Unlock,
  Database
} from 'lucide-react';

interface DataRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestType: 'export' | 'deletion' | 'rectification' | 'portability';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  requestedBy: string;
  processedBy?: string;
  reason?: string;
  dataTypes: string[];
  notes?: string;
}

interface ConsentRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  consentType: 'marketing' | 'analytics' | 'cookies' | 'data_processing';
  status: 'granted' | 'withdrawn' | 'expired';
  grantedDate: Date;
  withdrawnDate?: Date;
  expiryDate?: Date;
  source: 'registration' | 'settings' | 'admin' | 'api';
  ipAddress: string;
}

interface ComplianceReport {
  id: string;
  reportType: 'gdpr' | 'ccpa' | 'audit' | 'breach';
  title: string;
  description: string;
  generatedDate: Date;
  generatedBy: string;
  status: 'draft' | 'final' | 'submitted';
  filePath?: string;
  dataRange: {
    startDate: Date;
    endDate: Date;
  };
}

interface DataRetentionPolicy {
  id: string;
  dataType: string;
  retentionPeriod: number; // in days
  retentionUnit: 'days' | 'months' | 'years';
  autoDelete: boolean;
  lastReviewDate: Date;
  nextReviewDate: Date;
  description: string;
  legalBasis: string;
}

export const DataPrivacyCompliance: React.FC = () => {
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<DataRetentionPolicy[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DataRequest | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockDataRequests: DataRequest[] = [
        {
          id: '1',
          userId: 'user123',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          requestType: 'export',
          status: 'completed',
          requestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          completionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          requestedBy: 'john@example.com',
          processedBy: 'admin@company.com',
          dataTypes: ['profile', 'calls', 'agents', 'billing'],
          notes: 'GDPR data export request processed successfully'
        },
        {
          id: '2',
          userId: 'user456',
          userName: 'Jane Smith',
          userEmail: 'jane@company.com',
          requestType: 'deletion',
          status: 'pending',
          requestDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          requestedBy: 'jane@company.com',
          dataTypes: ['profile', 'calls', 'contacts'],
          reason: 'Account closure request'
        }
      ];

      const mockConsentRecords: ConsentRecord[] = [
        {
          id: '1',
          userId: 'user123',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          consentType: 'marketing',
          status: 'granted',
          grantedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          source: 'registration',
          ipAddress: '192.168.1.100'
        },
        {
          id: '2',
          userId: 'user456',
          userName: 'Jane Smith',
          userEmail: 'jane@company.com',
          consentType: 'analytics',
          status: 'withdrawn',
          grantedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          withdrawnDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          source: 'settings',
          ipAddress: '192.168.1.101'
        }
      ];

      const mockReports: ComplianceReport[] = [
        {
          id: '1',
          reportType: 'gdpr',
          title: 'GDPR Compliance Report Q1 2024',
          description: 'Quarterly GDPR compliance assessment and data processing activities',
          generatedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          generatedBy: 'admin@company.com',
          status: 'final',
          dataRange: {
            startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      ];

      const mockPolicies: DataRetentionPolicy[] = [
        {
          id: '1',
          dataType: 'User Profile Data',
          retentionPeriod: 7,
          retentionUnit: 'years',
          autoDelete: false,
          lastReviewDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
          nextReviewDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000),
          description: 'User account information and profile data',
          legalBasis: 'Contract performance and legitimate interest'
        },
        {
          id: '2',
          dataType: 'Call Recordings',
          retentionPeriod: 2,
          retentionUnit: 'years',
          autoDelete: true,
          lastReviewDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          nextReviewDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
          description: 'Audio recordings and transcripts of AI agent calls',
          legalBasis: 'Legitimate interest for service improvement'
        }
      ];

      setDataRequests(mockDataRequests);
      setConsentRecords(mockConsentRecords);
      setComplianceReports(mockReports);
      setRetentionPolicies(mockPolicies);
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'export':
        return 'bg-blue-100 text-blue-800';
      case 'deletion':
        return 'bg-red-100 text-red-800';
      case 'rectification':
        return 'bg-yellow-100 text-yellow-800';
      case 'portability':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConsentStatusColor = (status: string) => {
    switch (status) {
      case 'granted':
        return 'bg-green-100 text-green-800';
      case 'withdrawn':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleProcessRequest = async (requestId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      setDataRequests(prev => prev.map(request => {
        if (request.id === requestId) {
          return {
            ...request,
            status: action === 'approve' ? 'processing' : 'rejected',
            processedBy: 'admin@company.com',
            notes
          };
        }
        return request;
      }));
    } catch (error) {
      console.error('Failed to process request:', error);
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    try {
      setDataRequests(prev => prev.map(request => {
        if (request.id === requestId) {
          return {
            ...request,
            status: 'completed',
            completionDate: new Date()
          };
        }
        return request;
      }));
    } catch (error) {
      console.error('Failed to complete request:', error);
    }
  };

  const generateComplianceReport = async (reportType: string, title: string, description: string) => {
    try {
      const newReport: ComplianceReport = {
        id: Date.now().toString(),
        reportType: reportType as any,
        title,
        description,
        generatedDate: new Date(),
        generatedBy: 'admin@company.com',
        status: 'draft',
        dataRange: {
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        }
      };

      setComplianceReports(prev => [newReport, ...prev]);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const filteredRequests = dataRequests.filter(request => {
    const matchesSearch = request.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
          <h2 className="text-2xl font-bold">Data Privacy & Compliance</h2>
          <p className="text-gray-600">Manage GDPR, CCPA compliance and data protection</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Compliance Report</DialogTitle>
                <DialogDescription>
                  Create a new compliance report for regulatory requirements
                </DialogDescription>
              </DialogHeader>
              <ComplianceReportForm onSubmit={generateComplianceReport} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Data Requests</TabsTrigger>
          <TabsTrigger value="consent">Consent Management</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search requests..."
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Requests List */}
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{request.userName}</h3>
                        <Badge className={getRequestTypeColor(request.requestType)}>
                          {request.requestType.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{request.userEmail}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Requested:</span>
                          <div className="font-medium">{request.requestDate.toLocaleDateString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Requested By:</span>
                          <div className="font-medium">{request.requestedBy}</div>
                        </div>
                        {request.completionDate && (
                          <div>
                            <span className="text-gray-500">Completed:</span>
                            <div className="font-medium">{request.completionDate.toLocaleDateString()}</div>
                          </div>
                        )}
                      </div>

                      <div className="mb-2">
                        <span className="text-sm text-gray-500">Data Types: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {request.dataTypes.map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {request.reason && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                      )}

                      {request.notes && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Notes:</span> {request.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      
                      {request.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleProcessRequest(request.id, 'approve')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleProcessRequest(request.id, 'reject')}
                          >
                            Reject
                          </Button>
                        </div>
                      )}

                      {request.status === 'processing' && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteRequest(request.id)}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="consent" className="space-y-4">
          <div className="space-y-4">
            {consentRecords.map((consent) => (
              <Card key={consent.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{consent.userName}</h3>
                        <Badge className={getConsentStatusColor(consent.status)}>
                          {consent.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {consent.consentType.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{consent.userEmail}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Granted:</span>
                          <div className="font-medium">{consent.grantedDate.toLocaleDateString()}</div>
                        </div>
                        {consent.withdrawnDate && (
                          <div>
                            <span className="text-gray-500">Withdrawn:</span>
                            <div className="font-medium">{consent.withdrawnDate.toLocaleDateString()}</div>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Source:</span>
                          <div className="font-medium">{consent.source}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">IP Address:</span>
                          <div className="font-medium">{consent.ipAddress}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {consent.status === 'granted' ? (
                        <Button variant="outline" size="sm">
                          <Lock className="h-4 w-4 mr-1" />
                          Withdraw
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm">
                          <Unlock className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <div className="space-y-4">
            {retentionPolicies.map((policy) => (
              <Card key={policy.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-5 w-5" />
                        <h3 className="font-semibold">{policy.dataType}</h3>
                        <Badge variant={policy.autoDelete ? "default" : "secondary"}>
                          {policy.autoDelete ? 'Auto-Delete' : 'Manual'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{policy.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Retention Period:</span>
                          <div className="font-medium">
                            {policy.retentionPeriod} {policy.retentionUnit}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Legal Basis:</span>
                          <div className="font-medium">{policy.legalBasis}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Next Review:</span>
                          <div className="font-medium">{policy.nextReviewDate.toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit Policy
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="space-y-4">
            {complianceReports.map((report) => (
              <Card key={report.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5" />
                        <h3 className="font-semibold">{report.title}</h3>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {report.reportType.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Generated:</span>
                          <div className="font-medium">{report.generatedDate.toLocaleDateString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Generated By:</span>
                          <div className="font-medium">{report.generatedBy}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Data Range:</span>
                          <div className="font-medium">
                            {report.dataRange.startDate.toLocaleDateString()} - {report.dataRange.endDate.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Compliance Report Form Component
const ComplianceReportForm: React.FC<{
  onSubmit: (reportType: string, title: string, description: string) => void;
}> = ({ onSubmit }) => {
  const [reportType, setReportType] = useState('gdpr');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && description) {
      onSubmit(reportType, title, description);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="reportType">Report Type</Label>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gdpr">GDPR Compliance</SelectItem>
            <SelectItem value="ccpa">CCPA Compliance</SelectItem>
            <SelectItem value="audit">Data Audit</SelectItem>
            <SelectItem value="breach">Breach Report</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="title">Report Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter report title..."
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the purpose and scope of this report..."
          required
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={!title || !description}>
          Generate Report
        </Button>
      </DialogFooter>
    </form>
  );
};

export default DataPrivacyCompliance;