import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { AuditLogList } from './AuditLogList';
import { SecurityMonitoring } from './SecurityMonitoring';
import { Shield, FileText } from 'lucide-react';

interface AuditLogsProps {
  className?: string;
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('audit-logs');

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="audit-logs" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Audit Logs</span>
          </TabsTrigger>
          <TabsTrigger value="security-monitoring" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security Monitoring</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="audit-logs" className="mt-6">
          <AuditLogList />
        </TabsContent>
        
        <TabsContent value="security-monitoring" className="mt-6">
          <SecurityMonitoring />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuditLogs;

// Export individual components for direct use
export { AuditLogList } from './AuditLogList';
export { AuditLogDetails } from './AuditLogDetails';
export { AuditLogFilter } from './AuditLogFilter';
export { SecurityMonitoring } from './SecurityMonitoring';