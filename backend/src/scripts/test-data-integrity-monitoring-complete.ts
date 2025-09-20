#!/usr/bin/env ts-node

/**
 * Comprehensive Data Integrity Monitoring Test Suite
 * 
 * This script thoroughly tests all aspects of the data integrity monitoring system:
 * 1. Cross-agent contamination detection
 * 2. Orphaned records detection  
 * 3. Trigger health monitoring
 * 4. Performance monitoring
 * 5. Alert system functionality
 * 6. API endpoints
 */

import { pool } from '../config/database';
import { dataIntegrityMonitor } from '../services/dataIntegrityMonitor';
import { dataIntegrityAlerts } from '../services/dataIntegrityAlerts';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

class DataIntegrityTester {
  private results: TestResult[] = [];
  private testUserId1: string = '';
  private testUserId2: string = '';
  private testAgentId1: string = '';
  private testAgentId2: string = '';

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Data Integrity Monitoring Tests');
    console.log('=' .repeat(60));

    try {
      await this.setupTestData();
      await this.testContaminationDetection();
      await this.testOrphanedRecordsDetection();
      await this.testTriggerMonitoring();
      await this.testPerformanceMonitoring();
      await this.testAlertSystem();
      await this.testUserIsolationValidation();
      await this.testComprehensiveMetrics();
      await this.cleanupTestData();

      this.printResults();
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      await this.cleanupTestData();
      throw error;
    }
  }

  private async setupTestData(): Promise<void> {
    console.log('🔧 Setting up test data...');

    try {
      // Create test users
      const user1Result = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, created_at)
        VALUES ('test-integrity-1@example.com', 'hash1', 'Test', 'User1', NOW())
        RETURNING id
      `);
      this.testUserId1 = user1Result.rows[0].id;

      const user2Result = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, created_at)
        VALUES ('test-integrity-2@example.com', 'hash2', 'Test', 'User2', NOW())
        RETURNING id
      `);
      this.testUserId2 = user2Result.rows[0].id;

      // Create test agents
      const agent1Result = await pool.query(`
        INSERT INTO agents (user_id, name, voice_id, created_at)
        VALUES ($1, 'Test Integrity Agent 1', 'voice1', NOW())
        RETURNING id
      `, [this.testUserId1]);
      this.testAgentId1 = agent1Result.rows[0].id;

      const agent2Result = await pool.query(`
        INSERT INTO agents (user_id, name, voice_id, created_at)
        VALUES ($2, 'Test Integrity Agent 2', 'voice2', NOW())
        RETURNING id
      `, [this.testUserId2]);
      this.testAgentId2 = agent2Result.rows[0].id;

      this.addResult('Setup Test Data', true, 'Test users and agents created successfully');
    } catch (error) {
      this.addResult('Setup Test Data', false, `Failed to setup test data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async testContaminationDetection(): Promise<void> {
    console.log('🔍 Testing cross-agent contamination detection...');

    try {
      // Test 1: Clean data should show no contamination
      const initialContamination = await dataIntegrityMonitor.detectCrossAgentContamination();
      const testContamination = initialContamination.filter((c: any) => 
        [this.testUserId1, this.testUserId2].includes(c.call_user_id) ||
        [this.testUserId1, this.testUserId2].includes(c.agent_user_id)
      );

      this.addResult(
        'Clean Data Contamination Check',
        testContamination.length === 0,
        testContamination.length === 0 ? 'No contamination in clean data' : `Found ${testContamination.length} contamination issues`
      );

      // Test 2: Create contaminated data and detect it
      await pool.query(`
        INSERT INTO calls (user_id, agent_id, phone_number, status, created_at)
        VALUES ($1, $2, '+1111111111', 'completed', NOW())
      `, [this.testUserId1, this.testAgentId2]); // User 1 with User 2's agent - CONTAMINATION!

      const contaminationAfter = await dataIntegrityMonitor.detectCrossAgentContamination();
      const detectedContamination = contaminationAfter.find((c: any) => 
        c.call_user_id === this.testUserId1 && c.agent_user_id === this.testUserId2
      );

      this.addResult(
        'Contamination Detection',
        !!detectedContamination,
        detectedContamination ? 
          `Successfully detected contamination: ${detectedContamination.mismatched_calls} calls` :
          'Failed to detect intentional contamination'
      );

      // Clean up contaminated data
      await pool.query(`
        DELETE FROM calls 
        WHERE user_id = $1 AND agent_id = $2
      `, [this.testUserId1, this.testAgentId2]);

    } catch (error) {
      this.addResult('Contamination Detection', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testOrphanedRecordsDetection(): Promise<void> {
    console.log('🔍 Testing orphaned records detection...');

    try {
      // Create orphaned call (with non-existent agent)
      const orphanedCallResult = await pool.query(`
        INSERT INTO calls (user_id, agent_id, phone_number, status, created_at)
        VALUES ($1, 'non-existent-agent-id', '+2222222222', 'completed', NOW())
        RETURNING id
      `, [this.testUserId1]);

      const orphanedRecords = await dataIntegrityMonitor.detectOrphanedRecords();
      const orphanedCalls = orphanedRecords.filter((r: any) => r.table_name === 'calls');

      this.addResult(
        'Orphaned Records Detection',
        orphanedCalls.length > 0,
        orphanedCalls.length > 0 ? 
          `Successfully detected ${orphanedCalls.length} orphaned calls` :
          'Failed to detect orphaned records'
      );

      // Clean up orphaned call
      await pool.query('DELETE FROM calls WHERE id = $1', [orphanedCallResult.rows[0].id]);

    } catch (error) {
      this.addResult('Orphaned Records Detection', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testTriggerMonitoring(): Promise<void> {
    console.log('🔍 Testing trigger monitoring...');

    try {
      // Test logging trigger execution
      await dataIntegrityMonitor.logTriggerExecution(
        'test_trigger_success',
        'success',
        undefined,
        50
      );

      await dataIntegrityMonitor.logTriggerExecution(
        'test_trigger_failure',
        'error',
        'Test error message',
        1000
      );

      // Check if logs were created
      const triggerFailures = await dataIntegrityMonitor.checkTriggerHealth();
      const testFailure = triggerFailures.find((f: any) => f.trigger_name === 'test_trigger_failure');

      this.addResult(
        'Trigger Monitoring',
        !!testFailure,
        testFailure ? 
          `Successfully logged and detected trigger failure: ${testFailure.error_message}` :
          'Failed to log or detect trigger failures'
      );

    } catch (error) {
      this.addResult('Trigger Monitoring', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testPerformanceMonitoring(): Promise<void> {
    console.log('🔍 Testing performance monitoring...');

    try {
      const performanceDegradation = await dataIntegrityMonitor.checkPerformanceDegradation();

      this.addResult(
        'Performance Monitoring',
        typeof performanceDegradation === 'boolean',
        `Performance monitoring working, degradation status: ${performanceDegradation}`
      );

    } catch (error) {
      this.addResult('Performance Monitoring', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testAlertSystem(): Promise<void> {
    console.log('🔍 Testing alert system...');

    try {
      // Create contamination to trigger alert
      await pool.query(`
        INSERT INTO calls (user_id, agent_id, phone_number, status, created_at)
        VALUES ($1, $2, '+3333333333', 'completed', NOW())
      `, [this.testUserId1, this.testAgentId2]);

      const alerts = await dataIntegrityAlerts.checkAlerts();
      const contaminationAlert = alerts.find((a: any) => a.rule_id === 'cross-agent-contamination');

      this.addResult(
        'Alert Generation',
        !!contaminationAlert,
        contaminationAlert ? 
          `Successfully generated ${contaminationAlert.severity} alert: ${contaminationAlert.message}` :
          'Failed to generate alert for contamination'
      );

      // Test alert statistics
      const statistics = dataIntegrityAlerts.getAlertStats();
      this.addResult(
        'Alert Statistics',
        typeof statistics.total === 'number',
        `Alert statistics working: ${statistics.total} total, ${statistics.active} active`
      );

      // Clean up contaminated data
      await pool.query(`
        DELETE FROM calls 
        WHERE user_id = $1 AND agent_id = $2
      `, [this.testUserId1, this.testAgentId2]);

    } catch (error) {
      this.addResult('Alert System', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testUserIsolationValidation(): Promise<void> {
    console.log('🔍 Testing user isolation validation...');

    try {
      // Test clean isolation
      const cleanValidation = await dataIntegrityMonitor.validateUserDataIsolation(this.testUserId1);
      
      this.addResult(
        'Clean User Isolation',
        cleanValidation.isIsolated,
        cleanValidation.isIsolated ? 
          'User data properly isolated' :
          `Isolation violations: ${cleanValidation.violations.join(', ')}`
      );

      // Test with violation
      await pool.query(`
        INSERT INTO calls (user_id, agent_id, phone_number, status, created_at)
        VALUES ($1, $2, '+4444444444', 'completed', NOW())
      `, [this.testUserId2, this.testAgentId1]); // User 2 with User 1's agent

      const violationValidation = await dataIntegrityMonitor.validateUserDataIsolation(this.testUserId1);
      
      this.addResult(
        'Isolation Violation Detection',
        !violationValidation.isIsolated,
        !violationValidation.isIsolated ? 
          `Successfully detected isolation violation: ${violationValidation.violations[0]}` :
          'Failed to detect isolation violation'
      );

      // Clean up violation
      await pool.query(`
        DELETE FROM calls 
        WHERE user_id = $1 AND agent_id = $2
      `, [this.testUserId2, this.testAgentId1]);

    } catch (error) {
      this.addResult('User Isolation Validation', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testComprehensiveMetrics(): Promise<void> {
    console.log('🔍 Testing comprehensive metrics...');

    try {
      const metrics = await dataIntegrityMonitor.getDataIntegrityMetrics();

      const requiredFields = [
        'crossAgentContamination',
        'orphanedRecords', 
        'triggerFailures',
        'performanceDegradation',
        'lastChecked'
      ];

      const hasAllFields = requiredFields.every(field => metrics.hasOwnProperty(field));

      this.addResult(
        'Comprehensive Metrics',
        hasAllFields,
        hasAllFields ? 
          `All required metrics present: ${Object.keys(metrics).join(', ')}` :
          `Missing metrics: ${requiredFields.filter(f => !metrics.hasOwnProperty(f)).join(', ')}`
      );

    } catch (error) {
      this.addResult('Comprehensive Metrics', false, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    try {
      // Clean up calls
      await pool.query('DELETE FROM calls WHERE agent_id IN ($1, $2)', [this.testAgentId1, this.testAgentId2]);
      
      // Clean up agents
      await pool.query('DELETE FROM agents WHERE id IN ($1, $2)', [this.testAgentId1, this.testAgentId2]);
      
      // Clean up users
      await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [this.testUserId1, this.testUserId2]);

      // Clean up test trigger logs
      await pool.query(`
        DELETE FROM trigger_execution_log 
        WHERE trigger_name IN ('test_trigger_success', 'test_trigger_failure')
      `);

      this.addResult('Cleanup Test Data', true, 'Test data cleaned up successfully');
    } catch (error) {
      this.addResult('Cleanup Test Data', false, `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private addResult(name: string, passed: boolean, message: string, details?: any): void {
    this.results.push({ name, passed, message, details });
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${name}: ${message}`);
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const failed = total - passed;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`  - ${result.name}: ${result.message}`);
        });
    }

    console.log('\n🎯 COMPONENT STATUS:');
    console.log(`  Cross-Agent Contamination Detection: ${this.getComponentStatus(['Clean Data Contamination Check', 'Contamination Detection'])}`);
    console.log(`  Orphaned Records Detection: ${this.getComponentStatus(['Orphaned Records Detection'])}`);
    console.log(`  Trigger Monitoring: ${this.getComponentStatus(['Trigger Monitoring'])}`);
    console.log(`  Performance Monitoring: ${this.getComponentStatus(['Performance Monitoring'])}`);
    console.log(`  Alert System: ${this.getComponentStatus(['Alert Generation', 'Alert Statistics'])}`);
    console.log(`  User Isolation Validation: ${this.getComponentStatus(['Clean User Isolation', 'Isolation Violation Detection'])}`);
    console.log(`  Comprehensive Metrics: ${this.getComponentStatus(['Comprehensive Metrics'])}`);

    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! Data Integrity Monitoring System is fully functional.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix the issues before deploying.');
    }
  }

  private getComponentStatus(testNames: string[]): string {
    const componentResults = this.results.filter(r => testNames.includes(r.name));
    const componentPassed = componentResults.filter(r => r.passed).length;
    const componentTotal = componentResults.length;
    
    if (componentPassed === componentTotal) {
      return '✅ WORKING';
    } else if (componentPassed > 0) {
      return '⚠️  PARTIAL';
    } else {
      return '❌ FAILED';
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const tester = new DataIntegrityTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n🏁 Test suite completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { DataIntegrityTester };