#!/usr/bin/env ts-node

/**
 * Run Migration 016 - Fix Cache Invalidation Trigger
 */

import { DatabaseConnection } from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('🔧 Running migration 016 - Fix cache invalidation trigger...\n');

  try {
    const db = new DatabaseConnection();
    const migrationPath = path.join(__dirname, '../migrations/016_fix_cache_invalidation_trigger.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await db.query(sql);
    
    console.log('✅ Migration 016 completed successfully');
    console.log('   - Fixed cache invalidation trigger for users table');
    console.log('   - Updated trigger function to handle different table schemas');
    console.log('   - Recreated triggers for all relevant tables');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('🎉 Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  });