import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  Phone,
  PhoneCall,
  Calendar as CalendarIcon,
  Users,
  Search,
  Filter,
  X,
  Mail,
  UserPlus,
  MoreHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

import { DateRange } from "react-day-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CallingModal from "./CallingModal";
import CallTranscriptViewer from "./CallTranscriptViewer";
import { useLeads } from "@/hooks/useLeads";
import { useCalls } from "@/hooks/useCalls";
import type { LeadFilters, LeadListOptions } from "@/hooks/useLeads";
import { Call, Lead } from "@/types";
import { NoCallsData, NoSearchResults } from "@/components/ui/EmptyStateComponents";



const timeSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
];

interface Filters {
  agent: string;
  source: string;
  leadTag: string[];
  status: string[];
  intentLevel: number[];
  engagementLevel: number[];
  hasTranscript: boolean | null;
  hasAnalytics: boolean | null;
}

interface DisplayLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  platform: string;
  leadType: string;
  businessType: string;
  useCase: string;
  leadTag: string;
  duration: string;
  engagementLevel: string;
  intentLevel: string;
  budgetConstraint: string;
  timelineUrgency: string;
  followUpScheduled: string;
  demoScheduled: string;
  agent: string;
  interactionDate: string;
  isLatestInteraction: boolean;
  status: string;
  hasTranscript: boolean;
  hasAnalytics: boolean;
}

interface CallDataProps {
  agentId?: string;
  onNavigateToLogs?: () => void;
  onOpenProfile?: (lead: DisplayLead) => void;
}

const CallData = ({
  onNavigateToLogs: _onNavigateToLogs,
  onOpenProfile,
}: CallDataProps) => {
  const { theme } = useTheme();

  // Use the calls hook for real API data
  const {
    calls,
    loading,
    error,
    pagination,
    refreshCalls,
    loadCall,
    loadTranscript,
  } = useCalls({
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Local state
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Enhanced filters
  const [filters, setFilters] = useState<Filters>({
    agent: "",
    source: "",
    leadTag: [],
    status: [],
    intentLevel: [1, 10],
    engagementLevel: [1, 10],
    hasTranscript: null,
    hasAnalytics: null,
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState("");
  const [showCallingModal, setShowCallingModal] = useState(false);
  const [callingLead, setCallingLead] = useState<DisplayLead | null>(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [selectedTranscriptCall, setSelectedTranscriptCall] = useState<Call | null>(null);

  // Bulk action modal states
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [showBulkFollowUpModal, setShowBulkFollowUpModal] = useState(false);
  const [showBulkDemoModal, setShowBulkDemoModal] = useState(false);
  const [showBulkCallingModal, setShowBulkCallingModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  // Email modal state
  const [emailData, setEmailData] = useState({
    subject: "",
    body: "",
  });

  // Calendar modal state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");

  // Add lead form state
  const [newLeadData, setNewLeadData] = useState({
    name: "",
    email: "",
    phone: "",
    platform: "WhatsApp",
    leadType: "Inbound",
    businessType: "SaaS",
    useCase: "",
    leadTag: "Warm",
  });

  // Debug logging
  console.log('CallData Debug:', {
    callsLength: calls.length,
    firstCall: calls[0],
    loading,
    error
  });

  // Transform call data to display format
  const displayData: DisplayLead[] = calls.map((call) => ({
    id: call.id,
    name: call.contactName || call.callerName || 'Unknown Contact',
    phone: call.phoneNumber || 'No phone',
    email: call.contactEmail || call.callerEmail || 'No email',
    platform: call.callSource === 'phone' ? 'Phone' : call.callSource === 'internet' ? 'Web' : 'Unknown',
    leadType: (call as any).leadType || 'Unknown',
    businessType: (call as any).businessType || 'Unknown',
    useCase: (call as any).useCase || 'No summary available',
    leadTag: (call as any).leadTag || 'Cold',
    duration: (() => {
      if (call.durationSeconds && !isNaN(call.durationSeconds)) {
        const mins = Math.floor(call.durationSeconds / 60);
        const secs = call.durationSeconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
      }
      if (call.displayDuration) {
        const parts = call.displayDuration.replace(/ min| sec/g, '').split(' ').filter(Boolean);
        if (call.displayDuration.includes('min')) {
          const mins = parts[0] || '0';
          const secs = parts[1] || '0';
          return `${mins}:${String(secs).padStart(2, '0')}`;
        }
        const secs = parts[0] || '0';
        return `0:${String(secs).padStart(2, '0')}`;
      }
      if (call.durationMinutes && !isNaN(call.durationMinutes)) {
        return `${Math.floor(call.durationMinutes)}:${String(Math.round((call.durationMinutes % 1) * 60)).padStart(2, '0')}`;
      }
      return '0:00';
    })(),
    engagementLevel: (call as any).engagementLevel || 'Medium',
    intentLevel: (call as any).intentLevel || 'Medium',
    budgetConstraint: (call as any).budgetConstraint || 'Unknown',
    timelineUrgency: (call as any).timelineUrgency || 'Unknown',
    followUpScheduled: (call as any).followUpScheduled || '',
    demoScheduled: (call as any).demoScheduled || '',
    agent: call.agentName || 'Unknown Agent',
    interactionDate: call.createdAt ? new Date(call.createdAt).toLocaleDateString() : 'Invalid Date',
    isLatestInteraction: true,
    status: call.status,
    hasTranscript: !!call.transcript,
    hasAnalytics: !!call.leadAnalytics,
  }));

  // Apply search and filters
  useEffect(() => {
    const applyFilters = async () => {
      const leadFilters: LeadFilters = {};

      // Add search term
      if (searchTerm.trim()) {
        leadFilters.search = searchTerm.trim();
      }

      // Add agent filter
      if (filters.agent) {
        leadFilters.agent = filters.agent;
      }

      // Add lead tag filter
      if (filters.leadTag.length > 0) {
        const tag = filters.leadTag[0];
        if (tag === 'Hot' || tag === 'Warm' || tag === 'Cold') {
          leadFilters.leadTag = tag;
        }
      }

      // Add business type filter (if available in filters)
      if ((filters as any).businessType) {
        leadFilters.businessType = (filters as any).businessType;
      }

      // Add lead type filter (if available in filters)
      if ((filters as any).leadType) {
        leadFilters.leadType = (filters as any).leadType;
      }

      // Add platform filter
      if (filters.source) {
        leadFilters.platform = filters.source;
      }

      // Add date range filters
      if (dateRange?.from) {
        leadFilters.startDate = dateRange.from;
      }
      if (dateRange?.to) {
        leadFilters.endDate = dateRange.to;
      }

      // Apply engagement level filters
      if (filters.engagementLevel[0] > 1 || filters.engagementLevel[1] < 10) {
        const level = filters.engagementLevel[0] <= 3 ? 'Low' :
          filters.engagementLevel[0] <= 7 ? 'Medium' : 'High';
        leadFilters.engagementLevel = level;
      }

      // Apply intent level filters
      if (filters.intentLevel[0] > 1 || filters.intentLevel[1] < 10) {
        const level = filters.intentLevel[0] <= 3 ? 'Low' :
          filters.intentLevel[0] <= 7 ? 'Medium' : 'High';
        leadFilters.intentLevel = level;
      }

      const options: LeadListOptions = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortBy: sortBy as any,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      // For calls, we'll implement filtering differently
      // For now, just refresh the calls
      await refreshCalls();
    };

    applyFilters();
  }, [searchTerm, filters, dateRange, currentPage, pageSize, sortBy, sortOrder, refreshCalls]);

  // Table select logic
  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleNextPage = () => {
    if (pagination?.hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadNextPage(currentPage, pageSize);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      loadPreviousPage(currentPage, pageSize);
    }
  };

  // Search handler with debouncing
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };



  // Action handlers
  const handleTranscriptAction = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      // Check if transcript exists
      if (!(lead as any).hasTranscript) {
        toast.error('No transcript available for this lead');
        return;
      }
      // For leads, we would need to fetch the transcript data
      // This would require additional API calls to get call details
      toast.info('Transcript functionality would be implemented here');
    } else {
      toast.error('Lead not found');
    }
  };

  const handleCallAction = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      const leadData: DisplayLead = {
        id: lead.id,
        name: (lead as any).name || 'Unknown Lead',
        phone: (lead as any).phone || lead.email,
        email: lead.email,
        platform: (lead as any).platform || 'Phone',
        leadType: (lead as any).leadType || 'Customer',
        businessType: (lead as any).businessType || 'Unknown',
        useCase: (lead as any).useCase || 'No summary available',
        leadTag: (lead as any).leadTag || 'Cold',
        duration: (lead as any).duration || '0:00',
        engagementLevel: (lead as any).engagementLevel || 'Medium',
        intentLevel: (lead as any).intentLevel || 'Medium',
        budgetConstraint: (lead as any).budgetConstraint || 'Unknown',
        timelineUrgency: (lead as any).timelineUrgency || 'Unknown',
        followUpScheduled: (lead as any).followUpScheduled || '',
        demoScheduled: (lead as any).demoScheduled || '',
        agent: (lead as any).agent || 'Unknown Agent',
        interactionDate: (lead as any).interactionDate || new Date(lead.createdAt).toLocaleDateString(),
        isLatestInteraction: true,
        status: lead.status,
        hasTranscript: (lead as any).hasTranscript || false,
        hasAnalytics: (lead as any).hasAnalytics || false,
      };
      setCallingLead(leadData);
      setShowCallingModal(true);
    }
  };

  const handleEmailAction = (leadId: string) => {
    setCurrentLeadId(leadId);
    setShowEmailModal(true);
    setEmailData({ subject: "", body: "" });
  };

  const handleFollowUpAction = (leadId: string) => {
    setCurrentLeadId(leadId);
    setShowFollowUpModal(true);
    setSelectedDate(undefined);
    setSelectedTimeSlot("");
  };

  const handleDemoAction = (leadId: string) => {
    setCurrentLeadId(leadId);
    setShowDemoModal(true);
    setSelectedDate(undefined);
    setSelectedTimeSlot("");
  };

  const handleSendEmail = () => {
    if (emailData.subject && emailData.body) {
      toast.success("Email sent successfully!");
      setShowEmailModal(false);
      setEmailData({ subject: "", body: "" });
      setCurrentLeadId("");
    }
  };

  const handleScheduleFollowUp = () => {
    if (selectedDate && selectedTimeSlot && currentLeadId) {
      const scheduled = `${selectedDate.toLocaleDateString()} ${selectedTimeSlot}`;
      // This would need to be implemented with a backend API call
      toast.success(`Follow-up scheduled for ${scheduled}`);
      setShowFollowUpModal(false);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setCurrentLeadId("");
    }
  };

  const handleScheduleDemo = () => {
    if (selectedDate && selectedTimeSlot && currentLeadId) {
      const scheduled = `${selectedDate.toLocaleDateString()} ${selectedTimeSlot}`;
      // This would need to be implemented with a backend API call
      toast.success(`Demo scheduled for ${scheduled}`);
      setShowDemoModal(false);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setCurrentLeadId("");
    }
  };

  // Bulk action handlers
  const handleBulkEmail = () => {
    if (selectedLeads.length > 0 && emailData.subject && emailData.body) {
      toast.success(`Email sent to ${selectedLeads.length} leads!`);
      setShowBulkEmailModal(false);
      setEmailData({ subject: "", body: "" });
      setSelectedLeads([]);
    }
  };

  const handleBulkFollowUp = () => {
    if (selectedLeads.length > 0 && selectedDate && selectedTimeSlot) {
      const scheduled = `${selectedDate.toLocaleDateString()} ${selectedTimeSlot}`;
      // This would need to be implemented with a backend API call
      toast.success(`Follow-up scheduled for ${selectedLeads.length} calls!`);
      setShowBulkFollowUpModal(false);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setSelectedLeads([]);
    }
  };

  const handleBulkDemo = () => {
    if (selectedLeads.length > 0 && selectedDate && selectedTimeSlot) {
      const scheduled = `${selectedDate.toLocaleDateString()} ${selectedTimeSlot}`;
      // This would need to be implemented with a backend API call
      toast.success(`Demo scheduled for ${selectedLeads.length} calls!`);
      setShowBulkDemoModal(false);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setSelectedLeads([]);
    }
  };

  const handleBulkCall = () => {
    if (selectedLeads.length > 0) {
      setShowBulkCallingModal(true);
      setSelectedLeads([]);
    }
  };

  const handleAddLead = () => {
    if (newLeadData.name && newLeadData.email && newLeadData.phone) {
      // This would need to be implemented with a backend API call to create a contact
      // and potentially initiate a call
      toast.success("Contact added successfully! Call functionality would be implemented here.");
      setShowAddLeadModal(false);
      setNewLeadData({
        name: "",
        email: "",
        phone: "",
        platform: "WhatsApp",
        leadType: "Inbound",
        businessType: "SaaS",
        useCase: "",
        leadTag: "Warm",
      });
      // Refresh the leads list
      refreshLeads();
    }
  };

  // Filter helpers
  const toggleArrayFilter = (
    filterKey: keyof Pick<Filters, "leadTag" | "status">,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: prev[filterKey].includes(value)
        ? prev[filterKey].filter((item) => item !== value)
        : [...prev[filterKey], value],
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const statusColor = (tag: string) => {
    if (tag === "Hot") return "bg-red-500";
    if (tag === "Warm") return "bg-orange-500";
    if (tag === "Cold") return "bg-blue-500";
    return "bg-gray-500";
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "WhatsApp":
        return "💬";
      case "Instagram":
        return "📷";
      default:
        return "💬";
    }
  };

  const handleExport = () => {
    toast.success("Export functionality will be implemented soon!");
  };

  return (
    <div
      className={`flex h-full ${theme === "dark" ? "bg-black" : "bg-gray-50"}`}
    >
      {/* Main content */}
      <div className={`flex-1 p-6 space-y-6 ${showFilterPanel ? "mr-80" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"
              }`}
          >
            Leads Data
          </h2>
        </div>

        {/* Search bar with Add Lead, Filter and 3-dots buttons in same row */}
        <div className="flex items-center justify-between gap-4">
          <div className="w-80 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search leads by name, email, phone, or company..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className={`pl-10 ${theme === "dark"
                ? "bg-[#020817] border-gray-600 text-white"
                : "bg-transparent border-gray-300 text-gray-900"
                }`}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowAddLeadModal(true)}
              className="bg-[#1A6262] hover:bg-[#145252] text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Lead/Customer
            </Button>
            <Button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              variant="outline"
              className={
                theme === "dark"
                  ? "border-gray-700 text-slate-300 hover:bg-gray-800"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            {/* 3-dots dropdown menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-10 w-10 p-0 ${theme === "dark"
                    ? "border-gray-700 text-slate-300 hover:bg-gray-800"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className={`z-50 ${theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
                  }`}
              >
                <DropdownMenuItem
                  onClick={() => setShowBulkFollowUpModal(true)}
                  disabled={selectedLeads.length === 0}
                  className={
                    selectedLeads.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Bulk Follow-up
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowBulkDemoModal(true)}
                  disabled={selectedLeads.length === 0}
                  className={
                    selectedLeads.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                >
                  <Users className="w-4 h-4 mr-2" />
                  Bulk Demo
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleBulkCall}
                  disabled={selectedLeads.length === 0}
                  className={
                    selectedLeads.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                >
                  <PhoneCall className="w-4 h-4 mr-2" />
                  Bulk Call
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowBulkEmailModal(true)}
                  disabled={selectedLeads.length === 0}
                  className={
                    selectedLeads.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Bulk Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Selection count and quick actions in a separate row */}
        {selectedLeads.length > 0 && (
          <div className="flex items-center justify-between">
            <span
              className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-600"
                }`}
            >
              {selectedLeads.length} selected
            </span>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowBulkEmailModal(true)}
                className="h-8 bg-[#E1A940] hover:bg-[#D49B35] text-white"
              >
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
              <Button
                size="sm"
                onClick={() => setShowBulkFollowUpModal(true)}
                className="h-8 bg-[#91C499] hover:bg-[#7FB088] text-white"
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                Follow-up
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-8 ${theme === "dark"
                      ? "border-gray-600 text-slate-300 hover:bg-gray-700"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className={`z-50 ${theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                    }`}
                >
                  <DropdownMenuItem onClick={() => setShowBulkDemoModal(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Bulk Demo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkCall}>
                    <PhoneCall className="w-4 h-4 mr-2" />
                    Bulk Call
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <X className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700 dark:text-red-300">{error}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div
          className={`rounded-lg border overflow-hidden ${theme === "dark"
            ? "border-gray-700 bg-[#020817]"
            : "border-gray-200"
            }`}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow
                  className={
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                  }
                >
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedLeads.length === displayData.length &&
                        displayData.length > 0
                      }
                      onCheckedChange={(checked) =>
                        setSelectedLeads(
                          checked ? displayData.map((d) => d.id) : []
                        )
                      }
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('name')}
                  >
                    Contact {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => handleSort('interactionDate')}
                  >
                    Date {sortBy === 'interactionDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lead Tag</TableHead>
                  <TableHead>Use Case</TableHead>
                  <TableHead>Business Type</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        <span>Loading leads...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : displayData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      {searchTerm ? (
                        <NoSearchResults
                          searchTerm={searchTerm}
                          onClearSearch={() => setSearchTerm('')}
                          entityType="calls"
                        />
                      ) : (
                        <NoCallsData
                          onRefresh={() => window.location.reload()}
                          isFiltered={Boolean(filters.agent || filters.source || filters.leadTag.length > 0)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayData.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className={
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={() => handleSelectLead(lead.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${theme === "dark" ? "bg-gray-600" : "bg-gray-500"
                              }`}
                          >
                            {lead.name.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div
                              className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"
                                }`}
                            >
                              {lead.name}
                            </div>
                            <div
                              className={`text-sm ${theme === "dark"
                                ? "text-slate-400"
                                : "text-gray-500"
                                }`}
                            >
                              {lead.email || 'No email available'}
                            </div>
                            <div
                              className={`text-sm ${theme === "dark"
                                ? "text-slate-400"
                                : "text-gray-500"
                                }`}
                            >
                              {lead.phone}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-900"
                          }`}
                      >
                        {lead.interactionDate}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="text-lg mr-2">
                            {getPlatformIcon(lead.platform)}
                          </span>
                          <span
                            className={`text-sm ${theme === "dark"
                              ? "text-slate-300"
                              : "text-gray-900"
                              }`}
                          >
                            {lead.platform}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lead.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : lead.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : lead.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}
                        >
                          {lead.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${statusColor(
                            lead.leadTag
                          )}`}
                        >
                          {lead.leadTag}
                        </span>
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate"
                        title={lead.useCase}
                      >
                        {lead.useCase}
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-900"}`}>
                          {lead.businessType}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${lead.engagementLevel === "High"
                            ? "bg-red-500 text-white"
                            : lead.engagementLevel === "Medium"
                              ? "bg-orange-500 text-white"
                              : "bg-blue-500 text-white"
                            }`}
                        >
                          {lead.engagementLevel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${lead.intentLevel === "High"
                            ? "bg-red-500 text-white"
                            : lead.intentLevel === "Medium"
                              ? "bg-orange-500 text-white"
                              : "bg-blue-500 text-white"
                            }`}
                        >
                          {lead.intentLevel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEmailAction(lead.id)}
                            className="h-8 w-8 p-0"
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFollowUpAction(lead.id)}
                            className="h-8 w-8 p-0"
                            title="Schedule Follow-up"
                          >
                            <CalendarIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCallAction(lead.id)}
                            className="h-8 w-8 p-0"
                            title="Call Lead"
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenProfile && onOpenProfile(lead)}
                            className="h-8 w-8 p-0"
                            title="View Profile"
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-600"}`}>
                Showing {((pagination.offset || 0) + 1)} to {Math.min((pagination.offset || 0) + (pagination.limit || 20), pagination.total)} of {pagination.total} calls
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage <= 1 || loading}
                className={theme === "dark" ? "border-gray-700 text-slate-300" : "border-gray-300"}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages || 1) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > (pagination.totalPages || 1)) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                      className={`w-8 h-8 p-0 ${pageNum === currentPage
                        ? "bg-[#1A6262] text-white"
                        : theme === "dark"
                          ? "border-gray-700 text-slate-300"
                          : "border-gray-300"
                        }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!pagination.hasMore || loading}
                className={theme === "dark" ? "border-gray-700 text-slate-300" : "border-gray-300"}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div
          className={`fixed right-0 top-0 h-full w-80 border-l z-50 overflow-y-auto ${theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
            }`}
        >
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3
                className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
              >
                Filters
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilterPanel(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Agent Filter */}
              <div>
                <Label
                  className={
                    theme === "dark" ? "text-slate-300" : "text-gray-700"
                  }
                >
                  Agent
                </Label>
                <select
                  value={filters.agent}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, agent: e.target.value }))
                  }
                  className={`w-full mt-1 p-2 rounded-md border ${theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                    }`}
                >
                  <option value="">All Agents</option>
                  <option value="CallAgent-01">CallAgent-01</option>
                  <option value="CallAgent-02">CallAgent-02</option>
                </select>
              </div>

              {/* Source Filter */}
              <div>
                <Label
                  className={
                    theme === "dark" ? "text-slate-300" : "text-gray-700"
                  }
                >
                  Source
                </Label>
                <select
                  value={filters.source}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, source: e.target.value }))
                  }
                  className={`w-full mt-1 p-2 rounded-md border ${theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                    }`}
                >
                  <option value="">All Sources</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Instagram">Instagram</option>
                </select>
              </div>

              {/* Call Status Multi-select */}
              <div>
                <Label
                  className={
                    theme === "dark" ? "text-slate-300" : "text-gray-700"
                  }
                >
                  Call Status
                </Label>
                <div className="mt-2 space-y-2">
                  {["completed", "failed", "in_progress", "cancelled"].map((status) => (
                    <div key={status} className="flex items-center space-x-2">
                      <Checkbox
                        checked={filters.status.includes(status)}
                        onCheckedChange={() =>
                          toggleArrayFilter("status", status)
                        }
                      />
                      <span
                        className={
                          theme === "dark" ? "text-slate-300" : "text-gray-700"
                        }
                      >
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lead Tag Multi-select */}
              <div>
                <Label
                  className={
                    theme === "dark" ? "text-slate-300" : "text-gray-700"
                  }
                >
                  Lead Tag
                </Label>
                <div className="mt-2 space-y-2">
                  {["Hot", "Warm", "Cold"].map((tag) => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        checked={filters.leadTag.includes(tag)}
                        onCheckedChange={() =>
                          toggleArrayFilter("leadTag", tag)
                        }
                      />
                      <span
                        className={
                          theme === "dark" ? "text-slate-300" : "text-gray-700"
                        }
                      >
                        {tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Has Transcript Filter */}
              <div>
                <Label
                  className={
                    theme === "dark" ? "text-slate-300" : "text-gray-700"
                  }
                >
                  Has Transcript
                </Label>
                <select
                  value={filters.hasTranscript === null ? "" : filters.hasTranscript.toString()}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      hasTranscript: e.target.value === "" ? null : e.target.value === "true"
                    }))
                  }
                  className={`w-full mt-1 p-2 rounded-md border ${theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                    }`}
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              {/* Has Analytics Filter */}
              <div>
                <Label
                  className={
                    theme === "dark" ? "text-slate-300" : "text-gray-700"
                  }
                >
                  Has Analytics
                </Label>
                <select
                  value={filters.hasAnalytics === null ? "" : filters.hasAnalytics.toString()}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      hasAnalytics: e.target.value === "" ? null : e.target.value === "true"
                    }))
                  }
                  className={`w-full mt-1 p-2 rounded-md border ${theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                    }`}
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              {/* Intent Level Slider */}
              <div>
                <Label
                  className={
                    theme === "dark" ? "text-slate-300" : "text-gray-700"
                  }
                >
                  Intent Level ({filters.intentLevel[0]} -{" "}
                  {filters.intentLevel[1]})
                </Label>
                <Slider
                  value={filters.intentLevel}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, intentLevel: value }))
                  }
                  max={10}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>

              {/* Engagement Level Slider */}
              <div>
                <Label
                  className={
                    theme === "dark" ? "text-slate-300" : "text-gray-700"
                  }
                >
                  Engagement Level ({filters.engagementLevel[0]} -{" "}
                  {filters.engagementLevel[1]})
                </Label>
                <Slider
                  value={filters.engagementLevel}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, engagementLevel: value }))
                  }
                  max={10}
                  min={1}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={() => {
                  setFilters({
                    agent: "",
                    source: "",
                    leadTag: [],
                    status: [],
                    intentLevel: [1, 10],
                    engagementLevel: [1, 10],
                    hasTranscript: null,
                    hasAnalytics: null,
                  });
                  setDateRange(undefined);
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                variant="outline"
                className="w-full"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transcript Modal */}
      {selectedTranscriptCall && (
        <CallTranscriptViewer
          callId={selectedTranscriptCall.id}
          isOpen={showTranscriptModal}
          onClose={() => {
            setShowTranscriptModal(false);
            setSelectedTranscriptCall(null);
          }}
          call={selectedTranscriptCall}
        />
      )}


      {/* Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent
          className={`max-w-2xl ${theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
            }`}
        >
          <DialogHeader>
            <DialogTitle
              className={`${theme === "dark" ? "text-white" : "text-gray-900"
                } flex items-center`}
            >
              <Mail className="w-5 h-5 mr-2" />
              📧 SniperThink Email Composer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label
                className={theme === "dark" ? "text-white" : "text-gray-900"}
              >
                Subject
              </Label>
              <Input
                value={emailData.subject}
                onChange={(e) =>
                  setEmailData((prev) => ({ ...prev, subject: e.target.value }))
                }
                placeholder="Enter email subject"
                className={
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }
              />
            </div>
            <div>
              <Label
                className={theme === "dark" ? "text-white" : "text-gray-900"}
              >
                Message
              </Label>
              <Textarea
                value={emailData.body}
                onChange={(e) =>
                  setEmailData((prev) => ({ ...prev, body: e.target.value }))
                }
                placeholder="Enter your message here..."
                className={
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }
                rows={6}
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEmailModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!emailData.subject || !emailData.body}
              >
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-up Modal with right-side time slots */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
        <DialogContent
          className={`max-w-4xl ${theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
            }`}
        >
          <DialogHeader>
            <DialogTitle
              className={`${theme === "dark" ? "text-white" : "text-gray-900"
                } text-xl font-bold`}
            >
              {selectedDate && selectedTimeSlot && currentLeadId
                ? "Follow-up"
                : "Schedule Follow-up"}
            </DialogTitle>
          </DialogHeader>
          {selectedDate && selectedTimeSlot && currentLeadId ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Lead Name
                  </Label>
                  <Input
                    value={
                      displayData.find((l) => l.id === currentLeadId)?.name ?? ""
                    }
                    readOnly
                  />
                </div>
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Email
                  </Label>
                  <Input
                    value={
                      displayData.find((l) => l.id === currentLeadId)?.email ?? ""
                    }
                    readOnly
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Date
                  </Label>
                  <Input value={selectedDate.toLocaleDateString()} readOnly />
                </div>
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Time
                  </Label>
                  <Input value={selectedTimeSlot} readOnly />
                </div>
              </div>
              <div>
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Meeting Notes
                </Label>
                <Textarea
                  placeholder="Add notes for the follow-up meeting..."
                  rows={3}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFollowUpModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScheduleFollowUp}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Schedule
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-6">
              <div className="flex-1">
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Select Date
                </Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border pointer-events-auto"
                  disabled={(date) => date < new Date()}
                />
              </div>
              {selectedDate && (
                <div className="flex-1">
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Available Time Slots
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-80 overflow-y-auto">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={
                          selectedTimeSlot === slot ? "default" : "outline"
                        }
                        onClick={() => setSelectedTimeSlot(slot)}
                        className="text-sm"
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Demo Modal with right-side time slots */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent
          className={`max-w-4xl ${theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
            }`}
        >
          <DialogHeader>
            <DialogTitle
              className={`${theme === "dark" ? "text-white" : "text-gray-900"
                } text-xl font-bold`}
            >
              {selectedDate && selectedTimeSlot && currentLeadId
                ? "Demo"
                : "Book Demo"}
            </DialogTitle>
          </DialogHeader>
          {selectedDate && selectedTimeSlot && currentLeadId ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Lead Name
                  </Label>
                  <Input
                    value={
                      displayData.find((l) => l.id === currentLeadId)?.name ?? ""
                    }
                    readOnly
                  />
                </div>
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Email
                  </Label>
                  <Input
                    value={
                      displayData.find((l) => l.id === currentLeadId)?.email ?? ""
                    }
                    readOnly
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Date
                  </Label>
                  <Input value={selectedDate.toLocaleDateString()} readOnly />
                </div>
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Time
                  </Label>
                  <Input value={selectedTimeSlot} readOnly />
                </div>
              </div>
              <div>
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Demo Notes
                </Label>
                <Textarea placeholder="Add notes for the demo..." rows={3} />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDemoModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScheduleDemo}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Book Demo
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-6">
              <div className="flex-1">
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Select Date
                </Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border pointer-events-auto"
                  disabled={(date) => date < new Date()}
                />
              </div>
              {selectedDate && (
                <div className="flex-1">
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Available Time Slots
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-80 overflow-y-auto">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={
                          selectedTimeSlot === slot ? "default" : "outline"
                        }
                        onClick={() => setSelectedTimeSlot(slot)}
                        className="text-sm"
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Email Modal */}
      <Dialog open={showBulkEmailModal} onOpenChange={setShowBulkEmailModal}>
        <DialogContent
          className={`max-w-2xl ${theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
            }`}
        >
          <DialogHeader>
            <DialogTitle
              className={`${theme === "dark" ? "text-white" : "text-gray-900"
                } flex items-center`}
            >
              <Mail className="w-5 h-5 mr-2" />
              📧 Bulk Email ({selectedLeads.length} leads)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label
                className={theme === "dark" ? "text-white" : "text-gray-900"}
              >
                Subject
              </Label>
              <Input
                value={emailData.subject}
                onChange={(e) =>
                  setEmailData((prev) => ({ ...prev, subject: e.target.value }))
                }
                placeholder="Enter email subject"
                className={
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }
              />
            </div>
            <div>
              <Label
                className={theme === "dark" ? "text-white" : "text-gray-900"}
              >
                Message
              </Label>
              <Textarea
                value={emailData.body}
                onChange={(e) =>
                  setEmailData((prev) => ({ ...prev, body: e.target.value }))
                }
                placeholder="Enter your message here..."
                className={
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }
                rows={6}
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowBulkEmailModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkEmail}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!emailData.subject || !emailData.body}
              >
                Send to {selectedLeads.length} Leads
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Follow-up Modal */}
      <Dialog
        open={showBulkFollowUpModal}
        onOpenChange={setShowBulkFollowUpModal}
      >
        <DialogContent
          className={`max-w-4xl ${theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
            }`}
        >
          <DialogHeader>
            <DialogTitle
              className={theme === "dark" ? "text-white" : "text-gray-900"}
            >
              {selectedDate && selectedTimeSlot
                ? "Follow-up"
                : "Bulk Schedule Follow-up"}{" "}
              ({selectedLeads.length} leads)
            </DialogTitle>
          </DialogHeader>
          {selectedDate && selectedTimeSlot ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Date
                  </Label>
                  <Input value={selectedDate.toLocaleDateString()} readOnly />
                </div>
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Time
                  </Label>
                  <Input value={selectedTimeSlot} readOnly />
                </div>
              </div>
              <div>
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Meeting Notes
                </Label>
                <Textarea
                  placeholder="Add notes for the follow-up meetings..."
                  rows={3}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkFollowUpModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkFollowUp}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Schedule for {selectedLeads.length} Leads
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-6">
              <div className="flex-1">
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Select Date
                </Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border pointer-events-auto"
                  disabled={(date) => date < new Date()}
                />
              </div>
              {selectedDate && (
                <div className="flex-1">
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Available Time Slots
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-80 overflow-y-auto">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={
                          selectedTimeSlot === slot ? "default" : "outline"
                        }
                        onClick={() => setSelectedTimeSlot(slot)}
                        className="text-sm"
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Demo Modal */}
      <Dialog open={showBulkDemoModal} onOpenChange={setShowBulkDemoModal}>
        <DialogContent
          className={`max-w-4xl ${theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
            }`}
        >
          <DialogHeader>
            <DialogTitle
              className={theme === "dark" ? "text-white" : "text-gray-900"}
            >
              {selectedDate && selectedTimeSlot ? "Demo" : "Bulk Book Demo"} (
              {selectedLeads.length} leads)
            </DialogTitle>
          </DialogHeader>
          {selectedDate && selectedTimeSlot ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Date
                  </Label>
                  <Input value={selectedDate.toLocaleDateString()} readOnly />
                </div>
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Time
                  </Label>
                  <Input value={selectedTimeSlot} readOnly />
                </div>
              </div>
              <div>
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Demo Notes
                </Label>
                <Textarea placeholder="Add notes for the demos..." rows={3} />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkDemoModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkDemo}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Book for {selectedLeads.length} Leads
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-6">
              <div className="flex-1">
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Select Date
                </Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border pointer-events-auto"
                  disabled={(date) => date < new Date()}
                />
              </div>
              {selectedDate && (
                <div className="flex-1">
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
                  >
                    Available Time Slots
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-80 overflow-y-auto">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={
                          selectedTimeSlot === slot ? "default" : "outline"
                        }
                        onClick={() => setSelectedTimeSlot(slot)}
                        className="text-sm"
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Lead Modal */}
      <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
        <DialogContent
          className={`max-w-2xl ${theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
            }`}
        >
          <DialogHeader>
            <DialogTitle
              className={`${theme === "dark" ? "text-white" : "text-gray-900"
                } flex items-center`}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Add New Lead
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Name *
                </Label>
                <Input
                  value={newLeadData.name}
                  onChange={(e) =>
                    setNewLeadData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter lead name"
                  className={
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }
                />
              </div>
              <div>
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Email *
                </Label>
                <Input
                  type="email"
                  value={newLeadData.email}
                  onChange={(e) =>
                    setNewLeadData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="Enter email address"
                  className={
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Phone *
                </Label>
                <Input
                  value={newLeadData.phone}
                  onChange={(e) =>
                    setNewLeadData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="Enter phone number"
                  className={
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }
                />
              </div>
              <div>
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Platform
                </Label>
                <select
                  value={newLeadData.platform}
                  onChange={(e) =>
                    setNewLeadData((prev) => ({
                      ...prev,
                      platform: e.target.value,
                    }))
                  }
                  className={`w-full p-2 rounded-md border ${theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                    }`}
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Instagram">Instagram</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Lead Type
                </Label>
                <select
                  value={newLeadData.leadType}
                  onChange={(e) =>
                    setNewLeadData((prev) => ({
                      ...prev,
                      leadType: e.target.value,
                    }))
                  }
                  className={`w-full p-2 rounded-md border ${theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                    }`}
                >
                  <option value="Inbound">Inbound</option>
                  <option value="Outbound">Outbound</option>
                  <option value="Customer">Customer</option>
                </select>
              </div>
              <div>
                <Label
                  className={theme === "dark" ? "text-white" : "text-gray-900"}
                >
                  Business Type
                </Label>
                <select
                  value={newLeadData.businessType}
                  onChange={(e) =>
                    setNewLeadData((prev) => ({
                      ...prev,
                      businessType: e.target.value,
                    }))
                  }
                  className={`w-full p-2 rounded-md border ${theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                    }`}
                >
                  <option value="SaaS">SaaS</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Startup">Startup</option>
                </select>
              </div>
            </div>
            <div>
              <Label
                className={theme === "dark" ? "text-white" : "text-gray-900"}
              >
                Lead Tag
              </Label>
              <select
                value={newLeadData.leadTag}
                onChange={(e) =>
                  setNewLeadData((prev) => ({
                    ...prev,
                    leadTag: e.target.value,
                  }))
                }
                className={`w-full p-2 rounded-md border ${theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
                  }`}
              >
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
            </div>
            <div>
              <Label
                className={theme === "dark" ? "text-white" : "text-gray-900"}
              >
                Use Case / Query
              </Label>
              <Textarea
                value={newLeadData.useCase}
                onChange={(e) =>
                  setNewLeadData((prev) => ({
                    ...prev,
                    useCase: e.target.value,
                  }))
                }
                placeholder="Describe the lead's use case or query..."
                className={
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }
                rows={3}
              />
            </div>
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddLeadModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddLead}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={
                  !newLeadData.name || !newLeadData.email || !newLeadData.phone
                }
              >
                Add Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      {/* Calling Modal */}
      <CallingModal
        isOpen={showCallingModal}
        onClose={() => {
          setShowCallingModal(false);
          setCallingLead(null);
        }}
        leadName={callingLead?.name}
        leadPhone={callingLead?.phone}
      />

      {/* Bulk Calling Modal */}
      <CallingModal
        isOpen={showBulkCallingModal}
        onClose={() => setShowBulkCallingModal(false)}
        isBulk={true}
        leadCount={selectedLeads.length}
      />
    </div >
  );
};

export default CallData;
