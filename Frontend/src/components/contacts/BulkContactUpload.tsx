import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { useToast } from '@/components/ui/use-toast';
import { useSuccessFeedback } from '@/contexts/SuccessFeedbackContext';
import type { ContactUploadResult } from '@/types';

interface BulkContactUploadProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (result: ContactUploadResult) => void;
}

interface UploadState {
  file: File | null;
  uploading: boolean;
  progress: number;
  result: ContactUploadResult | null;
  dragActive: boolean;
}

export const BulkContactUpload: React.FC<BulkContactUploadProps> = ({
  isOpen,
  onOpenChange,
  onUploadComplete,
}) => {
  const { toast } = useToast();
  const { uploadContacts } = useContacts();
  const { showSuccess } = useSuccessFeedback();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [state, setState] = useState<UploadState>({
    file: null,
    uploading: false,
    progress: 0,
    result: null,
    dragActive: false,
  });

  const resetState = () => {
    setState({
      file: null,
      uploading: false,
      progress: 0,
      result: null,
      dragActive: false,
    });
  };

  const handleClose = () => {
    if (!state.uploading) {
      resetState();
      onOpenChange(false);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV or Excel file (.csv, .xlsx, .xls).',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file is not empty
    if (file.size === 0) {
      toast({
        title: 'Empty file',
        description: 'Please select a file that contains data.',
        variant: 'destructive',
      });
      return;
    }

    setState(prev => ({ ...prev, file, result: null }));
    
    toast({
      title: 'File selected',
      description: `${file.name} is ready for upload.`,
    });
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setState(prev => ({ ...prev, dragActive: true }));
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setState(prev => ({ ...prev, dragActive: true }));
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set dragActive to false if we're leaving the drop zone entirely
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setState(prev => ({ ...prev, dragActive: false }));
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setState(prev => ({ ...prev, dragActive: false }));
    
    const files = Array.from(event.dataTransfer.files);
    
    if (files.length === 0) {
      toast({
        title: 'No file selected',
        description: 'Please drop a file to upload.',
        variant: 'destructive',
      });
      return;
    }
    
    if (files.length > 1) {
      toast({
        title: 'Multiple files detected',
        description: 'Please drop only one file at a time.',
        variant: 'destructive',
      });
      return;
    }
    
    handleFileSelect(files[0]);
  };

  const handleUpload = async () => {
    if (!state.file) return;

    setState(prev => ({ ...prev, uploading: true, progress: 0 }));

    try {
      // Progress tracking based on upload stages
      let currentProgress = 0;
      const progressStages = [
        { stage: 'Validating file...', progress: 20 },
        { stage: 'Processing contacts...', progress: 50 },
        { stage: 'Saving to database...', progress: 80 },
        { stage: 'Finalizing...', progress: 95 }
      ];
      
      let stageIndex = 0;
      const progressInterval = setInterval(() => {
        if (stageIndex < progressStages.length) {
          const targetProgress = progressStages[stageIndex].progress;
          currentProgress = Math.min(currentProgress + 5, targetProgress);
          
          setState(prev => ({
            ...prev,
            progress: currentProgress,
          }));
          
          if (currentProgress >= targetProgress) {
            stageIndex++;
          }
        }
      }, 200);

      const result = await uploadContacts(state.file);
      
      clearInterval(progressInterval);
      
      // Complete progress
      setState(prev => ({ ...prev, progress: 100 }));
      
      // Small delay to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 500));

      if (result) {
        setState(prev => ({ 
          ...prev, 
          uploading: false, 
          result,
        }));

        if (result.success) {
          const successCount = result.summary.successful;
          const totalCount = result.summary.totalProcessed;
          const duplicateCount = result.summary.duplicates;
          const failedCount = result.summary.failed;
          
          // Show appropriate feedback based on results
          if (successCount > 0) {
            showSuccess.contact.uploaded(successCount, {
              description: `Successfully added ${successCount} contacts${duplicateCount > 0 ? `. ${duplicateCount} duplicates skipped` : ''}${failedCount > 0 ? `. ${failedCount} failed` : ''}.`,
              action: {
                label: 'View Contacts',
                onClick: () => {
                  onOpenChange(false);
                },
              },
            });
          } else if (duplicateCount > 0 && failedCount === 0) {
            // All were duplicates
            toast({
              title: 'Upload completed',
              description: `All ${duplicateCount} contacts were duplicates and skipped. No new contacts added.`,
              variant: 'default',
            });
          } else if (failedCount > 0) {
            // Some or all failed
            toast({
              title: 'Upload completed with issues',
              description: `${failedCount} contacts failed to process${duplicateCount > 0 ? `, ${duplicateCount} duplicates skipped` : ''}.`,
              variant: 'destructive',
            });
          }
          
          onUploadComplete?.(result);
        } else {
          toast({
            title: 'Upload failed',
            description: result.message || 'Failed to upload contacts.',
            variant: 'destructive',
          });
        }
      } else {
        setState(prev => ({ ...prev, uploading: false, progress: 0 }));
        toast({
          title: 'Upload failed',
          description: 'No response received from server. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error: unknown) {
      setState(prev => ({ ...prev, uploading: false, progress: 0 }));
      console.error('Upload error:', error);
      
      let errorMessage = 'An unexpected error occurred during upload.';
      
      if (error && typeof error === 'object' && 'code' in error) {
        const apiError = error as { code: string; message?: string };
        if (apiError.code === 'NETWORK_ERROR') {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (apiError.code === 'UNAUTHORIZED') {
          errorMessage = 'Session expired. Please log in again.';
        } else if (apiError.code === 'VALIDATION_ERROR') {
          errorMessage = 'File format is invalid. Please check your file and try again.';
        } else if (apiError.message) {
          errorMessage = apiError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // Test backend connectivity first
      try {
        console.log('Testing backend connectivity...');
        const testResponse = await fetch('/api/contacts/test-upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: true })
        });
        console.log('Backend test response:', testResponse.status, await testResponse.text());
      } catch (testError) {
        console.error('Backend connectivity test failed:', testError);
      }

      // Try to download template from backend first
      try {
        const response = await fetch('/api/contacts/template', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'contact_template.xlsx';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          toast({
            title: 'Template downloaded',
            description: 'Excel template has been downloaded from server.',
          });
          return;
        }
      } catch (serverError) {
        console.warn('Failed to download template from server, using fallback:', serverError);
      }

      // Fallback: Create a local CSV template
      const csvContent = 'name,phoneNumber,email,company,notes\n' +
                        'John Doe,+91 9876543210,john@example.com,Acme Corp,Sample contact\n' +
                        'Jane Smith,+91 8765432109,jane@example.com,Tech Inc,Another sample';
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'contact_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Template downloaded',
        description: 'CSV template has been downloaded to your computer.',
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Failed to download template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderUploadArea = () => (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        state.dragActive
          ? 'border-primary bg-primary/5'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-medium mb-2">Upload Contact File</h3>
      <p className="text-gray-500 mb-4">
        Drag and drop your CSV or Excel file here, or click to browse
      </p>
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={state.uploading}
      >
        Choose File
      </Button>
      <Input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <p className="text-xs text-gray-400 mt-4">
        Supported formats: CSV, Excel (.xlsx, .xls) • Max size: 10MB
      </p>
    </div>
  );

  const renderFileInfo = () => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-500" />
            <div>
              <p className="font-medium">{state.file?.name}</p>
              <p className="text-sm text-gray-500">
                {state.file ? formatFileSize(state.file.size) : ''}
              </p>
            </div>
          </div>
          {!state.uploading && !state.result && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, file: null }))}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {state.uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Uploading...</span>
              <span className="text-sm text-gray-600">{state.progress}%</span>
            </div>
            <Progress value={state.progress} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderResults = () => {
    if (!state.result) return null;

    const { summary, errors } = state.result;

    return (
      <div className="space-y-4">
        <Alert className={
          summary.successful > 0 ? 'border-green-200' : 
          summary.failed > 0 ? 'border-red-200' : 
          'border-yellow-200'
        }>
          <div className="flex items-center gap-2">
            {summary.successful > 0 ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : summary.failed > 0 ? (
              <XCircle className="w-4 h-4 text-red-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-600" />
            )}
            <AlertDescription>
              {summary.successful > 0 && summary.failed === 0 && summary.duplicates === 0 
                ? `Successfully added ${summary.successful} contacts.`
                : summary.successful > 0 && (summary.failed > 0 || summary.duplicates > 0)
                ? `Added ${summary.successful} contacts. ${summary.failed > 0 ? `${summary.failed} failed.` : ''} ${summary.duplicates > 0 ? `${summary.duplicates} duplicates skipped.` : ''}`
                : summary.failed > 0 && summary.successful === 0
                ? `Upload failed. ${summary.failed} contacts could not be processed.`
                : summary.duplicates > 0 && summary.successful === 0 && summary.failed === 0
                ? `All ${summary.duplicates} contacts were duplicates and skipped. No new contacts added.`
                : state.result.message
              }
            </AlertDescription>
          </div>
        </Alert>

        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Upload Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {summary.successful}
                </div>
                <div className="text-sm text-gray-500">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {summary.failed}
                </div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {summary.duplicates}
                </div>
                <div className="text-sm text-gray-500">Duplicates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {summary.totalProcessed}
                </div>
                <div className="text-sm text-gray-500">Total Processed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {errors && errors.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                {summary.duplicates > 0 && summary.failed === 0 ? 'Duplicates Skipped' : 'Issues Found'} ({errors.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {errors.slice(0, 10).map((error, index) => {
                  const isDuplicate = error.error?.includes('already exists');
                  return (
                    <div key={index} className={`text-sm p-2 rounded border-l-4 ${
                      isDuplicate 
                        ? 'bg-yellow-50 border-yellow-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="font-medium">Row {error.row}: {error.data?.name || 'Unknown'}</div>
                      <div className={isDuplicate ? 'text-yellow-700' : 'text-red-600'}>
                        {isDuplicate 
                          ? `Contact "${error.data?.name}" with phone ${error.data?.phone_number} already exists`
                          : error.error || error.message
                        }
                      </div>
                    </div>
                  );
                })}
                {errors.length > 10 && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    ... and {errors.length - 10} more errors
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Contact Upload</DialogTitle>
          <DialogDescription>
            Upload multiple contacts from a CSV or Excel file. 
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 hover:text-blue-800"
              onClick={handleDownloadTemplate}
            >
              Download template
            </Button>
            {' '}to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!state.file && renderUploadArea()}
          {state.file && renderFileInfo()}
          {state.result && renderResults()}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={state.uploading}
          >
            {state.result ? 'Close' : 'Cancel'}
          </Button>
          {state.file && !state.result && (
            <Button
              onClick={handleUpload}
              disabled={state.uploading}
            >
              {state.uploading ? 'Uploading...' : 'Upload Contacts'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkContactUpload;