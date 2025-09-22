import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  Target,
  MessageCircle,
  AlertTriangle,
  Calendar,
  Info,
  BarChart2,
  ChevronDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  FunnelChart,
  Funnel,
  LabelList,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { InfoIcon } from "@/components/ui/info-icon";
import { apiService } from "@/services/apiService";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CallSourceExport from "./CallSourceExport";

const CALL_ANALYTICS_COLORS = [
  "#1A6262",
  "#91C499",
  "#E1A940",
  "#FF6700",
  "#a855f7",
];

interface TooltipEntry {
  name: string;
  value: number;
  color?: string;
  [key: string]: unknown;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

interface CustomScatterTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
}

interface CallAnalyticsProps {
  selectedAgentId?: string;
}

const CallAnalytics = ({ selectedAgentId }: CallAnalyticsProps) => {
  const { theme } = useTheme();
  const [chartViews, setChartViews] = useState({
    leadQuality: "pie",
    funnelChart: "funnel",
    intentBudget: "scatter",
    sourceChart: "pie",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedDateOption, setSelectedDateOption] = useState("30 days");
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [selectedCallSource, setSelectedCallSource] = useState("");

  // State for real data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [additionalMetrics, setAdditionalMetrics] = useState<any[]>([]);
  const [leadQualityData, setLeadQualityData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [intentBudgetData, setIntentBudgetData] = useState<any[]>([]);
  const [sourceChartData, setSourceChartData] = useState<any[]>([]);
  const [minutes, setMinutes] = useState(0);
  const dateOptions = [
    "7 days",
    "30 days",
    "90 days",
    "6 months",
    "1 year",
    "Custom range",
  ];

    // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, selectedDateOption, selectedCallSource, selectedAgentId]);

  const getDateRange = () => {
    const now = new Date();
    let fromDate: Date;
    let toDate = now;

    if (dateRange?.from && dateRange?.to) {
      fromDate = dateRange.from;
      toDate = dateRange.to;
    } else {
      switch (selectedDateOption) {
        case "7 days":
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "90 days":
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "6 months":
          fromDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case "1 year":
          fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // 30 days
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    return { fromDate, toDate };
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { fromDate, toDate } = getDateRange();
      
      const params = {
        dateFrom: fromDate.toISOString(),
        dateTo: toDate.toISOString(),
        ...(selectedCallSource && { callSource: selectedCallSource }),
        // Add agent filtering using the agent UUID directly
        ...(selectedAgentId && { agentId: selectedAgentId }),
      };

      console.log('📊 Analytics API params:', params, 'selectedAgentId:', selectedAgentId);

      // Fetch all analytics data in parallel
      const [
        kpisResponse,
        leadQualityResponse,
        funnelResponse,
        intentBudgetResponse,
        sourceResponse,
        summaryResponse,
      ] = await Promise.all([
        apiService.getCallAnalyticsKPIs(params),
        apiService.getCallAnalyticsLeadQuality(params),
        apiService.getCallAnalyticsFunnel(params),
        apiService.getCallAnalyticsIntentBudget(params),
        apiService.getCallAnalyticsSourceBreakdown(params),
        apiService.getCallAnalyticsSummary(),
      ]);

      // Update state with real data
      setKpiData(kpisResponse.data?.kpiData || []);
      setAdditionalMetrics(kpisResponse.data?.additionalMetrics || []);
      setLeadQualityData(leadQualityResponse.data || []);
      setFunnelData(funnelResponse.data || []);
      setIntentBudgetData(intentBudgetResponse.data || []);
      setSourceChartData(sourceResponse.data || []);
      setMinutes(summaryResponse.data?.minutes || 0);

    } catch (err) {
      console.error('Error fetching analytics data:', err);

      // Check if it's an authentication error
      if (err instanceof Error && err.message.includes('401')) {
        setError('Please log in to view analytics data.');
      } else {
        setError('Failed to load analytics data. Please try again.');
      }

      // Set fallback mock data when API fails
      setKpiData([
        {
          title: "Total Calls Made",
          value: "0",
          change: "0%",
          changeValue: "0",
          positive: true,
        },
        {
          title: "Successful Conversations",
          value: "0",
          change: "0%",
          changeValue: "0",
          positive: true,
        },
        {
          title: "Call Connection Rate",
          value: "0%",
          change: "0%",
          changeValue: "0%",
          positive: true,
        },
        {
          title: "Avg. Call Duration",
          value: "0m 0s",
          change: "0s",
          changeValue: "0%",
          positive: true,
        },
        {
          title: "Call-to-Lead Conversion",
          value: "0%",
          change: "0%",
          changeValue: "0",
          positive: true,
        },
        {
          title: "Pending Follow-ups",
          value: "0",
          change: "0",
          changeValue: "0%",
          positive: true,
        },
      ]);

      setAdditionalMetrics([
        {
          title: "Not Connected",
          value: "0",
          change: "0%",
          changeValue: "0%",
          positive: true,
        },
        {
          title: "Demo Scheduled",
          value: "0",
          change: "0%",
          changeValue: "0%",
          positive: true,
        },
        {
          title: "Hot Leads Generated",
          value: "0",
          change: "0%",
          changeValue: "0%",
          positive: true,
        },
      ]);

      setLeadQualityData([]);
      setFunnelData([]);
      setIntentBudgetData([]);
      setSourceChartData([]);
    } finally {
      setLoading(false);
    }
  };
  const handleDateOptionChange = (option: string) => {
    setSelectedDateOption(option);
    if (option === "Custom range") {
      setShowCustomRange(true);
    } else {
      setShowCustomRange(false);
      setDateRange(undefined);
    }
  };
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setSelectedDateOption(
        `${format(range.from, "dd MMM yyyy")} - ${format(
          range.to,
          "dd MMM yyyy"
        )}`
      );
      setShowCustomRange(false);
    }
  };
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-lg border shadow-lg ${theme === "dark"
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-gray-200"
            }`}
        >
          <p
            className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"
              }`}
          >
            {label}
          </p>
          {payload.map((entry: TooltipEntry) => (
            <p
              key={entry.name}
              style={{
                color: entry.color,
              }}
              className="text-sm"
            >
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  const CustomScatterTooltip = ({
    active,
    payload,
  }: CustomScatterTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as {
        name: string;
        intent: number;
        budget: number;
        leads: number;
      };
      return (
        <div
          className={`p-3 rounded-lg border shadow-lg ${theme === "dark"
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-gray-200"
            }`}
        >
          <p
            className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"
              }`}
          >
            {data.name}
          </p>
          <p
            className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-600"
              }`}
          >
            Intent: {data.intent}
          </p>
          <p
            className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-600"
              }`}
          >
            Budget: {data.budget}
          </p>
          <p
            className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-600"
              }`}
          >
            Leads: {data.leads}
          </p>
        </div>
      );
    }
    return null;
  };
  const renderChart = (
    type: string,
    data: unknown[],
    dataKey: string,
    chartType?: string
  ) => {
    if (chartType === "intentBudget") {
      return (
        <ScatterChart
          data={
            data as {
              intent: number;
              budget: number;
              leads: number;
              name: string;
            }[]
          }
          margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
          />
          <XAxis
            dataKey="intent"
            name="Intent"
            stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
            domain={[0, 10]}
            label={{
              value: "Intent Level",
              position: "insideBottom",
              offset: -10,
            }}
          />
          <YAxis
            dataKey="budget"
            name="Budget"
            stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
            domain={[0, 10]}
            label={{
              value: "Budget Level",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip content={<CustomScatterTooltip />} />
          <Scatter dataKey="leads" fill={CALL_ANALYTICS_COLORS[0]} />
        </ScatterChart>
      );
    }
    if (chartType === "funnel") {
      return (
        <FunnelChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList
              position="center"
              fill="#fff"
              stroke="none"
              style={{
                fontSize: "14px",
                fontWeight: "bold",
              }}
            />
          </Funnel>
          <Tooltip content={<CustomTooltip />} />
        </FunnelChart>
      );
    }
    switch (type) {
      case "bar":
        return (
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 60, bottom: 80 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
            />
            <XAxis
              dataKey="month"
              stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={dataKey} fill={CALL_ANALYTICS_COLORS[0]} />
          </BarChart>
        );
      case "line":
        return (
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
            />
            <XAxis
              dataKey="month"
              stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
              tick={{ fontSize: 12 }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={CALL_ANALYTICS_COLORS[0]}
              strokeWidth={3}
            />
          </LineChart>
        );
      case "pie":
        return (
          <PieChart margin={{ top: 12, right: 20, bottom: 56, left: 20 }}>
            <Pie
              data={data}
              cx="50%"
              cy="57%"
              outerRadius={100}
              dataKey="value"
              label={({ name, value }: { name: string; value: number }) =>
                value > 5 ? `${value}%` : ""
              }
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={(entry as TooltipEntry).color}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={0}
              wrapperStyle={{
                position: "absolute",
                bottom: 12,
                paddingTop: 8,
                fontSize: 12,
                lineHeight: 1.2,
                width: "calc(100% - 40px)",
                left: 20,
                textAlign: "center"
              }}
              iconSize={8}
              layout="horizontal"
            />
          </PieChart>
        );
      default:
        return null;
    }
  };
  const showBuyMinutes = minutes < 10;
  const handlePurchase = () => {
    // Placeholder: implement your purchase logic/modal here
    setMinutes((prev) => prev + 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchAnalyticsData} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Global Header Section */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"
            }`}
        >
          SniperThink AI Call Agent
        </h1>
        <div className="flex items-center space-x-4">
          <span
            className={theme === "dark" ? "text-slate-300" : "text-gray-600"}
          >
            Minutes Remaining:
          </span>
          <span
            className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"
              }`}
          >
            {minutes}/500
          </span>
          {showBuyMinutes && (
            <Button
              style={{ backgroundColor: "#1A6262" }}
              className="text-white px-4 py-1 rounded hover:opacity-90"
              onClick={handlePurchase}
            >
              Buy Minutes
            </Button>
          )}
        </div>
      </div>
      
      {/* Agent Filter Indicator */}
      {selectedAgentId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">
              Analytics filtered for selected agent
            </span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Showing analytics data for the selected agent only.
          </p>
        </div>
      )}
      
      {/* Global Filters */}
      <div className="bg-transparent">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label
              className={`text-sm mb-2 block ${theme === "dark" ? "text-slate-300" : "text-gray-700"
                }`}
            >
              Date Range
            </label>
            <div className="relative">
              <select
                value={selectedDateOption}
                onChange={(e) => handleDateOptionChange(e.target.value)}
                className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-slate-600 w-full"
              >
                {dateOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>

            <Popover open={showCustomRange} onOpenChange={setShowCustomRange}>
              <PopoverTrigger asChild>
                <div></div>
              </PopoverTrigger>
              <PopoverContent
                className={`w-auto p-0 ${theme === "dark"
                  ? "bg-slate-800 border-slate-700"
                  : "bg-white border-gray-200"
                  }`}
                align="start"
              >
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  className={`${theme === "dark" ? "text-white" : "text-gray-900"
                    } pointer-events-auto`}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label
              className={`text-sm mb-2 block ${theme === "dark" ? "text-slate-300" : "text-gray-700"
                }`}
            >
              Call Status
            </label>
            <div className="relative">
              <select className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-slate-600 w-full">
                <option>All Calls</option>
                <option>Connected</option>
                <option>Missed</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
          </div>
          <div>
            <label
              className={`text-sm mb-2 block ${theme === "dark" ? "text-slate-300" : "text-gray-700"
                }`}
            >
              Call Source
            </label>
            <div className="relative">
              <select 
                value={selectedCallSource}
                onChange={(e) => setSelectedCallSource(e.target.value)}
                className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-slate-600 w-full"
              >
                <option value="">All Sources</option>
                <option value="phone">Phone</option>
                <option value="internet">Internet</option>
                <option value="unknown">Unknown</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
          </div>
          <div>
            <label
              className={`text-sm mb-2 block ${theme === "dark" ? "text-slate-300" : "text-gray-700"
                }`}
            >
              Call Type
            </label>
            <div className="relative">
              <select className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-slate-600 w-full">
                <option>All Types</option>
                <option>Inbound</option>
                <option>Outbound</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
            </div>
          </div>
        </div>
        <div className="flex items-center mt-4 space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedDateOption("30 days");
              setDateRange(undefined);
              setShowCustomRange(false);
              setSelectedCallSource("");
            }}
            className={
              theme === "dark"
                ? "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }
          >
            Reset All
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {kpiData.map((kpi, index) => {
          // Map titles to icons
          const getIcon = (title: string) => {
            switch (title) {
              case "Total Calls Made":
                return Users;
              case "Successful Conversations":
                return TrendingUp;
              case "Call Connection Rate":
                return Target;
              case "Avg. Call Duration":
                return MessageCircle;
              case "Call-to-Lead Conversion":
                return MessageCircle;
              case "Pending Follow-ups":
                return AlertTriangle;
              default:
                return Users;
            }
          };

          const IconComponent = getIcon(kpi.title);
          return (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-2 rounded-lg ${theme === "dark"
                    ? "bg-slate-700/50 group-hover:bg-slate-600/50"
                    : "bg-gray-100 group-hover:bg-gray-200"
                    } transition-colors text-blue-400`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <span
                    className={`text-sm font-medium px-2 py-1 rounded-md ${kpi.positive
                      ? "text-green-400 bg-green-500/10"
                      : "text-red-400 bg-red-500/10"
                      }`}
                  >
                    {kpi.positive ? "▲" : "▼"}
                    {kpi.changeValue}
                  </span>
                  <p
                    className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-gray-500"
                      }`}
                  >
                    vs last period
                  </p>
                </div>
              </div>
              <h3
                className={`text-sm mb-2 transition-colors ${theme === "dark"
                  ? "text-slate-400 group-hover:text-slate-300"
                  : "text-gray-600 group-hover:text-gray-700"
                  }`}
              >
                {kpi.title}
              </h3>
              <p
                className={`text-2xl font-bold transition-colors ${theme === "dark"
                  ? "text-white group-hover:text-blue-200"
                  : "text-gray-900 group-hover:text-blue-600"
                  }`}
              >
                {kpi.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {additionalMetrics.map((metric, index) => {
          // Map titles to icons
          const getIcon = (title: string) => {
            switch (title) {
              case "Not Connected":
                return Info;
              case "Demo Scheduled":
                return Calendar;
              case "Hot Leads Generated":
                return BarChart2;
              default:
                return Info;
            }
          };

          const IconComponent = getIcon(metric.title);
          return (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-2 rounded-lg ${theme === "dark"
                    ? "bg-slate-700/50 group-hover:bg-slate-600/50"
                    : "bg-gray-100 group-hover:bg-gray-200"
                    } transition-colors text-blue-400`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded-md ${metric.positive
                    ? "text-green-400 bg-green-500/10"
                    : "text-red-400 bg-red-500/10"
                    }`}
                >
                  {metric.positive ? "▲" : "▼"}
                  {metric.changeValue}
                </span>
              </div>
              <h3
                className={`text-sm mb-2 transition-colors ${theme === "dark"
                  ? "text-slate-400 group-hover:text-slate-300"
                  : "text-gray-600 group-hover:text-gray-700"
                  }`}
              >
                {metric.title}
              </h3>
              <p
                className={`text-2xl font-bold transition-colors ${theme === "dark"
                  ? "text-white group-hover:text-blue-200"
                  : "text-gray-900 group-hover:text-blue-600"
                  }`}
              >
                {metric.value}
              </p>
              <p
                className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-gray-500"
                  }`}
              >
                vs last period
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                Lead Quality Distribution
              </h3>
              <InfoIcon description="Distribution of lead quality based on call outcomes and engagement" />
            </div>
            <div className="relative">
              <select
                value={chartViews.leadQuality}
                onChange={(e) =>
                  setChartViews((prev) => ({
                    ...prev,
                    leadQuality: e.target.value,
                  }))
                }
                className="appearance-none bg-background border border-border rounded px-3 py-1 pr-8 text-sm text-foreground"
              >
                <option value="pie">Pie Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            {renderChart(chartViews.leadQuality, leadQualityData, "value")}
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                Funnel Drop-off
              </h3>
              <InfoIcon description="Conversion funnel showing drop-off rates at each stage of the calling process" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            {renderChart("funnel", funnelData, "value", "funnel")}
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                Intent vs Budget Heatmap
              </h3>
              <InfoIcon description="Correlation between prospect intent level and budget constraints from call data" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            {renderChart("scatter", intentBudgetData, "leads", "intentBudget")}
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                Call Source Breakdown
              </h3>
              <InfoIcon description="Distribution of calls by source: phone calls, internet calls, and unknown sources" />
            </div>
            <div className="relative">
              <select
                value={chartViews.sourceChart}
                onChange={(e) =>
                  setChartViews((prev) => ({
                    ...prev,
                    sourceChart: e.target.value,
                  }))
                }
                className="appearance-none bg-background border border-border rounded px-3 py-1 pr-8 text-sm text-foreground"
              >
                <option value="pie">Pie Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            {renderChart(chartViews.sourceChart, sourceChartData, "value")}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Call Source Analytics Table */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">
              Call Source Performance Analytics
            </h3>
            <InfoIcon description="Detailed performance metrics broken down by call source with conversion rates and cost analysis" />
          </div>
          <CallSourceExport
            dateFrom={getDateRange().fromDate.toISOString()}
            dateTo={getDateRange().toDate.toISOString()}
            callSource={selectedCallSource}
          />
        </div>

        <div className="overflow-x-auto invisible-scrollbar">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${theme === "dark" ? "border-slate-700" : "border-gray-200"}`}>
                <th className={`text-left py-3 px-4 font-medium ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Call Source
                </th>
                <th className={`text-right py-3 px-4 font-medium ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Total Calls
                </th>
                <th className={`text-right py-3 px-4 font-medium ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Success Rate
                </th>
                <th className={`text-right py-3 px-4 font-medium ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Avg Duration
                </th>
                <th className={`text-right py-3 px-4 font-medium ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Leads Generated
                </th>
                <th className={`text-right py-3 px-4 font-medium ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Conversion Rate
                </th>
                <th className={`text-right py-3 px-4 font-medium ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Cost per Lead
                </th>
              </tr>
            </thead>
            <tbody>
              {sourceChartData.map((source, index) => (
                <tr 
                  key={index}
                  className={`border-b ${theme === "dark" ? "border-slate-700" : "border-gray-200"} hover:${theme === "dark" ? "bg-slate-800/50" : "bg-gray-50"} transition-colors`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: source.color }}
                      ></div>
                      <span className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {source.name}
                      </span>
                    </div>
                  </td>
                  <td className={`text-right py-3 px-4 ${theme === "dark" ? "text-slate-300" : "text-gray-600"}`}>
                    {source.count || 0}
                  </td>
                  <td className={`text-right py-3 px-4 ${theme === "dark" ? "text-slate-300" : "text-gray-600"}`}>
                    <span className={`px-2 py-1 rounded text-xs ${
                      (source.success_rate || 0) >= 70 
                        ? "bg-green-100 text-green-800" 
                        : (source.success_rate || 0) >= 50 
                        ? "bg-yellow-100 text-yellow-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {(source.success_rate || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className={`text-right py-3 px-4 ${theme === "dark" ? "text-slate-300" : "text-gray-600"}`}>
                    {source.avg_duration ? `${Math.floor(source.avg_duration)}m ${Math.round((source.avg_duration % 1) * 60)}s` : '0m 0s'}
                  </td>
                  <td className={`text-right py-3 px-4 ${theme === "dark" ? "text-slate-300" : "text-gray-600"}`}>
                    {source.leads_generated || 0}
                  </td>
                  <td className={`text-right py-3 px-4 ${theme === "dark" ? "text-slate-300" : "text-gray-600"}`}>
                    <span className={`px-2 py-1 rounded text-xs ${
                      (source.conversion_rate || 0) >= 20 
                        ? "bg-green-100 text-green-800" 
                        : (source.conversion_rate || 0) >= 10 
                        ? "bg-yellow-100 text-yellow-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {(source.conversion_rate || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className={`text-right py-3 px-4 ${theme === "dark" ? "text-slate-300" : "text-gray-600"}`}>
                    {source.leads_generated && source.leads_generated > 0 
                      ? `$${((source.count || 0) * 0.1 / source.leads_generated).toFixed(2)}` 
                      : 'N/A'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sourceChartData.length === 0 && (
          <div className="text-center py-8">
            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}>
              No call source data available for the selected period.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default CallAnalytics;
