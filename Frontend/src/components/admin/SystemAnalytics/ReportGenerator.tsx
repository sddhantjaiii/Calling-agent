import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Download,
    FileText,
    Calendar,
    Filter,
    Settings,
    Eye,
    Save,
    Clock,
    Mail
} from 'lucide-react';
import { AnalyticsFilters } from './AnalyticsDashboard';
import LoadingSpinner from '@/components/ui/LoadingStates';

interface ReportGeneratorProps {
    data: any;
    filters: AnalyticsFilters;
}

interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    metrics: string[];
    format: 'pdf' | 'csv' | 'excel';
    schedule?: 'daily' | 'weekly' | 'monthly';
}

interface CustomReport {
    name: string;
    description: string;
    metrics: string[];
    filters: AnalyticsFilters;
    format: 'pdf' | 'csv' | 'excel';
    includeCharts: boolean;
    schedule?: 'daily' | 'weekly' | 'monthly';
    recipients?: string[];
}

const AVAILABLE_METRICS = [
    { id: 'users_total', label: 'Total Users', category: 'Users' },
    { id: 'users_active', label: 'Active Users', category: 'Users' },
    { id: 'users_new', label: 'New Users', category: 'Users' },
    { id: 'users_by_tier', label: 'Users by Tier', category: 'Users' },
    { id: 'agents_total', label: 'Total Agents', category: 'Agents' },
    { id: 'agents_active', label: 'Active Agents', category: 'Agents' },
    { id: 'agents_by_type', label: 'Agents by Type', category: 'Agents' },
    { id: 'agents_performance', label: 'Agent Performance', category: 'Agents' },
    { id: 'calls_total', label: 'Total Calls', category: 'Calls' },
    { id: 'calls_success_rate', label: 'Call Success Rate', category: 'Calls' },
    { id: 'calls_duration', label: 'Average Call Duration', category: 'Calls' },
    { id: 'calls_by_hour', label: 'Calls by Hour', category: 'Calls' },
    { id: 'revenue_total', label: 'Total Revenue', category: 'Revenue' },
    { id: 'revenue_monthly', label: 'Monthly Revenue', category: 'Revenue' },
    { id: 'revenue_by_tier', label: 'Revenue by Tier', category: 'Revenue' },
    { id: 'system_uptime', label: 'System Uptime', category: 'System' },
    { id: 'system_response_time', label: 'Response Time', category: 'System' },
    { id: 'system_error_rate', label: 'Error Rate', category: 'System' }
];

const REPORT_TEMPLATES: ReportTemplate[] = [
    {
        id: 'executive_summary',
        name: 'Executive Summary',
        description: 'High-level overview of platform performance',
        metrics: ['users_total', 'agents_total', 'calls_total', 'revenue_total', 'system_uptime'],
        format: 'pdf'
    },
    {
        id: 'user_analytics',
        name: 'User Analytics Report',
        description: 'Detailed user behavior and growth analysis',
        metrics: ['users_total', 'users_active', 'users_new', 'users_by_tier'],
        format: 'excel'
    },
    {
        id: 'agent_performance',
        name: 'Agent Performance Report',
        description: 'Comprehensive agent performance metrics',
        metrics: ['agents_total', 'agents_active', 'agents_by_type', 'agents_performance'],
        format: 'pdf'
    },
    {
        id: 'financial_report',
        name: 'Financial Report',
        description: 'Revenue and billing analytics',
        metrics: ['revenue_total', 'revenue_monthly', 'revenue_by_tier', 'users_by_tier'],
        format: 'excel'
    },
    {
        id: 'system_health',
        name: 'System Health Report',
        description: 'Technical performance and system metrics',
        metrics: ['system_uptime', 'system_response_time', 'system_error_rate', 'calls_success_rate'],
        format: 'pdf'
    }
];

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ data, filters }) => {
    const [activeTab, setActiveTab] = useState<'templates' | 'custom' | 'scheduled'>('templates');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [customReport, setCustomReport] = useState<CustomReport>({
        name: '',
        description: '',
        metrics: [],
        filters,
        format: 'pdf',
        includeCharts: true,
        recipients: []
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedReports, setGeneratedReports] = useState<any[]>([]);

    const handleGenerateTemplate = async (templateId: string) => {
        setIsGenerating(true);
        const template = REPORT_TEMPLATES.find(t => t.id === templateId);

        try {
            // Simulate report generation
            await new Promise(resolve => setTimeout(resolve, 2000));

            const newReport = {
                id: Date.now().toString(),
                name: template?.name || 'Report',
                format: template?.format || 'pdf',
                generatedAt: new Date(),
                size: '2.3 MB',
                downloadUrl: '#'
            };

            setGeneratedReports(prev => [newReport, ...prev]);
        } catch (error) {
            console.error('Failed to generate report:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateCustomReport = async () => {
        if (!customReport.name || customReport.metrics.length === 0) {
            return;
        }

        setIsGenerating(true);

        try {
            // Simulate report generation
            await new Promise(resolve => setTimeout(resolve, 2000));

            const newReport = {
                id: Date.now().toString(),
                name: customReport.name,
                format: customReport.format,
                generatedAt: new Date(),
                size: '1.8 MB',
                downloadUrl: '#'
            };

            setGeneratedReports(prev => [newReport, ...prev]);

            // Reset form
            setCustomReport({
                name: '',
                description: '',
                metrics: [],
                filters,
                format: 'pdf',
                includeCharts: true,
                recipients: []
            });
        } catch (error) {
            console.error('Failed to generate custom report:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleMetricToggle = (metricId: string, checked: boolean) => {
        setCustomReport(prev => ({
            ...prev,
            metrics: checked
                ? [...prev.metrics, metricId]
                : prev.metrics.filter(m => m !== metricId)
        }));
    };

    const getMetricsByCategory = () => {
        const categories: Record<string, typeof AVAILABLE_METRICS> = {};
        AVAILABLE_METRICS.forEach(metric => {
            if (!categories[metric.category]) {
                categories[metric.category] = [];
            }
            categories[metric.category].push(metric);
        });
        return categories;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Report Generator</h2>
                    <p className="text-muted-foreground">
                        Create custom reports and export platform analytics
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
                <Button
                    variant={activeTab === 'templates' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('templates')}
                >
                    Templates
                </Button>
                <Button
                    variant={activeTab === 'custom' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('custom')}
                >
                    Custom Report
                </Button>
                <Button
                    variant={activeTab === 'scheduled' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('scheduled')}
                >
                    Generated Reports
                </Button>
            </div>

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {REPORT_TEMPLATES.map((template) => (
                        <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    {template.name}
                                    <Badge variant="outline">{template.format.toUpperCase()}</Badge>
                                </CardTitle>
                                <CardDescription>{template.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-sm font-medium">Includes:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {template.metrics.slice(0, 3).map((metricId) => {
                                                const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                                                return (
                                                    <Badge key={metricId} variant="secondary" className="text-xs">
                                                        {metric?.label}
                                                    </Badge>
                                                );
                                            })}
                                            {template.metrics.length > 3 && (
                                                <Badge variant="secondary" className="text-xs">
                                                    +{template.metrics.length - 3} more
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={() => handleGenerateTemplate(template.id)}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <LoadingSpinner size="sm" className="mr-2" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4 mr-2" />
                                                Generate Report
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Custom Report Tab */}
            {activeTab === 'custom' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Report Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Report Configuration</CardTitle>
                            <CardDescription>
                                Configure your custom report settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="report-name">Report Name</Label>
                                <Input
                                    id="report-name"
                                    value={customReport.name}
                                    onChange={(e) => setCustomReport(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter report name"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="report-description">Description</Label>
                                <Textarea
                                    id="report-description"
                                    value={customReport.description}
                                    onChange={(e) => setCustomReport(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Enter report description"
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Export Format</Label>
                                <Select
                                    value={customReport.format}
                                    onValueChange={(value: any) => setCustomReport(prev => ({ ...prev, format: value }))}
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

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="include-charts"
                                    checked={customReport.includeCharts}
                                    onCheckedChange={(checked) =>
                                        setCustomReport(prev => ({ ...prev, includeCharts: !!checked }))
                                    }
                                />
                                <Label htmlFor="include-charts">Include charts and visualizations</Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Metric Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Metrics</CardTitle>
                            <CardDescription>
                                Choose which metrics to include in your report
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {Object.entries(getMetricsByCategory()).map(([category, metrics]) => (
                                    <div key={category}>
                                        <h4 className="font-medium mb-2">{category}</h4>
                                        <div className="space-y-2 pl-4">
                                            {metrics.map((metric) => (
                                                <div key={metric.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={metric.id}
                                                        checked={customReport.metrics.includes(metric.id)}
                                                        onCheckedChange={(checked) => handleMetricToggle(metric.id, !!checked)}
                                                    />
                                                    <Label htmlFor={metric.id} className="text-sm">
                                                        {metric.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-4 border-t">
                                <Button
                                    className="w-full"
                                    onClick={handleGenerateCustomReport}
                                    disabled={isGenerating || !customReport.name || customReport.metrics.length === 0}
                                >
                                    {isGenerating ? (
                                        <>
                                            <LoadingSpinner size="sm" className="mr-2" />
                                            Generating Report...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="h-4 w-4 mr-2" />
                                            Generate Custom Report
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Generated Reports Tab */}
            {activeTab === 'scheduled' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Generated Reports</CardTitle>
                        <CardDescription>
                            Download and manage your generated reports
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {generatedReports.length === 0 ? (
                            <div className="text-center py-8">
                                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium mb-2">No reports generated yet</h3>
                                <p className="text-muted-foreground">
                                    Generate your first report using templates or custom configuration
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {generatedReports.map((report) => (
                                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-8 w-8 text-blue-600" />
                                            <div>
                                                <h4 className="font-medium">{report.name}</h4>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {report.generatedAt.toLocaleString()}
                                                    <span>•</span>
                                                    <span>{report.size}</span>
                                                    <Badge variant="outline">{report.format.toUpperCase()}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm">
                                                <Eye className="h-4 w-4 mr-2" />
                                                Preview
                                            </Button>
                                            <Button size="sm">
                                                <Download className="h-4 w-4 mr-2" />
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};