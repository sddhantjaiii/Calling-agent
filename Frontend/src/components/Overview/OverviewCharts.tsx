import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { Info, ChevronDown, RefreshCw, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-groups";
import type { TimelineEntry } from "@/pages/Dashboard";
import { InfoIcon } from "@/components/ui/info-icon";
import { useDashboard } from "@/hooks/useDashboard";
import { dataFlowDebugger } from "@/utils/dataFlowDebugger";
import type { DashboardAnalytics } from "@/types";
import { ChartErrorBoundary } from "@/components/ui/ErrorBoundaryWrapper";
import { DashboardChartsLoading, RefreshIndicator } from "@/components/ui/LoadingStates";
import { NoAnalyticsData, EmptyChart } from "@/components/ui/EmptyStateComponents";
import ErrorHandler from "@/components/ui/ErrorHandler";

// Replace with a local type definition for Lead (if needed)
type Lead = unknown;

// Consistent color palette
const COLORS = ["#1A6262", "#91C499", "#E1A940", "#FF6700", "#6366f1"];

// Removed default mock data constants - components now show empty states when no real data is available
const chartInfo = [
  {
    title: "Leads Over Time",
    description:
      "Shows how many new leads were captured across days, weeks, or months",
  },
  {
    title: "Total Interactions Over Time (Chat/Call)",
    description: "All conversations happening across agents",
  },
  {
    title: "Lead Quality Distribution (Hot/Warm/Cold)",
    description: "Current spread of lead quality to prioritize outreach",
  },
  {
    title: "Engagement Funnel",
    description:
      "Visual representation of how leads progress through key engagement stages",
  },
  {
    title: "Avg. Interactions to Convert",
    description:
      "Distribution of how many interactions it typically takes to convert a lead",
  },
  {
    title: "Avg. Time to Convert a Lead",
    description:
      "The average time duration from first interaction to customer conversion",
  },
  {
    title: "Inbound vs Outbound vs Customer Source Breakdown",
    description:
      "Comparison of how many leads are coming from inbound, outbound, or customers",
  },
];

interface TimelineCardProps {
  entry: TimelineEntry;
  onViewChat?: (entry: TimelineEntry) => void;
}

interface TooltipPayload {
  name: string;
  value: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

interface CustomFunnelTooltipProps {
  active?: boolean;
  payload?: { payload: { name: string; value: number }; color: string }[];
}

interface OverviewChartsProps {
  filters: {
    dateRange?: { from?: string | Date; to?: string | Date } | null;
    source?: string;
    agent?: string;
    leadQuality?: string;
  };
  onSegmentClick?: (segment: any) => void;
}

function OverviewChartsContent({ filters, onSegmentClick }: OverviewChartsProps) {
  const { theme } = useTheme();
  const { 
    analytics, 
    loadingAnalytics, 
    error, 
    refreshAnalytics,
    clearError 
  } = useDashboard(false); // Disable auto-refresh to prevent infinite calls

  const [chartViews, setChartViews] = useState({
    leadsOverTime: "line",
    interactionsOverTime: "line",
    leadQuality: "bar",
    engagementFunnel: "funnel",
    interactionsToConvert: "bar",
    timeToConvert: "bar",
    sourceBreakdown: "pie",
  });
  const [agentFilter, setAgentFilter] = useState({
    leadQuality: "chat",
    interactionsToConvert: "both",
  });
  const [selectedContact, setSelectedContact] = useState<Lead | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Refresh analytics data when filters change (with debounce)
  useEffect(() => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Set a new timeout to debounce the refresh
    refreshTimeoutRef.current = setTimeout(() => {
      refreshAnalytics();
    }, 500); // 500ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [filters]); // Removed refreshAnalytics from deps to prevent infinite loop
  const cardClass = `rounded-xl p-6 border shadow transition-all duration-300 bg-card text-card-foreground`;

  // Loading state component - now using comprehensive loading component
  const LoadingState = () => <DashboardChartsLoading count={4} />;

  // Error state component - now using comprehensive error handler
  const ErrorState = () => (
    <ErrorHandler
      error={error}
      onRetry={async () => {
        clearError();
        await refreshAnalytics();
      }}
      maxRetries={3}
      showToast={false}
    />
  );

  // Check if filters are applied
  const hasFilters = filters.dateRange || filters.source !== 'all' || filters.agent !== 'all' || filters.leadQuality !== 'all';
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-lg border shadow-lg ${
            theme === "dark"
              ? "bg-slate-800 border-slate-700 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <div className="font-medium">{label}</div>
          {payload.map((entry, index) => (
            <div key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };
  const CustomFunnelTooltip = ({
    active,
    payload,
  }: CustomFunnelTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className={`p-3 rounded-lg border shadow-lg ${
            theme === "dark"
              ? "bg-slate-800 border-slate-700 text-white"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <div className="font-medium">{data.name}</div>
          <div className="text-sm" style={{ color: payload[0].color }}>
            Count: {data.value.toLocaleString()}
          </div>
        </div>
      );
    }
    return null;
  };
  const getChartTypeOptions = (chartKey: string) => {
    const optionMap = {
      leadsOverTime: [
        { value: "line", label: "Line Chart" },
        { value: "area", label: "Area Chart" },
        { value: "bar", label: "Bar Chart" },
        { value: "combo", label: "Combo Chart" },
      ],
      interactionsOverTime: [
        { value: "line", label: "Line Chart" },
        { value: "bar", label: "Bar Chart" },
        { value: "area", label: "Area Chart" },
        { value: "combo", label: "Combo Chart" },
      ],
      leadQuality: [
        { value: "bar", label: "Bar Chart" },
        { value: "line", label: "Line Chart" },
        { value: "pie", label: "Pie Chart" },
        { value: "donut", label: "Donut Chart" },
      ],
      engagementFunnel: [
        { value: "funnel", label: "Funnel Chart" },
        { value: "bar", label: "Bar Chart" },
        { value: "pie", label: "Pie Chart" },
        { value: "line", label: "Line Chart" },
      ],
      interactionsToConvert: [
        { value: "bar", label: "Bar Chart" },
        { value: "line", label: "Line Chart" },
        { value: "area", label: "Area Chart" },
        { value: "pie", label: "Pie Chart" },
      ],
      timeToConvert: [
        { value: "bar", label: "Bar Chart" },
        { value: "line", label: "Line Chart" },
        { value: "area", label: "Area Chart" },
        { value: "pie", label: "Pie Chart" },
      ],
      sourceBreakdown: [
        { value: "pie", label: "Pie Chart" },
        { value: "donut", label: "Donut Chart" },
        { value: "bar", label: "Bar Chart" },
        { value: "line", label: "Line Chart" },
      ],
    };
    return optionMap[chartKey] || [];
  };
  type ChartData = Record<string, unknown>;
  let pieData: unknown[] = [];
  let donutData: unknown[] = [];
  const renderChart = (
    chartType: string,
    data: ChartData[],
    chartKey: string
  ) => {
    const filter = agentFilter[chartKey] || "both";
    if (!data || data.length === 0) {
      return (
        <EmptyChart 
          chartType={chartType === 'area' ? 'area' : chartType === 'bar' ? 'bar' : 'line'}
          isFiltered={hasFilters}
          onRefresh={hasFilters ? () => {
            // Clear filters logic would go here
            refreshAnalytics();
          } : refreshAnalytics}
          height="300px"
        />
      );
    }
    switch (chartType) {
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
            />
            <XAxis
              dataKey={
                chartKey === "interactionsToConvert"
                  ? "interactions"
                  : chartKey === "timeToConvert"
                  ? "period"
                  : chartKey === "engagementFunnel"
                  ? "name"
                  : "date"
              }
              type={
                chartKey === "interactionsToConvert" ||
                chartKey === "timeToConvert" ||
                chartKey === "engagementFunnel"
                  ? "category"
                  : undefined
              }
              stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
              tick={{
                fontSize: 12,
              }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
              tick={{
                fontSize: 12,
              }}
              width={60}
              label={{
                value:
                  chartKey === "leadQuality"
                    ? "Lead Count"
                    : chartKey === "interactionsToConvert"
                    ? "Number of Leads"
                    : "Count",
                angle: -90,
                position: "insideLeft",
                offset: -25,
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Legend />
            {chartKey === "leadsOverTime" && (
              <>
                <Line
                  type="monotone"
                  dataKey="chatLeads"
                  stroke={COLORS[0]}
                  strokeWidth={3}
                  name="Chat Leads"
                />
                <Line
                  type="monotone"
                  dataKey="callLeads"
                  stroke={COLORS[1]}
                  strokeWidth={3}
                  name="Call Leads"
                />
              </>
            )}
            {chartKey === "interactionsOverTime" && (
              <>
                <Line
                  type="monotone"
                  dataKey="chat"
                  stroke={COLORS[0]}
                  strokeWidth={3}
                  name="Chat"
                />
                <Line
                  type="monotone"
                  dataKey="call"
                  stroke={COLORS[1]}
                  strokeWidth={3}
                  name="Call"
                />
              </>
            )}
            {chartKey === "leadQuality" && (
              <>
                {filter === "chat" && (
                  <Line
                    type="monotone"
                    dataKey="chatCount"
                    stroke={COLORS[0]}
                    strokeWidth={3}
                    name="Chat Leads"
                  />
                )}
              </>
            )}
            {chartKey === "interactionsToConvert" && (
              <>
                <Line
                  type="monotone"
                  dataKey="chatCount"
                  stroke={COLORS[0]}
                  strokeWidth={3}
                  name="Chat"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="callCount"
                  stroke={COLORS[1]}
                  strokeWidth={3}
                  name="Call"
                  connectNulls
                />
              </>
            )}
            {chartKey === "timeToConvert" && (
              <Line
                type="monotone"
                dataKey="count"
                stroke={COLORS[0]}
                strokeWidth={3}
                name="Count"
                connectNulls
              />
            )}
            {chartKey === "engagementFunnel" && (
              <Line
                type="monotone"
                dataKey="value"
                stroke={COLORS[0]}
                strokeWidth={3}
                name="Count"
                connectNulls
              />
            )}
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
            />
            <XAxis
              dataKey={
                chartKey === "interactionsToConvert"
                  ? "interactions"
                  : chartKey === "timeToConvert"
                  ? "period"
                  : "date"
              }
              stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
              tick={{
                fontSize: 12,
              }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
              tick={{
                fontSize: 12,
              }}
              width={60}
              label={{
                value:
                  chartKey === "leadQuality"
                    ? "Lead Count"
                    : chartKey === "interactionsToConvert"
                    ? "Number of Leads"
                    : "Count",
                angle: -90,
                position: "insideLeft",
                offset: -25,
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Legend />
            {chartKey === "leadsOverTime" && (
              <>
                <Area
                  type="monotone"
                  dataKey="chatLeads"
                  stackId="1"
                  stroke={COLORS[0]}
                  fill={COLORS[0]}
                />
                <Area
                  type="monotone"
                  dataKey="callLeads"
                  stackId="1"
                  stroke={COLORS[1]}
                  fill={COLORS[1]}
                />
              </>
            )}
            {chartKey === "interactionsOverTime" && (
              <>
                <Area
                  type="monotone"
                  dataKey="chat"
                  stackId="1"
                  stroke={COLORS[0]}
                  fill={COLORS[0]}
                />
                <Area
                  type="monotone"
                  dataKey="call"
                  stackId="1"
                  stroke={COLORS[1]}
                  fill={COLORS[1]}
                />
              </>
            )}
            {chartKey === "interactionsToConvert" && (
              <>
                <Area
                  type="monotone"
                  dataKey="chatCount"
                  stackId="1"
                  stroke={COLORS[0]}
                  fill={COLORS[0]}
                />
                <Area
                  type="monotone"
                  dataKey="callCount"
                  stackId="1"
                  stroke={COLORS[1]}
                  fill={COLORS[1]}
                />
              </>
            )}
            {chartKey === "timeToConvert" && (
              <Area
                type="monotone"
                dataKey="count"
                stackId="1"
                stroke={COLORS[0]}
                fill={COLORS[0]}
              />
            )}
          </AreaChart>
        );
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
            />
            <XAxis
              dataKey={
                chartKey === "interactionsToConvert"
                  ? "interactions"
                  : chartKey === "timeToConvert"
                  ? "period"
                  : chartKey === "leadQuality"
                  ? "name"
                  : chartKey === "leadsOverTime" ||
                    chartKey === "interactionsOverTime"
                  ? "date"
                  : chartKey === "engagementFunnel"
                  ? "name"
                  : chartKey === "sourceBreakdown"
                  ? "name"
                  : "name"
              }
              type={
                chartKey === "engagementFunnel" ||
                chartKey === "sourceBreakdown" ||
                chartKey === "leadQuality" ||
                chartKey === "timeToConvert"
                  ? "category"
                  : undefined
              }
              stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
              tick={{
                fontSize: 12,
              }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
              label={{
                value:
                  chartKey === "leadQuality"
                    ? ""
                    : chartKey === "interactionsToConvert"
                    ? ""
                    : "",
                position: "insideBottom",
                offset: -25,
              }}
            />
            <YAxis
              stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
              tick={{
                fontSize: 12,
              }}
              width={60}
              label={{
                value:
                  chartKey === "leadQuality"
                    ? "Lead Count"
                    : chartKey === "interactionsToConvert"
                    ? "Number of Leads"
                    : "Count",
                angle: -90,
                position: "insideLeft",
                offset: -25,
              }}
            />
            <ReTooltip content={<CustomTooltip />} />
            <Legend />
            {/* Add Bar for each chartKey */}
            {chartKey === "leadsOverTime" && (
              <>
                <Bar dataKey="chatLeads" fill={COLORS[0]} name="Chat Leads" />
                <Bar dataKey="callLeads" fill={COLORS[1]} name="Call Leads" />
              </>
            )}
            {chartKey === "interactionsOverTime" && (
              <>
                <Bar dataKey="chat" fill={COLORS[0]} name="Chat" />
                <Bar dataKey="call" fill={COLORS[1]} name="Call" />
              </>
            )}
            {chartKey === "interactionsToConvert" && (
              <>
                <Bar dataKey="chatCount" fill={COLORS[0]} name="Chat" />
                <Bar dataKey="callCount" fill={COLORS[1]} name="Call" />
              </>
            )}
            {chartKey === "timeToConvert" && (
              <Bar dataKey="count" fill={COLORS[0]} name="Count" />
            )}
            {chartKey === "leadQuality" && (
              <>
                <Bar dataKey="chatCount" fill={COLORS[0]} name="Chat Leads" />
                <Bar dataKey="callCount" fill={COLORS[1]} name="Call Leads" />
              </>
            )}
            {chartKey === "engagementFunnel" && (
              <Bar dataKey="value" fill={COLORS[0]} name="Count" />
            )}
            {chartKey === "sourceBreakdown" && (
              <Bar dataKey="value" fill={COLORS[0]} />
            )}
          </BarChart>
        );
      case "pie":
        if (chartKey === "leadQuality") {
          if (filter === "chat") {
            pieData = leadQualityData.map((d) => ({
              name: d.name,
              value: d.chatCount,
              color: d.color,
            }));
          } else {
            pieData = leadQualityData.map((d) => ({
              name: d.name,
              value: d.chatCount + d.callCount,
              color: d.color,
            }));
          }
        } else if (chartKey === "interactionsToConvert") {
          // Show chatCount and callCount as separate pie slices
          let chatSum = 0;
          let callSum = 0;
          data.forEach((d) => {
            chatSum += Number(d.chatCount) || 0;
            callSum += Number(d.callCount) || 0;
          });
          pieData = [
            { name: "Chat", value: chatSum, color: COLORS[0] },
            { name: "Call", value: callSum, color: COLORS[1] },
          ];
        } else if (chartKey === "timeToConvert") {
          // Show each period as a slice
          pieData = data.map((d, i) => ({
            name: d.period,
            value: d.count,
            color: COLORS[i % COLORS.length],
          }));
        } else if (chartKey === "engagementFunnel") {
          // Map fill to color for Pie chart
          pieData = data.map((d) => ({
            ...d,
            color: d.color || d.fill,
          }));
        } else {
          pieData = data;
        }
        return (
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              onClick={onSegmentClick}
              label
            >
              {(pieData as { color: string }[]).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ReTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" />
          </PieChart>
        );
      case "donut":
        if (chartKey === "leadQuality") {
          if (filter === "chat") {
            donutData = leadQualityData.map((d) => ({
              name: d.name,
              value: d.chatCount,
              color: d.color,
            }));
          } else {
            donutData = leadQualityData.map((d) => ({
              name: d.name,
              value: d.chatCount + d.callCount,
              color: d.color,
            }));
          }
        } else {
          donutData = data;
        }
        return (
          <PieChart>
            <Pie
              data={donutData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              onClick={onSegmentClick}
              label
            >
              {(donutData as { color: string }[]).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ReTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" />
          </PieChart>
        );
      case "funnel":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Funnel
                dataKey="value"
                data={data}
                isAnimationActive
                width="100%"
              >
                <LabelList
                  position="center"
                  fill="#fff"
                  stroke="none"
                  dataKey="name"
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                />
              </Funnel>
              <ReTooltip content={<CustomFunnelTooltip />} />
            </FunnelChart>
          </ResponsiveContainer>
        );
      case "combo":
        // Only support combo for leadsOverTime and interactionsOverTime
        if (
          chartKey !== "leadsOverTime" &&
          chartKey !== "interactionsOverTime"
        ) {
          return (
            <div className="text-center text-muted-foreground py-12">
              Combo chart is not available for this data.
            </div>
          );
        }
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
              />
              <XAxis
                dataKey="date"
                stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke={theme === "dark" ? "#9CA3AF" : "#6b7280"}
                tick={{ fontSize: 12 }}
                width={60}
              />
              <ReTooltip content={<CustomTooltip />} />
              <Legend />
              {/* For leadsOverTime: total, chatLeads, callLeads. For interactionsOverTime: total, chat, call. */}
              {chartKey === "leadsOverTime" && (
                <>
                  <Bar
                    dataKey="total"
                    fill={COLORS[2]}
                    name="Total"
                    barSize={30}
                  />
                  <Line
                    type="monotone"
                    dataKey="chatLeads"
                    stroke={COLORS[0]}
                    strokeWidth={3}
                    name="Chat Trend"
                  />
                  <Line
                    type="monotone"
                    dataKey="callLeads"
                    stroke={COLORS[1]}
                    strokeWidth={3}
                    name="Call Trend"
                  />
                </>
              )}
              {chartKey === "interactionsOverTime" && (
                <>
                  <Bar
                    dataKey="total"
                    fill={COLORS[2]}
                    name="Total"
                    barSize={30}
                  />
                  <Line
                    type="monotone"
                    dataKey="chat"
                    stroke={COLORS[0]}
                    strokeWidth={3}
                    name="Chat Trend"
                  />
                  <Line
                    type="monotone"
                    dataKey="call"
                    stroke={COLORS[1]}
                    strokeWidth={3}
                    name="Call Trend"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  // Filtering helpers
  function filterByDateRange(
    data: ChartData[],
    filters: Record<string, unknown>
  ) {
    const dateRange = filters?.dateRange as {
      from?: string | Date;
      to?: string | Date;
    };
    if (!dateRange?.from || !dateRange?.to) return data;
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    return data.filter((d) => {
      const date = new Date((d.date || d.period || d.name) as string);
      return date >= from && date <= to;
    });
  }
  function filterByAgent(data: ChartData[], filters: Record<string, unknown>) {
    if (!filters?.agent || filters.agent === "all") return data;
    // Example: filter by agent type if present in data
    return data.filter((d) => d.agent === filters.agent);
  }
  function filterBySource(data: ChartData[], filters: Record<string, unknown>) {
    if (!filters?.source || filters.source === "all") return data;
    return data.filter(
      (d) =>
        d.source === filters.source ||
        d.platform === filters.source ||
        d.name === filters.source
    );
  }
  function filterByLeadQuality(
    data: ChartData[],
    filters: Record<string, unknown>
  ) {
    if (!filters?.leadQuality || filters.leadQuality === "all") return data;
    return data.filter((d) => {
      const label = (d.name || d.leadTag) as string;
      return (
        label && label.toLowerCase().includes(filters.leadQuality as string)
      );
    });
  }

  // Get data from API - no fallback to mock data, show empty states when no real data is available
  const leadsOverTimeData = analytics?.leadsOverTimeData || [];
  const interactionsOverTimeData = analytics?.interactionsOverTimeData || [];
  const leadQualityData = analytics?.leadQualityData || [];
  const engagementFunnelData = analytics?.engagementFunnelData || [];
  const interactionsToConvertData = analytics?.interactionsToConvertData || [];
  const timeToConvertData = analytics?.timeToConvertData || [];
  const sourceBreakdownData = analytics?.sourceBreakdownData || [];

  // Log data consumption and mock data usage
  useEffect(() => {
    dataFlowDebugger.logComponentData('OverviewCharts', analytics, !analytics);
    
    // Log data consumption - no longer using mock data fallbacks, showing empty states when no real data
    dataFlowDebugger.logComponentData('OverviewCharts.leadsOverTimeData', analytics?.leadsOverTimeData, false);
    dataFlowDebugger.logComponentData('OverviewCharts.interactionsOverTimeData', analytics?.interactionsOverTimeData, false);
    dataFlowDebugger.logComponentData('OverviewCharts.leadQualityData', analytics?.leadQualityData, false);
    dataFlowDebugger.logComponentData('OverviewCharts.engagementFunnelData', analytics?.engagementFunnelData, false);
    dataFlowDebugger.logComponentData('OverviewCharts.interactionsToConvertData', analytics?.interactionsToConvertData, false);
    dataFlowDebugger.logComponentData('OverviewCharts.timeToConvertData', analytics?.timeToConvertData, false);
    dataFlowDebugger.logComponentData('OverviewCharts.sourceBreakdownData', analytics?.sourceBreakdownData, false);
  }, [analytics]);

  // Filtered datasets
  const filteredLeadsOverTime = filterByDateRange(leadsOverTimeData, filters);
  const filteredInteractionsOverTime = filterByDateRange(
    interactionsOverTimeData,
    filters
  );
  const filteredLeadQuality = filterByLeadQuality(leadQualityData, filters);
  // Apply all relevant filters to engagementFunnelData
  let filteredEngagementFunnel = engagementFunnelData as {
    name: string;
    value: number;
    fill: string;
  }[];
  filteredEngagementFunnel = filterByDateRange(
    filteredEngagementFunnel,
    filters
  ) as typeof engagementFunnelData;
  filteredEngagementFunnel = filterByAgent(
    filteredEngagementFunnel,
    filters
  ) as typeof engagementFunnelData;
  filteredEngagementFunnel = filterBySource(
    filteredEngagementFunnel,
    filters
  ) as typeof engagementFunnelData;
  filteredEngagementFunnel = filterByLeadQuality(
    filteredEngagementFunnel,
    filters
  ) as typeof engagementFunnelData;
  // Apply all relevant filters to interactionsToConvertData
  let filteredInteractionsToConvert = interactionsToConvertData as {
    interactions: string;
    chatCount: number;
    callCount: number;
  }[];
  filteredInteractionsToConvert = filterByDateRange(
    filteredInteractionsToConvert,
    filters
  ) as typeof interactionsToConvertData;
  filteredInteractionsToConvert = filterByAgent(
    filteredInteractionsToConvert,
    filters
  ) as typeof interactionsToConvertData;
  filteredInteractionsToConvert = filterBySource(
    filteredInteractionsToConvert,
    filters
  ) as typeof interactionsToConvertData;
  filteredInteractionsToConvert = filterByLeadQuality(
    filteredInteractionsToConvert,
    filters
  ) as typeof interactionsToConvertData;
  // Apply all relevant filters to timeToConvertData
  let filteredTimeToConvert = timeToConvertData as {
    period: string;
    count: number;
  }[];
  filteredTimeToConvert = filterByDateRange(
    filteredTimeToConvert,
    filters
  ) as typeof timeToConvertData;
  filteredTimeToConvert = filterByAgent(
    filteredTimeToConvert,
    filters
  ) as typeof timeToConvertData;
  filteredTimeToConvert = filterBySource(
    filteredTimeToConvert,
    filters
  ) as typeof timeToConvertData;
  filteredTimeToConvert = filterByLeadQuality(
    filteredTimeToConvert,
    filters
  ) as typeof timeToConvertData;
  const filteredSourceBreakdown = filterBySource(sourceBreakdownData, filters);

  // Show loading state
  if (loadingAnalytics) {
    return <LoadingState />;
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Analytics Charts</h3>
        </div>
        <ErrorState />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Charts Header with Refresh Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold">Analytics Charts</h3>
            {analytics?.lastRefresh && (
              <span className="text-sm text-muted-foreground">
                Last updated: {new Date(analytics.lastRefresh).toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={refreshAnalytics}
            disabled={loadingAnalytics}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loadingAnalytics ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leads Over Time */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <span className="font-bold">{chartInfo[0].title}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    size={16}
                    className="text-muted-foreground cursor-help"
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  {chartInfo[0].description}
                </TooltipContent>
              </Tooltip>
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
                className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-slate-600"
              >
                {getChartTypeOptions("leadsOverTime").map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {renderChart(
              chartViews.leadsOverTime,
              filteredLeadsOverTime,
              "leadsOverTime"
            )}
          </ResponsiveContainer>
        </div>

        {/* Total Interactions Over Time */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <span className="font-bold">{chartInfo[1].title}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    size={16}
                    className="text-muted-foreground cursor-help"
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  {chartInfo[1].description}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative">
              <select
                value={chartViews.interactionsOverTime}
                onChange={(e) =>
                  setChartViews((prev) => ({
                    ...prev,
                    interactionsOverTime: e.target.value,
                  }))
                }
                className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-slate-600"
              >
                {getChartTypeOptions("interactionsOverTime").map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {renderChart(
              chartViews.interactionsOverTime,
              filteredInteractionsOverTime,
              "interactionsOverTime"
            )}
          </ResponsiveContainer>
        </div>

        {/* Lead Quality Distribution */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <span className="font-bold">{chartInfo[2].title}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    size={16}
                    className="text-muted-foreground cursor-help"
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  {chartInfo[2].description}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <ToggleGroup
                type="single"
                value={agentFilter.leadQuality}
                onValueChange={(value) =>
                  value &&
                  setAgentFilter((prev) => ({
                    ...prev,
                    leadQuality: value,
                  }))
                }
                className="bg-muted p-1 rounded-lg"
              ></ToggleGroup>
              <div className="relative">
                <select
                  value={chartViews.leadQuality}
                  onChange={(e) =>
                    setChartViews((prev) => ({
                      ...prev,
                      leadQuality: e.target.value,
                    }))
                  }
                  className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-slate-600"
                >
                  {getChartTypeOptions("leadQuality").map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {renderChart(
              chartViews.leadQuality,
              filteredLeadQuality,
              "leadQuality"
            )}
          </ResponsiveContainer>
        </div>

        {/* Engagement Funnel */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <span className="font-bold">{chartInfo[3].title}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    size={16}
                    className="text-muted-foreground cursor-help"
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  {chartInfo[3].description}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative">
              <select
                value={chartViews.engagementFunnel}
                onChange={(e) =>
                  setChartViews((prev) => ({
                    ...prev,
                    engagementFunnel: e.target.value,
                  }))
                }
                className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-slate-600"
              >
                {getChartTypeOptions("engagementFunnel").map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          <div className="w-full h-80">
            {renderChart(
              chartViews.engagementFunnel,
              filteredEngagementFunnel,
              "engagementFunnel"
            )}
          </div>
        </div>

        {/* Avg. Interactions to Convert */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <span className="font-bold">{chartInfo[4].title}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    size={16}
                    className="text-muted-foreground cursor-help"
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  {chartInfo[4].description}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={chartViews.interactionsToConvert}
                  onChange={(e) =>
                    setChartViews((prev) => ({
                      ...prev,
                      interactionsToConvert: e.target.value,
                    }))
                  }
                  className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-slate-600"
                >
                  {getChartTypeOptions("interactionsToConvert").map(
                    (option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    )
                  )}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {renderChart(
              chartViews.interactionsToConvert,
              filteredInteractionsToConvert,
              "interactionsToConvert"
            )}
          </ResponsiveContainer>
        </div>

        {/* Avg. Time to Convert a Lead */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <span className="font-bold">{chartInfo[5].title}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    size={16}
                    className="text-muted-foreground cursor-help"
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  {chartInfo[5].description}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative">
              <select
                value={chartViews.timeToConvert}
                onChange={(e) =>
                  setChartViews((prev) => ({
                    ...prev,
                    timeToConvert: e.target.value,
                  }))
                }
                className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-slate-600"
              >
                {getChartTypeOptions("timeToConvert").map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {renderChart(
              chartViews.timeToConvert,
              filteredTimeToConvert,
              "timeToConvert"
            )}
          </ResponsiveContainer>
        </div>

        {/* Source Breakdown */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">{chartInfo[6].title}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    size={16}
                    className="text-muted-foreground cursor-help flex-shrink-0"
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  {chartInfo[6].description}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative">
              <select
                value={chartViews.sourceBreakdown}
                onChange={(e) =>
                  setChartViews((prev) => ({
                    ...prev,
                    sourceBreakdown: e.target.value,
                  }))
                }
                className="appearance-none bg-background border rounded px-3 py-1 pr-8 text-sm border-slate-600"
              >
                {getChartTypeOptions("sourceBreakdown").map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {renderChart(
              chartViews.sourceBreakdown,
              filteredSourceBreakdown,
              "sourceBreakdown"
            )}
          </ResponsiveContainer>
        </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function OverviewCharts(props: OverviewChartsProps) {
  return (
    <ChartErrorBoundary>
      <OverviewChartsContent {...props} />
    </ChartErrorBoundary>
  );
}
