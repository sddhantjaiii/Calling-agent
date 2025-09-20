import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../ui/chart';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 

  Legend
} from 'recharts';

// Chart configuration for consistent theming
export const adminChartConfig = {
  users: {
    label: "Users",
    color: "hsl(var(--chart-1))",
  },
  agents: {
    label: "Agents", 
    color: "hsl(var(--chart-2))",
  },
  calls: {
    label: "Calls",
    color: "hsl(var(--chart-3))",
  },
  success: {
    label: "Success Rate",
    color: "hsl(var(--chart-4))",
  },
  error: {
    label: "Errors",
    color: "hsl(var(--chart-5))",
  },
};

// Color palette for charts
export const CHART_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'
];

interface ActivityChartProps {
  data: Array<{
    name: string;
    users: number;
    agents: number;
    calls: number;
  }>;
  className?: string;
}

export function ActivityChart({ data, className }: ActivityChartProps) {
  return (
    <ChartContainer config={adminChartConfig} className={className}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line 
          type="monotone" 
          dataKey="users" 
          stroke="var(--color-users)" 
          strokeWidth={2}
          dot={{ fill: "var(--color-users)", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: "var(--color-users)", strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="agents" 
          stroke="var(--color-agents)" 
          strokeWidth={2}
          dot={{ fill: "var(--color-agents)", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: "var(--color-agents)", strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="calls" 
          stroke="var(--color-calls)" 
          strokeWidth={2}
          dot={{ fill: "var(--color-calls)", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: "var(--color-calls)", strokeWidth: 2 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

interface SystemHealthChartProps {
  data: Array<{
    name: string;
    value: number;
    status: 'healthy' | 'warning' | 'error';
  }>;
  className?: string;
}

export function SystemHealthChart({ data, className }: SystemHealthChartProps) {
  const getBarColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <ChartContainer config={adminChartConfig} className={className}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          domain={[0, 100]} 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <ChartTooltip 
          content={<ChartTooltipContent />}
        />
        <Bar 
          dataKey="value" 
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

interface CallVolumeChartProps {
  data: Array<{
    time: string;
    successful: number;
    failed: number;
    total: number;
  }>;
  className?: string;
}

export function CallVolumeChart({ data, className }: CallVolumeChartProps) {
  return (
    <ChartContainer config={adminChartConfig} className={className}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="successful"
          stackId="1"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.6}
        />
        <Area
          type="monotone"
          dataKey="failed"
          stackId="1"
          stroke="#ef4444"
          fill="#ef4444"
          fillOpacity={0.6}
        />
      </AreaChart>
    </ChartContainer>
  );
}

interface UserGrowthChartProps {
  data: Array<{
    date: string;
    newUsers: number;
    totalUsers: number;
  }>;
  className?: string;
}

export function UserGrowthChart({ data, className }: UserGrowthChartProps) {
  return (
    <ChartContainer config={adminChartConfig} className={className}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line 
          type="monotone" 
          dataKey="newUsers" 
          stroke="var(--color-users)" 
          strokeWidth={2}
          dot={{ fill: "var(--color-users)", strokeWidth: 2, r: 4 }}
          name="New Users"
        />
        <Line 
          type="monotone" 
          dataKey="totalUsers" 
          stroke="var(--color-agents)" 
          strokeWidth={2}
          dot={{ fill: "var(--color-agents)", strokeWidth: 2, r: 4 }}
          name="Total Users"
        />
      </LineChart>
    </ChartContainer>
  );
}

interface AgentDistributionChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  className?: string;
}

export function AgentDistributionChart({ data, className }: AgentDistributionChartProps) {
  return (
    <ChartContainer config={adminChartConfig} className={className}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} 
            />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
      </PieChart>
    </ChartContainer>
  );
}

interface ResponseTimeChartProps {
  data: Array<{
    time: string;
    responseTime: number;
    threshold: number;
  }>;
  className?: string;
}

export function ResponseTimeChart({ data, className }: ResponseTimeChartProps) {
  return (
    <ChartContainer config={adminChartConfig} className={className}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: '#e5e7eb' }}
          label={{ value: 'ms', angle: -90, position: 'insideLeft' }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line 
          type="monotone" 
          dataKey="responseTime" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
          name="Response Time"
        />
        <Line 
          type="monotone" 
          dataKey="threshold" 
          stroke="#ef4444" 
          strokeWidth={1}
          strokeDasharray="5 5"
          dot={false}
          name="Threshold"
        />
      </LineChart>
    </ChartContainer>
  );
}

export default {
  ActivityChart,
  SystemHealthChart,
  CallVolumeChart,
  UserGrowthChart,
  AgentDistributionChart,
  ResponseTimeChart,
};