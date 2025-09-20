import OverviewFilters from "@/components/Overview/OverviewFilters";
import OverviewKPIs from "@/components/Overview/OverviewKPIs";
import OverviewCharts from "@/components/Overview/OverviewCharts";
import ExportSummaryModal from "@/components/Overview/ExportSummaryModal";
import CreditDisplay from "@/components/billing/CreditDisplay";
import { useState } from "react";

const sources = [
  { value: "all", label: "All Types" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
  { value: "customer", label: "Customer" },
];

const Overview = () => {
  const [showExport, setShowExport] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: null,
    source: "all",
    agent: "all",
    leadQuality: "all",
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Overview</h2>
        <CreditDisplay variant="detailed" showStats={true} className="max-w-sm" />
      </div>
      {/* Align filter and export button in a perfectly horizontal row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6 w-full">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <OverviewFilters
            filters={filters}
            setFilters={setFilters}
            sources={sources}
            leadTypes={[]}
          />
        </div>
        <div className="flex items-center">
          <button
            className="rounded px-4 py-2 text-sm font-medium text-white"
            style={{
              backgroundColor: "#1A6262",
            }}
            onClick={() => setShowExport(true)}
          >
            Export Summary
          </button>
        </div>
      </div>
      <OverviewKPIs filters={filters} />
      <OverviewCharts
        filters={filters}
        onSegmentClick={(segment) => {
          // e.g., go to respective analytics tab for clicked agent type
        }}
      />
      {showExport && (
        <ExportSummaryModal
          open={showExport}
          onClose={() => setShowExport(false)}
          dateRange={filters.dateRange}
        />
      )}
    </div>
  );
};

export default Overview;
