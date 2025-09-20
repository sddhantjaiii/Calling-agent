#!/usr/bin/env ts-node

/**
 * Performance Validation Suite Runner
 * 
 * This script runs comprehensive performance validation tests for the entire system
 * to verify all performance requirements are met.
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';
import database from '../config/database';

interface TestSuite {
  name: string;
  command: string;
  timeout: number;
  required: boolean;
}

class PerformanceValidationSuite {
  private results: Array<{
    suite: string;
    passed: boolean;
    duration: number;
    output?: string;
    error?: string;
  }> = [];

  constructor() {
    // Database connection handled by singleton
  }

  /**
   * Check system prerequisites
   */
  async checkPrerequisites(): Promise<void> {
    console.log('🔍 Checking system prerequisites...');

    // Check database connection
    try {
      await database.initialize();
      await database.query('SELECT NOW()');
      console.log('✅ Database connection: OK');
    } catch (error) {
      console.error('❌ Database connection failed:', error instanceof Error ? error.message : String(error));
      throw new Error('Database connection required for performance tests');
    }

    // Check if required tables exist
    const requiredTables = ['calls', 'agents', 'users', 'lead_analytics', 'agent_analytics'];
    
    for (const table of requiredTables) {
      try {
        const result = await database.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        if (!result.rows[0].exists) {
          console.warn(`⚠️  Table '${table}' not found - some tests may fail`);
        } else {
          console.log(`✅ Table '${table}': OK`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not check table '${table}':`, error.message);
      }
    }

    // Check if test data exists
    try {
      const userCount = await database.query('SELECT COUNT(*) FROM users');
      const callCount = await database.query('SELECT COUNT(*) FROM calls');
      
      console.log(`📊 Test data: ${userCount.rows[0].count} users, ${callCount.rows[0].count} calls`);
      
      if (parseInt(userCount.rows[0].count) === 0) {
        console.warn('⚠️  No test users found - creating minimal test data...');
        await this.createMinimalTestData();
      }
    } catch (error) {
      console.warn('⚠️  Could not check test data:', error.message);
    }
  }

  /**
   * Create minimal test data for performance tests
   */
  async createMinimalTestData(): Promise<void> {
    try {
      // Create test user
      await database.query(`
        INSERT INTO users (id, email, password_hash, created_at, updated_at)
        VALUES (1, 'test@example.com', 'test_hash', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);

      // Create test agent
      await database.query(`
        INSERT INTO agents (id, user_id, name, voice_id, created_at, updated_at)
        VALUES (1, 1, 'Test Agent', 'test_voice', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);

      // Create test calls
      await database.query(`
        INSERT INTO calls (user_id, agent_id, phone_number, status, created_at, updated_at)
        SELECT 
          1 as user_id,
          1 as agent_id,
          '+1555000' || LPAD(generate_series::text, 4, '0') as phone_number,
          CASE WHEN generate_series % 3 = 0 THEN 'completed' ELSE 'in_progress' END as status,
          NOW() - (generate_series || ' minutes')::interval as created_at,
          NOW() - (generate_series || ' minutes')::interval as updated_at
        FROM generate_series(1, 100)
        ON CONFLICT DO NOTHING
      `);

      console.log('✅ Minimal test data created');
    } catch (error) {
      console.warn('⚠️  Could not create test data:', error.message);
    }
  }

  /**
   * Run a test suite
   */
  async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`\n🧪 Running ${suite.name}...`);
    
    const start = performance.now();
    
    try {
      const output = execSync(suite.command, {
        timeout: suite.timeout,
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      const duration = performance.now() - start;
      
      this.results.push({
        suite: suite.name,
        passed: true,
        duration,
        output
      });
      
      console.log(`✅ ${suite.name} completed in ${duration.toFixed(2)}ms`);
      
    } catch (error) {
      const duration = performance.now() - start;
      
      this.results.push({
        suite: suite.name,
        passed: false,
        duration,
        error: error.message
      });
      
      console.error(`❌ ${suite.name} failed after ${duration.toFixed(2)}ms`);
      
      if (suite.required) {
        console.error(`Error: ${error.message}`);
        throw new Error(`Required test suite '${suite.name}' failed`);
      } else {
        console.warn(`Warning: Optional test suite '${suite.name}' failed: ${error.message}`);
      }
    }
  }

  /**
   * Run all performance validation tests
   */
  async runAllTests(): Promise<void> {
    const testSuites: TestSuite[] = [
      {
        name: 'Backend Performance Validation',
        command: 'npx ts-node src/scripts/test-performance-validation-comprehensive.ts',
        timeout: 60000, // 60 seconds
        required: true
      },
      {
        name: 'Database Query Performance',
        command: 'npx ts-node src/scripts/test-analytics-endpoint.js',
        timeout: 30000, // 30 seconds
        required: false
      },
      {
        name: 'Trigger Performance Validation',
        command: 'npx ts-node src/scripts/test-trigger-performance-optimization.ts',
        timeout: 30000,
        required: false
      },
      {
        name: 'Cache Performance Validation',
        command: 'npx ts-node src/scripts/test-cache-invalidation-system.ts',
        timeout: 30000,
        required: false
      }
    ];

    console.log('🚀 Starting Performance Validation Suite...');
    console.log(`Total test suites: ${testSuites.length}`);

    await this.checkPrerequisites();

    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }
  }

  /**
   * Run frontend performance tests
   */
  async runFrontendTests(): Promise<void> {
    console.log('\n🌐 Running Frontend Performance Tests...');
    
    try {
      // Check if frontend is available
      const frontendCheck = execSync('curl -f http://localhost:8080 || echo "Frontend not available"', {
        encoding: 'utf8',
        timeout: 5000
      });
      
      if (frontendCheck.includes('not available')) {
        console.warn('⚠️  Frontend server not running - skipping frontend tests');
        console.log('💡 To run frontend tests, start the frontend server with: npm run dev');
        return;
      }

      // Run frontend performance tests
      const frontendTestCommand = 'cd ../Frontend && npx ts-node src/scripts/test-frontend-performance-validation.ts';
      
      await this.runTestSuite({
        name: 'Frontend Performance Validation',
        command: frontendTestCommand,
        timeout: 60000,
        required: false
      });
      
    } catch (error) {
      console.warn('⚠️  Frontend performance tests failed:', error.message);
      console.log('💡 Make sure the frontend server is running on port 8080');
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport(): void {
    console.log('\n📊 Performance Validation Suite Report');
    console.log('======================================');

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`\n📈 Summary:`);
    console.log(`Total test suites: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);

    if (totalTests > 0) {
      const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
      console.log(`Total execution time: ${(totalDuration / 1000).toFixed(2)}s`);
    }

    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const duration = (result.duration / 1000).toFixed(2);
      
      console.log(`${status} ${result.suite} (${duration}s)`);
      
      if (!result.passed && result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });

    // Performance requirements summary
    console.log('\n🎯 Performance Requirements Status:');
    
    const backendTests = this.results.filter(r => r.suite.includes('Backend') || r.suite.includes('Database'));
    const backendPass = backendTests.length === 0 || backendTests.some(r => r.passed);
    console.log(`Backend performance: ${backendPass ? '✅ PASS' : '❌ FAIL'}`);

    const frontendTests = this.results.filter(r => r.suite.includes('Frontend'));
    const frontendPass = frontendTests.length === 0 || frontendTests.some(r => r.passed);
    console.log(`Frontend performance: ${frontendPass ? '✅ PASS' : '❌ FAIL'}`);

    const triggerTests = this.results.filter(r => r.suite.includes('Trigger'));
    const triggerPass = triggerTests.length === 0 || triggerTests.some(r => r.passed);
    console.log(`Trigger performance: ${triggerPass ? '✅ PASS' : '❌ FAIL'}`);

    const cacheTests = this.results.filter(r => r.suite.includes('Cache'));
    const cachePass = cacheTests.length === 0 || cacheTests.some(r => r.passed);
    console.log(`Cache performance: ${cachePass ? '✅ PASS' : '❌ FAIL'}`);

    const overallPass = passedTests > 0 && failedTests === 0;
    console.log(`\n🏆 Overall Performance Status: ${overallPass ? '✅ PASS' : '❌ NEEDS ATTENTION'}`);

    if (!overallPass) {
      console.log('\n📝 Recommendations:');
      
      if (failedTests > 0) {
        console.log('• Review failed test suites above');
        console.log('• Check database performance and indexing');
        console.log('• Verify trigger optimization is working correctly');
        console.log('• Ensure cache invalidation is functioning properly');
      }
      
      if (frontendTests.length === 0) {
        console.log('• Start frontend server to run frontend performance tests');
      }
      
      console.log('• Consider running individual test suites for detailed analysis');
    } else {
      console.log('\n🎉 All performance requirements are being met!');
    }
  }

  async cleanup(): Promise<void> {
    await database.close();
  }
}

async function main(): Promise<void> {
  const suite = new PerformanceValidationSuite();

  try {
    await suite.runAllTests();
    await suite.runFrontendTests();
    suite.generateReport();
    
  } catch (error) {
    console.error('❌ Performance validation suite failed:', error);
    process.exit(1);
  } finally {
    await suite.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceValidationSuite };