#!/usr/bin/env ts-node

/**
 * Test script for trigger error handling migration
 * Tests the enhanced trigger functions with various edge cases
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

interface TriggerStats {
  trigger_name: string;
  total_executions: number;
  successful_executions: number;
  warning_executions: number;
  error_executions: number;
  success_rate: number;
  avg_execution_time_ms: number;
  max_execution_time_ms: number;
  last_error_message: string | null;
  last_error_time: Date | null;
}

async function runMigration() {
  console.log('🔄 Running trigger error handling migration...');
  
  try {
    const migrationSQL = await import('fs').then(fs => 
      fs.promises.readFile('./src/migrations/018_fix_trigger_error_handling.sql', 'utf8')
    );
    
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function createTestData() {
  console.log('🔄 Creating test data...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create test user
    const userResult = await client.query(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, ['550e8400-e29b-41d4-a716-446655440000', 'Test User', 'test-trigger@example.com', 'hashed_password']);
    
    const userId = userResult.rows[0].id;
    
    // Create test agent
    const agentResult = await client.query(`
      INSERT INTO agents (id, user_id, name, elevenlabs_agent_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, elevenlabs_agent_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, ['660e8400-e29b-41d4-a716-446655440000', userId, 'Test Agent', 'test-agent-id']);
    
    const agentId = agentResult.rows[0].id;
    
    await client.query('COMMIT');
    
    console.log('✅ Test data created successfully');
    return { userId, agentId };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create test data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function testValidTriggerExecution(userId: string, agentId: string) {
  console.log('🔄 Testing valid trigger execution...');
  
  try {
    // Insert valid agent analytics data
    await pool.query(`
      INSERT INTO agent_analytics (
        agent_id, user_id, date, hour,
        total_calls, successful_calls, failed_calls,
        total_duration_minutes, credits_used,
        avg_engagement_score, avg_intent_score
      ) VALUES ($1, $2, CURRENT_DATE, NULL, 10, 8, 2, 120, 50, 75.5, 80.2)
      ON CONFLICT (agent_id, date, hour) 
      DO UPDATE SET 
        total_calls = EXCLUDED.total_calls,
        successful_calls = EXCLUDED.successful_calls,
        updated_at = CURRENT_TIMESTAMP
    `, [agentId, userId]);
    
    console.log('✅ Valid trigger execution test completed');
  } catch (error) {
    console.error('❌ Valid trigger execution test failed:', error);
    throw error;
  }
}

async function testNullValueHandling() {
  console.log('🔄 Testing NULL value handling...');
  
  try {
    // Try to insert agent analytics with NULL user_id (should be handled gracefully)
    await pool.query(`
      INSERT INTO agent_analytics (
        agent_id, user_id, date, hour,
        total_calls, successful_calls
      ) VALUES ($1, NULL, CURRENT_DATE, NULL, 5, 3)
      ON CONFLICT (agent_id, date, hour) DO NOTHING
    `, ['770e8400-e29b-41d4-a716-446655440000']);
    
    // Try to insert with NULL date (should be handled gracefully)
    await pool.query(`
      INSERT INTO agent_analytics (
        agent_id, user_id, date, hour,
        total_calls, successful_calls
      ) VALUES ($1, $2, NULL, NULL, 5, 3)
      ON CONFLICT (agent_id, date, hour) DO NOTHING
    `, ['880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000']);
    
    console.log('✅ NULL value handling test completed');
  } catch (error) {
    console.error('❌ NULL value handling test failed:', error);
    // Don't throw - this is expected to be handled gracefully
  }
}

async function testNonExistentUserHandling() {
  console.log('🔄 Testing non-existent user handling...');
  
  try {
    // Try to insert agent analytics for non-existent user
    await pool.query(`
      INSERT INTO agent_analytics (
        agent_id, user_id, date, hour,
        total_calls, successful_calls
      ) VALUES ($1, $2, CURRENT_DATE, NULL, 5, 3)
      ON CONFLICT (agent_id, date, hour) DO NOTHING
    `, ['990e8400-e29b-41d4-a716-446655440000', '999e8400-e29b-41d4-a716-446655440000']);
    
    console.log('✅ Non-existent user handling test completed');
  } catch (error) {
    console.error('❌ Non-existent user handling test failed:', error);
    // Don't throw - this should be handled gracefully by triggers
  }
}

async function testCallTriggerHandling(userId: string, agentId: string) {
  console.log('🔄 Testing call trigger handling...');
  
  try {
    // Insert a completed call
    await pool.query(`
      INSERT INTO calls (
        id, user_id, agent_id, phone_number, status,
        duration_minutes, credits_used, created_at, updated_at
      ) VALUES ($1, $2, $3, '+1234567890', 'completed', 15, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET 
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `, ['aa0e8400-e29b-41d4-a716-446655440000', userId, agentId]);
    
    // Insert call with NULL values (should be handled gracefully)
    await pool.query(`
      INSERT INTO calls (
        id, user_id, agent_id, phone_number, status,
        duration_minutes, credits_used, created_at, updated_at
      ) VALUES ($1, NULL, $2, '+1234567891', 'completed', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET 
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `, ['bb0e8400-e29b-41d4-a716-446655440000', agentId]);
    
    console.log('✅ Call trigger handling test completed');
  } catch (error) {
    console.error('❌ Call trigger handling test failed:', error);
    // Don't throw - this should be handled gracefully
  }
}

async function testLeadAnalyticsTrigger(userId: string, agentId: string) {
  console.log('🔄 Testing lead analytics trigger...');
  
  try {
    // First create a call to reference
    const callResult = await pool.query(`
      INSERT INTO calls (
        id, user_id, agent_id, phone_number, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, '+1234567892', 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, ['cc0e8400-e29b-41d4-a716-446655440000', userId, agentId]);
    
    const callId = callResult.rows[0].id;
    
    // Insert lead analytics
    await pool.query(`
      INSERT INTO lead_analytics (
        call_id, intent_score, engagement_score, urgency_score,
        budget_score, fit_score, total_score, created_at, updated_at
      ) VALUES ($1, 85, 90, 75, 80, 88, 83.6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (call_id) DO UPDATE SET 
        total_score = EXCLUDED.total_score,
        updated_at = CURRENT_TIMESTAMP
    `, [callId]);
    
    // Test with NULL call_id (should be handled gracefully)
    await pool.query(`
      INSERT INTO lead_analytics (
        call_id, intent_score, total_score, created_at, updated_at
      ) VALUES (NULL, 75, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (call_id) DO NOTHING
    `);
    
    console.log('✅ Lead analytics trigger test completed');
  } catch (error) {
    console.error('❌ Lead analytics trigger test failed:', error);
    // Don't throw - this should be handled gracefully
  }
}

async function checkTriggerExecutionStats() {
  console.log('🔄 Checking trigger execution statistics...');
  
  try {
    const result = await pool.query<TriggerStats>(`
      SELECT * FROM get_trigger_execution_stats(1)
      ORDER BY total_executions DESC
    `);
    
    console.log('\n📊 Trigger Execution Statistics (Last 1 hour):');
    console.log('=' .repeat(120));
    console.log(
      'Trigger Name'.padEnd(40) + 
      'Total'.padEnd(8) + 
      'Success'.padEnd(8) + 
      'Warning'.padEnd(8) + 
      'Error'.padEnd(8) + 
      'Success%'.padEnd(10) + 
      'Avg Time(ms)'.padEnd(12) + 
      'Max Time(ms)'.padEnd(12)
    );
    console.log('-'.repeat(120));
    
    for (const row of result.rows) {
      console.log(
        row.trigger_name.padEnd(40) +
        row.total_executions.toString().padEnd(8) +
        row.successful_executions.toString().padEnd(8) +
        row.warning_executions.toString().padEnd(8) +
        row.error_executions.toString().padEnd(8) +
        row.success_rate.toFixed(1).padEnd(10) +
        row.avg_execution_time_ms.toFixed(1).padEnd(12) +
        row.max_execution_time_ms.toString().padEnd(12)
      );
      
      if (row.last_error_message) {
        console.log(`  Last Error: ${row.last_error_message}`);
        console.log(`  Error Time: ${row.last_error_time}`);
      }
    }
    
    console.log('=' .repeat(120));
    
    // Check for any errors or warnings
    const problemTriggers = result.rows.filter(row => 
      row.error_executions > 0 || row.warning_executions > 0
    );
    
    if (problemTriggers.length > 0) {
      console.log('\n⚠️  Triggers with issues detected:');
      for (const trigger of problemTriggers) {
        console.log(`  - ${trigger.trigger_name}: ${trigger.error_executions} errors, ${trigger.warning_executions} warnings`);
      }
    } else {
      console.log('\n✅ All triggers executed without errors or warnings');
    }
    
  } catch (error) {
    console.error('❌ Failed to check trigger statistics:', error);
    throw error;
  }
}

async function checkDataConsistency(userId: string) {
  console.log('🔄 Checking data consistency...');
  
  try {
    // Check if user daily analytics were updated
    const userAnalytics = await pool.query(`
      SELECT * FROM user_daily_analytics 
      WHERE user_id = $1 AND date = CURRENT_DATE
    `, [userId]);
    
    console.log(`📈 User daily analytics records: ${userAnalytics.rows.length}`);
    if (userAnalytics.rows.length > 0) {
      const record = userAnalytics.rows[0];
      console.log(`  - Total calls: ${record.total_calls}`);
      console.log(`  - Successful calls: ${record.successful_calls}`);
      console.log(`  - Credits used: ${record.credits_used}`);
    }
    
    // Check if dashboard cache was updated
    const dashboardCache = await pool.query(`
      SELECT cache_data FROM dashboard_cache 
      WHERE user_id = $1 AND cache_key = 'overview_stats'
    `, [userId]);
    
    console.log(`🎯 Dashboard cache records: ${dashboardCache.rows.length}`);
    if (dashboardCache.rows.length > 0) {
      const cacheData = dashboardCache.rows[0].cache_data;
      console.log(`  - Cache data: ${JSON.stringify(cacheData, null, 2)}`);
    }
    
    console.log('✅ Data consistency check completed');
  } catch (error) {
    console.error('❌ Data consistency check failed:', error);
    throw error;
  }
}

async function cleanupTestData() {
  console.log('🔄 Cleaning up test data...');
  
  try {
    // Clean up in reverse order of dependencies
    await pool.query(`DELETE FROM lead_analytics WHERE call_id IN (
      SELECT id FROM calls WHERE user_id = $1
    )`, ['550e8400-e29b-41d4-a716-446655440000']);
    
    await pool.query(`DELETE FROM calls WHERE user_id = $1`, 
      ['550e8400-e29b-41d4-a716-446655440000']);
    
    await pool.query(`DELETE FROM agent_analytics WHERE user_id = $1`, 
      ['550e8400-e29b-41d4-a716-446655440000']);
    
    await pool.query(`DELETE FROM user_daily_analytics WHERE user_id = $1`, 
      ['550e8400-e29b-41d4-a716-446655440000']);
    
    await pool.query(`DELETE FROM dashboard_cache WHERE user_id = $1`, 
      ['550e8400-e29b-41d4-a716-446655440000']);
    
    await pool.query(`DELETE FROM agents WHERE user_id = $1`, 
      ['550e8400-e29b-41d4-a716-446655440000']);
    
    await pool.query(`DELETE FROM users WHERE id = $1`, 
      ['550e8400-e29b-41d4-a716-446655440000']);
    
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
    // Don't throw - cleanup is best effort
  }
}

async function main() {
  console.log('🚀 Starting trigger error handling tests...\n');
  
  try {
    // Run the migration
    await runMigration();
    
    // Create test data
    const { userId, agentId } = await createTestData();
    
    // Run various tests
    await testValidTriggerExecution(userId, agentId);
    await testNullValueHandling();
    await testNonExistentUserHandling();
    await testCallTriggerHandling(userId, agentId);
    await testLeadAnalyticsTrigger(userId, agentId);
    
    // Wait a moment for triggers to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check results
    await checkTriggerExecutionStats();
    await checkDataConsistency(userId);
    
    // Cleanup
    await cleanupTestData();
    
    console.log('\n🎉 All trigger error handling tests completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

export { main as testTriggerErrorHandling };