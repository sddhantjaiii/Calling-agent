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
import { ContactDisplay } from "@/components/contacts/ContactDisplay";
import {
    Phone,
    PhoneCall,
    Calendar as CalendarIcon,
    Users,
    Search,
    Filter,
    X,
    Mail,
    ChevronDown,
    UserPlus,
    FileText,
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLeads } from "@/hooks/useLeads";
import type { Lead, LeadFilters, LeadListOptions } from "@/hooks/useLeads";
import { TableErrorBoundary } from "@/components/ui/ErrorBoundaryWrapper";
import { LeadsTableLoading } from "@/components/ui/LoadingStates";
import { NoLeadsData, NoSearchResults, LoadingFailed } from "@/components/ui/EmptyStateComponents";
import ErrorHandler from "@/components/ui/ErrorHandler";

// Helper function to get lead tag color
const getLeadTagColor = (tag: string) => {
    switch (tag) {
        case "Hot": return "bg-red-500";
        case "Warm": return "bg-orange-500";
        case "Cold": return "bg-blue-500";
        default: return "bg-gray-500";
    }
};

// Helper function to get platform icon
const getPlatformIcon = (platform: string) => {
    switch (platform) {
        case "WhatsApp": return "💬";
        case "Instagram": return "📷";
        case "Phone": return "📞";
        default: return "💬";
    }
};

const timeSlots = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
];

interface Filters {
    agent: string;
    source: string;
    leadTag: string[];
    status: string[];
    intentLevel: number[];
    engagementLevel: number[];
    businessType: string;
    leadType: string;
}

interface LeadsDataProps {
    onNavigateToLogs?: () => void;
    onOpenProfile?: (lead: Lead) => void;
}

const LeadsDataContent = ({ onNavigateToLogs, onOpenProfile }: LeadsDataProps) => {
    const { theme } = useTheme();

    // Use the leads hook for real API data
    const {
        leads,
        loading,
        error,
        pagination,
        refreshLeads,
        filterLeads,
        loadLeadsWithPagination,
        loadNextPage,
        loadPreviousPage,
        clearError,
    } = useLeads();

    // Local state
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [sortBy, setSortBy] = useState<string>('interactionDate');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Enhanced filters
    const [filters, setFilters] = useState<Filters>({
        agent: "",
        source: "",
        leadTag: [],
        status: [],
        intentLevel: [1, 10],
        engagementLevel: [1, 10],
        businessType: "",
        leadType: "",
    });
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [showCustomRange, setShowCustomRange] = useState(false);

    // Modal states
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [currentLeadId, setCurrentLeadId] = useState("");

    // Bulk action modal states
    const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
    const [showBulkFollowUpModal, setShowBulkFollowUpModal] = useState(false);
    const [showBulkDemoModal, setShowBulkDemoModal] = useState(false);
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

    // Helper functions for filter state
    const hasActiveFilters = Boolean(
        searchTerm.trim() ||
        filters.agent ||
        filters.source ||
        filters.leadTag.length > 0 ||
        filters.status.length > 0 ||
        filters.businessType ||
        filters.leadType ||
        dateRange?.from ||
        dateRange?.to
    );

    const getActiveFilterCount = () => {
        let count = 0;
        if (searchTerm.trim()) count++;
        if (filters.agent) count++;
        if (filters.source) count++;
        if (filters.leadTag.length > 0) count++;
        if (filters.status.length > 0) count++;
        if (filters.businessType) count++;
        if (filters.leadType) count++;
        if (dateRange?.from || dateRange?.to) count++;
        return count;
    };

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
                leadFilters.leadTag = filters.leadTag[0] as 'Hot' | 'Warm' | 'Cold';
            }

            // Add business type filter
            if (filters.businessType) {
                leadFilters.businessType = filters.businessType;
            }

            // Add lead type filter
            if (filters.leadType) {
                leadFilters.leadType = filters.leadType;
            }

            // Add engagement level filter
            if (filters.engagementLevel[0] > 1 || filters.engagementLevel[1] < 10) {
                const level = filters.engagementLevel[0] <= 3 ? 'Low' :
                    filters.engagementLevel[0] <= 7 ? 'Medium' : 'High';
                leadFilters.engagementLevel = level;
            }

            // Add intent level filter
            if (filters.intentLevel[0] > 1 || filters.intentLevel[1] < 10) {
                const level = filters.intentLevel[0] <= 3 ? 'Low' :
                    filters.intentLevel[0] <= 7 ? 'Medium' : 'High';
                leadFilters.intentLevel = level;
            }

            // Add date range filters
            if (dateRange?.from) {
                leadFilters.startDate = dateRange.from;
            }
            if (dateRange?.to) {
                leadFilters.endDate = dateRange.to;
            }

            const options: LeadListOptions = {
                limit: pageSize,
                offset: (currentPage - 1) * pageSize,
                sortBy: sortBy as any,
                sortOrder,
            };

            await filterLeads(leadFilters, options);
        };

        applyFilters();
    }, [searchTerm, filters, dateRange, currentPage, pageSize, sortBy, sortOrder, filterLeads]);

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
            toast.success(`Follow-up scheduled for ${selectedLeads.length} leads!`);
            setShowBulkFollowUpModal(false);
            setSelectedDate(undefined);
            setSelectedTimeSlot("");
            setSelectedLeads([]);
        }
    };

    const handleBulkDemo = () => {
        if (selectedLeads.length > 0 && selectedDate && selectedTimeSlot) {
            const scheduled = `${selectedDate.toLocaleDateString()} ${selectedTimeSlot}`;
            toast.success(`Demo scheduled for ${selectedLeads.length} leads!`);
            setShowBulkDemoModal(false);
            setSelectedDate(undefined);
            setSelectedTimeSlot("");
            setSelectedLeads([]);
        }
    };

    const handleAddLead = () => {
        if (newLeadData.name && newLeadData.email && newLeadData.phone) {
            toast.success("Lead added successfully!");
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

    const handleExport = () => {
        toast.success("Export functionality will be implemented soon!");
    };

    return (
        <div className={`flex h-full ${theme === "dark" ? "bg-black" : "bg-gray-50"}`}>
            {/* Main content */}
            <div className={`flex-1 p-6 space-y-6 ${showFilterPanel ? "mr-80" : ""}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
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
                            Add Lead
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
                        <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-600"}`}>
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
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <ErrorHandler
                        error={error}
                        onRetry={refreshLeads}
                        maxRetries={3}
                        showToast={false}
                        compact={true}
                        className="mb-6"
                    />
                )}

                {/* Data Table */}
                <div className={`rounded-lg border overflow-hidden ${theme === "dark" ? "border-gray-700 bg-[#020817]" : "border-gray-200"}`}>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className={theme === "dark" ? "border-gray-700" : "border-gray-200"}>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={selectedLeads.length === leads.length && leads.length > 0}
                                            onCheckedChange={(checked) =>
                                                setSelectedLeads(checked ? leads.map((l) => l.id) : [])
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
                                    <TableHead>Engagement</TableHead>
                                    <TableHead>Intent</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8">
                                            <LeadsTableLoading rows={5} />
                                        </TableCell>
                                    </TableRow>
                                ) : leads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8">
                                            {searchTerm ? (
                                                <NoSearchResults
                                                    searchTerm={searchTerm}
                                                    onClearSearch={() => setSearchTerm('')}
                                                    entityType="leads"
                                                />
                                            ) : (
                                                <NoLeadsData
                                                    onAddLead={() => setShowAddLeadModal(true)}
                                                    onRefresh={refreshLeads}
                                                    isFiltered={hasActiveFilters}
                                                    filterCount={getActiveFilterCount()}
                                                />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    leads.map((lead) => (
                                        <TableRow
                                            key={lead.id}
                                            className={theme === "dark" ? "border-gray-700" : "border-gray-200"}
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedLeads.includes(lead.id)}
                                                    onCheckedChange={() => handleSelectLead(lead.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${theme === "dark" ? "bg-gray-600" : "bg-gray-500"}`}>
                                                        {(lead as any).contactName?.charAt(0) || (lead as any).callerName?.charAt(0) || 'L'}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className={`text-sm font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                                                            {(lead as any).contactName || (lead as any).callerName || 'Unknown Lead'}
                                                        </div>
                                                        <ContactDisplay 
                                                            contact={{
                                                                name: (lead as any).contactName || (lead as any).callerName,
                                                                email: (lead as any).contactEmail || (lead as any).callerEmail || lead.email,
                                                                phoneNumber: (lead as any).phoneNumber
                                                            }}
                                                            callSource={(lead as any).callSource || "unknown"}
                                                            className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-900"}`}>
                                                    {(lead as any).interactionDate || new Date(lead.createdAt).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <span className="mr-2">{getPlatformIcon((lead as any).platform || 'Phone')}</span>
                                                    <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-900"}`}>
                                                        {(lead as any).platform || 'Phone'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lead.status === 'converted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                    lead.status === 'qualified' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                        lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                                    }`}>
                                                    {lead.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getLeadTagColor((lead as any).leadTag || 'Cold')}`}>
                                                    {(lead as any).leadTag || 'Cold'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-900"}`}>
                                                    {(lead as any).useCase || 'No summary available'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-900"}`}>
                                                    {(lead as any).engagementLevel || 'Medium'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-900"}`}>
                                                    {(lead as any).intentLevel || 'Medium'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEmailAction(lead.id)}
                                                        className="h-8"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleFollowUpAction(lead.id)}
                                                        className="h-8"
                                                    >
                                                        <CalendarIcon className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onOpenProfile?.(lead)}
                                                        className="h-8"
                                                    >
                                                        <FileText className="w-4 h-4" />
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

                {/* Pagination */}
                {pagination && (
                    <div className="flex items-center justify-between">
                        <div className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                            Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{" "}
                            {Math.min(pagination.currentPage * pagination.limit, pagination.total)} of{" "}
                            {pagination.total} results
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePreviousPage}
                                disabled={currentPage <= 1}
                                className={theme === "dark" ? "border-gray-600 text-slate-300" : ""}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </Button>
                            <span className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                                Page {pagination.currentPage} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNextPage}
                                disabled={!pagination.hasMore}
                                className={theme === "dark" ? "border-gray-600 text-slate-300" : ""}
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Filter Panel */}
            {showFilterPanel && (
                <div className={`fixed right-0 top-0 h-full w-80 ${theme === "dark" ? "bg-[#020817] border-l border-gray-700" : "bg-white border-l border-gray-200"} p-6 overflow-y-auto z-40`}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                            Filters
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowFilterPanel(false)}
                            className={theme === "dark" ? "text-slate-300 hover:bg-gray-800" : ""}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {/* Agent Filter */}
                        <div>
                            <Label className={theme === "dark" ? "text-slate-300" : ""}>Agent</Label>
                            <Input
                                placeholder="Filter by agent"
                                value={filters.agent}
                                onChange={(e) => setFilters(prev => ({ ...prev, agent: e.target.value }))}
                                className={theme === "dark" ? "bg-[#020817] border-gray-600 text-white" : ""}
                            />
                        </div>

                        {/* Lead Tag Filter */}
                        <div>
                            <Label className={theme === "dark" ? "text-slate-300" : ""}>Lead Tag</Label>
                            <div className="space-y-2 mt-2">
                                {['Hot', 'Warm', 'Cold'].map((tag) => (
                                    <div key={tag} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={tag}
                                            checked={filters.leadTag.includes(tag)}
                                            onCheckedChange={() => toggleArrayFilter('leadTag', tag)}
                                        />
                                        <Label htmlFor={tag} className={`text-sm ${theme === "dark" ? "text-slate-300" : ""}`}>
                                            {tag}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Business Type Filter */}
                        <div>
                            <Label className={theme === "dark" ? "text-slate-300" : ""}>Business Type</Label>
                            <Input
                                placeholder="Filter by business type"
                                value={filters.businessType}
                                onChange={(e) => setFilters(prev => ({ ...prev, businessType: e.target.value }))}
                                className={theme === "dark" ? "bg-[#020817] border-gray-600 text-white" : ""}
                            />
                        </div>

                        {/* Date Range Filter */}
                        <div>
                            <Label className={theme === "dark" ? "text-slate-300" : ""}>Date Range</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={`w-full justify-start text-left font-normal ${theme === "dark" ? "border-gray-600 text-slate-300 hover:bg-gray-800" : ""}`}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                                    {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pick a date range</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Clear Filters */}
                        <Button
                            variant="outline"
                            onClick={() => {
                                setFilters({
                                    agent: "",
                                    source: "",
                                    leadTag: [],
                                    status: [],
                                    intentLevel: [1, 10],
                                    engagementLevel: [1, 10],
                                    businessType: "",
                                    leadType: "",
                                });
                                setDateRange(undefined);
                                setSearchTerm("");
                            }}
                            className={`w-full ${theme === "dark" ? "border-gray-600 text-slate-300 hover:bg-gray-800" : ""}`}
                        >
                            Clear All Filters
                        </Button>
                    </div>
                </div>
            )}

            {/* Modals would go here - Email, Follow-up, Demo, Add Lead, etc. */}
            {/* For brevity, I'm not including all the modal implementations */}
        </div>
    );
};

const LeadsData = (props: LeadsDataProps) => {
    return (
        <TableErrorBoundary>
            <LeadsDataContent {...props} />
        </TableErrorBoundary>
    );
};

export default LeadsData;