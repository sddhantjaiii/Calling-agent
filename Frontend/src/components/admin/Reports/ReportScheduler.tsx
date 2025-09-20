import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Clock, 
  Mail, 
  Calendar, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/services/adminApiService';

interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  reportConfig: any;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    timezone: string;
  };
  recipients: string[];
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'active' | 'paused' | 'error' | 'completed';
  errorMessage?: string;
  createdAt: Date;
  createdBy: string;
}

interface ReportSchedulerProps {
  reportConfig?: any;
  onScheduleCreated?: (schedule: ScheduledReport) => void;
}

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' }
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export const ReportScheduler: React.FC<ReportSchedulerProps> = ({ 
  reportConfig, 
  onScheduleCreated 
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    description: '',
    frequency: 'weekly' as const,
    time: '09:00',
    dayOfWeek: 1,
    dayOfMonth: 1,
    timezone: 'UTC',
    recipients: [''],
    isActive: true
  });

  const loadScheduledReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const reports = await adminApiService.getScheduledReports();
      setScheduledReports(reports);
    } catch (error) {
      toast({
        title: "Load Failed",
        description: "Failed to load scheduled reports.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (activeTab === 'manage') {
      loadScheduledReports();
    }
  }, [activeTab, loadScheduledReports]);

  const addRecipient = useCallback(() => {
    setNewSchedule(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }));
  }, []);

  const updateRecipient = useCallback((index: number, email: string) => {
    setNewSchedule(prev => ({
      ...prev,
      recipients: prev.recipients.map((r, i) => i === index ? email : r)
    }));
  }, []);

  const removeRecipient = useCallback((index: number) => {
    setNewSchedule(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  }, []);

  const createSchedule = useCallback(async () => {
    if (!newSchedule.name || !reportConfig) {
      toast({
        title: "Configuration Required",
        description: "Please provide a schedule name and report configuration.",
        variant: "destructive"
      });
      return;
    }

    const validRecipients = newSchedule.recipients.filter(email => 
      email.trim() && email.includes('@')
    );

    if (validRecipients.length === 0) {
      toast({
        title: "Recipients Required",
        description: "Please provide at least one valid email recipient.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const schedule: Partial<ScheduledReport> = {
        name: newSchedule.name,
        description: newSchedule.description,
        reportConfig,
        schedule: {
          frequency: newSchedule.frequency,
          time: newSchedule.time,
          dayOfWeek: newSchedule.frequency === 'weekly' ? newSchedule.dayOfWeek : undefined,
          dayOfMonth: newSchedule.frequency === 'monthly' ? newSchedule.dayOfMonth : undefined,
          timezone: newSchedule.timezone
        },
        recipients: validRecipients,
        isActive: newSchedule.isActive
      };

      const created = await adminApiService.createScheduledReport(schedule);
      
      toast({
        title: "Schedule Created",
        description: `Report "${newSchedule.name}" has been scheduled successfully.`
      });

      // Reset form
      setNewSchedule({
        name: '',
        description: '',
        frequency: 'weekly',
        time: '09:00',
        dayOfWeek: 1,
        dayOfMonth: 1,
        timezone: 'UTC',
        recipients: [''],
        isActive: true
      });

      onScheduleCreated?.(created);
      
      // Refresh the list if we're on the manage tab
      if (activeTab === 'manage') {
        loadScheduledReports();
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create scheduled report.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [newSchedule, reportConfig, toast, onScheduleCreated, activeTab, loadScheduledReports]);

  const toggleScheduleStatus = useCallback(async (scheduleId: string, isActive: boolean) => {
    try {
      await adminApiService.updateScheduledReport(scheduleId, { isActive });
      setScheduledReports(prev => 
        prev.map(report => 
          report.id === scheduleId ? { ...report, isActive, status: isActive ? 'active' : 'paused' } : report
        )
      );
      
      toast({
        title: isActive ? "Schedule Activated" : "Schedule Paused",
        description: `Report schedule has been ${isActive ? 'activated' : 'paused'}.`
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update schedule status.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const deleteSchedule = useCallback(async (scheduleId: string) => {
    try {
      await adminApiService.deleteScheduledReport(scheduleId);
      setScheduledReports(prev => prev.filter(report => report.id !== scheduleId));
      
      toast({
        title: "Schedule Deleted",
        description: "Scheduled report has been deleted."
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete scheduled report.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const runScheduleNow = useCallback(async (scheduleId: string) => {
    try {
      await adminApiService.runScheduledReport(scheduleId);
      
      toast({
        title: "Report Triggered",
        description: "Report generation has been triggered manually."
      });
    } catch (error) {
      toast({
        title: "Trigger Failed",
        description: "Failed to trigger report generation.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const getStatusIcon = (status: ScheduledReport['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getFrequencyDescription = (schedule: ScheduledReport['schedule']) => {
    const { frequency, time, dayOfWeek, dayOfMonth, timezone } = schedule;
    
    let description = `${frequency} at ${time}`;
    
    if (frequency === 'weekly' && dayOfWeek !== undefined) {
      const day = DAYS_OF_WEEK.find(d => d.value === dayOfWeek);
      description += ` on ${day?.label}s`;
    } else if (frequency === 'monthly' && dayOfMonth) {
      description += ` on the ${dayOfMonth}${getOrdinalSuffix(dayOfMonth)}`;
    }
    
    description += ` (${timezone})`;
    return description;
  };

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Scheduler</h2>
          <p className="text-muted-foreground">
            Schedule automated report generation and delivery
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'create' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('create')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Schedule
        </Button>
        <Button
          variant={activeTab === 'manage' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('manage')}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Manage Schedules
        </Button>
      </div>

      {/* Create Schedule Tab */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-name">Schedule Name</Label>
                <Input
                  id="schedule-name"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter schedule name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-description">Description</Label>
                <Textarea
                  id="schedule-description"
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter schedule description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={newSchedule.frequency}
                    onValueChange={(frequency: any) => setNewSchedule(prev => ({ ...prev, frequency }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newSchedule.time}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>

              {newSchedule.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={newSchedule.dayOfWeek.toString()}
                    onValueChange={(day) => setNewSchedule(prev => ({ ...prev, dayOfWeek: parseInt(day) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newSchedule.frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={newSchedule.dayOfMonth}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={newSchedule.timezone}
                  onValueChange={(timezone) => setNewSchedule(prev => ({ ...prev, timezone }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active-schedule"
                  checked={newSchedule.isActive}
                  onCheckedChange={(isActive) => setNewSchedule(prev => ({ ...prev, isActive }))}
                />
                <Label htmlFor="active-schedule">Activate schedule immediately</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Recipients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {newSchedule.recipients.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateRecipient(index, e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1"
                  />
                  {newSchedule.recipients.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeRecipient(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <Button variant="outline" onClick={addRecipient} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Recipient
              </Button>

              <Separator />

              <Button 
                onClick={createSchedule} 
                disabled={isLoading || !newSchedule.name}
                className="w-full"
              >
                <Clock className="h-4 w-4 mr-2" />
                Create Schedule
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manage Schedules Tab */}
      {activeTab === 'manage' && (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {scheduledReports.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No scheduled reports</h3>
                <p className="text-muted-foreground">
                  Create your first scheduled report to automate report delivery
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(report.status)}
                          <h4 className="font-medium">{report.name}</h4>
                          <Badge variant={report.isActive ? 'default' : 'secondary'}>
                            {report.isActive ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {report.description}
                        </p>
                        
                        <div className="text-sm space-y-1">
                          <div>
                            <strong>Schedule:</strong> {getFrequencyDescription(report.schedule)}
                          </div>
                          <div>
                            <strong>Recipients:</strong> {report.recipients.join(', ')}
                          </div>
                          {report.lastRun && (
                            <div>
                              <strong>Last Run:</strong> {report.lastRun.toLocaleString()}
                            </div>
                          )}
                          {report.nextRun && (
                            <div>
                              <strong>Next Run:</strong> {report.nextRun.toLocaleString()}
                            </div>
                          )}
                        </div>

                        {report.errorMessage && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <strong>Error:</strong> {report.errorMessage}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleScheduleStatus(report.id, !report.isActive)}
                        >
                          {report.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runScheduleNow(report.id)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSchedule(report.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
export default ReportScheduler;