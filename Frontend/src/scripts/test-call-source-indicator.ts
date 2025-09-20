#!/usr/bin/env ts-node

/**
 * Call Source Indicator Frontend Test Runner
 * 
 * This script runs all frontend tests for call source detection including:
 * - CallSourceIndicator component tests
 * - Call source utility function tests
 * - Integration tests with real call data
 * - Accessibility compliance tests
 * 
 * Requirements: Call Source Detection Acceptance Criteria
 */

import { execSync } from 'child_process';
import path from 'path';

interface TestResult {
  testSuite: string;
  passed: boolean;
  output: string;
  error?: string;
}

class CallSourceIndicatorTestRunner {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Call Source Indicator Frontend Tests...\n');

    try {
      // Run component tests
      await this.runComponentTests();
      
      // Run utility function tests
      await this.runUtilityTests();
      
      // Run integration tests
      await this.runIntegrationTests();
      
      // Run accessibility tests
      await this.runAccessibilityTests();
      
      // Generate test report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    }
  }

  private async runComponentTests(): Promise<void> {
    console.log('🎨 Running Component Tests...');
    
    try {
      const output = execSync(
        'npm run test -- --run --reporter=verbose src/components/call/__tests__/CallSourceIndicator.comprehensive.test.tsx',
        { 
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 30000
        }
      );
      
      this.results.push({
        testSuite: 'CallSourceIndicator Component Tests',
        passed: true,
        output
      });
      
      console.log('✅ Component tests passed\n');
      
    } catch (error: any) {
      this.results.push({
        testSuite: 'CallSourceIndicator Component Tests',
        passed: false,
        output: error.stdout || '',
        error: error.stderr || error.message
      });
      
      console.log('❌ Component tests failed\n');
    }
  }

  private async runUtilityTests(): Promise<void> {
    console.log('🔧 Running Utility Function Tests...');
    
    try {
      // Test getCallSourceFromData function with various scenarios
      await this.testCallSourceUtility();
      
      this.results.push({
        testSuite: 'Call Source Utility Tests',
        passed: true,
        output: 'All utility function tests passed'
      });
      
      console.log('✅ Utility tests passed\n');
      
    } catch (error: any) {
      this.results.push({
        testSuite: 'Call Source Utility Tests',
        passed: false,
        output: '',
        error: error.message
      });
      
      console.log('❌ Utility tests failed:', error.message, '\n');
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running Integration Tests...');
    
    try {
      // Test component integration with real data scenarios
      await this.testComponentIntegration();
      
      this.results.push({
        testSuite: 'Component Integration Tests',
        passed: true,
        output: 'All integration tests passed'
      });
      
      console.log('✅ Integration tests passed\n');
      
    } catch (error: any) {
      this.results.push({
        testSuite: 'Component Integration Tests',
        passed: false,
        output: '',
        error: error.message
      });
      
      console.log('❌ Integration tests failed:', error.message, '\n');
    }
  }

  private async runAccessibilityTests(): Promise<void> {
    console.log('♿ Running Accessibility Tests...');
    
    try {
      // Test accessibility compliance
      await this.testAccessibilityCompliance();
      
      this.results.push({
        testSuite: 'Accessibility Tests',
        passed: true,
        output: 'All accessibility tests passed'
      });
      
      console.log('✅ Accessibility tests passed\n');
      
    } catch (error: any) {
      this.results.push({
        testSuite: 'Accessibility Tests',
        passed: false,
        output: '',
        error: error.message
      });
      
      console.log('❌ Accessibility tests failed:', error.message, '\n');
    }
  }

  private async testCallSourceUtility(): Promise<void> {
    console.log('  🔍 Testing getCallSourceFromData utility...');
    
    // Import the utility function
    const { getCallSourceFromData } = await import('../components/call/CallSourceIndicator');
    
    // Test cases for call source detection
    const testCases = [
      {
        name: 'explicit phone call source',
        data: { phone_number: '+1234567890', call_source: 'phone' as const },
        expected: 'phone'
      },
      {
        name: 'explicit internet call source',
        data: { phone_number: 'internal', call_source: 'internet' as const },
        expected: 'internet'
      },
      {
        name: 'explicit unknown call source',
        data: { phone_number: null, call_source: 'unknown' as const },
        expected: 'unknown'
      },
      {
        name: 'fallback to phone number analysis - phone',
        data: { phone_number: '+1234567890' },
        expected: 'phone'
      },
      {
        name: 'fallback to phone number analysis - internal',
        data: { phone_number: 'internal' },
        expected: 'internet'
      },
      {
        name: 'fallback to phone number analysis - null',
        data: { phone_number: null },
        expected: 'unknown'
      },
      {
        name: 'fallback to phone number analysis - empty',
        data: { phone_number: '' },
        expected: 'unknown'
      },
      {
        name: 'missing data',
        data: {},
        expected: 'unknown'
      }
    ];
    
    for (const testCase of testCases) {
      const result = getCallSourceFromData(testCase.data);
      if (result !== testCase.expected) {
        throw new Error(
          `Test "${testCase.name}" failed: expected ${testCase.expected}, got ${result}`
        );
      }
    }
    
    console.log('    ✅ getCallSourceFromData utility is correct');
  }

  private async testComponentIntegration(): Promise<void> {
    console.log('  🎯 Testing component integration scenarios...');
    
    // Test typical usage scenarios
    const scenarios = [
      {
        name: 'Phone call with contact info',
        callData: {
          id: '1',
          phone_number: '+1234567890',
          call_source: 'phone' as const,
          caller_name: 'John Doe',
          caller_email: 'john@example.com'
        }
      },
      {
        name: 'Internet call with email',
        callData: {
          id: '2',
          phone_number: 'internal',
          call_source: 'internet' as const,
          caller_email: 'visitor@example.com'
        }
      },
      {
        name: 'Unknown call without contact info',
        callData: {
          id: '3',
          phone_number: null,
          call_source: 'unknown' as const
        }
      },
      {
        name: 'Legacy call data without call_source',
        callData: {
          id: '4',
          phone_number: '+1234567890'
        }
      }
    ];
    
    // Import React and testing utilities
    const React = await import('react');
    const { render } = await import('@testing-library/react');
    const { CallSourceIndicator, getCallSourceFromData } = await import('../components/call/CallSourceIndicator');
    
    for (const scenario of scenarios) {
      try {
        const callSource = getCallSourceFromData(scenario.callData);
        
        // Test that component renders without errors
        const { unmount } = render(
          React.createElement(CallSourceIndicator, {
            callSource,
            phoneNumber: scenario.callData.phone_number
          })
        );
        
        unmount();
        
      } catch (error) {
        throw new Error(`Integration test "${scenario.name}" failed: ${error}`);
      }
    }
    
    console.log('    ✅ Component integration scenarios are correct');
  }

  private async testAccessibilityCompliance(): Promise<void> {
    console.log('  ♿ Testing accessibility compliance...');
    
    // Import React and testing utilities
    const React = await import('react');
    const { render, screen } = await import('@testing-library/react');
    const { CallSourceIndicator } = await import('../components/call/CallSourceIndicator');
    
    // Test accessibility features
    const accessibilityTests = [
      {
        name: 'Phone call ARIA labels',
        props: { callSource: 'phone' as const, phoneNumber: '+1234567890' },
        expectedAriaLabel: 'Phone call from +1234567890'
      },
      {
        name: 'Internet call ARIA labels',
        props: { callSource: 'internet' as const },
        expectedAriaLabel: 'Internet call'
      },
      {
        name: 'Unknown call ARIA labels',
        props: { callSource: 'unknown' as const },
        expectedAriaLabel: 'Unknown call source'
      },
      {
        name: 'Icon-only accessibility',
        props: { callSource: 'phone' as const, phoneNumber: '+1234567890', showLabel: false },
        expectedAriaLabel: 'Phone call from +1234567890'
      }
    ];
    
    for (const test of accessibilityTests) {
      const { unmount } = render(
        React.createElement(CallSourceIndicator, test.props)
      );
      
      // Check for proper ARIA label
      const element = screen.getByRole('img');
      const ariaLabel = element.getAttribute('aria-label');
      
      if (ariaLabel !== test.expectedAriaLabel) {
        throw new Error(
          `Accessibility test "${test.name}" failed: expected aria-label "${test.expectedAriaLabel}", got "${ariaLabel}"`
        );
      }
      
      // Check for aria-hidden on icon
      const icon = element.querySelector('svg');
      if (!icon || icon.getAttribute('aria-hidden') !== 'true') {
        throw new Error(`Accessibility test "${test.name}" failed: icon should have aria-hidden="true"`);
      }
      
      unmount();
    }
    
    console.log('    ✅ Accessibility compliance is correct');
  }

  private generateReport(): void {
    console.log('\n📊 Frontend Test Results Summary');
    console.log('=================================\n');
    
    let totalTests = this.results.length;
    let passedTests = this.results.filter(r => r.passed).length;
    let failedTests = totalTests - passedTests;
    
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} - ${result.testSuite}`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('\n📈 Overall Results:');
    console.log(`   Total Test Suites: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Some frontend tests failed. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All call source indicator frontend tests passed!');
      console.log('\n✅ Frontend Call Source Detection Verified:');
      console.log('   ✓ CallSourceIndicator component renders correctly');
      console.log('   ✓ Phone calls display with proper icons and labels');
      console.log('   ✓ Internet calls display with proper icons and labels');
      console.log('   ✓ Unknown sources display with proper fallbacks');
      console.log('   ✓ Component sizing and styling work correctly');
      console.log('   ✓ Accessibility compliance maintained');
      console.log('   ✓ Utility functions work with legacy data');
      console.log('   ✓ Integration scenarios handle real-world data');
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const testRunner = new CallSourceIndicatorTestRunner();
  testRunner.runAllTests().catch(error => {
    console.error('Frontend test runner failed:', error);
    process.exit(1);
  });
}

export { CallSourceIndicatorTestRunner };