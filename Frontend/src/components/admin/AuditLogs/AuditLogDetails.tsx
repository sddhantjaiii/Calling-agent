import React from 'react';
import { format } from 'date-fns';
import { X, User, Globe, Monitor, AlertTriangle, CheckCircle, XCircle, Copy } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Separator } from '../../ui/separator';
import { useToast } from '../../../hooks/use-toast';
import type { AuditLogEntry } from '../../../types/admin';

interface AuditLogDetailsProps {
  log: AuditLogEntry;
  onClose: () => void;
}

export const AuditLogDetails: React.FC<AuditLogDetailsProps> = ({ log, onClose }) => {
  const { toast } = useToast();

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied',
        description: `${label} copied to clipboard`,
      });
    }).catch(() => {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    });
  };

  // Get status badge
  const getStatusBadge = (success: boolean) => {
    if (success) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-4 h-4 mr-2" />
          Success
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="w-4 h-4 mr-2" />
          Failed
        </Badge>
      );
    }
  };

  // Get action badge color
  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      'user.create': 'bg-blue-100 text-blue-800 border-blue-200',
      'user.update': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'user.delete': 'bg-red-100 text-red-800 border-red-200',
      'agent.create': 'bg-green-100 text-green-800 border-green-200',
      'agent.update': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'agent.delete': 'bg-red-100 text-red-800 border-red-200',
      'system.config': 'bg-purple-100 text-purple-800 border-purple-200',
      'auth.login': 'bg-gray-100 text-gray-800 border-gray-200',
      'auth.logout': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    const colorClass = actionColors[action] || 'bg-gray-100 text-gray-800 border-gray-200';
    
    return (
      <Badge variant="outline" className={colorClass}>
        {action}
      </Badge>
    );
  };

  // Format details object
  const formatDetails = (details: Record<string, unknown>) => {
    return Object.entries(details).map(([key, value]) => (
      <div key={key} className="flex justify-between items-start py-2">
        <span className="font-medium text-sm text-gray-600 capitalize">
          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
        </span>
        <div className="text-sm text-right max-w-xs">
          {typeof value === 'object' && value !== null ? (
            <pre className="text-xs bg-gray-50 p-2 rounded border overflow-x-auto">
              {JSON.stringify(value, null, 2)}
            </pre>
          ) : (
            <span className="break-words">{String(value)}</span>
          )}
        </div>
      </div>
    ));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Audit Log Details</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  {getActionBadge(log.action)}
                  <span className="text-lg">{log.action}</span>
                </span>
                {getStatusBadge(log.success)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Log ID</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">
                      {log.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(log.id, 'Log ID')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Timestamp</label>
                  <div className="text-sm">
                    <div>{format(new Date(log.timestamp), 'MMMM dd, yyyy')}</div>
                    <div className="text-gray-500">
                      {format(new Date(log.timestamp), 'HH:mm:ss.SSS')} UTC
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Admin User</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{log.adminUserEmail}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(log.adminUserEmail, 'Admin email')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">User ID</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">
                      {log.adminUserId}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(log.adminUserId, 'Admin user ID')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource Information */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Resource Type</label>
                  <div className="text-sm">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {log.resourceType}
                    </Badge>
                  </div>
                </div>
                {log.resourceId && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Resource ID</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">
                        {log.resourceId}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(log.resourceId!, 'Resource ID')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Target User Information */}
              {(log.targetUserId || log.targetUserEmail) && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Target User</label>
                    <div className="grid grid-cols-2 gap-4">
                      {log.targetUserEmail && (
                        <div>
                          <label className="text-xs text-gray-500">Email</label>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{log.targetUserEmail}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(log.targetUserEmail!, 'Target user email')}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {log.targetUserId && (
                        <div>
                          <label className="text-xs text-gray-500">User ID</label>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">
                              {log.targetUserId}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(log.targetUserId!, 'Target user ID')}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Technical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <span>Technical Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">IP Address</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">
                      {log.ipAddress}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(log.ipAddress, 'IP address')}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Success</label>
                  <div>{getStatusBadge(log.success)}</div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">User Agent</label>
                <div className="text-sm bg-gray-50 p-2 rounded border break-all">
                  {log.userAgent}
                </div>
              </div>

              {/* Error Message */}
              {!log.success && log.errorMessage && (
                <div>
                  <label className="text-sm font-medium text-red-600 flex items-center space-x-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Error Message</span>
                  </label>
                  <div className="text-sm bg-red-50 border border-red-200 p-3 rounded text-red-800">
                    {log.errorMessage}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Details */}
          {Object.keys(log.details).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Action Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {formatDetails(log.details)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuditLogDetails;