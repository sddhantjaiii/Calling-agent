import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Calendar, 
  Share, 
  BarChart3, 
  Settings,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react';
import ReportBuilder from './ReportBuilder';
import ReportScheduler from './ReportScheduler';
import ReportSharing from './ReportSharing';
import { ReportGenerator } from '../SystemAnalytics/ReportGenerator';

interface ReportsProps {
  defaultTab?: string;
}

interface ReportStats {
  totalReports: number;
  scheduledReports: number;
  sharedReports: number;
  reportsThisMonth: number;
}

export const Reports: React.FC<ReportsProps> = ({ defaultTab = 'builder' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  // Mock stats - in real implementation, these would come from API
  const stats: ReportStats = {
    totalReports: 47,
    scheduledReports: 12,
    sharedReports: 8,
    reportsThisMonth: 23
  };

  const handleReportCreated = (report: any) => {
    setSelectedReport(report);
    // Could switch to sharing tab or show success message
  };

  const handleScheduleCreated = (schedule: any) => {
    // Handle schedule creation
    console.log('Schedule created:', schedule);
  };

  const handleShareCreated = (share: any) => {
    // Handle share creation
    console.log('Share created:', share);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Create, schedule, and share comprehensive platform reports
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{stats.totalReports}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">{stats.scheduledReports}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Shared</p>
                <p className="text-2xl font-bold">{stats.sharedReports}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{stats.reportsThisMonth}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Report Builder
          </TabsTrigger>
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scheduler
          </TabsTrigger>
          <TabsTrigger value="sharing" className="flex items-center gap-2">
            <Share className="h-4 w-4" />
            Sharing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <ReportBuilder />
        </TabsContent>

        <TabsContent value="generator" className="space-y-6">
          <ReportGenerator 
            data={null} 
            filters={{
              dateRange: { start: new Date(), end: new Date() },
              userTier: 'all',
              agentType: 'all'
            }} 
          />
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-6">
          <ReportScheduler 
            reportConfig={selectedReport}
            onScheduleCreated={handleScheduleCreated}
          />
        </TabsContent>

        <TabsContent value="sharing" className="space-y-6">
          <ReportSharing 
            reportId={selectedReport?.id}
            reportName={selectedReport?.name}
            onShareCreated={handleShareCreated}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => setActiveTab('builder')}
            >
              <BarChart3 className="h-6 w-6 text-blue-600" />
              <div className="text-left">
                <div className="font-medium">Create Custom Report</div>
                <div className="text-sm text-muted-foreground">
                  Build a report with custom metrics and filters
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => setActiveTab('scheduler')}
            >
              <Calendar className="h-6 w-6 text-green-600" />
              <div className="text-left">
                <div className="font-medium">Schedule Report</div>
                <div className="text-sm text-muted-foreground">
                  Set up automated report delivery
                </div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => setActiveTab('generator')}
            >
              <Download className="h-6 w-6 text-purple-600" />
              <div className="text-left">
                <div className="font-medium">Quick Export</div>
                <div className="text-sm text-muted-foreground">
                  Generate report from predefined templates
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;