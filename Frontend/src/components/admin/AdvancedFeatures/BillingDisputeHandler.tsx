import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  FileText,
  Search,
  Filter,
  Calendar,
  MessageSquare,
  Plus,
  Eye
} from 'lucide-react';

interface BillingDispute {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  disputeType: 'chargeback' | 'refund_request' | 'billing_error' | 'unauthorized_charge';
  status: 'open' | 'investigating' | 'resolved' | 'escalated' | 'closed';
  amount: number;
  currency: string;
  transactionId: string;
  disputeDate: Date;
  resolvedDate?: Date;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  customerReason: string;
  internalNotes: string[];
  attachments: string[];
  timeline: DisputeTimelineEntry[];
}

interface DisputeTimelineEntry {
  id: string;
  timestamp: Date;
  action: string;
  description: string;
  user: string;
  type: 'status_change' | 'note_added' | 'assignment' | 'resolution' | 'escalation';
}

interface DisputeResolution {
  disputeId: string;
  resolutionType: 'full_refund' | 'partial_refund' | 'no_refund' | 'credit_issued' | 'chargeback_won';
  amount?: number;
  reason: string;
  notes: string;
}

export const BillingDisputeHandler: React.FC = () => {
  const [disputes, setDisputes] = useState<BillingDispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<BillingDispute | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      // Mock data - replace with actual API call
      const mockDisputes: BillingDispute[] = [
        {
          id: '1',
          userId: 'user123',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          disputeType: 'chargeback',
          status: 'investigating',
          amount: 99.99,
          currency: 'USD',
          transactionId: 'txn_1234567890',
          disputeDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          assignedTo: 'support@company.com',
          priority: 'high',
          description: 'Customer disputes charge claiming they did not authorize the transaction',
          customerReason: 'I did not authorize this charge on my credit card',
          internalNotes: [
            'Initial chargeback received from payment processor',
            'Gathering transaction evidence and user activity logs'
          ],
          attachments: ['receipt_txn_1234567890.pdf', 'user_activity_log.csv'],
          timeline: [
            {
              id: '1',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              action: 'Dispute Created',
              description: 'Chargeback notification received from Stripe',
              user: 'system@company.com',
              type: 'status_change'
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000),
              action: 'Assigned to Support',
              description: 'Dispute assigned to support team for investigation',
              user: 'admin@company.com',
              type: 'assignment'
            }
          ]
        },
        {
          id: '2',
          userId: 'user456',
          userName: 'Jane Smith',
          userEmail: 'jane@company.com',
          disputeType: 'refund_request',
          status: 'open',
          amount: 49.99,
          currency: 'USD',
          transactionId: 'txn_0987654321',
          disputeDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          priority: 'medium',
          description: 'Customer requesting refund due to service not meeting expectations',
          customerReason: 'The AI calling service did not work as advertised',
          internalNotes: [],
          attachments: [],
          timeline: [
            {
              id: '1',
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              action: 'Refund Request Submitted',
              description: 'Customer submitted refund request through support portal',
              user: 'jane@company.com',
              type: 'status_change'
            }
          ]
        }
      ];

      setDisputes(mockDisputes);
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisputeTypeColor = (type: string) => {
    switch (type) {
      case 'chargeback':
        return 'bg-red-100 text-red-800';
      case 'refund_request':
        return 'bg-blue-100 text-blue-800';
      case 'billing_error':
        return 'bg-yellow-100 text-yellow-800';
      case 'unauthorized_charge':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'investigating':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'escalated':
        return 'bg-orange-100 text-orange-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = async (disputeId: string, newStatus: string, notes?: string) => {
    try {
      setDisputes(prev => prev.map(dispute => {
        if (dispute.id === disputeId) {
          const updatedDispute = {
            ...dispute,
            status: newStatus as any,
            ...(newStatus === 'resolved' && { resolvedDate: new Date() }),
            timeline: [
              ...dispute.timeline,
              {
                id: Date.now().toString(),
                timestamp: new Date(),
                action: `Status changed to ${newStatus}`,
                description: notes || `Dispute status updated to ${newStatus}`,
                user: 'admin@company.com',
                type: 'status_change' as const
              }
            ]
          };
          
          if (selectedDispute?.id === disputeId) {
            setSelectedDispute(updatedDispute);
          }
          
          return updatedDispute;
        }
        return dispute;
      }));
    } catch (error) {
      console.error('Failed to update dispute status:', error);
    }
  };

  const handleResolveDispute = async (resolution: DisputeResolution) => {
    try {
      await handleStatusUpdate(resolution.disputeId, 'resolved', resolution.reason);
      // Additional resolution logic here
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
    }
  };

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = dispute.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dispute.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dispute.transactionId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || dispute.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-4">
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
          <h2 className="text-2xl font-bold">Billing Dispute Handler</h2>
          <p className="text-gray-600">Manage chargebacks, refunds, and billing disputes</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {disputes.filter(d => d.status === 'open').length} Open
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {disputes.filter(d => d.status === 'investigating').length} Investigating
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search disputes..."
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
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Disputes List */}
      <div className="space-y-4">
        {filteredDisputes.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4" />
                <p>No disputes found matching your criteria</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredDisputes.map((dispute) => (
            <Card key={dispute.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4" />
                      <h3 className="font-semibold">{dispute.userName}</h3>
                      <Badge className={getDisputeTypeColor(dispute.disputeType)}>
                        {dispute.disputeType.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(dispute.status)}>
                        {dispute.status.toUpperCase()}
                      </Badge>
                      <Badge className={getPriorityColor(dispute.priority)}>
                        {dispute.priority.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{dispute.userEmail}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <div className="font-medium">
                          {dispute.currency} ${dispute.amount.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Transaction ID:</span>
                        <div className="font-medium font-mono text-xs">{dispute.transactionId}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Dispute Date:</span>
                        <div className="font-medium">{dispute.disputeDate.toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Assigned To:</span>
                        <div className="font-medium">{dispute.assignedTo || 'Unassigned'}</div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Customer Reason:</span> {dispute.customerReason}
                    </p>

                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Description:</span> {dispute.description}
                    </p>

                    {dispute.attachments.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-500">Attachments: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dispute.attachments.map((attachment, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              {attachment}
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
                      onClick={() => {
                        setSelectedDispute(dispute);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    
                    {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                      <Select
                        value={dispute.status}
                        onValueChange={(value) => handleStatusUpdate(dispute.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="investigating">Investigating</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="escalated">Escalated</SelectItem>
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

      {/* Dispute Details Modal */}
      {selectedDispute && (
        <DisputeDetailsModal
          dispute={selectedDispute}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedDispute(null);
          }}
          onResolve={handleResolveDispute}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};

// Dispute Details Modal Component
const DisputeDetailsModal: React.FC<{
  dispute: BillingDispute;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: DisputeResolution) => void;
  onStatusUpdate: (disputeId: string, status: string, notes?: string) => void;
}> = ({ dispute, isOpen, onClose, onResolve, onStatusUpdate }) => {
  const [resolutionType, setResolutionType] = useState<string>('');
  const [resolutionAmount, setResolutionAmount] = useState<number>(0);
  const [resolutionReason, setResolutionReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleResolve = () => {
    if (resolutionType && resolutionReason) {
      onResolve({
        disputeId: dispute.id,
        resolutionType: resolutionType as any,
        amount: resolutionAmount || undefined,
        reason: resolutionReason,
        notes: resolutionNotes
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Dispute Details - {dispute.transactionId}
          </DialogTitle>
          <div className="flex gap-2">
            <Badge className={getDisputeTypeColor(dispute.disputeType)}>
              {dispute.disputeType.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge className={getStatusColor(dispute.status)}>
              {dispute.status.toUpperCase()}
            </Badge>
            <Badge className={getPriorityColor(dispute.priority)}>
              {dispute.priority.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="resolution">Resolution</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {dispute.userName} ({dispute.userEmail})
                </p>
              </div>
              <div>
                <Label>Amount</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {dispute.currency} ${dispute.amount.toFixed(2)}
                </p>
              </div>
              <div>
                <Label>Transaction ID</Label>
                <p className="text-sm text-gray-600 mt-1 font-mono">{dispute.transactionId}</p>
              </div>
              <div>
                <Label>Dispute Date</Label>
                <p className="text-sm text-gray-600 mt-1">{dispute.disputeDate.toLocaleString()}</p>
              </div>
            </div>

            <div>
              <Label>Customer Reason</Label>
              <p className="text-sm text-gray-600 mt-1">{dispute.customerReason}</p>
            </div>

            <div>
              <Label>Internal Description</Label>
              <p className="text-sm text-gray-600 mt-1">{dispute.description}</p>
            </div>

            {dispute.internalNotes.length > 0 && (
              <div>
                <Label>Internal Notes</Label>
                <div className="space-y-2 mt-1">
                  {dispute.internalNotes.map((note, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <div className="space-y-4">
              {dispute.timeline.map((entry) => (
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

          <TabsContent value="resolution" className="space-y-4">
            {dispute.status === 'resolved' ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  This dispute has been resolved on {dispute.resolvedDate?.toLocaleDateString()}.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="resolutionType">Resolution Type</Label>
                  <Select value={resolutionType} onValueChange={setResolutionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resolution type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_refund">Full Refund</SelectItem>
                      <SelectItem value="partial_refund">Partial Refund</SelectItem>
                      <SelectItem value="no_refund">No Refund</SelectItem>
                      <SelectItem value="credit_issued">Credit Issued</SelectItem>
                      <SelectItem value="chargeback_won">Chargeback Won</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(resolutionType === 'partial_refund' || resolutionType === 'credit_issued') && (
                  <div>
                    <Label htmlFor="resolutionAmount">Amount</Label>
                    <Input
                      id="resolutionAmount"
                      type="number"
                      step="0.01"
                      value={resolutionAmount}
                      onChange={(e) => setResolutionAmount(parseFloat(e.target.value))}
                      placeholder="Enter amount"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="resolutionReason">Reason</Label>
                  <Textarea
                    id="resolutionReason"
                    value={resolutionReason}
                    onChange={(e) => setResolutionReason(e.target.value)}
                    placeholder="Explain the resolution decision..."
                  />
                </div>

                <div>
                  <Label htmlFor="resolutionNotes">Additional Notes</Label>
                  <Textarea
                    id="resolutionNotes"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Any additional notes or instructions..."
                  />
                </div>

                <Button 
                  onClick={handleResolve}
                  disabled={!resolutionType || !resolutionReason}
                  className="w-full"
                >
                  Resolve Dispute
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Helper functions (defined outside to avoid re-creation)
const getDisputeTypeColor = (type: string) => {
  switch (type) {
    case 'chargeback':
      return 'bg-red-100 text-red-800';
    case 'refund_request':
      return 'bg-blue-100 text-blue-800';
    case 'billing_error':
      return 'bg-yellow-100 text-yellow-800';
    case 'unauthorized_charge':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-800';
    case 'investigating':
      return 'bg-yellow-100 text-yellow-800';
    case 'resolved':
      return 'bg-green-100 text-green-800';
    case 'escalated':
      return 'bg-orange-100 text-orange-800';
    case 'closed':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default BillingDisputeHandler;