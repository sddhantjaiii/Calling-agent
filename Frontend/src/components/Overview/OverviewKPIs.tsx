import React, { useEffect } from "react";
import { ArrowUp, ArrowDown, Info, RefreshCw } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { dataFlowDebugger } from "@/utils/dataFlowDebugger";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { DashboardErrorBoundary } from "@/components/ui/ErrorBoundaryWrapper";
import { DashboardKPIsLoading, RefreshIndicator } from "@/components/ui/LoadingStates";
import { NoKPIData, LoadingFailed } from "@/components/ui/EmptyStateComponents";
import ErrorHandler from "@/components/ui/ErrorHandler";

interface OverviewKPIsProps {
  filters: {
    dateRange?: string;
    source?: string;
    agent?: string;
    leadQuality?: string;
  };
}

function OverviewKPIsContent({ filters }: OverviewKPIsProps) {
  const {
    overview,
    loadingOverview,
    error,
    refreshOverview,
    setAutoRefresh,
    lastRefresh
  } = useDashboard(false, 300000); // Disable auto-refresh temporarily to fix infinite calls

  // Get KPIs from overview data - no fallback to mock data
  const kpis = overview?.kpis || [];
  
  // Log data consumption in component
  useEffect(() => {
    dataFlowDebugger.logComponentData('OverviewKPIs', overview, !overview?.kpis);
    if (!overview?.kpis) {
      dataFlowDebugger.logMockDataUsage('OverviewKPIs', 'no fallback data', 'overview.kpis is null/undefined - showing empty state');
    }
  }, [overview]);

  // Set up auto-refresh when component mounts
  useEffect(() => {
    setAutoRefresh(true); // Auto-refresh enabled

    return () => {
      setAutoRefresh(false); // Cleanup auto-refresh on unmount
    };
  }, []); // Remove setAutoRefresh from dependencies to prevent infinite loop

  // Refresh data when filters change
  useEffect(() => {
    if (filters) {
      refreshOverview();
    }
  }, [filters]); // Remove refreshOverview from dependencies to prevent infinite loop

  // Validate KPI data structure
  const validateKpiData = (kpi: any) => {
    return (
      kpi &&
      typeof kpi.label === 'string' &&
      (typeof kpi.value === 'number' || typeof kpi.value === 'string') &&
      typeof kpi.description === 'string'
    );
  };

  // Show loading state
  if (loadingOverview && !overview) {
    return <DashboardKPIsLoading count={6} />;
  }

  // Show error state with retry option
  if (error && !overview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Key Performance Indicators</h3>
        </div>
        <ErrorHandler
          error={error}
          onRetry={refreshOverview}
          maxRetries={3}
          showToast={false}
        />
      </div>
    );
  }

  // Show empty state when no KPI data is available
  if (!loadingOverview && overview && (!kpis || kpis.length === 0)) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Key Performance Indicators</h3>
          <RefreshIndicator
            isRefreshing={loadingOverview}
            onRefresh={refreshOverview}
            lastRefresh={lastRefresh}
          />
        </div>
        <NoKPIData onRefresh={refreshOverview} size="md" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with refresh button and last update time */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Key Performance Indicators</h3>
          <RefreshIndicator
            isRefreshing={loadingOverview}
            onRefresh={refreshOverview}
            lastRefresh={lastRefresh}
          />
        </div>
        <div className="-mt-2 mb-2 text-xs text-muted-foreground">
          Data may lag up to ~5 minutes; charts are real-time.
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {kpis.filter(validateKpiData).map((kpi) => {
            const isPositive = typeof kpi.delta === "number" && kpi.delta > 0;
            const isNegative = typeof kpi.delta === "number" && kpi.delta < 0;

            return (
              <div
                key={kpi.label}
                className={`rounded-lg p-4 flex flex-col shadow border
                  bg-card border-border text-card-foreground
                  ${loadingOverview ? 'opacity-75' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    {kpi.label}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>{kpi.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {kpi.value}
                  </span>
                  {kpi.percentage && (
                    <span className="text-sm text-muted-foreground">
                      ({kpi.percentage}%)
                    </span>
                  )}
                </div>

                <div className="flex items-center text-xs mt-1">
                  {isPositive && (
                    <ArrowUp className="w-4 h-4 mr-1 text-emerald-500" />
                  )}
                  {isNegative && (
                    <ArrowDown className="w-4 h-4 mr-1 text-red-500" />
                  )}
                  <span
                    className={
                      isPositive
                        ? "text-emerald-500 font-medium"
                        : isNegative
                          ? "text-red-500 font-medium"
                          : "text-muted-foreground font-medium"
                    }
                  >
                    {typeof kpi.delta === "number" && kpi.delta > 0 && "+"}
                    {typeof kpi.delta === "number" ? (kpi.delta === 0 ? "0.0" : Math.abs(kpi.delta)) : ""}
                    {typeof kpi.delta === "number" && "%"}
                  </span>
                  {kpi.compare && (
                    <span className="ml-2 text-muted-foreground">
                      {kpi.compare}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function OverviewKPIs(props: OverviewKPIsProps) {
  return (
    <DashboardErrorBoundary>
      <OverviewKPIsContent {...props} />
    </DashboardErrorBoundary>
  );
}
