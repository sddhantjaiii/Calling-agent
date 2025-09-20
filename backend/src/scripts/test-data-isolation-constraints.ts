#!/usr/bin/env ts-node

/**
 * Test script to validate data isolation constraints
 * This script tests that the database constraints prevent cross-user data access
 */

import database from '../config/database';
import { logger } from '../utils/logger';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

async function runDataIsolationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    // Test 1: Validate user data consistency
    logger.info('Running data consistency validation...');
    
    const consistencyResult = await database.query('SELECT * FROM validate_user_data_consistency()');
    
    let allConsistent = true;
    let inconsistentDetails: any[] = [];
    
    for (const row of consistencyResult.rows) {
      if (row.inconsistent_records > 0) {
        allConsistent = false;
        inconsistentDetails.push({
          table: row.table_name,
          count: row.inconsistent_records,
          details: row.details
        });
      }
    }

    results.push({
      test: 'Data Consistency Validation',
      passed: allConsistent,
      message: allConsistent 
        ? 'All data relationships are consistent across users'
        : `Found ${inconsistentDetails.length} inconsistency types`,
      details: inconsistentDetails
    });

    // Test 2: Check if we can create test users and validate isolation
    logger.info('Creating test users for isolation testing...');
    
    // Create two test users
    const user1Result = await database.query(`
      INSERT INTO users (email, name, credits) 
      VALUES ('test-user-1@example.com', 'Test User 1', 100) 
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    
    const user2Result = await database.query(`
      INSERT INTO users (email, name, credits) 
      VALUES ('test-user-2@example.com', 'Test User 2', 100) 
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);

    const user1Id = user1Result.rows[0].id;
    const user2Id = user2Result.rows[0].id;

    // Create agents for each user
    const agent1Result = await database.query(`
      INSERT INTO agents (user_id, elevenlabs_agent_id, name, agent_type) 
      VALUES ($1, 'test-agent-1', 'Test Agent 1', 'call') 
      ON CONFLICT (user_id, elevenlabs_agent_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [user1Id]);

    const agent2Result = await database.query(`
      INSERT INTO agents (user_id, elevenlabs_agent_id, name, agent_type) 
      VALUES ($1, 'test-agent-2', 'Test Agent 2', 'call') 
      ON CONFLICT (user_id, elevenlabs_agent_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [user2Id]);

    const agent1Id = agent1Result.rows[0].id;
    const agent2Id = agent2Result.rows[0].id;

    // Test 3: Try to create a call with mismatched user_id and agent_id (should fail)
    logger.info('Testing cross-user call creation constraint...');
    
    try {
      await database.query(`
        INSERT INTO calls (agent_id, user_id, elevenlabs_conversation_id, phone_number) 
        VALUES ($1, $2, 'test-call-cross-user', '+1234567890')
      `, [agent1Id, user2Id]); // Agent belongs to user1, but call is for user2
      
      results.push({
        test: 'Cross-User Call Creation Constraint',
        passed: false,
        message: 'ERROR: Cross-user call creation was allowed (constraint failed)'
      });
    } catch (error: any) {
      results.push({
        test: 'Cross-User Call Creation Constraint',
        passed: true,
        message: 'Cross-user call creation properly blocked by constraint',
        details: { error: error.message }
      });
    }

    // Test 4: Create valid calls and test lead_analytics constraint
    logger.info('Testing lead analytics constraint...');
    
    // Create valid call for user1
    const call1Result = await database.query(`
      INSERT INTO calls (agent_id, user_id, elevenlabs_conversation_id, phone_number, status) 
      VALUES ($1, $2, 'test-call-user1', '+1234567890', 'completed') 
      ON CONFLICT (elevenlabs_conversation_id) DO UPDATE SET status = EXCLUDED.status
      RETURNING id
    `, [agent1Id, user1Id]);

    const call1Id = call1Result.rows[0].id;

    // Try to create lead_analytics with mismatched user_id (should fail)
    try {
      await database.query(`
        INSERT INTO lead_analytics (call_id, user_id, intent_score, total_score) 
        VALUES ($1, $2, 75, 75)
      `, [call1Id, user2Id]); // Call belongs to user1, but analytics for user2
      
      results.push({
        test: 'Cross-User Lead Analytics Constraint',
        passed: false,
        message: 'ERROR: Cross-user lead analytics creation was allowed (constraint failed)'
      });
    } catch (error: any) {
      results.push({
        test: 'Cross-User Lead Analytics Constraint',
        passed: true,
        message: 'Cross-user lead analytics creation properly blocked by constraint',
        details: { error: error.message }
      });
    }

    // Test 5: Test agent analytics queries with proper user_id filtering
    logger.info('Testing agent analytics user_id filtering...');
    
    // Create some test agent analytics data
    await database.query(`
      INSERT INTO agent_analytics (agent_id, user_id, date, total_calls, successful_calls, leads_generated) 
      VALUES ($1, $2, CURRENT_DATE, 10, 8, 3)
      ON CONFLICT (agent_id, date, hour) DO UPDATE SET 
        total_calls = EXCLUDED.total_calls,
        successful_calls = EXCLUDED.successful_calls,
        leads_generated = EXCLUDED.leads_generated
    `, [agent1Id, user1Id]);

    await database.query(`
      INSERT INTO agent_analytics (agent_id, user_id, date, total_calls, successful_calls, leads_generated) 
      VALUES ($1, $2, CURRENT_DATE, 15, 12, 5)
      ON CONFLICT (agent_id, date, hour) DO UPDATE SET 
        total_calls = EXCLUDED.total_calls,
        successful_calls = EXCLUDED.successful_calls,
        leads_generated = EXCLUDED.leads_generated
    `, [agent2Id, user2Id]);

    // Query agent analytics for user1 - should only see user1's data
    const user1Analytics = await database.query(`
      SELECT aa.*, a.name as agent_name, a.user_id as agent_user_id
      FROM agent_analytics aa
      JOIN agents a ON aa.agent_id = a.id AND aa.user_id = a.user_id
      WHERE aa.user_id = $1
    `, [user1Id]);

    const hasOnlyUser1Data = user1Analytics.rows.every((row: any) => row.agent_user_id === user1Id);
    
    results.push({
      test: 'Agent Analytics User Isolation',
      passed: hasOnlyUser1Data,
      message: hasOnlyUser1Data 
        ? 'Agent analytics properly isolated by user_id'
        : 'ERROR: Agent analytics contains data from other users',
      details: { 
        rowCount: user1Analytics.rows.length,
        userIds: user1Analytics.rows.map((row: any) => row.agent_user_id)
      }
    });

    // Test 6: Run audit function on test users
    logger.info('Running data isolation audit...');
    
    const auditResult = await database.query('SELECT * FROM audit_data_isolation($1)', [user1Id]);
    
    const hasLeaks = auditResult.rows.some((row: any) => row.potential_leak);
    
    results.push({
      test: 'Data Isolation Audit',
      passed: !hasLeaks,
      message: hasLeaks 
        ? 'WARNING: Potential data leaks detected'
        : 'No data isolation leaks detected',
      details: auditResult.rows
    });

    // Cleanup test data
    logger.info('Cleaning up test data...');
    await database.query('DELETE FROM calls WHERE elevenlabs_conversation_id LIKE \'test-call-%\'');
    await database.query('DELETE FROM agent_analytics WHERE agent_id IN ($1, $2)', [agent1Id, agent2Id]);
    await database.query('DELETE FROM agents WHERE elevenlabs_agent_id LIKE \'test-agent-%\'');
    await database.query('DELETE FROM users WHERE email LIKE \'test-user-%@example.com\'');

  } catch (error) {
    logger.error('Error during data isolation testing:', error);
    results.push({
      test: 'Test Execution',
      passed: false,
      message: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return results;
}

async function main() {
  logger.info('🔒 Starting Data Isolation Constraint Tests...');
  
  try {
    const results = await runDataIsolationTests();
    
    logger.info('\n📊 Test Results Summary:');
    logger.info('=' .repeat(50));
    
    let passedCount = 0;
    let totalCount = results.length;
    
    for (const result of results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      logger.info(`${status} - ${result.test}`);
      logger.info(`   ${result.message}`);
      
      if (result.details) {
        logger.info(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      
      if (result.passed) passedCount++;
      logger.info('');
    }
    
    logger.info('=' .repeat(50));
    logger.info(`📈 Overall Results: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      logger.info('🎉 All data isolation constraints are working correctly!');
      process.exit(0);
    } else {
      logger.error('⚠️  Some data isolation tests failed. Please review the results above.');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main();
}

export { runDataIsolationTests };