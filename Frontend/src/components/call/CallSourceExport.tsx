import React, { useState } from 'react';
import { Download, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useToast } from '@/components/ui/use-toast';
import { apiService } from '@/services/apiService';

interface CallSourceExportProps {
  dateFrom?: string;
  dateTo?: string;
  callSource?: string;
}

interface ExportData {
  call_source: string;
  metrics: {
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    cancelled_calls: number;
    avg_duration: number;
    total_credits_used: number;
    leads_generated: number;
    hot_leads: number;
    demos_scheduled: number;
    success_rate: number;
    conversion_rate: number;
    cost_per_lead: number;
  };
  changes: {
    calls_change: number;
    calls_change_percent: number;
    success_change: number;
    leads_change: number;
    leads_change_percent: number;
  };
}

const CallSourceExport: React.FC<CallSourceExportProps> = ({
  dateFrom,
  dateTo,
  callSource,
}) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Fetch call source analytics data
      const response = await apiService.getCallSourceAnalytics({
        dateFrom,
        dateTo,
        ...(callSource && { callSource }),
      });

      const data = response.data?.source_analytics || [];

      if (data.length === 0) {
        toast({
          title: 'No Data Available',
          description: 'No call source data found for the selected period.',
          variant: 'destructive',
        });
        return;
      }

      switch (exportFormat) {
        case 'csv':
          exportToCSV(data);
          break;
        case 'json':
          exportToJSON(data);
          break;
        case 'pdf':
          exportToPDF(data);
          break;
      }

      toast({
        title: 'Export Successful',
        description: `Call source analytics exported as ${exportFormat.toUpperCase()}`,
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export call source analytics. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = (data: ExportData[]) => {
    const headers = [
      'Call Source',
      'Total Calls',
      'Successful Calls',
      'Failed Calls',
      'Cancelled Calls',
      'Success Rate (%)',
      'Avg Duration (min)',
      'Leads Generated',
      'Hot Leads',
      'Demos Scheduled',
      'Conversion Rate (%)',
      'Total Credits Used',
      'Cost per Lead',
      'Calls Change',
      'Calls Change (%)',
      'Leads Change',
      'Leads Change (%)',
    ];

    const csvContent = [
      headers.join(','),
      ...data.map((item) =>
        [
          item.call_source,
          item.metrics.total_calls,
          item.metrics.successful_calls,
          item.metrics.failed_calls,
          item.metrics.cancelled_calls,
          item.metrics.success_rate.toFixed(1),
          item.metrics.avg_duration.toFixed(2),
          item.metrics.leads_generated,
          item.metrics.hot_leads,
          item.metrics.demos_scheduled,
          item.metrics.conversion_rate.toFixed(1),
          item.metrics.total_credits_used,
          item.metrics.cost_per_lead.toFixed(2),
          item.changes.calls_change,
          item.changes.calls_change_percent.toFixed(1),
          item.changes.leads_change,
          item.changes.leads_change_percent.toFixed(1),
        ].join(',')
      ),
    ].join('\n');

    downloadFile(csvContent, 'call-source-analytics.csv', 'text/csv');
  };

  const exportToJSON = (data: ExportData[]) => {
    const jsonContent = JSON.stringify(
      {
        export_date: new Date().toISOString(),
        period: { from: dateFrom, to: dateTo },
        call_source_filter: callSource || 'all',
        data,
      },
      null,
      2
    );

    downloadFile(jsonContent, 'call-source-analytics.json', 'application/json');
  };

  const exportToPDF = (data: ExportData[]) => {
    // For PDF export, we'll create a simple HTML structure that can be printed
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Call Source Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1A6262; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .metric { font-weight: bold; }
            .positive { color: green; }
            .negative { color: red; }
          </style>
        </head>
        <body>
          <h1>Call Source Analytics Report</h1>
          <p><strong>Period:</strong> ${dateFrom} to ${dateTo}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          
          <table>
            <thead>
              <tr>
                <th>Call Source</th>
                <th>Total Calls</th>
                <th>Success Rate</th>
                <th>Avg Duration</th>
                <th>Leads Generated</th>
                <th>Conversion Rate</th>
                <th>Cost per Lead</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (item) => `
                <tr>
                  <td class="metric">${item.call_source}</td>
                  <td>${item.metrics.total_calls}</td>
                  <td>${item.metrics.success_rate.toFixed(1)}%</td>
                  <td>${item.metrics.avg_duration.toFixed(2)} min</td>
                  <td>${item.metrics.leads_generated}</td>
                  <td>${item.metrics.conversion_rate.toFixed(1)}%</td>
                  <td>$${item.metrics.cost_per_lead.toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    downloadFile(htmlContent, 'call-source-analytics.html', 'text/html');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            theme === "dark"
              ? "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          }
        >
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Call Source Analytics
          </DialogTitle>
          <DialogDescription>
            Export your call source performance data in your preferred format.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportFormat} onValueChange={(value: 'csv' | 'json' | 'pdf') => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Excel Compatible)</SelectItem>
                <SelectItem value="json">JSON (Developer Friendly)</SelectItem>
                <SelectItem value="pdf">HTML (Print/PDF Ready)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Export Details</label>
            <div className={`p-3 rounded border ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Period: {dateFrom} to {dateTo}</span>
              </div>
              {callSource && (
                <div className="text-sm mt-1">
                  <span>Filter: {callSource} calls only</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-[#1A6262] hover:bg-[#1A6262]/90 text-white"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallSourceExport;