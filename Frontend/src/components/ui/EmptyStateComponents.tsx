import React from 'react';
import { 
  Database, 
  Search, 
  TrendingUp, 
  Users, 
  Phone, 
  MessageSquare, 
  BarChart3, 
  AlertCircle,
  RefreshCw,
  Plus,
  FileText,
  Wifi,
  WifiOff,
  Info,
  Filter,
  Calendar,
  Target,
  Activity,
  PieChart,
  LineChart,
  BarChart2
} from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBorder?: boolean;
  testId?: string;
}

const BaseEmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
  size = 'md',
  showBorder = false,
  testId,
}) => {
  const sizeClasses = {
    sm: 'py-8 px-3',
    md: 'py-12 px-4',
    lg: 'py-16 px-6'
  };

  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} ${showBorder ? 'border rounded-lg bg-card' : ''} ${className}`}
      data-testid={testId}
      role="status"
      aria-live="polite"
    >
      <div className="flex justify-center mb-4">
        {React.isValidElement(icon) 
          ? React.cloneElement(icon as React.ReactElement, { 
              className: `${iconSizes[size]} text-muted-foreground` 
            })
          : typeof icon === 'function'
          ? React.createElement(icon, { className: `${iconSizes[size]} text-muted-foreground` })
          : icon
        }
      </div>
      
      <h3 className={`${titleSizes[size]} font-semibold text-foreground mb-2`}>
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {description}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || 'default'}
            size="sm"
            aria-label={action.label}
          >
            {action.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button
            onClick={secondaryAction.onClick}
            variant="outline"
            size="sm"
            aria-label={secondaryAction.label}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};

// Dashboard-specific empty states
export const NoDataAvailable: React.FC<{
  title?: string;
  description?: string;
  onRefresh?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  testId?: string;
}> = ({
  title = "No data available",
  description = "Data will appear here once you have interactions and leads.",
  onRefresh,
  className = '',
  size = 'md',
  testId = 'no-data-available',
}) => (
  <BaseEmptyState
    icon={<Database />}
    title={title}
    description={description}
    action={onRefresh ? {
      label: "Refresh",
      onClick: onRefresh,
      variant: "outline"
    } : undefined}
    className={className}
    size={size}
    testId={testId}
  />
);

export const NoKPIData: React.FC<{
  onRefresh?: () => void;
  size?: 'sm' | 'md' | 'lg';
}> = ({ onRefresh, size = 'md' }) => (
  <BaseEmptyState
    icon={<Target />}
    title="No KPI data available"
    description="Key performance indicators will appear here once you have call and lead data. Start making calls or generating leads to see your metrics."
    action={onRefresh ? {
      label: "Refresh Data",
      onClick: onRefresh,
      variant: "outline"
    } : undefined}
    size={size}
    testId="no-kpi-data"
  />
);

export const NoAnalyticsData: React.FC<{
  onRefresh?: () => void;
  size?: 'sm' | 'md' | 'lg';
  chartType?: string;
}> = ({ onRefresh, size = 'md', chartType }) => (
  <BaseEmptyState
    icon={<BarChart3 />}
    title={chartType ? `No ${chartType} data` : "No analytics data"}
    description="Charts and analytics will appear here once you have interaction data. Your conversations and calls will generate insights over time."
    action={onRefresh ? {
      label: "Refresh Analytics",
      onClick: onRefresh,
      variant: "outline"
    } : undefined}
    size={size}
    testId="no-analytics-data"
  />
);

export const NoLeadsData: React.FC<{
  onAddLead?: () => void;
  onRefresh?: () => void;
  isFiltered?: boolean;
  filterCount?: number;
}> = ({ onAddLead, onRefresh, isFiltered, filterCount }) => {
  const title = isFiltered ? "No leads match your filters" : "No leads found";
  const description = isFiltered 
    ? `No leads found with the current ${filterCount ? `${filterCount} ` : ''}filters applied. Try adjusting your search criteria or clearing filters.`
    : "Leads will appear here once you start having conversations with potential customers. Your AI agents will automatically capture and qualify leads from calls and chats.";

  return (
    <BaseEmptyState
      icon={<Users />}
      title={title}
      description={description}
      action={isFiltered ? (onRefresh ? {
        label: "Clear Filters",
        onClick: onRefresh,
        variant: "outline"
      } : undefined) : (onAddLead ? {
        label: "Add Lead",
        onClick: onAddLead,
      } : undefined)}
      secondaryAction={onRefresh && !isFiltered ? {
        label: "Refresh",
        onClick: onRefresh,
      } : undefined}
      testId="no-leads-data"
    />
  );
};

export const NoCallsData: React.FC<{
  onRefresh?: () => void;
  onSetupAgent?: () => void;
  isFiltered?: boolean;
}> = ({ onRefresh, onSetupAgent, isFiltered }) => {
  const title = isFiltered ? "No calls match your filters" : "No calls found";
  const description = isFiltered 
    ? "No call records found with the current filters applied. Try adjusting your search criteria."
    : "Call records will appear here once you start making or receiving calls. Set up your AI agents to begin capturing call data.";

  return (
    <BaseEmptyState
      icon={<Phone />}
      title={title}
      description={description}
      action={isFiltered ? (onRefresh ? {
        label: "Clear Filters",
        onClick: onRefresh,
        variant: "outline"
      } : undefined) : (onSetupAgent ? {
        label: "Set Up Agent",
        onClick: onSetupAgent,
      } : undefined)}
      secondaryAction={onRefresh && !isFiltered ? {
        label: "Refresh",
        onClick: onRefresh,
      } : undefined}
      testId="no-calls-data"
    />
  );
};

export const NoChatsData: React.FC<{
  onRefresh?: () => void;
  onSetupAgent?: () => void;
  isFiltered?: boolean;
}> = ({ onRefresh, onSetupAgent, isFiltered }) => {
  const title = isFiltered ? "No chats match your filters" : "No chats found";
  const description = isFiltered 
    ? "No chat conversations found with the current filters applied. Try adjusting your search criteria."
    : "Chat conversations will appear here once you start chatting with leads. Configure your AI agents to handle chat interactions.";

  return (
    <BaseEmptyState
      icon={<MessageSquare />}
      title={title}
      description={description}
      action={isFiltered ? (onRefresh ? {
        label: "Clear Filters",
        onClick: onRefresh,
        variant: "outline"
      } : undefined) : (onSetupAgent ? {
        label: "Set Up Agent",
        onClick: onSetupAgent,
      } : undefined)}
      secondaryAction={onRefresh && !isFiltered ? {
        label: "Refresh",
        onClick: onRefresh,
      } : undefined}
      testId="no-chats-data"
    />
  );
};

export const NoSearchResults: React.FC<{
  searchTerm?: string;
  onClearSearch?: () => void;
  entityType?: string;
}> = ({ searchTerm, onClearSearch, entityType = "results" }) => (
  <BaseEmptyState
    icon={<Search className="h-12 w-12 text-muted-foreground" />}
    title="No search results"
    description={
      searchTerm 
        ? `No ${entityType} found for "${searchTerm}". Try adjusting your search terms.`
        : `No ${entityType} match your current filters.`
    }
    action={onClearSearch ? {
      label: "Clear Search",
      onClick: onClearSearch,
      variant: "outline"
    } : undefined}
  />
);

export const LoadingFailed: React.FC<{
  onRetry?: () => void;
  error?: string;
  entityType?: string;
}> = ({ onRetry, error, entityType = "data" }) => (
  <BaseEmptyState
    icon={<AlertCircle className="h-12 w-12 text-red-500" />}
    title={`Failed to load ${entityType}`}
    description={
      error 
        ? `Error: ${error}. Please try again or contact support if the problem persists.`
        : `Unable to load ${entityType}. This might be a temporary issue.`
    }
    action={onRetry ? {
      label: "Try Again",
      onClick: onRetry,
    } : undefined}
  />
);

export const NetworkError: React.FC<{
  onRetry?: () => void;
}> = ({ onRetry }) => (
  <BaseEmptyState
    icon={<WifiOff className="h-12 w-12 text-red-500" />}
    title="Connection Error"
    description="Unable to connect to the server. Please check your internet connection and try again."
    action={onRetry ? {
      label: "Retry",
      onClick: onRetry,
    } : undefined}
  />
);

export const UnauthorizedAccess: React.FC<{
  onLogin?: () => void;
}> = ({ onLogin }) => (
  <BaseEmptyState
    icon={<AlertCircle className="h-12 w-12 text-orange-500" />}
    title="Access Denied"
    description="You don't have permission to view this data. Please contact your administrator."
    action={onLogin ? {
      label: "Login Again",
      onClick: onLogin,
      variant: "outline"
    } : undefined}
  />
);

// Chart-specific empty states
export const EmptyChart: React.FC<{
  title?: string;
  description?: string;
  onRefresh?: () => void;
  height?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'funnel';
  isFiltered?: boolean;
}> = ({ 
  title, 
  description,
  onRefresh,
  height = "300px",
  chartType = 'line',
  isFiltered = false
}) => {
  const chartIcons = {
    line: <LineChart />,
    bar: <BarChart2 />,
    pie: <PieChart />,
    area: <Activity />,
    funnel: <TrendingUp />
  };

  const defaultTitle = isFiltered 
    ? `No ${chartType} chart data for current filters`
    : `No ${chartType} chart data`;
  
  const defaultDescription = isFiltered
    ? "No data matches your current filter criteria. Try adjusting the date range or other filters."
    : "Chart data will appear here once you have analytics data. Your interactions will generate insights over time.";

  return (
    <div 
      className="flex items-center justify-center border rounded-lg bg-card" 
      style={{ height }}
      data-testid="empty-chart"
    >
      <BaseEmptyState
        icon={chartIcons[chartType]}
        title={title || defaultTitle}
        description={description || defaultDescription}
        action={onRefresh ? {
          label: isFiltered ? "Clear Filters" : "Refresh Chart",
          onClick: onRefresh,
          variant: "outline"
        } : undefined}
        size="sm"
      />
    </div>
  );
};

// Table-specific empty states
export const EmptyTable: React.FC<{
  title?: string;
  description?: string;
  onAdd?: () => void;
  onRefresh?: () => void;
  addLabel?: string;
  entityType?: string;
  isFiltered?: boolean;
  showBorder?: boolean;
}> = ({ 
  title, 
  description,
  onAdd,
  onRefresh,
  addLabel = "Add Item",
  entityType = "data",
  isFiltered = false,
  showBorder = true
}) => {
  const defaultTitle = isFiltered 
    ? `No ${entityType} match your filters`
    : `No ${entityType} found`;
  
  const defaultDescription = isFiltered
    ? `No ${entityType} found with the current filters applied. Try adjusting your search criteria or clearing filters.`
    : `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} will appear in this table once available.`;

  const containerClass = showBorder 
    ? "flex items-center justify-center py-12 border rounded-lg bg-card"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClass} data-testid="empty-table">
      <BaseEmptyState
        icon={<FileText />}
        title={title || defaultTitle}
        description={description || defaultDescription}
        action={isFiltered ? (onRefresh ? {
          label: "Clear Filters",
          onClick: onRefresh,
          variant: "outline"
        } : undefined) : (onAdd ? {
          label: addLabel,
          onClick: onAdd,
        } : undefined)}
        secondaryAction={onRefresh && !isFiltered ? {
          label: "Refresh",
          onClick: onRefresh,
        } : undefined}
        size="sm"
      />
    </div>
  );
};

// Specialized empty states for different contexts
export const EmptyLeadProfile: React.FC<{
  leadName?: string;
  onRefresh?: () => void;
  onContactLead?: () => void;
}> = ({ leadName, onRefresh, onContactLead }) => (
  <BaseEmptyState
    icon={<Users />}
    title="No profile data available"
    description={
      leadName 
        ? `Profile information for ${leadName} is not available yet. This may be because the lead was recently added or data is still being processed.`
        : "Lead profile information will appear here once available. Profile data is generated from interactions and conversations."
    }
    action={onContactLead ? {
      label: "Contact Lead",
      onClick: onContactLead,
    } : undefined}
    secondaryAction={onRefresh ? {
      label: "Refresh Profile",
      onClick: onRefresh,
    } : undefined}
    testId="empty-lead-profile"
  />
);

export const EmptyInteractionHistory: React.FC<{
  onRefresh?: () => void;
  onStartConversation?: () => void;
  leadName?: string;
}> = ({ onRefresh, onStartConversation, leadName }) => (
  <BaseEmptyState
    icon={<MessageSquare />}
    title="No interaction history"
    description={
      leadName 
        ? `No conversations found with ${leadName} yet. Start a conversation to see interaction history here.`
        : "Conversation history will appear here once you start interacting with this lead. All calls, chats, and messages will be tracked."
    }
    action={onStartConversation ? {
      label: "Start Conversation",
      onClick: onStartConversation,
    } : undefined}
    secondaryAction={onRefresh ? {
      label: "Refresh",
      onClick: onRefresh,
    } : undefined}
    size="sm"
    testId="empty-interaction-history"
  />
);

// Dashboard-specific empty states for different sections
export const EmptyDashboardSection: React.FC<{
  sectionType: 'overview' | 'analytics' | 'leads' | 'calls' | 'agents';
  onRefresh?: () => void;
  onSetup?: () => void;
  isFiltered?: boolean;
}> = ({ sectionType, onRefresh, onSetup, isFiltered }) => {
  const sectionConfig = {
    overview: {
      icon: <Database />,
      title: isFiltered ? "No overview data for current filters" : "No overview data available",
      description: isFiltered 
        ? "No data matches your current filters. Try adjusting the date range or clearing filters."
        : "Your dashboard overview will appear here once you have activity data. Start making calls or generating leads to see your performance metrics.",
      actionLabel: isFiltered ? "Clear Filters" : "Refresh Overview"
    },
    analytics: {
      icon: <BarChart3 />,
      title: isFiltered ? "No analytics data for current filters" : "No analytics data available",
      description: isFiltered
        ? "No analytics data matches your current filter criteria. Try adjusting the date range or other filters."
        : "Analytics and insights will appear here once you have interaction data. Your conversations and performance will generate valuable insights over time.",
      actionLabel: isFiltered ? "Clear Filters" : "Refresh Analytics"
    },
    leads: {
      icon: <Users />,
      title: isFiltered ? "No leads match your filters" : "No leads found",
      description: isFiltered
        ? "No leads found with the current filters applied. Try adjusting your search criteria."
        : "Leads will appear here once you start having conversations with potential customers. Your AI agents will automatically capture and qualify leads.",
      actionLabel: isFiltered ? "Clear Filters" : "Set Up Agents"
    },
    calls: {
      icon: <Phone />,
      title: isFiltered ? "No calls match your filters" : "No calls found",
      description: isFiltered
        ? "No call records found with the current filters applied. Try adjusting your search criteria."
        : "Call records will appear here once you start making or receiving calls. Set up your AI agents to begin capturing call data.",
      actionLabel: isFiltered ? "Clear Filters" : "Set Up Calling"
    },
    agents: {
      icon: <Activity />,
      title: "No agents configured",
      description: "AI agents will appear here once you create them. Agents handle your calls, chats, and lead qualification automatically.",
      actionLabel: "Create Agent"
    }
  };

  const config = sectionConfig[sectionType];

  return (
    <BaseEmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      action={(isFiltered ? onRefresh : onSetup) ? {
        label: config.actionLabel,
        onClick: isFiltered ? onRefresh! : onSetup!,
        variant: isFiltered ? "outline" : "default"
      } : undefined}
      secondaryAction={onRefresh && !isFiltered ? {
        label: "Refresh",
        onClick: onRefresh,
      } : undefined}
      testId={`empty-${sectionType}-section`}
    />
  );
};

// Date range specific empty state
export const EmptyDateRange: React.FC<{
  dateRange?: { start?: Date; end?: Date };
  onChangeDateRange?: () => void;
  onRefresh?: () => void;
  entityType?: string;
}> = ({ dateRange, onChangeDateRange, onRefresh, entityType = "data" }) => {
  const formatDate = (date: Date) => date.toLocaleDateString();
  const rangeText = dateRange?.start && dateRange?.end 
    ? `from ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`
    : "for the selected date range";

  return (
    <BaseEmptyState
      icon={<Calendar />}
      title={`No ${entityType} found ${rangeText}`}
      description={`No ${entityType} available for the selected time period. Try expanding your date range or selecting a different time period.`}
      action={onChangeDateRange ? {
        label: "Change Date Range",
        onClick: onChangeDateRange,
        variant: "outline"
      } : undefined}
      secondaryAction={onRefresh ? {
        label: "Refresh",
        onClick: onRefresh,
      } : undefined}
      testId="empty-date-range"
    />
  );
};

export { BaseEmptyState };
export { BaseEmptyState as EmptyState };
export default BaseEmptyState;