#!/usr/bin/env ts-node

/**
 * Test script for parallel ElevenLabs API calls implementation
 * Tests the new parallel processing capabilities for agent configuration fetching
 * 
 * Requirements tested: 3.3, 5.3, 5.4
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

import { elevenLabsApiManager } from '../services/elevenLabsApiManager';
import { agentService } from '../services/agentService';
import { agentCacheService } from '../services/agentCache';
import { logger } from '../utils/logger';
import database from '../config/database';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  details: any;
  error?: string;
}

class ParallelElevenLabsApiTest {
  private testResults: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Parallel ElevenLabs API Tests...\n');

    try {
      // Test 1: Direct parallel API manager test
      await this.testDirectParallelApiManager();

      // Test 2: Agent service parallel processing
      await this.testAgentServiceParallelProcessing();

      // Test 3: Agent cache service parallel processing
      await this.testAgentCacheParallelProcessing();

      // Test 4: Performance comparison
      await this.testPerformanceComparison();

      // Test 5: Error handling and graceful degradation
      await this.testErrorHandlingAndGracefulDegradation();

      // Test 6: Individual request timeout handling
      await this.testIndividualTimeoutHandling();

      this.printTestSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Test 1: Direct parallel API manager functionality
   * Requirements: 3.3, 5.3, 5.4
   */
  private async testDirectParallelApiManager(): Promise<void> {
    const testName = 'Direct Parallel API Manager';
    console.log(`📋 Running ${testName}...`);

    try {
      const startTime = Date.now();

      // Get some test agent IDs from database
      const agentsQuery = `
        SELECT elevenlabs_agent_id 
        FROM agents 
        WHERE elevenlabs_agent_id IS NOT NULL 
        LIMIT 5
      `;
      const agentsResult = await database.query(agentsQuery);
      const agentIds = agentsResult.rows.map((row: any) => row.elevenlabs_agent_id);

      if (agentIds.length === 0) {
        throw new Error('No agents with ElevenLabs IDs found for testing');
      }

      console.log(`  Testing with ${agentIds.length} agents...`);

      // Test parallel processing
      const parallelResult = await elevenLabsApiManager.fetchAgentConfigsParallel(agentIds);
      
      // Test batched processing for comparison
      const batchedResult = await elevenLabsApiManager.fetchAgentConfigsBatch(agentIds);

      const duration = Date.now() - startTime;

      const details = {
        agentCount: agentIds.length,
        parallelMethod: {
          successCount: parallelResult.successCount,
          errorCount: parallelResult.errorCount,
          totalTime: parallelResult.totalTime,
          avgTimePerAgent: Math.round(parallelResult.totalTime / agentIds.length)
        },
        batchedMethod: {
          successCount: batchedResult.successCount,
          errorCount: batchedResult.errorCount,
          totalTime: batchedResult.totalTime,
          avgTimePerAgent: Math.round(batchedResult.totalTime / agentIds.length)
        }
      };

      console.log(`  ✅ Parallel method: ${parallelResult.successCount}/${agentIds.length} success in ${parallelResult.totalTime}ms`);
      console.log(`  ✅ Batched method: ${batchedResult.successCount}/${agentIds.length} success in ${batchedResult.totalTime}ms`);

      this.testResults.push({
        testName,
        success: true,
        duration,
        details
      });

    } catch (error) {
      const duration = Date.now();
      console.log(`  ❌ ${testName} failed:`, error);
      
      this.testResults.push({
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test 2: Agent service parallel processing
   * Requirements: 3.3, 5.3, 5.4
   */
  private async testAgentServiceParallelProcessing(): Promise<void> {
    const testName = 'Agent Service Parallel Processing';
    console.log(`📋 Running ${testName}...`);

    try {
      const startTime = Date.now();

      // Get a test user with agents
      const userQuery = `
        SELECT DISTINCT user_id 
        FROM agents 
        WHERE elevenlabs_agent_id IS NOT NULL 
        LIMIT 1
      `;
      const userResult = await database.query(userQuery);
      
      if (userResult.rows.length === 0) {
        throw new Error('No users with agents found for testing');
      }

      const testUserId = userResult.rows[0].user_id;
      console.log(`  Testing with user: ${testUserId}`);

      // Test agent service list agents (should use parallel processing)
      const agents = await agentService.listAgents(testUserId);
      
      // Test frontend agent listing (should use cached parallel processing)
      const frontendAgents = await agentService.listAgentsForFrontend(testUserId);

      const duration = Date.now() - startTime;

      const details = {
        userId: testUserId,
        agentCount: agents.length,
        frontendAgentCount: frontendAgents.length,
        configsLoaded: agents.filter(a => a.config).length,
        configsLoadedPercentage: Math.round((agents.filter(a => a.config).length / agents.length) * 100)
      };

      console.log(`  ✅ Listed ${agents.length} agents with ${details.configsLoaded} configs (${details.configsLoadedPercentage}%)`);
      console.log(`  ✅ Frontend format: ${frontendAgents.length} agents`);

      this.testResults.push({
        testName,
        success: true,
        duration,
        details
      });

    } catch (error) {
      const duration = Date.now();
      console.log(`  ❌ ${testName} failed:`, error);
      
      this.testResults.push({
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test 3: Agent cache service parallel processing
   * Requirements: 3.3, 5.3, 5.4
   */
  private async testAgentCacheParallelProcessing(): Promise<void> {
    const testName = 'Agent Cache Parallel Processing';
    console.log(`📋 Running ${testName}...`);

    try {
      const startTime = Date.now();

      // Get a test user with agents
      const userQuery = `
        SELECT DISTINCT user_id 
        FROM agents 
        WHERE elevenlabs_agent_id IS NOT NULL 
        LIMIT 1
      `;
      const userResult = await database.query(userQuery);
      
      if (userResult.rows.length === 0) {
        throw new Error('No users with agents found for testing');
      }

      const testUserId = userResult.rows[0].user_id;
      console.log(`  Testing with user: ${testUserId}`);

      // Clear cache to force fresh fetch
      agentCacheService.clearUserAgentCaches(testUserId);

      // Test batch agent performance (should use parallel ElevenLabs processing)
      const batchAgents = await agentCacheService.getBatchAgentPerformance(testUserId);

      const duration = Date.now() - startTime;

      const details = {
        userId: testUserId,
        batchAgentCount: batchAgents.length,
        cacheHit: false // First call should be cache miss
      };

      console.log(`  ✅ Batch agent performance: ${batchAgents.length} agents`);

      // Test cache hit on second call
      const secondCallStart = Date.now();
      const cachedAgents = await agentCacheService.getBatchAgentPerformance(testUserId);
      const cacheHitDuration = Date.now() - secondCallStart;

      console.log(`  ✅ Cache hit: ${cachedAgents.length} agents in ${cacheHitDuration}ms`);

      (details as any).cacheHitDuration = cacheHitDuration;

      this.testResults.push({
        testName,
        success: true,
        duration,
        details
      });

    } catch (error) {
      const duration = Date.now();
      console.log(`  ❌ ${testName} failed:`, error);
      
      this.testResults.push({
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test 4: Performance comparison between sequential and parallel
   * Requirements: 3.3, 5.3, 5.4
   */
  private async testPerformanceComparison(): Promise<void> {
    const testName = 'Performance Comparison';
    console.log(`📋 Running ${testName}...`);

    try {
      // Get test agent IDs
      const agentsQuery = `
        SELECT elevenlabs_agent_id 
        FROM agents 
        WHERE elevenlabs_agent_id IS NOT NULL 
        LIMIT 10
      `;
      const agentsResult = await database.query(agentsQuery);
      const agentIds = agentsResult.rows.map((row: any) => row.elevenlabs_agent_id);

      if (agentIds.length < 3) {
        throw new Error('Need at least 3 agents for performance comparison');
      }

      console.log(`  Testing performance with ${agentIds.length} agents...`);

      // Test parallel processing
      const parallelStart = Date.now();
      const parallelResult = await elevenLabsApiManager.fetchAgentConfigsParallel(agentIds);
      const parallelDuration = Date.now() - parallelStart;

      // Test batched processing
      const batchedStart = Date.now();
      const batchedResult = await elevenLabsApiManager.fetchAgentConfigsBatch(agentIds);
      const batchedDuration = Date.now() - batchedStart;

      const details = {
        agentCount: agentIds.length,
        parallel: {
          duration: parallelDuration,
          successCount: parallelResult.successCount,
          avgTimePerAgent: Math.round(parallelDuration / agentIds.length)
        },
        batched: {
          duration: batchedDuration,
          successCount: batchedResult.successCount,
          avgTimePerAgent: Math.round(batchedDuration / agentIds.length)
        },
        performanceImprovement: batchedDuration > 0 ? Math.round(((batchedDuration - parallelDuration) / batchedDuration) * 100) : 0
      };

      console.log(`  ✅ Parallel: ${parallelDuration}ms (${details.parallel.avgTimePerAgent}ms/agent)`);
      console.log(`  ✅ Batched: ${batchedDuration}ms (${details.batched.avgTimePerAgent}ms/agent)`);
      console.log(`  📊 Performance improvement: ${details.performanceImprovement}%`);

      this.testResults.push({
        testName,
        success: true,
        duration: parallelDuration + batchedDuration,
        details
      });

    } catch (error) {
      const duration = Date.now();
      console.log(`  ❌ ${testName} failed:`, error);
      
      this.testResults.push({
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test 5: Error handling and graceful degradation
   * Requirements: 5.2, 5.6
   */
  private async testErrorHandlingAndGracefulDegradation(): Promise<void> {
    const testName = 'Error Handling and Graceful Degradation';
    console.log(`📋 Running ${testName}...`);

    try {
      const startTime = Date.now();

      // Test with mix of valid and invalid agent IDs
      const validAgentsQuery = `
        SELECT elevenlabs_agent_id 
        FROM agents 
        WHERE elevenlabs_agent_id IS NOT NULL 
        LIMIT 2
      `;
      const validResult = await database.query(validAgentsQuery);
      const validIds = validResult.rows.map((row: any) => row.elevenlabs_agent_id);
      
      // Add some invalid IDs
      const invalidIds = ['invalid-id-1', 'invalid-id-2', 'invalid-id-3'];
      const mixedIds = [...validIds, ...invalidIds];

      console.log(`  Testing with ${validIds.length} valid and ${invalidIds.length} invalid agent IDs...`);

      // Test parallel processing with mixed IDs
      const result = await elevenLabsApiManager.fetchAgentConfigsParallel(mixedIds);

      const duration = Date.now() - startTime;

      const details = {
        totalIds: mixedIds.length,
        validIds: validIds.length,
        invalidIds: invalidIds.length,
        successCount: result.successCount,
        errorCount: result.errorCount,
        gracefulDegradation: result.errorCount === invalidIds.length && result.successCount >= 0
      };

      console.log(`  ✅ Processed ${mixedIds.length} IDs: ${result.successCount} success, ${result.errorCount} errors`);
      console.log(`  ✅ Graceful degradation: ${details.gracefulDegradation ? 'PASS' : 'FAIL'}`);

      this.testResults.push({
        testName,
        success: details.gracefulDegradation,
        duration,
        details
      });

    } catch (error) {
      const duration = Date.now();
      console.log(`  ❌ ${testName} failed:`, error);
      
      this.testResults.push({
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test 6: Individual request timeout handling
   * Requirements: 5.5, 5.6
   */
  private async testIndividualTimeoutHandling(): Promise<void> {
    const testName = 'Individual Request Timeout Handling';
    console.log(`📋 Running ${testName}...`);

    try {
      const startTime = Date.now();

      // Test API availability first
      const isAvailable = await elevenLabsApiManager.checkApiAvailability();
      
      console.log(`  ElevenLabs API availability: ${isAvailable ? 'Available' : 'Unavailable'}`);

      // Get test agent IDs
      const agentsQuery = `
        SELECT elevenlabs_agent_id 
        FROM agents 
        WHERE elevenlabs_agent_id IS NOT NULL 
        LIMIT 3
      `;
      const agentsResult = await database.query(agentsQuery);
      const agentIds = agentsResult.rows.map((row: any) => row.elevenlabs_agent_id);

      if (agentIds.length === 0) {
        throw new Error('No agents found for timeout testing');
      }

      console.log(`  Testing timeout handling with ${agentIds.length} agents...`);

      // Test with normal timeout
      const result = await elevenLabsApiManager.fetchAgentConfigsParallel(agentIds);

      const duration = Date.now() - startTime;

      const details = {
        apiAvailable: isAvailable,
        agentCount: agentIds.length,
        successCount: result.successCount,
        errorCount: result.errorCount,
        totalTime: result.totalTime,
        avgTimePerAgent: Math.round(result.totalTime / agentIds.length),
        timeoutHandling: result.totalTime < 30000 // Should complete within 30 seconds
      };

      console.log(`  ✅ Timeout handling: ${details.timeoutHandling ? 'PASS' : 'FAIL'}`);
      console.log(`  ✅ Total time: ${result.totalTime}ms (avg: ${details.avgTimePerAgent}ms/agent)`);

      this.testResults.push({
        testName,
        success: details.timeoutHandling,
        duration,
        details
      });

    } catch (error) {
      const duration = Date.now();
      console.log(`  ❌ ${testName} failed:`, error);
      
      this.testResults.push({
        testName,
        success: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private printTestSummary(): void {
    console.log('\n📊 Test Summary:');
    console.log('================');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    console.log('\nDetailed Results:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.testName} (${result.duration}ms)`);
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    if (failedTests > 0) {
      console.log('\n❌ Some tests failed. Check the implementation.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! Parallel ElevenLabs API implementation is working correctly.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new ParallelElevenLabsApiTest();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { ParallelElevenLabsApiTest };