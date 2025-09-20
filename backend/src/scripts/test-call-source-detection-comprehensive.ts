#!/usr/bin/env ts-node

/**
 * Comprehensive Call Source Detection Test Runner
 * 
 * This script runs all call source detection tests including:
 * - Unit tests for WebhookDataProcessor
 * - Integration tests for database storage
 * - End-to-end webhook processing tests
 * - Historical data categorization tests
 * 
 * Requirements: Call Source Detection Acceptance Criteria
 */

import { execSync } from 'child_process';
import { pool } from '../config/database';

interface TestResult {
  testSuite: string;
  passed: boolean;
  output: string;
  error?: string;
}

class CallSourceDetectionTestRunner {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Call Source Detection Tests...\n');

    try {
      // Run unit tests
      await this.runUnitTests();
      
      // Run integration tests
      await this.runIntegrationTests();
      
      // Run database schema tests
      await this.runDatabaseTests();
      
      // Run webhook processing tests
      await this.runWebhookTests();
      
      // Generate test report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  }

  private async runUnitTests(): Promise<void> {
    console.log('📋 Running Unit Tests...');
    
    try {
      const output = execSync(
        'npm test -- --testPathPattern=webhookDataProcessor.callSource.test.ts --verbose',
        { 
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 30000
        }
      );
      
      this.results.push({
        testSuite: 'WebhookDataProcessor Unit Tests',
        passed: true,
        output
      });
      
      console.log('✅ Unit tests passed\n');
      
    } catch (error: any) {
      this.results.push({
        testSuite: 'WebhookDataProcessor Unit Tests',
        passed: false,
        output: error.stdout || '',
        error: error.stderr || error.message
      });
      
      console.log('❌ Unit tests failed\n');
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running Integration Tests...');
    
    try {
      const output = execSync(
        'npm test -- --testPathPattern=callSourceDetection.test.ts --verbose',
        { 
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 60000
        }
      );
      
      this.results.push({
        testSuite: 'Call Source Detection Integration Tests',
        passed: true,
        output
      });
      
      console.log('✅ Integration tests passed\n');
      
    } catch (error: any) {
      this.results.push({
        testSuite: 'Call Source Detection Integration Tests',
        passed: false,
        output: error.stdout || '',
        error: error.stderr || error.message
      });
      
      console.log('❌ Integration tests failed\n');
    }
  }

  private async runDatabaseTests(): Promise<void> {
    console.log('🗄️ Running Database Schema Tests...');
    
    try {
      // Test database schema and constraints
      await this.testDatabaseSchema();
      await this.testDatabaseConstraints();
      await this.testDatabaseIndexes();
      await this.testDatabaseFunctions();
      
      this.results.push({
        testSuite: 'Database Schema Tests',
        passed: true,
        output: 'All database schema tests passed'
      });
      
      console.log('✅ Database tests passed\n');
      
    } catch (error: any) {
      this.results.push({
        testSuite: 'Database Schema Tests',
        passed: false,
        output: '',
        error: error.message
      });
      
      console.log('❌ Database tests failed:', error.message, '\n');
    }
  }

  private async runWebhookTests(): Promise<void> {
    console.log('🔗 Running Webhook Processing Tests...');
    
    try {
      // Test webhook processing with different payloads
      await this.testPhoneCallWebhook();
      await this.testInternetCallWebhook();
      await this.testUnknownCallWebhook();
      await this.testMalformedWebhook();
      
      this.results.push({
        testSuite: 'Webhook Processing Tests',
        passed: true,
        output: 'All webhook processing tests passed'
      });
      
      console.log('✅ Webhook tests passed\n');
      
    } catch (error: any) {
      this.results.push({
        testSuite: 'Webhook Processing Tests',
        passed: false,
        output: '',
        error: error.message
      });
      
      console.log('❌ Webhook tests failed:', error.message, '\n');
    }
  }

  private async testDatabaseSchema(): Promise<void> {
    console.log('  📊 Testing database schema...');
    
    // Check call_source column exists
    const columnResult = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'calls' AND column_name = 'call_source'
    `);
    
    if (columnResult.rows.length === 0) {
      throw new Error('call_source column not found in calls table');
    }
    
    const column = columnResult.rows[0];
    if (column.data_type !== 'character varying') {
      throw new Error(`call_source column has wrong type: ${column.data_type}`);
    }
    
    if (!column.column_default?.includes('phone')) {
      throw new Error(`call_source column has wrong default: ${column.column_default}`);
    }
    
    // Check caller_name and caller_email columns
    const contactColumnsResult = await pool.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'calls' AND column_name IN ('caller_name', 'caller_email')
    `);
    
    if (contactColumnsResult.rows.length !== 2) {
      throw new Error('caller_name and caller_email columns not found');
    }
    
    console.log('    ✅ Database schema is correct');
  }

  private async testDatabaseConstraints(): Promise<void> {
    console.log('  🔒 Testing database constraints...');
    
    // Check call_source constraint exists
    const constraintResult = await pool.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints 
      WHERE constraint_name = 'chk_call_source'
    `);
    
    if (constraintResult.rows.length === 0) {
      throw new Error('chk_call_source constraint not found');
    }
    
    const constraint = constraintResult.rows[0];
    const checkClause = constraint.check_clause;
    
    if (!checkClause.includes('phone') || !checkClause.includes('internet') || !checkClause.includes('unknown')) {
      throw new Error(`call_source constraint is incomplete: ${checkClause}`);
    }
    
    console.log('    ✅ Database constraints are correct');
  }

  private async testDatabaseIndexes(): Promise<void> {
    console.log('  📇 Testing database indexes...');
    
    // Check for call source indexes
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'calls' AND indexname LIKE '%source%'
    `);
    
    if (indexResult.rows.length === 0) {
      throw new Error('No call source indexes found');
    }
    
    const sourceUserIndex = indexResult.rows.find(row => 
      row.indexname === 'idx_calls_source_user'
    );
    
    if (!sourceUserIndex) {
      throw new Error('idx_calls_source_user index not found');
    }
    
    if (!sourceUserIndex.indexdef.includes('call_source') || !sourceUserIndex.indexdef.includes('user_id')) {
      throw new Error('idx_calls_source_user index is incorrect');
    }
    
    console.log('    ✅ Database indexes are correct');
  }

  private async testDatabaseFunctions(): Promise<void> {
    console.log('  ⚙️ Testing database functions...');
    
    // Test determine_call_source function
    const testCases = [
      { caller_id: '+1234567890', call_type: 'phone', expected: 'phone' },
      { caller_id: 'internal', call_type: 'web', expected: 'internet' },
      { caller_id: null, call_type: 'web', expected: 'internet' },
      { caller_id: 'unknown', call_type: 'unknown', expected: 'unknown' }
    ];
    
    for (const { caller_id, call_type, expected } of testCases) {
      const result = await pool.query(
        'SELECT determine_call_source($1, $2) as call_source',
        [caller_id, call_type]
      );
      
      if (result.rows[0].call_source !== expected) {
        throw new Error(
          `determine_call_source(${caller_id}, ${call_type}) returned ${result.rows[0].call_source}, expected ${expected}`
        );
      }
    }
    
    console.log('    ✅ Database functions are correct');
  }

  private async testPhoneCallWebhook(): Promise<void> {
    console.log('  📞 Testing phone call webhook processing...');
    
    const { WebhookDataProcessor } = await import('../services/webhookDataProcessor');
    
    const webhookData = {
      conversation_initiation_client_data: {
        dynamic_variables: {
          system__caller_id: '+1234567890',
          system__call_type: 'phone',
          caller_name: 'John Doe',
          caller_email: 'john@example.com'
        }
      }
    };
    
    const callSourceInfo = WebhookDataProcessor.getCallSourceInfo(webhookData);
    
    if (callSourceInfo.callSource !== 'phone') {
      throw new Error(`Expected phone call source, got ${callSourceInfo.callSource}`);
    }
    
    if (!callSourceInfo.contactInfo || callSourceInfo.contactInfo.phoneNumber !== '+1234567890') {
      throw new Error('Phone number not extracted correctly');
    }
    
    console.log('    ✅ Phone call webhook processing is correct');
  }

  private async testInternetCallWebhook(): Promise<void> {
    console.log('  🌐 Testing internet call webhook processing...');
    
    const { WebhookDataProcessor } = await import('../services/webhookDataProcessor');
    
    const webhookData = {
      conversation_initiation_client_data: {
        dynamic_variables: {
          system__caller_id: 'internal',
          system__call_type: 'web',
          caller_email: 'visitor@example.com'
        }
      }
    };
    
    const callSourceInfo = WebhookDataProcessor.getCallSourceInfo(webhookData);
    
    if (callSourceInfo.callSource !== 'internet') {
      throw new Error(`Expected internet call source, got ${callSourceInfo.callSource}`);
    }
    
    if (!callSourceInfo.contactInfo || callSourceInfo.contactInfo.email !== 'visitor@example.com') {
      throw new Error('Email not extracted correctly for internet call');
    }
    
    console.log('    ✅ Internet call webhook processing is correct');
  }

  private async testUnknownCallWebhook(): Promise<void> {
    console.log('  ❓ Testing unknown call webhook processing...');
    
    const { WebhookDataProcessor } = await import('../services/webhookDataProcessor');
    
    const webhookData = {
      conversation_initiation_client_data: {
        dynamic_variables: {
          system__caller_id: 'unknown-format',
          system__call_type: 'unknown-type'
        }
      }
    };
    
    const callSourceInfo = WebhookDataProcessor.getCallSourceInfo(webhookData);
    
    if (callSourceInfo.callSource !== 'unknown') {
      throw new Error(`Expected unknown call source, got ${callSourceInfo.callSource}`);
    }
    
    if (callSourceInfo.contactInfo !== null) {
      throw new Error('Expected null contact info for unknown call');
    }
    
    console.log('    ✅ Unknown call webhook processing is correct');
  }

  private async testMalformedWebhook(): Promise<void> {
    console.log('  🚫 Testing malformed webhook processing...');
    
    const { WebhookDataProcessor } = await import('../services/webhookDataProcessor');
    
    const malformedWebhook = {
      // Missing conversation_initiation_client_data
      analysis: {
        call_successful: false
      }
    };
    
    const callSourceInfo = WebhookDataProcessor.getCallSourceInfo(malformedWebhook);
    
    if (callSourceInfo.callSource !== 'unknown') {
      throw new Error(`Expected unknown call source for malformed webhook, got ${callSourceInfo.callSource}`);
    }
    
    if (callSourceInfo.contactInfo !== null) {
      throw new Error('Expected null contact info for malformed webhook');
    }
    
    console.log('    ✅ Malformed webhook processing is correct');
  }

  private generateReport(): void {
    console.log('\n📊 Test Results Summary');
    console.log('========================\n');
    
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
      console.log('\n❌ Some tests failed. Please review the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All call source detection tests passed!');
      console.log('\n✅ Call Source Detection Acceptance Criteria Verified:');
      console.log('   ✓ Phone calls correctly identified and labeled');
      console.log('   ✓ Internet calls correctly identified and labeled');
      console.log('   ✓ Unknown sources handled gracefully');
      console.log('   ✓ Call source storage working correctly');
      console.log('   ✓ Historical data categorization implemented');
      console.log('   ✓ Database schema and constraints in place');
      console.log('   ✓ Webhook processing with call source detection');
      console.log('   ✓ Analytics queries support call source filtering');
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const testRunner = new CallSourceDetectionTestRunner();
  testRunner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { CallSourceDetectionTestRunner };