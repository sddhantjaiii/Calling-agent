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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import CustomerConversionModal from "./CustomerConversionModal";
import InteractionDetailsModal from './InteractionDetailsModal';
import {
  Search,
  Download,
  MessageSquare,
  Phone,
  Calendar,
  Mail,
  UserPlus,
  CalendarDays,
  Building2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ContactDisplay } from "@/components/contacts/ContactDisplay";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiService } from "@/services/apiService";
import type { Lead, LeadAnalyticsData } from "@/pages/Dashboard";

// API interfaces
interface LeadGroup {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  leadType: 'inbound' | 'outbound';
  recentLeadTag: string;
  recentEngagementLevel?: string;
  recentIntentLevel?: string;
  recentBudgetConstraint?: string;
  recentTimelineUrgency?: string;
  recentFitAlignment?: string;
  escalatedToHuman: boolean;
  interactedAgents: string[];
  interactions: number;
  lastContact: string;
  followUpScheduled?: string;
  followUpStatus?: string;
  demoScheduled: string | null; // Now a datetime string
  groupType: 'phone' | 'email' | 'individual';
}

interface LeadTimelineEntry {
  id: string;
  interactionAgent: string;
  interactionDate: string;
  platform: string;
  companyName?: string;
  status: string;
  useCase: string;
  duration?: string;
  engagementLevel?: string;
  intentLevel?: string;
  budgetConstraint?: string;
  timelineUrgency?: string;
  fitAlignment?: string;
}

interface CreateFollowUpRequest {
  leadPhone?: string;
  leadEmail?: string;
  leadName?: string;
  followUpDate: string;
  remark?: string;
}

interface LeadIntelligenceProps {
  onOpenProfile: (contact: Lead) => void;
}

const LeadIntelligence = ({ onOpenProfile }: LeadIntelligenceProps) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState<LeadGroup | null>(null);
  const [contacts, setContacts] = useState<LeadGroup[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<LeadTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Interaction details modal state
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [selectedInteractionAnalytics, setSelectedInteractionAnalytics] = useState<LeadAnalyticsData | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Follow-up scheduling state
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [followUpRemark, setFollowUpRemark] = useState("");
  const [currentFollowUpContact, setCurrentFollowUpContact] = useState<LeadGroup | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Customer conversion modal state
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [currentConversionContact, setCurrentConversionContact] = useState<LeadGroup | null>(null);
  const [conversionLoading, setConversionLoading] = useState(false);

  // API functions
  const fetchLeadIntelligence = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getLeadIntelligence();
      setContacts(response.data || response as any);
    } catch (error) {
      console.error('Error fetching lead intelligence:', error);
      setError('Failed to load lead intelligence data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadTimeline = async (groupId: string) => {
    try {
      setTimelineLoading(true);
      const response = await apiService.getLeadIntelligenceTimeline(groupId);
      setTimeline(response.data || response as any);
    } catch (error) {
      console.error('Error fetching lead timeline:', error);
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  const createFollowUp = async (followUpData: CreateFollowUpRequest) => {
    try {
      setFollowUpLoading(true);
      await apiService.createFollowUp(followUpData);
      // Refresh the lead intelligence data to get updated follow-up info
      await fetchLeadIntelligence();
    } catch (error) {
      console.error('Error creating follow-up:', error);
      throw error;
    } finally {
      setFollowUpLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchLeadIntelligence();
  }, []);

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesLeadType =
      leadTypeFilter === "all" || contact.leadType === leadTypeFilter;
    const matchesTag =
      tagFilter === "all" || contact.recentLeadTag === tagFilter;
    return matchesSearch && matchesLeadType && matchesTag;
  });

  const handleContactClick = async (contact: LeadGroup) => {
    setSelectedContact(contact);
    await fetchLeadTimeline(contact.id);
  };

  const handleBackToList = () => {
    setSelectedContact(null);
    setTimeline([]);
  };

  const handleInteractionClick = async (interactionId: string) => {
    console.log(`Interaction clicked: ${interactionId}`);
    setIsInteractionModalOpen(true);
    setIsAnalyticsLoading(true);
    setAnalyticsError(null);
    setSelectedInteractionAnalytics(null);

    try {
      // Assuming interactionId is the callId
      const response = await apiService.getCallAnalytics(interactionId);
      console.log('API Response:', response);

      if (response.data) {
        setSelectedInteractionAnalytics(response.data);
        console.log('Analytics data set:', response.data);
      } else {
        // Handle cases where response.data is null or undefined
        setSelectedInteractionAnalytics(response as any);
        console.log('Analytics data set (raw response):', response);
      }
    } catch (error: any) {
      console.error('Error fetching call analytics:', error);
      setAnalyticsError(error.message || 'An unknown error occurred');
    } finally {
      setIsAnalyticsLoading(false);
      console.log('Finished loading analytics.');
    }
  };

  // Follow-up scheduling functions
  const handleScheduleFollowUp = (contact: LeadGroup) => {
    setCurrentFollowUpContact(contact);
    setFollowUpDate(undefined);
    setFollowUpRemark("");
    setShowFollowUpDialog(true);
  };

  const handleSaveFollowUp = async () => {
    if (followUpDate && currentFollowUpContact) {
      try {
        const followUpData: CreateFollowUpRequest = {
          leadPhone: currentFollowUpContact.phone,
          leadEmail: currentFollowUpContact.email,
          leadName: currentFollowUpContact.name,
          followUpDate: format(followUpDate, 'yyyy-MM-dd'),
          remark: followUpRemark || undefined
        };

        await createFollowUp(followUpData);
        
        // Close dialog and reset state
        setShowFollowUpDialog(false);
        setFollowUpDate(undefined);
        setFollowUpRemark("");
        setCurrentFollowUpContact(null);
      } catch (error) {
        console.error('Failed to schedule follow-up:', error);
        // You might want to show a toast notification here
      }
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
      case "hot":
        return "border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300";
      case "warm":
        return "border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300";
      case "cold":
        return "border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300";
      default:
        return "border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-300";
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
        return "border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300";
      case "medium":
        return "border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300";
      case "low":
        return "border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300";
      default:
        return "border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-300";
    }
  };

  const getIntentColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
        return "border-purple-500 text-purple-700 bg-purple-50 dark:bg-purple-950 dark:text-purple-300";
      case "medium":
        return "border-indigo-500 text-indigo-700 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300";
      case "low":
        return "border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-300";
      default:
        return "border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-300";
    }
  };

  const getBudgetColor = (constraint: string) => {
    switch (constraint.toLowerCase()) {
      case "low":
        return "border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300";
      case "medium":
        return "border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300";
      case "high":
        return "border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300";
      default:
        return "border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-300";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case "urgent":
        return "border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300";
      case "soon":
        return "border-orange-500 text-orange-700 bg-orange-50 dark:bg-orange-950 dark:text-orange-300";
      case "flexible":
        return "border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300";
      default:
        return "border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-300";
    }
  };

  const getFitColor = (fit: string) => {
    switch (fit.toLowerCase()) {
      case "excellent":
        return "border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300";
      case "good":
        return "border-lime-500 text-lime-700 bg-lime-50 dark:bg-lime-950 dark:text-lime-300";
      case "fair":
        return "border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-300";
      case "poor":
        return "border-red-500 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300";
      default:
        return "border-gray-500 text-gray-700 bg-gray-50 dark:bg-gray-950 dark:text-gray-300";
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts((prev) => [...prev, contactId]);
    } else {
      setSelectedContacts((prev) => prev.filter((id) => id !== contactId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(filteredContacts.map((contact) => contact.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleToggleFollowUpStatus = async (contact: LeadGroup, completed: boolean) => {
    try {
      const status = completed ? 'completed' : 'scheduled';
      
      // Optimistically update the local state first for immediate UI feedback
      setContacts(prevContacts => 
        prevContacts.map(c => 
          c.id === contact.id 
            ? { ...c, followUpStatus: status }
            : c
        )
      );
      
      // Call API to update follow-up status
      await apiService.updateFollowUpStatus({
        leadPhone: contact.phone,
        leadEmail: contact.email,
        status: status
      });
      
      // No need to refresh the entire component - state is already updated
    } catch (error) {
      console.error('Error updating follow-up status:', error);
      
      // Revert the optimistic update on error
      setContacts(prevContacts => 
        prevContacts.map(c => 
          c.id === contact.id 
            ? { ...c, followUpStatus: contact.followUpStatus }
            : c
        )
      );
    }
  };

  const handleScheduleDemo = async (contact: LeadGroup) => {
    try {
      // Call API to schedule demo
      const demoDate = new Date();
      demoDate.setDate(demoDate.getDate() + 7); // Schedule for next week as default
      
      await apiService.scheduleDemo({
        contactId: contact.id,
        demoDate: demoDate.toISOString(),
        leadPhone: contact.phone,
        leadEmail: contact.email
      });
      
      // Refresh the lead intelligence data
      await fetchLeadIntelligence();
    } catch (error) {
      console.error('Error scheduling demo:', error);
    }
  };

  const handleConvertToCustomer = async (contact: LeadGroup) => {
    setCurrentConversionContact(contact);
    setShowConversionModal(true);
  };

  const handleConfirmConversion = async (customerData: {
    name: string;
    email: string;
    phone: string;
    company: string;
    status: string;
    assignedSalesRep: string;
    notes: string;
  }) => {
    if (!currentConversionContact) return;

    setConversionLoading(true);
    try {
      // Call API to convert lead to customer
      await apiService.convertToCustomer(
        {
          id: currentConversionContact.id,
          name: currentConversionContact.name,
          email: currentConversionContact.email,
          phone: currentConversionContact.phone,
          company: currentConversionContact.company,
          source: 'Lead Intelligence'
        },
        customerData
      );
      
      // Close modal
      setShowConversionModal(false);
      setCurrentConversionContact(null);
      
      // Refresh the lead intelligence data to remove converted customer
      await fetchLeadIntelligence();
    } catch (error) {
      console.error('Error converting to customer:', error);
    } finally {
      setConversionLoading(false);
    }
  };

  if (selectedContact) {
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
              <span>Back to List</span>
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {selectedContact.name}
              </h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {selectedContact.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {selectedContact.email}
                  </div>
                )}
                {selectedContact.phone ? (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedContact.phone}
                  </div>
                ) : selectedContact.groupType === 'individual' && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Internet
                    </span>
                  </div>
                )}
                {selectedContact.company && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {selectedContact.company}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Interaction Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Use Case</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Fit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timelineLoading ? (
                    <TableRow>
                      <TableCell colSpan={17} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading timeline...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : timeline.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={17} className="text-center py-8 text-muted-foreground">
                        No interaction history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    timeline.map((interaction) => (
                      <TableRow 
                        key={interaction.id}
                        className="cursor-pointer hover:bg-muted-foreground/10"
                        onClick={() => handleInteractionClick(interaction.id)}
                      >
                        <TableCell className="text-foreground">
                          {interaction.interactionAgent}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {new Date(interaction.interactionDate).toLocaleDateString('en-US', { 
                            timeZone: 'UTC',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {interaction.platform}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {interaction.companyName || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getTagColor(interaction.status)}
                          >
                            {interaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {interaction.useCase}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {interaction.duration || "—"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {interaction.engagementLevel || "—"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {interaction.intentLevel || "—"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {interaction.budgetConstraint || "—"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {interaction.timelineUrgency || "—"}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {interaction.fitAlignment || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        <InteractionDetailsModal
          isOpen={isInteractionModalOpen}
          onClose={() => setIsInteractionModalOpen(false)}
          analytics={selectedInteractionAnalytics}
          isLoading={isAnalyticsLoading}
          error={analyticsError}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading lead intelligence...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchLeadIntelligence}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      {/* Header with title only */}
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold">Lead Intelligence</h1>
      </div>

      {/* Search bar and controls */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Select value={leadTypeFilter} onValueChange={setLeadTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Lead Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Lead Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              <SelectItem value="Hot">Hot</SelectItem>
              <SelectItem value="Warm">Warm</SelectItem>
              <SelectItem value="Cold">Cold</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto invisible-scrollbar flex-1 min-h-0">
        <Table className="min-w-[1400px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedContacts.length === filteredContacts.length &&
                    filteredContacts.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Lead Type</TableHead>
              <TableHead>Recent Lead Tag</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead>Fit</TableHead>
              <TableHead>Escalated</TableHead>
              <TableHead>No. of Interactions</TableHead>
              <TableHead>Interacted Agents</TableHead>
              <TableHead>Last Interaction</TableHead>
              <TableHead>Follow-up Date</TableHead>
              <TableHead>Follow-up Status</TableHead>
              <TableHead>Demo Scheduled</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact) => (
              <TableRow
                key={contact.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleContactClick(contact)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedContacts.includes(contact.id)}
                    onCheckedChange={(checked) =>
                      handleSelectContact(contact.id, checked as boolean)
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground underline cursor-pointer">
                    {contact.name}
                  </div>
                  <div className="space-y-1 mt-1">
                    {contact.email && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {contact.phone}
                      </div>
                    )}
                    {contact.company && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building2 className="w-3 h-3" />
                        {contact.company}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {contact.leadType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getTagColor(contact.recentLeadTag)}>
                    {contact.recentLeadTag}
                  </Badge>
                </TableCell>
                <TableCell>
                  {contact.recentEngagementLevel ? (
                    <Badge variant="outline" className={getEngagementColor(contact.recentEngagementLevel)}>
                      {contact.recentEngagementLevel}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {contact.recentIntentLevel ? (
                    <Badge variant="outline" className={getIntentColor(contact.recentIntentLevel)}>
                      {contact.recentIntentLevel}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {contact.recentBudgetConstraint ? (
                    <Badge variant="outline" className={getBudgetColor(contact.recentBudgetConstraint)}>
                      {contact.recentBudgetConstraint}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {contact.recentTimelineUrgency ? (
                    <Badge variant="outline" className={getUrgencyColor(contact.recentTimelineUrgency)}>
                      {contact.recentTimelineUrgency}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {contact.recentFitAlignment ? (
                    <Badge variant="outline" className={getFitColor(contact.recentFitAlignment)}>
                      {contact.recentFitAlignment}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={contact.escalatedToHuman ? "destructive" : "secondary"}
                  >
                    {contact.escalatedToHuman ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell className="text-foreground">
                  {contact.interactions}
                </TableCell>
                <TableCell className="text-foreground">
                  {contact.interactedAgents.join(', ')}
                </TableCell>
                <TableCell className="text-foreground">
                  {new Date(contact.lastContact).toLocaleDateString('en-US', { 
                    timeZone: 'UTC',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {contact.followUpScheduled ? (
                    <div className="flex items-center gap-1 text-sm">
                      <CalendarDays className="w-4 h-4 text-green-600" />
                      {new Date(contact.followUpScheduled).toLocaleDateString()}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleScheduleFollowUp(contact)}
                      className="h-8 w-8 p-0"
                    >
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </Button>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {contact.followUpScheduled ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={contact.followUpStatus === 'completed'}
                        onCheckedChange={(checked) =>
                          handleToggleFollowUpStatus(contact, checked)
                        }
                        className={cn(
                          "h-5 w-9 data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-700",
                          contact.followUpStatus === 'completed' && "data-[state=checked]:bg-green-600"
                        )}
                      />
                      <span className={cn(
                        "text-xs font-medium",
                        contact.followUpStatus === 'completed' 
                          ? 'text-green-700 dark:text-green-400' 
                          : 'text-gray-600 dark:text-gray-400'
                      )}>
                        {contact.followUpStatus === 'completed' ? 'Done' : 'Pending'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {contact.demoScheduled ? (
                    <div className="flex items-center gap-1 text-sm">
                      <CalendarDays className="w-4 h-4 text-blue-600" />
                      {new Date(contact.demoScheduled).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleConvertToCustomer(contact)}
                    className="h-8 px-3 text-xs"
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Convert
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredContacts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No contacts found matching your criteria.
          </div>
        )}
      </div>

      {/* Follow-up Scheduling Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentFollowUpContact && (
              <div className="text-sm text-muted-foreground">
                Scheduling follow-up for: <strong>{currentFollowUpContact.name}</strong>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="followup-date">Follow-up Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !followUpDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {followUpDate ? format(followUpDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={followUpDate}
                    onSelect={setFollowUpDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="followup-remark">Remark (Optional)</Label>
              <Textarea
                id="followup-remark"
                placeholder="Add a note about this follow-up..."
                value={followUpRemark}
                onChange={(e) => setFollowUpRemark(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFollowUpDialog(false)}
                disabled={followUpLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveFollowUp}
                disabled={!followUpDate || followUpLoading}
              >
                {followUpLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Follow-up'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Conversion Modal */}
      <CustomerConversionModal
        open={showConversionModal}
        onClose={() => {
          setShowConversionModal(false);
          setCurrentConversionContact(null);
        }}
        onConfirm={handleConfirmConversion}
        lead={currentConversionContact}
        loading={conversionLoading}
      />

      <InteractionDetailsModal
        isOpen={isInteractionModalOpen}
        onClose={() => setIsInteractionModalOpen(false)}
        analytics={selectedInteractionAnalytics}
        isLoading={isAnalyticsLoading}
        error={analyticsError}
      />
    </div>
  );
};

export default LeadIntelligence;