import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

export default function ExportSummaryModal({
  open,
  onClose,
  dateRange,
  kpis = [],
  leadsOverTimeData = [],
  interactionsOverTimeData = [],
}) {
  const [exportFormat, setExportFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(dateRange?.from);
  const [toDate, setToDate] = useState<Date | undefined>(dateRange?.to);
  const [fromCalendarOpen, setFromCalendarOpen] = useState(false);
  const [toCalendarOpen, setToCalendarOpen] = useState(false);
  const { theme } = useTheme();

  const generateCSV = () => {
    let csv = "KPI,Value,Delta,Compare\n";
    kpis.forEach((kpi) => {
      csv += `"${kpi.label}","${kpi.value}","${kpi.delta}","${kpi.compare}"\n`;
    });
    csv += "\nLeads Over Time\nDate,Total,Chat Leads,Call Leads\n";
    leadsOverTimeData.forEach((item) => {
      csv += `"${item.date}","${item.total}","${item.chatLeads}","${item.callLeads}"\n`;
    });
    csv += "\nInteractions Over Time\nDate,Total,Chat,Call\n";
    interactionsOverTimeData.forEach((item) => {
      csv += `"${item.date}","${item.total}","${item.chat}","${item.call}"\n`;
    });
    return csv;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Overview Summary", 10, 10);
    let y = 20;
    doc.setFontSize(12);
    doc.text("KPIs:", 10, y);
    y += 8;
    kpis.forEach((kpi) => {
      doc.text(
        `${kpi.label}: ${kpi.value} (${kpi.delta > 0 ? "+" : ""}${kpi.delta}%)`,
        10,
        y
      );
      y += 7;
    });
    y += 5;
    doc.text("Leads Over Time:", 10, y);
    y += 8;
    leadsOverTimeData.forEach((item) => {
      doc.text(
        `${item.date}: ${item.total} (Chat: ${item.chatLeads}, Call: ${item.callLeads})`,
        10,
        y
      );
      y += 7;
    });
    y += 5;
    doc.text("Interactions Over Time:", 10, y);
    y += 8;
    interactionsOverTimeData.forEach((item) => {
      doc.text(
        `${item.date}: ${item.total} (Chat: ${item.chat}, Call: ${item.call})`,
        10,
        y
      );
      y += 7;
    });
    doc.save("overview-summary.pdf");
  };

  const handleDownload = () => {
    setExporting(true);
    setTimeout(() => {
      if (exportFormat === "csv") {
        const csv = generateCSV();
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "overview-summary.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (exportFormat === "pdf") {
        generatePDF();
      }
      setExporting(false);
      onClose();
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={
          theme === "dark"
            ? "bg-gray-900 text-white border-gray-700"
            : "bg-white text-gray-900 border-gray-200"
        }
      >
        <DialogHeader>
          <DialogTitle
            className={theme === "dark" ? "text-white" : "text-gray-900"}
          >
            Export Summary
          </DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <label
            className={`block mb-1 text-sm font-medium ${
              theme === "dark" ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Choose format
          </label>
          <select
            className={`border px-3 py-2 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              theme === "dark"
                ? "bg-gray-800 text-white border-gray-600"
                : "bg-white text-gray-900 border-gray-300"
            }`}
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
          >
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
        <div className="mb-4">
          <label
            className={`block mb-2 text-sm font-medium ${
              theme === "dark" ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Select Date Range
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* From Date Picker */}
            <div className="flex-1">
              <label
                className={`block mb-1 text-xs ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                From Date
              </label>
              <Popover
                open={fromCalendarOpen}
                onOpenChange={setFromCalendarOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      theme === "dark"
                        ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                        : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                    } ${!fromDate && "text-muted-foreground"}`}
                  >
                    <CalendarDays className="w-4 h-4 mr-2" />
                    {fromDate
                      ? format(fromDate, "MMM dd, yyyy")
                      : "Select from date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      setFromDate(date);
                      setFromCalendarOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date Picker */}
            <div className="flex-1">
              <label
                className={`block mb-1 text-xs ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                To Date
              </label>
              <Popover open={toCalendarOpen} onOpenChange={setToCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      theme === "dark"
                        ? "bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                        : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                    } ${!toDate && "text-muted-foreground"}`}
                  >
                    <CalendarDays className="w-4 h-4 mr-2" />
                    {toDate ? format(toDate, "MMM dd, yyyy") : "Select to date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => {
                      setToDate(date);
                      setToCalendarOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                    disabled={(date) => (fromDate ? date < fromDate : false)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <button
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              theme === "dark"
                ? "bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
            }`}
            onClick={onClose}
            disabled={exporting}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors"
            onClick={handleDownload}
            disabled={exporting}
          >
            {exporting ? "Exporting..." : "Download"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
