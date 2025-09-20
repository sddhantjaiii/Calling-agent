import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Save, Share, Clock, Filter, FileText, BarChart3, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/services/adminApiService';

interface ReportFilter {
    id: string;
    type: 'date' | 'select' | 'multiselect' | 'number' | 'text';
    label: string;
    value: any;
    options?: { label: string; value: string }[];
    min?: number;
    max?: number;
}

interface ReportConfig {
    id?: string;
    name: string;
    description: string;
    dataSource: string;
    metrics: string[];
    filters: ReportFilter[];
    groupBy?: string[];
    sortBy?: { field: string; direction: 'asc' | 'desc' }[];
    format: 'pdf' | 'csv' | 'excel';
    includeCharts: boolean;
    includeRawData: boolean;
    schedule?: {
        enabled: boolean;
        frequency: 'daily' | 'weekly' | 'monthly';
        time: string;
        recipients: string[];
    };
}

interface DataVisualization {
    id: string;
    type: 'chart' | 'table' | 'kpi';
    title: string;
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    data: any[];
    config: any;
}

const DATA_SOURCES = [
    { value: 'users', label: 'Users', description: 'User registration, activity, and profile data' },
    { value: 'agents', label: 'Agents', description: 'Agent performance and configuration data' },
    { value: 'calls', label: 'Calls', description: 'Call logs, analytics, and performance metrics' },
    { value: 'billing', label: 'Billing', description: 'Revenue, payments, and subscription data' },
    { value: 'system', label: 'System', description: 'System performance and health metrics' },
    { value: 'audit', label: 'Audit Logs', description: 'Admin actions and security events' }
];

const AVAILABLE_METRICS = {
    users: [
        { id: 'total_users', label: 'Total Users' },
        { id: 'active_users', label: 'Active Users' },
        { id: 'new_registrations', label: 'New Registrations' },
        { id: 'user_retention', label: 'User Retention Rate' },
        { id: 'users_by_tier', label: 'Users by Subscription Tier' }
    ],
    agents: [
        { id: 'total_agents', label: 'Total Agents' },
        { id: 'active_agents', label: 'Active Agents' },
        { id: 'agent_performance', label: 'Agent Performance Scores' },
        { id: 'agents_by_type', label: 'Agents by Type' },
        { id: 'agent_utilization', label: 'Agent Utilization Rate' }
    ],
    calls: [
        { id: 'total_calls', label: 'Total Calls' },
        { id: 'call_success_rate', label: 'Call Success Rate' },
        { id: 'average_duration', label: 'Average Call Duration' },
        { id: 'calls_by_hour', label: 'Calls by Hour' },
        { id: 'call_costs', label: 'Call Costs' }
    ],
    billing: [
        { id: 'total_revenue', label: 'Total Revenue' },
        { id: 'monthly_revenue', label: 'Monthly Revenue' },
        { id: 'revenue_by_tier', label: 'Revenue by Tier' },
        { id: 'payment_methods', label: 'Payment Methods' },
        { id: 'churn_rate', label: 'Churn Rate' }
    ],
    system: [
        { id: 'system_uptime', label: 'System Uptime' },
        { id: 'response_times', label: 'API Response Times' },
        { id: 'error_rates', label: 'Error Rates' },
        { id: 'resource_usage', label: 'Resource Usage' },
        { id: 'concurrent_users', label: 'Concurrent Users' }
    ],
    audit: [
        { id: 'admin_actions', label: 'Admin Actions' },
        { id: 'login_attempts', label: 'Login Attempts' },
        { id: 'security_events', label: 'Security Events' },
        { id: 'data_access', label: 'Data Access Logs' },
        { id: 'system_changes', label: 'System Changes' }
    ]
};

export const ReportBuilder: React.FC = () => {
    const { toast } = useToast();
    const [reportConfig, setReportConfig] = useState<ReportConfig>({
        name: '',
        description: '',
        dataSource: '',
        metrics: [],
        filters: [],
        format: 'pdf',
        includeCharts: true,
        includeRawData: false
    });
    const [visualizations, setVisualizations] = useState<DataVisualization[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    const handleDataSourceChange = useCallback((dataSource: string) => {
        setReportConfig(prev => ({
            ...prev,
            dataSource,
            metrics: [], // Reset metrics when data source changes
            filters: [] // Reset filters when data source changes
        }));
    }, []);

    const handleMetricToggle = useCallback((metricId: string, checked: boolean) => {
        setReportConfig(prev => ({
            ...prev,
            metrics: checked
                ? [...prev.metrics, metricId]
                : prev.metrics.filter(m => m !== metricId)
        }));
    }, []);

    const addFilter = useCallback(() => {
        const newFilter: ReportFilter = {
            id: `filter_${Date.now()}`,
            type: 'text',
            label: 'New Filter',
            value: ''
        };
        setReportConfig(prev => ({
            ...prev,
            filters: [...prev.filters, newFilter]
        }));
    }, []);

    const updateFilter = useCallback((filterId: string, updates: Partial<ReportFilter>) => {
        setReportConfig(prev => ({
            ...prev,
            filters: prev.filters.map(filter =>
                filter.id === filterId ? { ...filter, ...updates } : filter
            )
        }));
    }, []);

    const removeFilter = useCallback((filterId: string) => {
        setReportConfig(prev => ({
            ...prev,
            filters: prev.filters.filter(filter => filter.id !== filterId)
        }));
    }, []);

    const generatePreview = useCallback(async () => {
        if (!reportConfig.dataSource || reportConfig.metrics.length === 0) {
            toast({
                title: "Configuration Required",
                description: "Please select a data source and at least one metric.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);
        try {
            const preview = await adminApiService.generateReportPreview(reportConfig);
            setPreviewData(preview);

            // Generate visualizations based on metrics
            const newVisualizations: DataVisualization[] = reportConfig.metrics.map((metricId, index) => ({
                id: `viz_${index}`,
                type: 'chart',
                title: AVAILABLE_METRICS[reportConfig.dataSource as keyof typeof AVAILABLE_METRICS]
                    ?.find(m => m.id === metricId)?.label || metricId,
                chartType: index % 2 === 0 ? 'line' : 'bar',
                data: preview.data[metricId] || [],
                config: {}
            }));

            setVisualizations(newVisualizations);

            toast({
                title: "Preview Generated",
                description: "Report preview has been generated successfully."
            });
        } catch (error) {
            toast({
                title: "Preview Failed",
                description: "Failed to generate report preview. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    }, [reportConfig, toast]);

    const generateReport = useCallback(async () => {
        if (!reportConfig.name || !reportConfig.dataSource || reportConfig.metrics.length === 0) {
            toast({
                title: "Configuration Required",
                description: "Please provide a report name, data source, and at least one metric.",
                variant: "destructive"
            });
            return;
        }

        setIsGenerating(true);
        try {
            const result = await adminApiService.generateReport(reportConfig);

            // Trigger download
            const link = document.createElement('a');
            link.href = result.downloadUrl;
            link.download = `${reportConfig.name}.${reportConfig.format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
                title: "Report Generated",
                description: `Report "${reportConfig.name}" has been generated and downloaded.`
            });
        } catch (error) {
            toast({
                title: "Generation Failed",
                description: "Failed to generate report. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(false);
        }
    }, [reportConfig, toast]);

    const saveReportTemplate = useCallback(async () => {
        if (!reportConfig.name) {
            toast({
                title: "Name Required",
                description: "Please provide a name for the report template.",
                variant: "destructive"
            });
            return;
        }

        try {
            await adminApiService.saveReportTemplate(reportConfig);
            toast({
                title: "Template Saved",
                description: `Report template "${reportConfig.name}" has been saved.`
            });
        } catch (error) {
            toast({
                title: "Save Failed",
                description: "Failed to save report template. Please try again.",
                variant: "destructive"
            });
        }
    }, [reportConfig, toast]);

    const availableMetrics = reportConfig.dataSource
        ? AVAILABLE_METRICS[reportConfig.dataSource as keyof typeof AVAILABLE_METRICS] || []
        : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Report Builder</h2>
                    <p className="text-muted-foreground">
                        Create custom reports with advanced filtering and visualization
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={saveReportTemplate}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Template
                    </Button>
                    <Button variant="outline" onClick={generatePreview} disabled={isGenerating}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Preview
                    </Button>
                    <Button onClick={generateReport} disabled={isGenerating}>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Report
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="report-name">Report Name</Label>
                                    <Input
                                        id="report-name"
                                        value={reportConfig.name}
                                        onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Enter report name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="data-source">Data Source</Label>
                                    <Select value={reportConfig.dataSource} onValueChange={handleDataSourceChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select data source" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DATA_SOURCES.map((source) => (
                                                <SelectItem key={source.value} value={source.value}>
                                                    <div>
                                                        <div className="font-medium">{source.label}</div>
                                                        <div className="text-xs text-muted-foreground">{source.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    value={reportConfig.description}
                                    onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Enter report description"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Metrics Selection */}
                    {reportConfig.dataSource && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Metrics Selection</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {availableMetrics.map((metric) => (
                                        <div key={metric.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={metric.id}
                                                checked={reportConfig.metrics.includes(metric.id)}
                                                onCheckedChange={(checked) => handleMetricToggle(metric.id, !!checked)}
                                            />
                                            <Label htmlFor={metric.id} className="text-sm">
                                                {metric.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Filters */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                Filters
                                <Button variant="outline" size="sm" onClick={addFilter}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Filter
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {reportConfig.filters.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">
                                    No filters added. Click "Add Filter" to create custom filters.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {reportConfig.filters.map((filter) => (
                                        <div key={filter.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <Input
                                                    value={filter.label}
                                                    onChange={(e) => updateFilter(filter.id, { label: e.target.value })}
                                                    placeholder="Filter label"
                                                />
                                                <Select
                                                    value={filter.type}
                                                    onValueChange={(type: any) => updateFilter(filter.id, { type })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="text">Text</SelectItem>
                                                        <SelectItem value="number">Number</SelectItem>
                                                        <SelectItem value="date">Date</SelectItem>
                                                        <SelectItem value="select">Select</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    value={filter.value}
                                                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                                    placeholder="Filter value"
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeFilter(filter.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Export Options */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Export Options</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Export Format</Label>
                                    <Select
                                        value={reportConfig.format}
                                        onValueChange={(format: any) => setReportConfig(prev => ({ ...prev, format }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                            <SelectItem value="csv">CSV</SelectItem>
                                            <SelectItem value="excel">Excel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="include-charts"
                                        checked={reportConfig.includeCharts}
                                        onCheckedChange={(checked) =>
                                            setReportConfig(prev => ({ ...prev, includeCharts: !!checked }))
                                        }
                                    />
                                    <Label htmlFor="include-charts">Include charts and visualizations</Label>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="include-raw-data"
                                        checked={reportConfig.includeRawData}
                                        onCheckedChange={(checked) =>
                                            setReportConfig(prev => ({ ...prev, includeRawData: !!checked }))
                                        }
                                    />
                                    <Label htmlFor="include-raw-data">Include raw data tables</Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview Panel */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Report Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!previewData ? (
                                <div className="text-center py-8">
                                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">
                                        Configure your report and click "Preview" to see a sample
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-sm">
                                        <div className="font-medium">Data Source:</div>
                                        <div className="text-muted-foreground">{reportConfig.dataSource}</div>
                                    </div>

                                    <div className="text-sm">
                                        <div className="font-medium">Metrics ({reportConfig.metrics.length}):</div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {reportConfig.metrics.slice(0, 3).map((metricId) => (
                                                <Badge key={metricId} variant="secondary" className="text-xs">
                                                    {availableMetrics.find(m => m.id === metricId)?.label || metricId}
                                                </Badge>
                                            ))}
                                            {reportConfig.metrics.length > 3 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    +{reportConfig.metrics.length - 3} more
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {reportConfig.filters.length > 0 && (
                                        <div className="text-sm">
                                            <div className="font-medium">Filters ({reportConfig.filters.length}):</div>
                                            <div className="text-muted-foreground">
                                                {reportConfig.filters.map(f => f.label).join(', ')}
                                            </div>
                                        </div>
                                    )}

                                    <Separator />

                                    <div className="text-sm">
                                        <div className="font-medium">Sample Data Points:</div>
                                        <div className="text-muted-foreground">{previewData.totalRows || 0} rows</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-start">
                                <Clock className="h-4 w-4 mr-2" />
                                Schedule Report
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                                <Share className="h-4 w-4 mr-2" />
                                Share Configuration
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                                <Filter className="h-4 w-4 mr-2" />
                                Load Template
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
export default ReportBuilder;