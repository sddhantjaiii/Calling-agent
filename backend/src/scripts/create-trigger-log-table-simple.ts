#!/usr/bin/env ts-node

import { pool } from '../config/database';

async function createTriggerLogTable(): Promise<void> {
  console.log('🔄 Creating trigger execution log table');
  
  try {
    // Step 1: Create the table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trigger_execution_log (
          id SERIAL PRIMARY KEY,
          trigger_name VARCHAR(255) NOT NULL,
          table_name VARCHAR(255) NOT NULL,
          operation VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'success',
          error_message TEXT,
          execution_time_ms INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table created');

    // Step 2: Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trigger_log_status_time 
      ON trigger_execution_log(status, created_at);
    `);
    console.log('✅ Status-time index created');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trigger_log_trigger_name 
      ON trigger_execution_log(trigger_name);
    `);
    console.log('✅ Trigger name index created');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trigger_log_table_name 
      ON trigger_execution_log(table_name);
    `);
    console.log('✅ Table name index created');

    // Step 3: Verify table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'trigger_execution_log'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Table structure:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    console.log('✅ Trigger execution log table created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create trigger log table:', error);
    throw error;
  }
}

if (require.main === module) {
  createTriggerLogTable()
    .then(() => {
      console.log('🏁 Table creation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Table creation failed:', error);
      process.exit(1);
    });
}

export { createTriggerLogTable };