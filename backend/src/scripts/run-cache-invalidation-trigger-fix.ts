#!/usr/bin/env ts-node

/**
 * Script to run cache invalidation trigger fix migration and test
 * Task: 7.1 Fix cache invalidation trigger logic
 * Requirements: US-4.1 - Trigger Reliability
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import { testCacheInvalidationTriggers } from './test-cache-invalidation-trigger-fix';

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

/**
 * Run the cache invalidation trigger fix migration
 */
async function runMigration(): Promise<void> {
    try {
        logger.info('🔧 Running Cache Invalidation Trigger Fix Migration');
        logger.info('=' .repeat(50));

        // Read the migration file
        const migrationPath = join(__dirname, '../migrations/021_fix_cache_invalidation_trigger_logic.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf8');

        // Execute the migration
        await pool.query(migrationSQL);

        logger.info('✅ Migration executed successfully');
        
    } catch (error) {
        logger.error('❌ Migration failed:', error);
        throw error;
    }
}

/**
 * Verify migration was applied correctly
 */
async function verifyMigration(): Promise<void> {
    try {
        logger.info('\n🔍 Verifying Migration Results');
        logger.info('=' .repeat(50));

        // Check if new function exists
        const functionResult = await pool.query(`
            SELECT EXISTS(
                SELECT 1 FROM pg_proc p
                JOIN pg_namespace n ON p.pronamespace = n.oid
                WHERE n.nspname = 'public' 
                AND p.proname = 'notify_cache_invalidation'
            ) as function_exists
        `);

        if (!functionResult.rows[0].function_exists) {
            throw new Error('notify_cache_invalidation function not found after migration');
        }

        logger.info('✅ notify_cache_invalidation function created');

        // Check if error log table exists
        const tableResult = await pool.query(`
            SELECT EXISTS(
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'trigger_error_log'
            ) as table_exists
        `);

        if (!tableResult.rows[0].table_exists) {
            throw new Error('trigger_error_log table not found after migration');
        }

        logger.info('✅ trigger_error_log table created');

        // Check if triggers were recreated
        const triggerResult = await pool.query(`
            SELECT COUNT(*) as trigger_count
            FROM information_schema.triggers
            WHERE trigger_name LIKE 'cache_invalidation_%'
        `);

        const triggerCount = parseInt(triggerResult.rows[0].trigger_count);
        if (triggerCount < 6) {
            throw new Error(`Expected at least 6 triggers, found ${triggerCount}`);
        }

        logger.info(`✅ ${triggerCount} cache invalidation triggers created`);

        // Check if helper functions exist
        const helperFunctions = [
            'get_cache_trigger_health',
            'cleanup_trigger_error_log',
            'test_cache_invalidation'
        ];

        for (const funcName of helperFunctions) {
            const result = await pool.query(`
                SELECT EXISTS(
                    SELECT 1 FROM pg_proc p
                    JOIN pg_namespace n ON p.pronamespace = n.oid
                    WHERE n.nspname = 'public' 
                    AND p.proname = $1
                ) as function_exists
            `, [funcName]);

            if (!result.rows[0].function_exists) {
                throw new Error(`Helper function ${funcName} not found after migration`);
            }

            logger.info(`✅ ${funcName} function created`);
        }

        logger.info('✅ Migration verification completed successfully');

    } catch (error) {
        logger.error('❌ Migration verification failed:', error);
        throw error;
    }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
    try {
        logger.info('🚀 Starting Cache Invalidation Trigger Fix');
        logger.info('=' .repeat(60));

        // Step 1: Run the migration
        await runMigration();

        // Step 2: Verify migration results
        await verifyMigration();

        // Step 3: Run comprehensive tests
        logger.info('\n🧪 Running Comprehensive Tests');
        logger.info('=' .repeat(50));
        await testCacheInvalidationTriggers();

        logger.info('\n🎉 Cache Invalidation Trigger Fix Completed Successfully!');
        logger.info('=' .repeat(60));
        logger.info('✅ Migration applied');
        logger.info('✅ Verification passed');
        logger.info('✅ All tests passed');
        logger.info('\nThe cache invalidation triggers now include:');
        logger.info('• Proper error handling to prevent transaction failures');
        logger.info('• Batching support for efficient cache invalidation');
        logger.info('• Cascade invalidation for related data');
        logger.info('• Comprehensive logging and monitoring');
        logger.info('• Helper functions for testing and maintenance');

    } catch (error) {
        logger.error('❌ Cache invalidation trigger fix failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        logger.error('Script execution failed:', error);
        process.exit(1);
    });
}

export { runMigration, verifyMigration };