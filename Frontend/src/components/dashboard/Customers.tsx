import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Download,
  UserCheck,
  Phone,
  Mail,
  Building2,
  Edit3,
  Save,
  X,
  Loader2,
  ArrowLeft,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiService } from "@/services/apiService";

// Customer interface
interface Customer {
  id: string;
  customer_reference_number: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: 'active' | 'inactive';
  last_interaction_date?: string;
  conversion_date: string;
  notes?: string;
  assigned_sales_rep?: string;
  original_lead_source?: string;
  interactions_since_conversion?: number;
  latest_interaction_date?: string;
}

// Customer timeline interface (similar to LeadIntelligence)
interface CustomerTimelineEntry {
  id: string;
  interaction_date: string;
  duration_minutes?: number;
  call_status: string;
  agent_name?: string;
  interaction_type: 'call';
  lead_status_tag?: string;
  intent_level?: string;
  engagement_health?: string;
  budget_constraint?: string;
  urgency_level?: string;
  fit_alignment?: string;
  total_score?: number;
  cta_pricing_clicked?: boolean;
  cta_demo_clicked?: boolean;
  cta_followup_clicked?: boolean;
  cta_sample_clicked?: boolean;
  cta_escalated_to_human?: boolean;
  // Additional fields from backend transformation
  interactionAgent?: string;
  interactionDate?: string;
  platform?: string;
  companyName?: string;
  status?: string;
  useCase?: string;
  duration?: string;
  engagementLevel?: string;
  intentLevel?: string;
  budgetConstraint?: string;
  timelineUrgency?: string;
  fitAlignment?: string;
  totalScore?: number;
}

interface CustomersProps {
  // Add any props needed
}

const Customers = ({}: CustomersProps) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit notes state
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [editedNotes, setEditedNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Customer detail view state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTimeline, setCustomerTimeline] = useState<CustomerTimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // API functions
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getCustomers();
      
      // Ensure we always set an array for customers
      let customersData: Customer[] = [];
      
      if (response?.success && response?.data) {
        // Standard API response format: { success: true, data: [...] }
        if (Array.isArray(response.data)) {
          customersData = response.data;
        } else if (response.data.customers && Array.isArray(response.data.customers)) {
          // Nested format: { success: true, data: { customers: [...] } }
          customersData = response.data.customers;
        }
      } else if (Array.isArray(response)) {
        // Direct array response
        customersData = response;
      } else if (response && Array.isArray((response as any).data)) {
        // Fallback for other response formats
        customersData = (response as any).data;
      }
      
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to load customers data');
      // Ensure customers is always an array, even on error
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch customer timeline details
  const fetchCustomerTimeline = async (customer: Customer) => {
    try {
      setTimelineLoading(true);
      const response = await apiService.getCustomer(customer.id);
      
      // Ensure timeline is always an array
      let timelineData: CustomerTimelineEntry[] = [];
      
      if (response?.success && response?.data) {
        if (Array.isArray(response.data.timeline)) {
          timelineData = response.data.timeline;
        } else if (Array.isArray(response.data)) {
          timelineData = response.data;
        }
      }
      
      setCustomerTimeline(timelineData);
    } catch (error) {
      console.error('Error fetching customer timeline:', error);
      setCustomerTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  // Handle customer selection for detail view
  const handleCustomerClick = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerTimeline(customer);
  };

  // Handle back to list view
  const handleBackToList = () => {
    setSelectedCustomer(null);
    setCustomerTimeline([]);
  };

  // Load data on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = Array.isArray(customers) ? customers.filter((customer) => {
    const matchesSearch = customer.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) : [];

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers((prev) => [...prev, customerId]);
    } else {
      setSelectedCustomers((prev) => prev.filter((id) => id !== customerId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(filteredCustomers.map((customer) => customer.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleToggleStatus = async (customer: Customer, isActive: boolean) => {
    try {
      const newStatus = isActive ? 'active' : 'inactive';
      
      // Optimistically update the local state
      setCustomers(prevCustomers => 
        Array.isArray(prevCustomers) ? prevCustomers.map(c => 
          c.id === customer.id 
            ? { ...c, status: newStatus }
            : c
        ) : []
      );
      
      // Call API to update status
      await apiService.updateCustomer(customer.id, {
        status: newStatus
      });
      
    } catch (error) {
      console.error('Error updating customer status:', error);
      
      // Revert the optimistic update on error
      setCustomers(prevCustomers => 
        Array.isArray(prevCustomers) ? prevCustomers.map(c => 
          c.id === customer.id 
            ? { ...c, status: customer.status }
            : c
        ) : []
      );
    }
  };

  const handleEditNotes = (customer: Customer) => {
    setEditingNotes(customer.id);
    setEditedNotes(customer.notes || "");
  };

  const handleSaveNotes = async (customer: Customer) => {
    try {
      setSavingNotes(true);
      
      // Optimistically update the local state
      setCustomers(prevCustomers => 
        Array.isArray(prevCustomers) ? prevCustomers.map(c => 
          c.id === customer.id 
            ? { ...c, notes: editedNotes }
            : c
        ) : []
      );
      
      // Call API to update notes
      await apiService.updateCustomer(customer.id, {
        notes: editedNotes
      });
      
      setEditingNotes(null);
      setEditedNotes("");
    } catch (error) {
      console.error('Error updating customer notes:', error);
      
      // Revert the optimistic update on error
      setCustomers(prevCustomers => 
        Array.isArray(prevCustomers) ? prevCustomers.map(c => 
          c.id === customer.id 
            ? { ...c, notes: customer.notes }
            : c
        ) : []
      );
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingNotes(null);
    setEditedNotes("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300";
      case "inactive":
        return "border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300";
      default:
        return "border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading customers...</span>
        </div>
      </div>
    );
  }

  // Render customer detail view
  if (selectedCustomer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToList}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Customers</span>
            </Button>
            <div>
              <h2 className="text-xl font-semibold">{selectedCustomer.name}</h2>
              <p className="text-sm text-muted-foreground">
                Customer ID: {selectedCustomer.customer_reference_number}
              </p>
            </div>
          </div>
          <Badge variant={selectedCustomer.status === 'active' ? 'default' : 'secondary'}>
            {selectedCustomer.status}
          </Badge>
        </div>

        {/* Customer Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm truncate">{selectedCustomer.email || '-'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{selectedCustomer.phone || '-'}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Company</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{selectedCustomer.company || '-'}</span>
              </div>
              {selectedCustomer.assigned_sales_rep && (
                <div className="text-xs text-muted-foreground mt-1">
                  Rep: {selectedCustomer.assigned_sales_rep}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(selectedCustomer.conversion_date), 'MMM dd, yyyy')}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedCustomer.original_lead_source || 'Unknown Source'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {customerTimeline.length}
              </div>
              <div className="text-xs text-muted-foreground">
                Total Calls
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {customerTimeline.length > 0 
                  ? Math.round(customerTimeline.reduce((sum, entry) => sum + (entry.total_score || 0), 0) / customerTimeline.length)
                  : 0}
              </div>
              <div className="text-xs text-muted-foreground">
                Lead Score
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total CTAs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {customerTimeline.reduce((sum, entry) => {
                  return sum + 
                    (entry.cta_pricing_clicked ? 1 : 0) + 
                    (entry.cta_demo_clicked ? 1 : 0) + 
                    (entry.cta_followup_clicked ? 1 : 0) + 
                    (entry.cta_sample_clicked ? 1 : 0) + 
                    (entry.cta_escalated_to_human ? 1 : 0);
                }, 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                Interactions
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span className="text-lg font-semibold">Interaction Timeline</span>
                <Badge variant="outline">{customerTimeline.length} interactions</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing all call history for this customer
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : customerTimeline.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Date</TableHead>
                        <TableHead className="min-w-[120px]">Agent</TableHead>
                        <TableHead className="min-w-[80px]">Duration</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Company</TableHead>
                        <TableHead className="min-w-[120px]">Engagement</TableHead>
                        <TableHead className="min-w-[100px]">Intent</TableHead>
                        <TableHead className="min-w-[120px]">Budget</TableHead>
                        <TableHead className="min-w-[100px]">Urgency</TableHead>
                        <TableHead className="min-w-[100px]">Fit</TableHead>
                        <TableHead className="min-w-[80px]">Score</TableHead>
                        <TableHead className="min-w-[150px]">CTA Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerTimeline.map((entry, index) => (
                        <TableRow key={entry.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div className="text-sm">
                              {format(new Date(entry.interaction_date), 'MMM dd')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(entry.interaction_date), 'HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Phone className="w-3 h-3 text-blue-600" />
                              <span className="text-sm">{entry.agent_name || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {entry.duration || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={entry.call_status === 'completed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {entry.status || entry.call_status || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{entry.companyName || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={entry.engagementLevel === 'High' ? 'default' : 
                                      entry.engagementLevel === 'Medium' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {entry.engagementLevel || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={entry.intentLevel === 'High' ? 'default' : 
                                      entry.intentLevel === 'Medium' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {entry.intentLevel || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{entry.budgetConstraint || 'Unknown'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={entry.timelineUrgency === 'High' ? 'default' : 
                                      entry.timelineUrgency === 'Medium' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {entry.timelineUrgency || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={entry.fitAlignment === 'High' ? 'default' : 
                                      entry.fitAlignment === 'Medium' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {entry.fitAlignment || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-12 bg-muted rounded-full h-2">
                                <div
                                  className={cn(
                                    "h-2 rounded-full",
                                    entry.totalScore >= 70 ? "bg-green-600" :
                                    entry.totalScore >= 40 ? "bg-yellow-600" : "bg-red-600"
                                  )}
                                  style={{ width: `${entry.totalScore || 0}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{entry.totalScore || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {entry.cta_pricing_clicked && (
                                <Badge variant="secondary" className="text-xs">💰 Price</Badge>
                              )}
                              {entry.cta_demo_clicked && (
                                <Badge variant="secondary" className="text-xs">🎯 Demo</Badge>
                              )}
                              {entry.cta_followup_clicked && (
                                <Badge variant="secondary" className="text-xs">📞 Follow</Badge>
                              )}
                              {entry.cta_sample_clicked && (
                                <Badge variant="secondary" className="text-xs">📦 Sample</Badge>
                              )}
                              {entry.cta_escalated_to_human && (
                                <Badge variant="secondary" className="text-xs">👤 Human</Badge>
                              )}
                              {!entry.cta_pricing_clicked && !entry.cta_demo_clicked && 
                               !entry.cta_followup_clicked && !entry.cta_sample_clicked && 
                               !entry.cta_escalated_to_human && (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No interaction history found for this customer.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Notes */}
        {selectedCustomer.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{selectedCustomer.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pl-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your converted customers and track their interactions
          </p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedCustomers.length === filteredCustomers.length &&
                    filteredCustomers.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Customer ID</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Interaction</TableHead>
              <TableHead>Conversion Date</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow 
                key={customer.id} 
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => handleCustomerClick(customer)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedCustomers.includes(customer.id)}
                    onCheckedChange={(checked) =>
                      handleSelectCustomer(customer.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {customer.customer_reference_number}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">
                    {customer.name}
                  </div>
                  {customer.assigned_sales_rep && (
                    <div className="text-sm text-muted-foreground">
                      Rep: {customer.assigned_sales_rep}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {customer.email ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="w-3 h-3" />
                      {customer.email}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {customer.phone ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {customer.company ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Building2 className="w-3 h-3" />
                      {customer.company}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={customer.status === 'active'}
                      onCheckedChange={(checked) =>
                        handleToggleStatus(customer, checked)
                      }
                      className={cn(
                        "h-5 w-9 data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-700"
                      )}
                    />
                    <Badge
                      variant="outline"
                      className={getStatusColor(customer.status)}
                    >
                      {customer.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {customer.latest_interaction_date ? (
                    format(new Date(customer.latest_interaction_date), 'MMM dd, yyyy')
                  ) : (
                    <span className="text-muted-foreground">No interactions</span>
                  )}
                </TableCell>
                <TableCell>
                  {format(new Date(customer.conversion_date), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {editingNotes === customer.id ? (
                    <div className="flex items-center gap-2 max-w-xs">
                      <Textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        className="min-h-[60px] text-sm"
                        placeholder="Add notes..."
                      />
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleSaveNotes(customer)}
                          disabled={savingNotes}
                          className="h-6 w-6 p-0"
                        >
                          {savingNotes ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 max-w-xs">
                      <div className="flex-1 text-sm text-muted-foreground truncate">
                        {customer.notes || "No notes"}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditNotes(customer)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredCustomers.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            {error ? 'Unable to load customers.' : 'No customers found matching your criteria.'}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(customers) ? customers.length : 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Customers
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(customers) ? customers.filter(c => c.status === 'active').length : 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Customers
            </CardTitle>
            <UserCheck className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(customers) ? customers.filter(c => c.status === 'inactive').length : 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              This Month
            </CardTitle>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(customers) ? customers.filter(c => 
                new Date(c.conversion_date).getMonth() === new Date().getMonth() &&
                new Date(c.conversion_date).getFullYear() === new Date().getFullYear()
              ).length : 0}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Customers;
