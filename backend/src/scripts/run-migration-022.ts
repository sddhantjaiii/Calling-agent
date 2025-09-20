#!/usr/bin/env ts-node

import { pool } from '../config/database';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration022(): Promise<void> {
  console.log('🔄 Running migration 022: Create trigger execution log table');
  
  try {
    const migrationPath = join(__dirname, '..', 'migrations', '022_create_trigger_execution_log.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration 022 completed successfully');
    console.log('📋 Created trigger_execution_log table with indexes');
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trigger_execution_log'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Table structure:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Migration 022 failed:', error);
    throw error;
  }
}

if (require.main === module) {
  runMigration022()
    .then(() => {
      console.log('🏁 Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration022 };