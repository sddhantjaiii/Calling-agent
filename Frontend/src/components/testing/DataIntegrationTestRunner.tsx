import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { dataIntegrationTester } from '@/utils/dataIntegrationTests';

interface TestResult {
  component: string;
  test: string;
  passed: boolean;
  message: string;
  data?: any;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  passed: boolean;
  summary: string;
}

const DataIntegrationTestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    suites: TestSuite[];
    overallPassed: boolean;
    summary: string;
  } | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults(null);

    try {
      const results = await dataIntegrationTester.runAllTests();
      setTestResults(results);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getStatusBadge = (passed: boolean) => {
    return (
      <Badge variant={passed ? "default" : "destructive"}>
        {passed ? "PASSED" : "FAILED"}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Integration Test Runner</h1>
          <p className="text-muted-foreground">
            Validate that all components display real data or proper empty states (no mock data)
          </p>
        </div>
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="bg-[#1A6262] hover:bg-[#145252]"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      {testResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(testResults.overallPassed)}
                Overall Test Results
              </CardTitle>
              {getStatusBadge(testResults.overallPassed)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium mb-4">{testResults.summary}</p>
            
            <div className="space-y-4">
              {testResults.suites.map((suite, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(suite.passed)}
                        {suite.name}
                      </CardTitle>
                      {getStatusBadge(suite.passed)}
                    </div>
                    <p className="text-sm text-muted-foreground">{suite.summary}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {suite.results.map((result, resultIndex) => (
                        <div 
                          key={resultIndex}
                          className={`p-3 rounded-lg border ${
                            result.passed 
                              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' 
                              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {getStatusIcon(result.passed)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{result.component}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-sm">{result.test}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{result.message}</p>
                              {result.data && (
                                <details className="mt-2">
                                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                    View test data
                                  </summary>
                                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                    {JSON.stringify(result.data, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!testResults && !isRunning && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Ready to Test Data Integration</h3>
            <p className="text-muted-foreground text-center mb-4">
              Click "Run All Tests" to validate that all components properly display real data or appropriate empty states.
              This will test:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Dashboard KPIs display real data or "No data available" states</li>
              <li>• Analytics charts show real data or empty states (no mock data)</li>
              <li>• Lead tables and profiles show real data or "No data available"</li>
              <li>• All error states and loading states work correctly</li>
              <li>• Empty database scenarios show proper empty states</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataIntegrationTestRunner;