#!/usr/bin/env ts-node

import { pool } from '../config/database';

async function checkTriggerLogTable(): Promise<void> {
  console.log('🔍 Checking trigger execution log table');
  
  try {
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trigger_execution_log'
      );
    `);
    
    console.log('📋 Table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Check table structure
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'trigger_execution_log'
        ORDER BY ordinal_position
      `);
      
      console.log('📊 Current table structure:');
      columns.rows.forEach((row: any) => {
        console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
      });
      
      // Check indexes
      const indexes = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'trigger_execution_log'
      `);
      
      console.log('📊 Current indexes:');
      indexes.rows.forEach((row: any) => {
        console.log(`  - ${row.indexname}: ${row.indexdef}`);
      });
      
      // Drop and recreate if needed
      console.log('🗑️  Dropping existing table to recreate with correct structure...');
      await pool.query('DROP TABLE IF EXISTS trigger_execution_log CASCADE');
      console.log('✅ Table dropped');
    }
    
    // Create the table with correct structure
    console.log('🔄 Creating trigger execution log table...');
    await pool.query(`
      CREATE TABLE trigger_execution_log (
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

    // Create indexes
    await pool.query(`
      CREATE INDEX idx_trigger_log_status_time 
      ON trigger_execution_log(status, created_at);
    `);
    console.log('✅ Status-time index created');

    await pool.query(`
      CREATE INDEX idx_trigger_log_trigger_name 
      ON trigger_execution_log(trigger_name);
    `);
    console.log('✅ Trigger name index created');

    await pool.query(`
      CREATE INDEX idx_trigger_log_table_name 
      ON trigger_execution_log(table_name);
    `);
    console.log('✅ Table name index created');

    // Verify final structure
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'trigger_execution_log'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Final table structure:');
    finalColumns.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    console.log('✅ Trigger execution log table setup completed successfully');
    
  } catch (error) {
    console.error('❌ Failed to setup trigger log table:', error);
    throw error;
  }
}

if (require.main === module) {
  checkTriggerLogTable()
    .then(() => {
      console.log('🏁 Table setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Table setup failed:', error);
      process.exit(1);
    });
}

export { checkTriggerLogTable };