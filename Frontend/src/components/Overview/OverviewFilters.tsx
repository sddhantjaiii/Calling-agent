import React, { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { CalendarDays, Info } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

export default function OverviewFilters({
  filters,
  setFilters,
  sources = [],
  leadTypes = [],
}) {
  const { theme } = useTheme();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const leadQualityTypes = [
    { value: "all", label: "Lead Quality" },
    { value: "hot", label: "Hot Leads" },
    { value: "warm", label: "Warm Leads" },
    { value: "cold", label: "Cold Leads" },
  ];

  const agentTypes = [
    { value: "all", label: "All Agents" },
    { value: "chat", label: "Chat Agent" },
    { value: "call", label: "Calling Agent" },
  ];

  // Theme-specific dropdown style
  const selectClass = `border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2
    ${
      theme === "dark"
        ? "bg-background text-foreground border-border focus:ring-emerald-700"
        : "bg-white text-gray-800 border-gray-300 focus:ring-emerald-600"
    }`;

  const handleDateSelect = (range: DateRange | undefined) => {
    setFilters((f) => ({ ...f, dateRange: range }));
    if (range?.from && range?.to) {
      setDatePickerOpen(false);
    }
  };

  const formatDateRange = () => {
    if (filters.dateRange?.from && filters.dateRange?.to) {
      return `${format(filters.dateRange.from, "MMM dd")} - ${format(
        filters.dateRange.to,
        "MMM dd"
      )}`;
    }
    return "Select Date Range";
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full">
        {/* Date Range Picker */}
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`flex items-center justify-start text-left font-normal ${
                theme === "dark"
                  ? "bg-background text-foreground border-border hover:bg-accent"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange?.from}
              selected={filters.dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* Lead Types (Source) */}
        <div className="flex items-center gap-1">
          <select
            className={selectClass}
            value={filters.source}
            onChange={(e) =>
              setFilters((f) => ({ ...f, source: e.target.value }))
            }
          >
            {sources.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info size={14} className="text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Affects: All charts and KPIs</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Agents Filter */}
        <div className="flex items-center gap-1">
          <select
            className={selectClass}
            value={filters.agent || "all"}
            onChange={(e) =>
              setFilters((f) => ({ ...f, agent: e.target.value }))
            }
          >
            {agentTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info size={14} className="text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Affects: All charts and KPIs</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Lead Quality */}
        <div className="flex items-center gap-1">
          <select
            className={selectClass}
            value={filters.leadQuality || "all"}
            onChange={(e) =>
              setFilters((f) => ({ ...f, leadQuality: e.target.value }))
            }
          >
            {leadQualityTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info size={14} className="text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>
                Affects: Lead Quality Distribution chart and related KPIs only
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
