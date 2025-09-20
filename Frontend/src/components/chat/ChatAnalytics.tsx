import { useState } from "react";
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
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
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
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
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

const ChatAnalytics = () => {
  const { theme } = useTheme();
  const [chartViews, setChartViews] = useState({
    leadsOverTime: "line",
    leadQuality: "pie",
    intentBudget: "scatter",
    sourceChart: "pie",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedDateOption, setSelectedDateOption] = useState("30 days");
  const [showCustomRange, setShowCustomRange] = useState(false);
  const dateOptions = [
    "7 days",
    "30 days",
    "90 days",
    "6 months",
    "1 year",
    "Custom range",
  ];
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
  const kpiData = [
    {
      title: "Active Leads (Score ≥12)",
      value: "156",
      change: "+12.5%",
      changeValue: "+18",
      icon: Users,
      positive: true,
      color: "text-blue-400",
    },
    {
      title: "Budget Constraint %",
      value: "35%",
      change: "-5.2%",
      changeValue: "-8%",
      icon: TrendingUp,
      positive: true,
      color: "text-blue-400",
    },
    {
      title: "Interested Leads (9–11)",
      value: "89",
      change: "+3.8%",
      changeValue: "+12",
      icon: Target,
      positive: true,
      color: "text-blue-400",
    },
    {
      title: "Passive Leads (5–8)",
      value: "67",
      change: "+0.5",
      changeValue: "+3",
      icon: MessageCircle,
      positive: true,
      color: "text-blue-400",
    },
    {
      title: "Avg Lead Score",
      value: "9.2/15",
      change: "+0.3",
      changeValue: "+4%",
      icon: MessageCircle,
      positive: true,
      color: "text-blue-400",
    },
    {
      title: "Follow-up Pending",
      value: "24",
      change: "+5",
      changeValue: "+26%",
      icon: AlertTriangle,
      positive: false,
      color: "text-blue-400",
    },
  ];
  const additionalMetrics = [
    {
      title: "Drop Off Rate",
      value: "8%",
      change: "-2.1%",
      changeValue: "-21%",
      positive: true,
      icon: Info,
      color: "text-blue-400",
    },
    {
      title: "Demo Requests",
      value: "42",
      change: "+13%",
      changeValue: "+38%",
      positive: true,
      icon: BarChart2,
      color: "text-blue-400",
    },
    {
      title: "Human Escalations",
      value: "18",
      change: "-3.5%",
      changeValue: "-22%",
      positive: true,
      icon: Calendar,
      color: "text-blue-400",
    },
  ];
  const leadsOverTimeData = [
    {
      month: "Feb",
      leads: 60,
    },
    {
      month: "Mar",
      leads: 55,
    },
    {
      month: "Apr",
      leads: 65,
    },
    {
      month: "May",
      leads: 70,
    },
    {
      month: "Jun",
      leads: 75,
    },
    {
      month: "Jul",
      leads: 80,
    },
    {
      month: "Aug",
      leads: 85,
    },
    {
      month: "Sep",
      leads: 90,
    },
    {
      month: "Oct",
      leads: 95,
    },
    {
      month: "Nov",
      leads: 88,
    },
    {
      month: "Dec",
      leads: 92,
    },
  ];
  const leadQualityData = [
    {
      name: "Active (≥12)",
      value: 40,
      color: "#1A6262",
    },
    {
      name: "Interested (9-11)",
      value: 35,
      color: "#91C499",
    },
    {
      name: "Passive (5-8)",
      value: 20,
      color: "#E1A940",
    },
    {
      name: "Cold (<5)",
      value: 5,
      color: "#FF6700",
    },
  ];
  const intentBudgetData = [
    {
      intent: 9,
      budget: 8,
      leads: 15,
      name: "Segment 1",
    },
    {
      intent: 8,
      budget: 6,
      leads: 20,
      name: "Segment 2",
    },
    {
      intent: 7,
      budget: 9,
      leads: 12,
      name: "Segment 3",
    },
    {
      intent: 6,
      budget: 7,
      leads: 18,
      name: "Segment 4",
    },
    {
      intent: 10,
      budget: 5,
      leads: 8,
      name: "Segment 5",
    },
    {
      intent: 5,
      budget: 8,
      leads: 25,
      name: "Segment 6",
    },
    {
      intent: 9,
      budget: 10,
      leads: 30,
      name: "Segment 7",
    },
  ];
  const sourceChartData = [
    {
      name: "Inbound",
      value: 45,
      color: "#1A6262",
    },
    {
      name: "Outbound",
      value: 35,
      color: "#91C499",
    },
    {
      name: "Customers",
      value: 20,
      color: "#E1A940",
    },
  ];
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-lg border shadow-lg ${
            theme === "dark"
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-gray-200"
          }`}
        >
          <p
            className={`font-medium ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
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
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className={`p-3 rounded-lg border shadow-lg ${
            theme === "dark"
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-gray-200"
          }`}
        >
          <p
            className={`font-medium ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            {data.name}
          </p>
          <p
            className={`text-sm ${
              theme === "dark" ? "text-slate-300" : "text-gray-600"
            }`}
          >
            Intent: {data.intent}
          </p>
          <p
            className={`text-sm ${
              theme === "dark" ? "text-slate-300" : "text-gray-600"
            }`}
          >
            Budget: {data.budget}
          </p>
          <p
            className={`text-sm ${
              theme === "dark" ? "text-slate-300" : "text-gray-600"
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
    data: any,
    dataKey: string,
    chartType?: string
  ) => {
    if (chartType === "intentBudget") {
      return (
        <ScatterChart
          data={data}
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
          <Scatter dataKey="leads" fill="#1A6262" />
        </ScatterChart>
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
            <Bar dataKey={dataKey} fill="#1A6262" />
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
              stroke="#1A6262"
              strokeWidth={3}
            />
          </LineChart>
        );
      case "pie":
        return (
          <PieChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              outerRadius={100}
              dataKey="value"
              label={({ name, value }) => `${name} ${value}%`}
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        );
      default:
        return null;
    }
  };
  return (
    <div className="space-y-6 p-6">
      {/* Top Info Section */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className={`text-2xl font-bold ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          SniperThink AI Chat Agent
        </h1>
        <div className="flex items-center space-x-4">
          <span
            className={theme === "dark" ? "text-slate-300" : "text-gray-600"}
          >
            Credits Remaining:
          </span>
          <span
            className={`font-semibold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            450/500
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <label
            className={`text-sm mb-2 block ${
              theme === "dark" ? "text-slate-300" : "text-gray-700"
            } flex items-center gap-1`}
          >
            Date Range
            <InfoIcon description="All KPI Cards (interactions, demos, conversions, hot leads, escalations, etc.)" />
          </label>
          <div className="relative">
            <select
              value={selectedDateOption}
              onChange={(e) => handleDateOptionChange(e.target.value)}
              className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-border text-foreground w-full"
            >
              {dateOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-foreground" />
          </div>
          <Popover open={showCustomRange} onOpenChange={setShowCustomRange}>
            <PopoverTrigger asChild>
              <div></div>
            </PopoverTrigger>
            <PopoverContent
              className={`w-auto p-0 ${
                theme === "dark"
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
                className={`${
                  theme === "dark" ? "text-white" : "text-gray-900"
                } pointer-events-auto`}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <label
            className={`text-sm mb-2 block ${
              theme === "dark" ? "text-slate-300" : "text-gray-700"
            } flex items-center gap-1`}
          >
            Lead Type
            <InfoIcon description="Hot Leads, Active Leads, Conversions" />
          </label>
          <div className="relative">
            <select className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-border text-foreground w-full">
              <option>All Leads</option>
              <option>Active Leads</option>
              <option>Interested Leads</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-foreground" />
          </div>
        </div>
        <div>
          <label
            className={`text-sm mb-2 block ${
              theme === "dark" ? "text-slate-300" : "text-gray-700"
            } flex items-center gap-1`}
          >
            Channel Source
            <InfoIcon description="Total Leads, Total Interactions" />
          </label>
          <div className="relative">
            <select className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-border text-foreground w-full">
              <option>All Channels</option>
              <option>WhatsApp</option>
              <option>Website</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-foreground" />
          </div>
        </div>
        <div>
          <label
            className={`text-sm mb-2 block ${
              theme === "dark" ? "text-slate-300" : "text-gray-700"
            } flex items-center gap-1`}
          >
            Lead Status
            <InfoIcon description="Status for leads i.e. Active, Inactive and Interested" />
          </label>
          <div className="relative">
            <select className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-border text-foreground w-full">
              <option>All Status</option>
              <option>Active</option>
              <option>Interested</option>
              <option>Passive</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-foreground" />
          </div>
        </div>
      </div>
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          className={
            theme === "dark"
              ? "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          }
        >
          Reset All
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {kpiData.map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-2 rounded-lg ${
                    theme === "dark"
                      ? "bg-slate-700/50 group-hover:bg-slate-600/50"
                      : "bg-gray-100 group-hover:bg-gray-200"
                  } transition-colors ${kpi.color}`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded-md ${
                    kpi.positive
                      ? "text-green-400 bg-green-500/10"
                      : "text-red-400 bg-red-500/10"
                  }`}
                >
                  {kpi.positive ? "▲" : "▼"}
                  {kpi.changeValue}
                </span>
              </div>
              <h3
                className={`text-sm mb-2 transition-colors ${
                  theme === "dark"
                    ? "text-slate-400 group-hover:text-slate-300"
                    : "text-gray-600 group-hover:text-gray-700"
                }`}
              >
                {kpi.title}
              </h3>
              <p
                className={`text-2xl font-bold transition-colors ${
                  theme === "dark"
                    ? "text-white group-hover:text-blue-200"
                    : "text-gray-900 group-hover:text-blue-600"
                }`}
              >
                {kpi.value}
              </p>
              <p
                className={`text-xs mt-1 ${
                  theme === "dark" ? "text-slate-400" : "text-gray-500"
                }`}
              >
                vs last week
              </p>
            </div>
          );
        })}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {additionalMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-2 rounded-lg ${
                    theme === "dark"
                      ? "bg-slate-700/50 group-hover:bg-slate-600/50"
                      : "bg-gray-100 group-hover:bg-gray-200"
                  } transition-colors ${metric.color}`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded-md ${
                    metric.positive
                      ? "text-green-400 bg-green-500/10"
                      : "text-red-400 bg-red-500/10"
                  }`}
                >
                  {metric.positive ? "▲" : "▼"}
                  {metric.changeValue}
                </span>
              </div>
              <h3
                className={`text-sm mb-2 transition-colors ${
                  theme === "dark"
                    ? "text-slate-400 group-hover:text-slate-300"
                    : "text-gray-600 group-hover:text-gray-700"
                }`}
              >
                {metric.title}
              </h3>
              <p
                className={`text-2xl font-bold transition-colors ${
                  theme === "dark"
                    ? "text-white group-hover:text-blue-200"
                    : "text-gray-900 group-hover:text-blue-600"
                }`}
              >
                {metric.value}
              </p>
              <p
                className={`text-xs mt-1 ${
                  theme === "dark" ? "text-slate-400" : "text-gray-500"
                }`}
              >
                vs last week
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
                Leads Over Time
              </h3>
              <InfoIcon description="Volume trends in lead generation over a selected period" />
            </div>
            <div className="relative">
              <select
                value={chartViews.leadsOverTime}
                onChange={(e) =>
                  setChartViews((prev) => ({
                    ...prev,
                    leadsOverTime: e.target.value,
                  }))
                }
                className="appearance-none bg-background border border-border rounded px-3 py-1 pr-8 text-sm text-foreground"
              >
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            {renderChart(chartViews.leadsOverTime, leadsOverTimeData, "leads")}
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                Lead Quality Distribution
              </h3>
              <InfoIcon description="Spread of Passive, Interested, and Active leads" />
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
          <ResponsiveContainer width="100%" height={340}>
            {renderChart(chartViews.leadQuality, leadQualityData, "value")}
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                Intent vs Budget Heatmap
              </h3>
              <InfoIcon description="Correlation of lead intent vs stated budget" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            {renderChart("scatter", intentBudgetData, "leads", "intentBudget")}
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-semibold text-foreground">
                Inbound vs Outbound vs Customers Source Chart
              </h3>
              <InfoIcon
                description="Breakdown of Inbound, Outbound, Customer leads"
                className="flex-shrink-0"
              />
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
          <ResponsiveContainer width="100%" height={340}>
            {renderChart(chartViews.sourceChart, sourceChartData, "value")}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
export default ChatAnalytics;
