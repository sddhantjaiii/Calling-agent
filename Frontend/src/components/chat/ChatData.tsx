import { useState } from "react";
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
  MessageSquare,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Lead } from "@/pages/Dashboard";
import type { TimelineEntry } from "@/pages/Dashboard";

const chatDataDemo = [
  {
    id: "1-2",
    name: "Siddhant Kumar",
    phone: "+91 8979556941",
    email: "siddhant@example.com",
    platform: "WhatsApp",
    leadType: "Customer",
    businessType: "SaaS",
    useCase: "Interested in AI chatbots for customer service automation",
    leadTag: "Hot",
    messages: 120,
    engagementLevel: "High",
    intentLevel: "High",
    budgetConstraint: "No",
    timelineUrgency: "High",
    followUpScheduled: "",
    demoScheduled: "2024-06-25 2:00 PM",
    agent: "ChatAgent-01",
    interactionDate: "2024-06-18",
    isLatestInteraction: true,
  },
  {
    id: "2",
    name: "Pooja Rathi",
    phone: "+91 9234567890",
    email: "pooja@ecom.com",
    platform: "WhatsApp",
    leadType: "Outbound",
    businessType: "E-commerce",
    useCase: "Asked about product integration via chat",
    leadTag: "Warm",
    messages: 45,
    engagementLevel: "Medium",
    intentLevel: "Medium",
    budgetConstraint: "Yes",
    timelineUrgency: "Medium",
    followUpScheduled: "2024-06-24 10:30 AM",
    demoScheduled: "",
    agent: "ChatAgent-02",
    interactionDate: "2024-06-15",
    isLatestInteraction: true,
  },
  {
    id: "3",
    name: "Amit Mishra",
    phone: "+91 8899776655",
    email: "amit@startupworld.com",
    platform: "Instagram",
    leadType: "Customer",
    businessType: "Startup",
    useCase: "Needs detailed invoice and billing information via chat",
    leadTag: "Cold",
    messages: 10,
    engagementLevel: "Low",
    intentLevel: "Low",
    budgetConstraint: "No",
    timelineUrgency: "Low",
    followUpScheduled: "",
    demoScheduled: "",
    agent: "ChatAgent-01",
    interactionDate: "2024-06-10",
    isLatestInteraction: true,
  },
  {
    id: "1",
    name: "Siddhant Kumar",
    phone: "+91 8979556941",
    email: "siddhant@example.com",
    platform: "Instagram",
    leadType: "Inbound",
    businessType: "SaaS",
    useCase: "Interested in AI chatbots for customer service automation",
    leadTag: "Hot",
    messages: 75,
    engagementLevel: "High",
    intentLevel: "High",
    budgetConstraint: "No",
    timelineUrgency: "High",
    followUpScheduled: "",
    demoScheduled: "2024-06-25 2:00 PM",
    agent: "ChatAgent-01",
    interactionDate: "2024-06-02",
    isLatestInteraction: false,
  },
];

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
  leadType: string[];
  businessType: string[];
  intentLevel: number[];
  engagementLevel: number[];
}

interface ChatDataProps {
  onNavigateToLogs?: () => void;
  onOpenProfile?: (lead: Lead) => void;
}

const ChatData = ({
  onNavigateToLogs,
  onOpenProfile,
}: {
  onNavigateToLogs: () => void;
  onOpenProfile?: (lead: Lead) => void;
}) => {
  const { theme } = useTheme();

  const [chatData, setChatData] = useState(chatDataDemo);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [filters, setFilters] = useState<Filters>({
    agent: "",
    source: "",
    leadTag: [],
    leadType: [],
    businessType: [],
    intentLevel: [1, 10],
    engagementLevel: [1, 10],
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showCustomRange, setShowCustomRange] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState("");

  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [showBulkFollowUpModal, setShowBulkFollowUpModal] = useState(false);
  const [showBulkDemoModal, setShowBulkDemoModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  const [emailData, setEmailData] = useState({
    subject: "",
    body: "",
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");

  const [newLeadData, setNewLeadData] = useState({
    name: "",
    email: "",
    phone: "",
    platform: "Inbound Chat",
    leadType: "Inbound",
    businessType: "SaaS",
    useCase: "",
    leadTag: "Warm",
  });

  const sortedChatData = [...chatData].sort((a, b) => {
    return (
      new Date(b.interactionDate).getTime() -
      new Date(a.interactionDate).getTime()
    );
  });

  const filteredData = sortedChatData.filter((lead) => {
    const searchMatch =
      searchTerm === "" ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      lead.businessType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.useCase.toLowerCase().includes(searchTerm.toLowerCase());

    const agentMatch = filters.agent === "" || lead.agent === filters.agent;
    const sourceMatch =
      filters.source === "" || lead.platform === filters.source;
    const leadTagMatch =
      filters.leadTag.length === 0 || filters.leadTag.includes(lead.leadTag);
    const leadTypeMatch =
      filters.leadType.length === 0 || filters.leadType.includes(lead.leadType);
    const businessTypeMatch =
      filters.businessType.length === 0 ||
      filters.businessType.includes(lead.businessType);

    const intentValue =
      lead.intentLevel === "High" ? 8 : lead.intentLevel === "Medium" ? 5 : 2;
    const engagementValue =
      lead.engagementLevel === "High"
        ? 8
        : lead.engagementLevel === "Medium"
        ? 5
        : 2;
    const intentMatch =
      intentValue >= filters.intentLevel[0] &&
      intentValue <= filters.intentLevel[1];
    const engagementMatch =
      engagementValue >= filters.engagementLevel[0] &&
      engagementValue <= filters.engagementLevel[1];

    return (
      searchMatch &&
      agentMatch &&
      sourceMatch &&
      leadTagMatch &&
      leadTypeMatch &&
      businessTypeMatch &&
      intentMatch &&
      engagementMatch
    );
  });

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleLeadTypeChange = (leadId: string, newLeadType: string) => {
    setChatData((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, leadType: newLeadType } : lead
      )
    );
    toast.success("Lead type updated successfully!");
  };

  const handleChatAction = (leadId: string) => {
    const lead = chatData.find((l) => l.id === leadId);
    if (lead) {
      console.log(`Opening chat for lead: ${lead.name}`);
      onNavigateToLogs && onNavigateToLogs();
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
      setChatData((prev) =>
        prev.map((lead) =>
          lead.id === currentLeadId
            ? { ...lead, followUpScheduled: scheduled }
            : lead
        )
      );
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
      setChatData((prev) =>
        prev.map((lead) =>
          lead.id === currentLeadId
            ? { ...lead, demoScheduled: scheduled }
            : lead
        )
      );
      toast.success(`Demo scheduled for ${scheduled}`);
      setShowDemoModal(false);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setCurrentLeadId("");
    }
  };

  const handleBulkEmail = () => {
    if (selectedLeads.length > 0 && emailData.subject && emailData.body) {
      // Send emails to all selected leads
      const selectedLeadNames = chatData
        .filter((lead) => selectedLeads.includes(lead.id))
        .map((lead) => lead.name);

      console.log("Sending bulk email to:", selectedLeadNames);
      toast.success(`Email sent to ${selectedLeads.length} leads!`);
      setShowBulkEmailModal(false);
      setEmailData({ subject: "", body: "" });
      setSelectedLeads([]);
    }
  };

  const handleBulkFollowUp = () => {
    if (selectedLeads.length > 0 && selectedDate && selectedTimeSlot) {
      const scheduled = `${selectedDate.toLocaleDateString()} ${selectedTimeSlot}`;

      // Update follow-up for all selected leads
      setChatData((prev) =>
        prev.map((lead) =>
          selectedLeads.includes(lead.id)
            ? { ...lead, followUpScheduled: scheduled }
            : lead
        )
      );

      const selectedLeadNames = chatData
        .filter((lead) => selectedLeads.includes(lead.id))
        .map((lead) => lead.name);

      console.log("Scheduling bulk follow-up for:", selectedLeadNames);
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

      // Update demo for all selected leads
      setChatData((prev) =>
        prev.map((lead) =>
          selectedLeads.includes(lead.id)
            ? { ...lead, demoScheduled: scheduled }
            : lead
        )
      );

      const selectedLeadNames = chatData
        .filter((lead) => selectedLeads.includes(lead.id))
        .map((lead) => lead.name);

      console.log("Scheduling bulk demo for:", selectedLeadNames);
      toast.success(`Demo scheduled for ${selectedLeads.length} leads!`);
      setShowBulkDemoModal(false);
      setSelectedDate(undefined);
      setSelectedTimeSlot("");
      setSelectedLeads([]);
    }
  };

  const handleBulkChat = () => {
    if (selectedLeads.length > 0) {
      const selectedLeadNames = chatData
        .filter((lead) => selectedLeads.includes(lead.id))
        .map((lead) => lead.name);

      console.log("Opening bulk chat for:", selectedLeadNames);
      toast.success(`Opening chat for ${selectedLeads.length} leads!`);
      onNavigateToLogs && onNavigateToLogs();
      setSelectedLeads([]);
    }
  };

  const handleExport = () => {
    if (selectedLeads.length > 0) {
      const selectedLeadsData = chatData.filter((lead) =>
        selectedLeads.includes(lead.id)
      );
      console.log("Exporting data for:", selectedLeadsData);
      toast.success(`Exported data for ${selectedLeads.length} leads!`);
    } else {
      console.log("Exporting all data:", filteredData);
      toast.success("Exported all chat data!");
    }
  };

  const handleAddLead = () => {
    if (newLeadData.name && newLeadData.email && newLeadData.phone) {
      const newLead = {
        id: Date.now().toString(),
        ...newLeadData,
        messages: 0,
        engagementLevel: "Low",
        intentLevel: "Low",
        budgetConstraint: "No",
        timelineUrgency: "Low",
        followUpScheduled: "",
        demoScheduled: "",
        agent: "ChatAgent-01",
        interactionDate: new Date().toISOString().split("T")[0],
        isLatestInteraction: true,
      };
      setChatData((prev) => [...prev, newLead]);
      toast.success("Lead added successfully!");
      setShowAddLeadModal(false);
      setNewLeadData({
        name: "",
        email: "",
        phone: "",
        platform: "Inbound Chat",
        leadType: "Inbound",
        businessType: "SaaS",
        useCase: "",
        leadTag: "Warm",
      });
    }
  };

  const toggleArrayFilter = (
    filterKey: keyof Pick<Filters, "leadTag" | "leadType" | "businessType">,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: prev[filterKey].includes(value)
        ? prev[filterKey].filter((item) => item !== value)
        : [...prev[filterKey], value],
    }));
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

  return (
    <TooltipProvider>
      <div
        className={`flex h-full ${
          theme === "dark" ? "bg-black" : "bg-gray-50"
        }`}
      >
        <div
          className={`flex-1 p-6 space-y-6 ${showFilterPanel ? "mr-80" : ""}`}
        >
          <div className="flex items-center justify-between">
            <h2
              className={`text-2xl font-bold ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Chat Agent Data
            </h2>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-80 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${
                    theme === "dark"
                      ? "bg-[#020817] border-gray-600 text-white"
                      : "bg-transparent border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {selectedLeads.length > 0 && (
                <span
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-300" : "text-gray-600"
                  }`}
                >
                  {selectedLeads.length} selected
                </span>
              )}

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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-9 w-9 p-0 ${
                      theme === "dark"
                        ? "border-gray-600 text-slate-300 hover:bg-gray-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className={`z-50 ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  }`}
                >
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
                    onClick={handleBulkChat}
                    disabled={selectedLeads.length === 0}
                    className={
                      selectedLeads.length === 0
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Bulk Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div
            className={`rounded-lg border overflow-hidden ${
              theme === "dark"
                ? "border-gray-700 bg-[#020817]"
                : "border-gray-200"
            }`}
          >
            <div className="overflow-x-auto">
              <Table className="min-w-[1200px] w-full">
                <TableHeader>
                  <TableRow
                    className={
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    }
                  >
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedLeads.length === filteredData.length &&
                          filteredData.length > 0
                        }
                        onCheckedChange={(checked) =>
                          setSelectedLeads(
                            checked ? filteredData.map((d) => d.id) : []
                          )
                        }
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Chat Date</TableHead>
                    <TableHead>Platform/Source</TableHead>
                    <TableHead>Lead Type</TableHead>
                    <TableHead>Business Type</TableHead>
                    <TableHead>Status/Lead Tag</TableHead>
                    <TableHead>Lead Use-case/Query</TableHead>
                    <TableHead>No. of Messages</TableHead>
                    <TableHead>Engagement Level</TableHead>
                    <TableHead>Intent Level</TableHead>
                    <TableHead>Budget Constraint</TableHead>
                    <TableHead>Timeline Urgency</TableHead>
                    <TableHead>Follow-up Scheduled</TableHead>
                    <TableHead>Demo Scheduled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((lead) => (
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
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                              theme === "dark" ? "bg-gray-600" : "bg-gray-500"
                            }`}
                          >
                            {lead.name.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div
                              className={`text-sm font-medium ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              {(lead as any).contactName || (lead as any).callerName || lead.name}
                            </div>
                            <ContactDisplay 
                              contact={{
                                name: (lead as any).contactName || (lead as any).callerName || lead.name,
                                email: (lead as any).contactEmail || (lead as any).callerEmail || lead.email,
                                phoneNumber: (lead as any).phoneNumber || lead.phone
                              }}
                              callSource={(lead as any).callSource || "unknown"}
                              className={`text-sm ${
                                theme === "dark"
                                  ? "text-slate-400"
                                  : "text-gray-500"
                              }`}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-sm ${
                          theme === "dark" ? "text-slate-300" : "text-gray-900"
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
                            className={`text-sm ${
                              theme === "dark"
                                ? "text-slate-300"
                                : "text-gray-900"
                            }`}
                          >
                            {lead.platform}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <select
                          value={lead.leadType}
                          onChange={(e) =>
                            handleLeadTypeChange(lead.id, e.target.value)
                          }
                          className={`px-2 py-1 rounded-full text-xs border-0 ${
                            theme === "dark"
                              ? "bg-gray-700 text-gray-300"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          <option value="Inbound">Inbound</option>
                          <option value="Outbound">Outbound</option>
                          <option value="Customer">Customer</option>
                        </select>
                      </TableCell>
                      <TableCell>{lead.businessType}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${statusColor(
                            lead.leadTag
                          )}`}
                        >
                          {lead.leadTag}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate cursor-help">
                              {lead.useCase}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{lead.useCase}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{lead.messages}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            lead.engagementLevel === "High"
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
                          className={`px-2 py-1 rounded-full text-xs ${
                            lead.intentLevel === "High"
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
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            lead.budgetConstraint === "Yes"
                              ? "bg-green-500 text-white"
                              : "bg-red-500 text-white"
                          }`}
                        >
                          {lead.budgetConstraint}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            lead.timelineUrgency === "High"
                              ? "bg-red-500 text-white"
                              : lead.timelineUrgency === "Medium"
                              ? "bg-orange-500 text-white"
                              : "bg-blue-500 text-white"
                          }`}
                        >
                          {lead.timelineUrgency}
                        </span>
                      </TableCell>
                      <TableCell>{lead.followUpScheduled || "-"}</TableCell>
                      <TableCell>{lead.demoScheduled || "-"}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleChatAction(lead.id)}
                            className="h-8 w-8 p-0"
                            title="Open Chat"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
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
                            disabled={!lead.isLatestInteraction}
                            className="h-8 w-8 p-0"
                            title="Schedule Follow-up"
                          >
                            <CalendarIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDemoAction(lead.id)}
                            disabled={!lead.isLatestInteraction}
                            className="h-8 w-8 p-0"
                            title="Book Demo"
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {showFilterPanel && (
          <div
            className={`fixed right-0 top-0 h-full w-80 border-l z-50 overflow-y-auto ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3
                  className={`text-lg font-semibold ${
                    theme === "dark" ? "text-white" : "text-gray-900"
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
                    className={`w-full mt-1 p-2 rounded-md border ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="">All Agents</option>
                    <option value="ChatAgent-01">ChatAgent-01</option>
                    <option value="ChatAgent-02">ChatAgent-02</option>
                  </select>
                </div>

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
                      setFilters((prev) => ({
                        ...prev,
                        source: e.target.value,
                      }))
                    }
                    className={`w-full mt-1 p-2 rounded-md border ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="">All Sources</option>
                    <option value="Inbound Chat">Inbound Chat</option>
                    <option value="Outbound Chat">Outbound Chat</option>
                    <option value="Conference Chat">Conference Chat</option>
                  </select>
                </div>

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
                            theme === "dark"
                              ? "text-slate-300"
                              : "text-gray-700"
                          }
                        >
                          {tag}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    }
                  >
                    Lead Type
                  </Label>
                  <div className="mt-2 space-y-2">
                    {["Inbound", "Outbound", "Customer"].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.leadType.includes(type)}
                          onCheckedChange={() =>
                            toggleArrayFilter("leadType", type)
                          }
                        />
                        <span
                          className={
                            theme === "dark"
                              ? "text-slate-300"
                              : "text-gray-700"
                          }
                        >
                          {type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    }
                  >
                    Business Type
                  </Label>
                  <div className="mt-2 space-y-2">
                    {["SaaS", "E-commerce", "Startup"].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          checked={filters.businessType.includes(type)}
                          onCheckedChange={() =>
                            toggleArrayFilter("businessType", type)
                          }
                        />
                        <span
                          className={
                            theme === "dark"
                              ? "text-slate-300"
                              : "text-gray-700"
                          }
                        >
                          {type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

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
                      setFilters((prev) => ({
                        ...prev,
                        engagementLevel: value,
                      }))
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
                  onClick={() =>
                    setFilters({
                      agent: "",
                      source: "",
                      leadTag: [],
                      leadType: [],
                      businessType: [],
                      intentLevel: [1, 10],
                      engagementLevel: [1, 10],
                    })
                  }
                  variant="outline"
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </div>
        )}

        <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
          <DialogContent
            className={`max-w-2xl ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <DialogHeader>
              <DialogTitle
                className={`${
                  theme === "dark" ? "text-white" : "text-gray-900"
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
                    setEmailData((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
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

        <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
          <DialogContent
            className={`max-w-4xl ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <DialogHeader>
              <DialogTitle
                className={`${
                  theme === "dark" ? "text-white" : "text-gray-900"
                } text-xl font-bold`}
              >
                {selectedDate && selectedTimeSlot && currentLeadId
                  ? "Schedule Follow-up"
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
                        chatData.find((l) => l.id === currentLeadId)?.name ?? ""
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
                        chatData.find((l) => l.id === currentLeadId)?.email ??
                        ""
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
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
                  <div>
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

        <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
          <DialogContent
            className={`max-w-4xl ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <DialogHeader>
              <DialogTitle
                className={`${
                  theme === "dark" ? "text-white" : "text-gray-900"
                } text-xl font-bold`}
              >
                {selectedDate && selectedTimeSlot && currentLeadId
                  ? "Book Demo"
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
                        chatData.find((l) => l.id === currentLeadId)?.name ?? ""
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
                        chatData.find((l) => l.id === currentLeadId)?.email ??
                        ""
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
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
                  <div>
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

        <Dialog open={showBulkEmailModal} onOpenChange={setShowBulkEmailModal}>
          <DialogContent
            className={`max-w-2xl ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <DialogHeader>
              <DialogTitle
                className={`${
                  theme === "dark" ? "text-white" : "text-gray-900"
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
                    setEmailData((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
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

        <Dialog
          open={showBulkFollowUpModal}
          onOpenChange={setShowBulkFollowUpModal}
        >
          <DialogContent
            className={`max-w-4xl ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <DialogHeader>
              <DialogTitle
                className={theme === "dark" ? "text-white" : "text-gray-900"}
              >
                Bulk Schedule Follow-up ({selectedLeads.length} leads)
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6">
              <div>
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
                <div>
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
            {selectedDate && selectedTimeSlot && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showBulkDemoModal} onOpenChange={setShowBulkDemoModal}>
          <DialogContent
            className={`max-w-4xl ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <DialogHeader>
              <DialogTitle
                className={theme === "dark" ? "text-white" : "text-gray-900"}
              >
                Bulk Book Demo ({selectedLeads.length} leads)
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6">
              <div>
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
                <div>
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
            {selectedDate && selectedTimeSlot && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showAddLeadModal} onOpenChange={setShowAddLeadModal}>
          <DialogContent
            className={`max-w-2xl ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <DialogHeader>
              <DialogTitle
                className={`${
                  theme === "dark" ? "text-white" : "text-gray-900"
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
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
                    className={`w-full p-2 rounded-md border ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="Inbound Chat">Inbound Chat</option>
                    <option value="Outbound Chat">Outbound Chat</option>
                    <option value="Conference Chat">Conference Chat</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
                    className={`w-full p-2 rounded-md border ${
                      theme === "dark"
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
                    className={
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }
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
                    className={`w-full p-2 rounded-md border ${
                      theme === "dark"
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
                  className={`w-full p-2 rounded-md border ${
                    theme === "dark"
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
                    !newLeadData.name ||
                    !newLeadData.email ||
                    !newLeadData.phone
                  }
                >
                  Add Lead
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default ChatData;
