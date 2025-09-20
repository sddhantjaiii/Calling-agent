import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingSpinner, { InlineSpinner, FullPageSpinner } from '@/components/ui/LoadingSpinner';
import { 
  ProgressIndicator, 
  ProgressBar, 
  CircularProgress,
  type ProgressStep 
} from '@/components/ui/ProgressIndicator';
import {
  SkeletonAgent,
  SkeletonContact,
  SkeletonKPI,
  SkeletonCall,
  SkeletonChart,
  SkeletonTable,
  SkeletonList
} from '@/components/ui/SkeletonLoader';
import LoadingStateManager, {
  AgentLoadingState,
  ContactLoadingState,
  DashboardLoadingState,
  CallLoadingState,
  ButtonLoadingState
} from '@/components/ui/LoadingStateManager';

export const LoadingIndicatorsExample: React.FC = () => {
  const [showFullPageSpinner, setShowFullPageSpinner] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    {
      id: 'step1',
      label: 'Initializing',
      description: 'Setting up the environment',
      status: 'completed',
      duration: 1200,
    },
    {
      id: 'step2',
      label: 'Processing Data',
      description: 'Analyzing uploaded files',
      status: 'in-progress',
    },
    {
      id: 'step3',
      label: 'Validation',
      description: 'Checking data integrity',
      status: 'pending',
    },
    {
      id: 'step4',
      label: 'Finalizing',
      description: 'Completing the operation',
      status: 'pending',
    },
  ]);

  const handleButtonClick = () => {
    setButtonLoading(true);
    setTimeout(() => setButtonLoading(false), 2000);
  };

  const handleProgressDemo = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleStepsDemo = () => {
    const steps = [...progressSteps];
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex < steps.length) {
        if (currentIndex > 0) {
          steps[currentIndex - 1].status = 'completed';
          steps[currentIndex - 1].duration = Math.random() * 2000 + 500;
        }
        steps[currentIndex].status = 'in-progress';
        setProgressSteps([...steps]);
        currentIndex++;
      } else {
        steps[steps.length - 1].status = 'completed';
        steps[steps.length - 1].duration = Math.random() * 2000 + 500;
        setProgressSteps([...steps]);
        clearInterval(interval);
      }
    }, 1500);
  };

  return (
    <div className="space-y-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Loading Indicators Demo</h1>
        <p className="text-muted-foreground">
          Comprehensive showcase of all loading states and indicators
        </p>
      </div>

      {/* Basic Spinners */}
      <Card>
        <CardHeader>
          <CardTitle>Loading Spinners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">Sizes</h4>
            <div className="flex items-center gap-6">
              <LoadingSpinner size="xs" text="Extra Small" />
              <LoadingSpinner size="sm" text="Small" />
              <LoadingSpinner size="md" text="Medium" />
              <LoadingSpinner size="lg" text="Large" />
              <LoadingSpinner size="xl" text="Extra Large" />
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Variants</h4>
            <div className="flex items-center gap-6">
              <LoadingSpinner variant="default" text="Default" />
              <LoadingSpinner variant="dots" text="Dots" />
              <LoadingSpinner variant="pulse" text="Pulse" />
              <LoadingSpinner variant="bars" text="Bars" />
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Colors</h4>
            <div className="flex items-center gap-6">
              <LoadingSpinner color="primary" text="Primary" />
              <LoadingSpinner color="success" text="Success" />
              <LoadingSpinner color="warning" text="Warning" />
              <LoadingSpinner color="error" text="Error" />
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Inline Spinner</h4>
            <div className="flex items-center gap-4">
              <Button disabled>
                <InlineSpinner size="xs" className="mr-2" />
                Loading...
              </Button>
              <span className="flex items-center">
                <InlineSpinner size="sm" className="mr-2" />
                Processing data...
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Full Page Spinner</h4>
            <Button onClick={() => setShowFullPageSpinner(true)}>
              Show Full Page Spinner
            </Button>
            {showFullPageSpinner && (
              <FullPageSpinner text="Loading application..." />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Indicators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">Progress Bar</h4>
            <div className="space-y-4">
              <ProgressBar progress={progress} label="Upload Progress" />
              <ProgressBar progress={75} color="success" label="Success Progress" />
              <ProgressBar progress={45} color="warning" label="Warning Progress" />
              <ProgressBar progress={25} color="error" label="Error Progress" />
              <Button onClick={handleProgressDemo}>Demo Progress</Button>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Circular Progress</h4>
            <div className="flex items-center gap-6">
              <CircularProgress progress={progress} />
              <CircularProgress progress={75} color="success" size={80} />
              <CircularProgress progress={45} color="warning" size={60} />
              <CircularProgress progress={25} color="error" size={100} />
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Step Progress</h4>
            <div className="space-y-4">
              <ProgressIndicator steps={progressSteps} showDuration />
              <div className="flex gap-2">
                <Button onClick={handleStepsDemo}>Demo Steps</Button>
                <Button 
                  variant="outline" 
                  onClick={() => setProgressSteps(progressSteps.map(step => ({ ...step, status: 'pending' })))}
                >
                  Reset Steps
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skeleton Loaders */}
      <Card>
        <CardHeader>
          <CardTitle>Skeleton Loaders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">Agent Skeleton</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SkeletonAgent />
              <SkeletonAgent />
              <SkeletonAgent />
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Contact Skeleton</h4>
            <div className="border rounded-lg">
              <SkeletonContact />
              <SkeletonContact />
              <SkeletonContact />
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">KPI Skeleton</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <SkeletonKPI />
              <SkeletonKPI />
              <SkeletonKPI />
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Call Skeleton</h4>
            <div className="border rounded-lg">
              <SkeletonCall />
              <SkeletonCall />
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Chart Skeleton</h4>
            <SkeletonChart height="200px" />
          </div>

          <div>
            <h4 className="font-medium mb-3">Table Skeleton</h4>
            <SkeletonTable rows={4} columns={5} />
          </div>

          <div>
            <h4 className="font-medium mb-3">List Skeleton</h4>
            <SkeletonList items={4} />
          </div>
        </CardContent>
      </Card>

      {/* Loading State Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Loading State Manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-3">Agent Loading State</h4>
            <AgentLoadingState loading={true} error={null}>
              <div>This content is hidden while loading</div>
            </AgentLoadingState>
          </div>

          <div>
            <h4 className="font-medium mb-3">Contact Loading State</h4>
            <ContactLoadingState loading={true} error={null}>
              <div>This content is hidden while loading</div>
            </ContactLoadingState>
          </div>

          <div>
            <h4 className="font-medium mb-3">Dashboard Loading State</h4>
            <DashboardLoadingState loading={true} error={null}>
              <div>This content is hidden while loading</div>
            </DashboardLoadingState>
          </div>

          <div>
            <h4 className="font-medium mb-3">Error State with Retry</h4>
            <LoadingStateManager
              loading={false}
              error="Failed to load data. Please try again."
              onRetry={() => alert('Retry clicked!')}
            >
              <div>This content is hidden when there's an error</div>
            </LoadingStateManager>
          </div>
        </CardContent>
      </Card>

      {/* Button Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Button Loading States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={handleButtonClick} disabled={buttonLoading}>
              <ButtonLoadingState loading={buttonLoading} loadingText="Processing...">
                Click Me
              </ButtonLoadingState>
            </Button>

            <Button variant="outline" disabled>
              <InlineSpinner size="sm" className="mr-2" />
              Loading...
            </Button>

            <Button variant="destructive" disabled>
              <InlineSpinner size="sm" className="mr-2" />
              Deleting...
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Close Full Page Spinner */}
      {showFullPageSpinner && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button onClick={() => setShowFullPageSpinner(false)}>
            Close Full Page Spinner
          </Button>
        </div>
      )}
    </div>
  );
};

export default LoadingIndicatorsExample;