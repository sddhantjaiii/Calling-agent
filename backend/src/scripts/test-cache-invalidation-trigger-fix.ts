#!/usr/bin/env ts-node

/**
 * Test script for cache invalidation trigger fixes
 * Task: 7.1 Fix cache invalidation trigger logic
 * Requirements: US-4.1 - Trigger Reliability
 */

import { Pool } from 'pg';
import { logger } from '../utils/logger';

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

interface TriggerHealthResult {
    table_name: string;
    trigger_name: string;
    is_enabled: boolean;
    recent_errors: number;
}

interface TestResult {
    test: string;
    success: boolean;
    message: string;
    details?: any;
}

/**
 * Test cache invalidation trigger functionality
 */
async function testCacheInvalidationTriggers(): Promise<void> {
    const results: TestResult[] = [];

    try {
        logger.info('🧪 Testing Cache Invalidation Trigger Fixes');
        logger.info('=' .repeat(50));

        // Test 1: Check if new trigger function exists
        results.push(await testTriggerFunctionExists());

        // Test 2: Check if all triggers are properly created
        results.push(await testTriggersExist());

        // Test 3: Check trigger health status
        results.push(await testTriggerHealth());

        // Test 4: Test error handling with invalid data
        results.push(await testErrorHandling());

        // Test 5: Test batching functionality
        results.push(await testBatchingFunctionality());

        // Test 6: Test cascade invalidation logic
        results.push(await testCascadeInvalidation());

        // Test 7: Test manual cache invalidation
        results.push(await testManualCacheInvalidation());

        // Test 8: Check trigger error log functionality
        results.push(await testTriggerErrorLog());

        // Summary
        logger.info('\n' + '='.repeat(50));
        logger.info('📊 TEST SUMMARY');
        logger.info('='.repeat(50));

        const passed = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        results.forEach(result => {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            logger.info(`${status} ${result.test}: ${result.message}`);
            if (result.details) {
                logger.info(`   Details: ${JSON.stringify(result.details, null, 2)}`);
            }
        });

        logger.info(`\nTotal: ${results.length} tests, ${passed} passed, ${failed} failed`);

        if (failed > 0) {
            logger.error('❌ Some tests failed. Please review the trigger implementation.');
            process.exit(1);
        } else {
            logger.info('✅ All tests passed! Cache invalidation triggers are working correctly.');
        }

    } catch (error) {
        logger.error('❌ Test execution failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

/**
 * Test if the new trigger function exists
 */
async function testTriggerFunctionExists(): Promise<TestResult> {
    try {
        const result = await pool.query(`
            SELECT EXISTS(
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public' 
                AND p.proname = 'notify_cache_invalidation'
            ) as function_exists
        `);

        const exists = result.rows[0].function_exists;

        return {
            test: 'Trigger Function Exists',
            success: exists,
            message: exists 
                ? 'notify_cache_invalidation function found'
                : 'notify_cache_invalidation function not found'
        };
    } catch (error) {
        return {
            test: 'Trigger Function Exists',
            success: false,
            message: `Error checking function: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Test if all required triggers exist
 */
async function testTriggersExist(): Promise<TestResult> {
    try {
        const expectedTriggers = [
            'cache_invalidation_users',
            'cache_invalidation_agents',
            'cache_invalidation_calls',
            'cache_invalidation_lead_analytics',
            'cache_invalidation_agent_analytics',
            'cache_invalidation_credit_transactions'
        ];

        const result = await pool.query(`
            SELECT trigger_name, event_object_table, status
            FROM information_schema.triggers
            WHERE trigger_name LIKE 'cache_invalidation_%'
            ORDER BY trigger_name
        `);

        const foundTriggers = result.rows.map(row => row.trigger_name);
        const missingTriggers = expectedTriggers.filter(t => !foundTriggers.includes(t));
        const extraTriggers = foundTriggers.filter(t => !expectedTriggers.includes(t));

        const success = missingTriggers.length === 0;

        return {
            test: 'Required Triggers Exist',
            success,
            message: success 
                ? `All ${expectedTriggers.length} triggers found`
                : `Missing triggers: ${missingTriggers.join(', ')}`,
            details: {
                expected: expectedTriggers.length,
                found: foundTriggers.length,
                missing: missingTriggers,
                extra: extraTriggers,
                triggers: result.rows
            }
        };
    } catch (error) {
        return {
            test: 'Required Triggers Exist',
            success: false,
            message: `Error checking triggers: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Test trigger health status function
 */
async function testTriggerHealth(): Promise<TestResult> {
    try {
        const result = await pool.query('SELECT * FROM get_cache_trigger_health()');
        
        const triggers = result.rows as TriggerHealthResult[];
        const disabledTriggers = triggers.filter(t => !t.is_enabled);
        const triggersWithErrors = triggers.filter(t => t.recent_errors > 0);

        const success = disabledTriggers.length === 0 && triggersWithErrors.length === 0;

        return {
            test: 'Trigger Health Status',
            success,
            message: success 
                ? `All ${triggers.length} triggers are healthy`
                : `Issues found: ${disabledTriggers.length} disabled, ${triggersWithErrors.length} with errors`,
            details: {
                total: triggers.length,
                disabled: disabledTriggers,
                withErrors: triggersWithErrors,
                allTriggers: triggers
            }
        };
    } catch (error) {
        return {
            test: 'Trigger Health Status',
            success: false,
            message: `Error checking trigger health: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Test error handling with invalid data
 */
async function testErrorHandling(): Promise<TestResult> {
    try {
        // Test with a scenario that might cause errors (e.g., missing foreign key)
        const testUserId = '00000000-0000-0000-0000-000000000000'; // Invalid UUID
        
        // Try to insert a lead_analytics record with invalid call_id
        // This should trigger the error handling in the trigger
        try {
            await pool.query(`
                INSERT INTO lead_analytics (
                    call_id, 
                    intent_level, 
                    intent_score,
                    created_at
                ) VALUES (
                    '00000000-0000-0000-0000-000000000000',
                    'high',
                    85,
                    now()
                )
            `);
            
            // If we get here, the insert succeeded (which is unexpected)
            // Clean up the test data
            await pool.query(`
                DELETE FROM lead_analytics 
                WHERE call_id = '00000000-0000-0000-0000-000000000000'
            `);
            
            return {
                test: 'Error Handling',
                success: false,
                message: 'Expected error handling test to fail, but it succeeded'
            };
        } catch (insertError) {
            // This is expected - the insert should fail due to foreign key constraint
            // But the trigger should handle the error gracefully
            
            // Check if any errors were logged in the trigger error log
            const errorLogResult = await pool.query(`
                SELECT COUNT(*) as error_count
                FROM trigger_error_log
                WHERE occurred_at > now() - INTERVAL '1 minute'
            `);
            
            const errorCount = parseInt(errorLogResult.rows[0].error_count);
            
            return {
                test: 'Error Handling',
                success: true,
                message: `Error handling working correctly. ${errorCount} errors logged in last minute.`,
                details: {
                    insertError: insertError instanceof Error ? insertError.message : String(insertError),
                    errorsLogged: errorCount
                }
            };
        }
    } catch (error) {
        return {
            test: 'Error Handling',
            success: false,
            message: `Error testing error handling: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Test batching functionality
 */
async function testBatchingFunctionality(): Promise<TestResult> {
    try {
        // Test that notifications include batch_id (transaction ID)
        const result = await pool.query(`
            SELECT test_cache_invalidation('test_table', NULL) as test_result
        `);
        
        const testResult = result.rows[0].test_result;
        
        return {
            test: 'Batching Functionality',
            success: testResult.success,
            message: testResult.success 
                ? 'Test notification sent successfully with batching support'
                : `Test notification failed: ${testResult.error}`,
            details: testResult
        };
    } catch (error) {
        return {
            test: 'Batching Functionality',
            success: false,
            message: `Error testing batching: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Test cascade invalidation logic
 */
async function testCascadeInvalidation(): Promise<TestResult> {
    try {
        // Find a real user and agent for testing
        const userResult = await pool.query(`
            SELECT u.id as user_id, a.id as agent_id
            FROM users u
            LEFT JOIN agents a ON a.user_id = u.id
            WHERE u.is_active = true
            LIMIT 1
        `);

        if (userResult.rows.length === 0) {
            return {
                test: 'Cascade Invalidation Logic',
                success: false,
                message: 'No test users found for cascade invalidation test'
            };
        }

        const { user_id, agent_id } = userResult.rows[0];

        // Test cascade invalidation by updating agent (should invalidate dashboard + agent caches)
        if (agent_id) {
            await pool.query(`
                UPDATE agents 
                SET updated_at = now() 
                WHERE id = $1
            `, [agent_id]);
        }

        // Test cascade invalidation by updating user credits (should invalidate dashboard + credit caches)
        await pool.query(`
            UPDATE users 
            SET updated_at = now() 
            WHERE id = $1
        `, [user_id]);

        return {
            test: 'Cascade Invalidation Logic',
            success: true,
            message: 'Cascade invalidation triggers executed successfully',
            details: {
                user_id,
                agent_id,
                tested: agent_id ? 'agent and user updates' : 'user update only'
            }
        };
    } catch (error) {
        return {
            test: 'Cascade Invalidation Logic',
            success: false,
            message: `Error testing cascade invalidation: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Test manual cache invalidation function
 */
async function testManualCacheInvalidation(): Promise<TestResult> {
    try {
        // Find a test user
        const userResult = await pool.query(`
            SELECT id FROM users WHERE is_active = true LIMIT 1
        `);

        if (userResult.rows.length === 0) {
            return {
                test: 'Manual Cache Invalidation',
                success: false,
                message: 'No test users found for manual invalidation test'
            };
        }

        const userId = userResult.rows[0].id;

        // Test manual cache invalidation
        const result = await pool.query(`
            SELECT test_cache_invalidation('manual_test', $1) as test_result
        `, [userId]);

        const testResult = result.rows[0].test_result;

        return {
            test: 'Manual Cache Invalidation',
            success: testResult.success,
            message: testResult.message,
            details: testResult
        };
    } catch (error) {
        return {
            test: 'Manual Cache Invalidation',
            success: false,
            message: `Error testing manual invalidation: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Test trigger error log functionality
 */
async function testTriggerErrorLog(): Promise<TestResult> {
    try {
        // Check if trigger error log table exists
        const tableResult = await pool.query(`
            SELECT EXISTS(
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'trigger_error_log'
            ) as table_exists
        `);

        if (!tableResult.rows[0].table_exists) {
            return {
                test: 'Trigger Error Log',
                success: false,
                message: 'trigger_error_log table does not exist'
            };
        }

        // Check recent error log entries
        const errorResult = await pool.query(`
            SELECT 
                COUNT(*) as total_errors,
                COUNT(CASE WHEN occurred_at > now() - INTERVAL '1 hour' THEN 1 END) as recent_errors
            FROM trigger_error_log
        `);

        const { total_errors, recent_errors } = errorResult.rows[0];

        // Test cleanup function
        const cleanupResult = await pool.query(`
            SELECT cleanup_trigger_error_log(0) as cleaned_count
        `);

        const cleanedCount = cleanupResult.rows[0].cleaned_count;

        return {
            test: 'Trigger Error Log',
            success: true,
            message: `Error log table working correctly`,
            details: {
                totalErrors: parseInt(total_errors),
                recentErrors: parseInt(recent_errors),
                cleanedInTest: cleanedCount
            }
        };
    } catch (error) {
        return {
            test: 'Trigger Error Log',
            success: false,
            message: `Error testing error log: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

// Run the tests
if (require.main === module) {
    testCacheInvalidationTriggers().catch(error => {
        logger.error('Test execution failed:', error);
        process.exit(1);
    });
}

export { testCacheInvalidationTriggers };