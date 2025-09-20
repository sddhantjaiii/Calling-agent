import { useState } from 'react';
import { Users, Play, Pause, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { adminApiService } from '../../../services/adminApiService';
import type { BulkAgentActionRequest, BulkAgentActionResponse } from '../../../types/admin';

interface BulkAgentActionsProps {
  agentIds: string[];
  open: boolean;
  onClose: () => void;
  onComplete: (results: BulkAgentActionResponse) => void;
}

export const BulkAgentActions: React.FC<BulkAgentActionsProps> = ({
  agentIds,
  open,
  onClose,
  onComplete
}) => {
  const [selectedAction, setSelectedAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<BulkAgentActionResponse | null>(null);
  const [progress, setProgress] = useState(0);

  // Handle action selection
  const handleActionSelect = (action: 'activate' | 'deactivate' | 'delete') => {
    setSelectedAction(action);
    setResults(null);
  };

  // Execute bulk action
  const executeBulkAction = async () => {
    if (!selectedAction) return;

    try {
      setProcessing(true);
      setProgress(0);

      const request: BulkAgentActionRequest = {
        agentIds,
        action: selectedAction
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await adminApiService.bulkAgentAction(request);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (response.success && response.data) {
        setResults(response.data);
      } else {
        throw new Error(response.error?.message || 'Bulk action failed');
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      setResults({
        successful: 0,
        failed: agentIds.map(id => ({
          agentId: id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle completion
  const handleComplete = () => {
    if (results) {
      onComplete(results);
    }
    onClose();
  };

  // Reset state when dialog closes
  const handleClose = () => {
    setSelectedAction(null);
    setResults(null);
    setProgress(0);
    setProcessing(false);
    onClose();
  };

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setSelectedAction(null);
      setResults(null);
      setProgress(0);
      setProcessing(false);
    }
  }, [open]);

  // Get action details
  const getActionDetails = (action: string) => {
    switch (action) {
      case 'activate':
        return {
          title: 'Activate Agents',
          description: 'Enable selected agents to receive calls',
          icon: Play,
          color: 'text-green-600',
          variant: 'success' as const
        };
      case 'deactivate':
        return {
          title: 'Deactivate Agents',
          description: 'Disable selected agents from receiving calls',
          icon: Pause,
          color: 'text-yellow-600',
          variant: 'warning' as const
        };
      case 'delete':
        return {
          title: 'Delete Agents',
          description: 'Permanently delete selected agents (cannot be undone)',
          icon: Trash2,
          color: 'text-red-600',
          variant: 'destructive' as const
        };
      default:
        return {
          title: 'Unknown Action',
          description: '',
          icon: Users,
          color: 'text-gray-600',
          variant: 'secondary' as const
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Agent Actions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Agent Count */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{agentIds.length}</div>
                <div className="text-muted-foreground">agents selected</div>
              </div>
            </CardContent>
          </Card>

          {!results && !processing && (
            <>
              {/* Action Selection */}
              <div className="space-y-3">
                <h3 className="font-medium">Select Action</h3>
                <div className="grid grid-cols-1 gap-3">
                  {(['activate', 'deactivate', 'delete'] as const).map((action) => {
                    const details = getActionDetails(action);
                    const IconComponent = details.icon;
                    
                    return (
                      <Card 
                        key={action}
                        className={`cursor-pointer transition-colors ${
                          selectedAction === action ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleActionSelect(action)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <IconComponent className={`w-5 h-5 ${details.color}`} />
                            <div className="flex-1">
                              <div className="font-medium">{details.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {details.description}
                              </div>
                            </div>
                            {selectedAction === action && (
                              <CheckCircle className="w-5 h-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Confirmation */}
              {selectedAction && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-yellow-800">
                          Confirm Action
                        </div>
                        <div className="text-sm text-yellow-700">
                          {selectedAction === 'delete' 
                            ? `This will permanently delete ${agentIds.length} agents. This action cannot be undone.`
                            : `This will ${selectedAction} ${agentIds.length} agents.`
                          }
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Processing */}
          {processing && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <LoadingSpinner size="lg" />
                  <div>
                    <div className="font-medium">Processing {selectedAction}...</div>
                    <div className="text-sm text-muted-foreground">
                      Please wait while we process {agentIds.length} agents
                    </div>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Action Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {results.successful}
                    </div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {results.failed.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>

                {results.failed.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-600">Failed Operations</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {results.failed.map((failure, index) => (
                        <div key={index} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                          <div className="font-medium">Agent ID: {failure.agentId}</div>
                          <div className="text-red-600">{failure.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              {results ? 'Close' : 'Cancel'}
            </Button>
            {!results && !processing && selectedAction && (
              <Button 
                onClick={executeBulkAction}
                variant={getActionDetails(selectedAction).variant}
              >
                Execute {getActionDetails(selectedAction).title}
              </Button>
            )}
            {results && (
              <Button onClick={handleComplete}>
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};