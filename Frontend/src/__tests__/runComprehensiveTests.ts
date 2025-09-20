#!/usr/bin/env node

/**
 * Comprehensive Admin Panel Test Runner
 * 
 * This script runs all admin panel tests in a structured manner,
 * providing detailed reporting and coverage analysis.
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestSuite {
  name: string;
  description: string;
  pattern: string;
  timeout: number;
  critical: boolean;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  coverage?: number;
  errors: string[];
  warnings: string[];
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Unit Tests',
    description: 'Core admin component unit tests',
    pattern: 'src/__tests__/unit/**/*.test.tsx',
    timeout: 30000,
    critical: true,
  },
  {
    name: 'Integration Tests',
    description: 'Admin API integration tests',
    pattern: 'src/__tests__/integration/**/*.test.tsx',
    timeout: 60000,
    critical: true,
  },
  {
    name: 'End-to-End Tests',
    description: 'Complete admin workflow tests',
    pattern: 'src/__tests__/e2e/**/*.test.tsx',
    timeout: 120000,
    critical: true,
  },
  {
    name: 'Performance Tests',
    description: 'Large dataset and performance tests',
    pattern: 'src/__tests__/performance/**/*.test.tsx',
    timeout: 180000,
    critical: false,
  },
  {
    name: 'Security Tests',
    description: 'Security and penetration tests',
    pattern: 'src/__tests__/security/**/*.test.tsx',
    timeout: 90000,
    critical: true,
  },
  {
    name: 'Accessibility Tests',
    description: 'WCAG compliance and accessibility tests',
    pattern: 'src/__tests__/accessibility/**/*.test.tsx',
    timeout: 60000,
    critical: false,
  },
  {
    name: 'Load Tests',
    description: 'Scalability and load testing',
    pattern: 'src/__tests__/load/**/*.test.tsx',
    timeout: 300000,
    critical: false,
  },
  {
    name: 'Comprehensive Suite',
    description: 'All-in-one comprehensive test suite',
    pattern: 'src/__tests__/comprehensive/**/*.test.tsx',
    timeout: 240000,
    critical: true,
  },
];

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private reportDir: string;

  constructor() {
    this.reportDir = join(process.cwd(), 'test-reports');
    this.ensureReportDirectory();
  }

  private ensureReportDirectory(): void {
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    this.log(`Running ${suite.name}: ${suite.description}`);
    
    const result: TestResult = {
      suite: suite.name,
      passed: false,
      duration: 0,
      errors: [],
      warnings: [],
    };

    const startTime = Date.now();

    try {
      // Run the test suite with vitest
      const command = `npx vitest run "${suite.pattern}" --reporter=json --timeout=${suite.timeout}`;
      
      this.log(`Executing: ${command}`);
      
      const output = execSync(command, {
        encoding: 'utf8',
        timeout: suite.timeout + 10000, // Add buffer time
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      // Parse vitest JSON output
      const testOutput = this.parseVitestOutput(output);
      
      result.passed = testOutput.success;
      result.coverage = testOutput.coverage;
      result.errors = testOutput.errors;
      result.warnings = testOutput.warnings;

      if (result.passed) {
        this.log(`✅ ${suite.name} completed successfully`);
      } else {
        this.log(`❌ ${suite.name} failed with ${result.errors.length} errors`, 'error');
      }

    } catch (error: any) {
      result.passed = false;
      result.errors.push(error.message || 'Unknown error occurred');
      this.log(`❌ ${suite.name} failed: ${error.message}`, 'error');
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private parseVitestOutput(output: string): {
    success: boolean;
    coverage?: number;
    errors: string[];
    warnings: string[];
  } {
    try {
      // Try to parse JSON output from vitest
      const lines = output.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{'));
      
      if (jsonLine) {
        const testResult = JSON.parse(jsonLine);
        return {
          success: testResult.success || false,
          coverage: testResult.coverage?.percentage,
          errors: testResult.errors || [],
          warnings: testResult.warnings || [],
        };
      }
    } catch (e) {
      // Fallback to parsing text output
    }

    // Fallback parsing
    const success = !output.includes('FAIL') && !output.includes('Error:');
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract errors and warnings from output
    const lines = output.split('\n');
    lines.forEach(line => {
      if (line.includes('Error:') || line.includes('FAIL')) {
        errors.push(line.trim());
      } else if (line.includes('Warning:') || line.includes('WARN')) {
        warnings.push(line.trim());
      }
    });

    return { success, errors, warnings };
  }

  private generateReport(): void {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        critical_failed: this.results.filter(r => !r.passed && this.isCritical(r.suite)).length,
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    // Write JSON report
    const jsonReportPath = join(this.reportDir, 'comprehensive-test-report.json');
    writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));

    // Write HTML report
    const htmlReportPath = join(this.reportDir, 'comprehensive-test-report.html');
    writeFileSync(htmlReportPath, this.generateHtmlReport(report));

    // Write summary to console
    this.printSummary(report);
  }

  private isCritical(suiteName: string): boolean {
    const suite = TEST_SUITES.find(s => s.name === suiteName);
    return suite?.critical || false;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const failedCritical = this.results.filter(r => !r.passed && this.isCritical(r.suite));
    if (failedCritical.length > 0) {
      recommendations.push('🚨 Critical test failures detected. Address these before deployment.');
    }

    const slowTests = this.results.filter(r => r.duration > 60000);
    if (slowTests.length > 0) {
      recommendations.push('⏱️ Some tests are running slowly. Consider optimization.');
    }

    const lowCoverage = this.results.filter(r => r.coverage && r.coverage < 80);
    if (lowCoverage.length > 0) {
      recommendations.push('📊 Test coverage is below 80% in some areas. Add more tests.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All tests are performing well. Great job!');
    }

    return recommendations;
  }

  private generateHtmlReport(report: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card.passed { border-left: 4px solid #28a745; }
        .summary-card.failed { border-left: 4px solid #dc3545; }
        .summary-card.warning { border-left: 4px solid #ffc107; }
        .test-results { margin-bottom: 30px; }
        .test-suite { margin-bottom: 20px; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
        .test-suite-header { background: #e9ecef; padding: 15px; font-weight: bold; }
        .test-suite-header.passed { background: #d4edda; }
        .test-suite-header.failed { background: #f8d7da; }
        .test-suite-body { padding: 15px; }
        .error { color: #dc3545; margin: 5px 0; }
        .warning { color: #856404; margin: 5px 0; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 8px; }
        .recommendations h3 { margin-top: 0; }
        .recommendations ul { margin: 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Admin Panel Comprehensive Test Report</h1>
            <p>Generated on ${report.timestamp}</p>
            <p>Total Duration: ${Math.round(report.totalDuration / 1000)}s</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div style="font-size: 2em; font-weight: bold;">${report.summary.total}</div>
            </div>
            <div class="summary-card passed">
                <h3>Passed</h3>
                <div style="font-size: 2em; font-weight: bold; color: #28a745;">${report.summary.passed}</div>
            </div>
            <div class="summary-card failed">
                <h3>Failed</h3>
                <div style="font-size: 2em; font-weight: bold; color: #dc3545;">${report.summary.failed}</div>
            </div>
            <div class="summary-card warning">
                <h3>Critical Failed</h3>
                <div style="font-size: 2em; font-weight: bold; color: #ffc107;">${report.summary.critical_failed}</div>
            </div>
        </div>

        <div class="test-results">
            <h2>Test Suite Results</h2>
            ${report.results.map((result: TestResult) => `
                <div class="test-suite">
                    <div class="test-suite-header ${result.passed ? 'passed' : 'failed'}">
                        ${result.passed ? '✅' : '❌'} ${result.suite}
                        <span style="float: right;">${Math.round(result.duration / 1000)}s</span>
                    </div>
                    <div class="test-suite-body">
                        ${result.coverage ? `<p><strong>Coverage:</strong> ${result.coverage}%</p>` : ''}
                        ${result.errors.length > 0 ? `
                            <h4>Errors:</h4>
                            ${result.errors.map(error => `<div class="error">${error}</div>`).join('')}
                        ` : ''}
                        ${result.warnings.length > 0 ? `
                            <h4>Warnings:</h4>
                            ${result.warnings.map(warning => `<div class="warning">${warning}</div>`).join('')}
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h3>📋 Recommendations</h3>
            <ul>
                ${report.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
</body>
</html>`;
  }

  private printSummary(report: any): void {
    console.log('\n' + '='.repeat(80));
    console.log('🛡️  ADMIN PANEL COMPREHENSIVE TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`📊 Total Test Suites: ${report.summary.total}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`🚨 Critical Failed: ${report.summary.critical_failed}`);
    console.log(`⏱️  Total Duration: ${Math.round(report.totalDuration / 1000)}s`);
    console.log('\n📋 RECOMMENDATIONS:');
    report.recommendations.forEach((rec: string) => console.log(`   ${rec}`));
    console.log('\n📄 Detailed reports saved to:');
    console.log(`   JSON: ${join(this.reportDir, 'comprehensive-test-report.json')}`);
    console.log(`   HTML: ${join(this.reportDir, 'comprehensive-test-report.html')}`);
    console.log('='.repeat(80));
  }

  public async runAll(): Promise<void> {
    this.log('🚀 Starting comprehensive admin panel test suite');
    this.startTime = Date.now();

    // Run critical tests first
    const criticalSuites = TEST_SUITES.filter(suite => suite.critical);
    const nonCriticalSuites = TEST_SUITES.filter(suite => !suite.critical);

    this.log(`Running ${criticalSuites.length} critical test suites first...`);
    
    for (const suite of criticalSuites) {
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      
      // Stop if critical test fails (optional - can be configured)
      if (!result.passed && process.env.FAIL_FAST === 'true') {
        this.log(`💥 Critical test suite "${suite.name}" failed. Stopping execution.`, 'error');
        break;
      }
    }

    // Run non-critical tests
    if (process.env.SKIP_NON_CRITICAL !== 'true') {
      this.log(`Running ${nonCriticalSuites.length} non-critical test suites...`);
      
      for (const suite of nonCriticalSuites) {
        const result = await this.runTestSuite(suite);
        this.results.push(result);
      }
    }

    // Generate comprehensive report
    this.generateReport();

    // Exit with appropriate code
    const criticalFailures = this.results.filter(r => !r.passed && this.isCritical(r.suite));
    if (criticalFailures.length > 0) {
      this.log(`💥 ${criticalFailures.length} critical test failures detected.`, 'error');
      process.exit(1);
    } else {
      this.log('🎉 All critical tests passed!');
      process.exit(0);
    }
  }

  public async runSuite(suiteName: string): Promise<void> {
    const suite = TEST_SUITES.find(s => s.name === suiteName);
    if (!suite) {
      this.log(`❌ Test suite "${suiteName}" not found`, 'error');
      process.exit(1);
    }

    this.log(`🎯 Running specific test suite: ${suiteName}`);
    this.startTime = Date.now();

    const result = await this.runTestSuite(suite);
    this.results.push(result);

    this.generateReport();

    if (!result.passed) {
      this.log(`💥 Test suite "${suiteName}" failed.`, 'error');
      process.exit(1);
    } else {
      this.log(`🎉 Test suite "${suiteName}" passed!`);
      process.exit(0);
    }
  }
}

// CLI Interface
const args = process.argv.slice(2);
const runner = new TestRunner();

if (args.length === 0) {
  // Run all tests
  runner.runAll().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
} else if (args[0] === '--suite' && args[1]) {
  // Run specific suite
  runner.runSuite(args[1]).catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
} else if (args[0] === '--list') {
  // List available test suites
  console.log('📋 Available test suites:');
  TEST_SUITES.forEach(suite => {
    console.log(`   ${suite.name}: ${suite.description} ${suite.critical ? '(Critical)' : ''}`);
  });
} else {
  console.log('Usage:');
  console.log('  npm run test:comprehensive              # Run all tests');
  console.log('  npm run test:comprehensive --list       # List available test suites');
  console.log('  npm run test:comprehensive --suite "Unit Tests"  # Run specific suite');
  console.log('');
  console.log('Environment variables:');
  console.log('  FAIL_FAST=true                         # Stop on first critical failure');
  console.log('  SKIP_NON_CRITICAL=true                 # Skip non-critical tests');
}

export default TestRunner;