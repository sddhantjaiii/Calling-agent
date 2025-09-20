#!/usr/bin/env ts-node

import database from '../config/database';

async function createPerformanceMetricsTable() {
  try {
    await database.initialize();
    
    console.log('Creating trigger_performance_metrics table...');
    
    await database.query(`
      CREATE TABLE IF NOT EXISTS trigger_performance_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        trigger_name VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        operation VARCHAR(20) NOT NULL,
        avg_execution_time_ms DECIMAL(10,2) NOT NULL,
        max_execution_time_ms INTEGER NOT NULL,
        min_execution_time_ms INTEGER NOT NULL,
        execution_count INTEGER NOT NULL,
        error_count INTEGER NOT NULL,
        last_execution TIMESTAMP WITH TIME ZONE NOT NULL,
        date_bucket DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        
        UNIQUE(trigger_name, table_name, operation, date_bucket)
      );
    `);
    
    console.log('Creating indexes...');
    
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_trigger_performance_metrics_date ON trigger_performance_metrics(date_bucket);
    `);
    
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_trigger_performance_metrics_trigger ON trigger_performance_metrics(trigger_name);
    `);
    
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_trigger_performance_metrics_avg_time ON trigger_performance_metrics(avg_execution_time_ms);
    `);
    
    console.log('Creating performance monitoring functions...');
    
    await database.query(`
      CREATE OR REPLACE FUNCTION update_trigger_performance_metrics(
        p_trigger_name VARCHAR(100),
        p_table_name VARCHAR(100),
        p_operation VARCHAR(20),
        p_execution_time_ms INTEGER,
        p_status VARCHAR(20)
      )
      RETURNS void AS $$
      DECLARE
        current_date DATE := CURRENT_DATE;
        is_error BOOLEAN := (p_status = 'ERROR');
      BEGIN
        INSERT INTO trigger_performance_metrics (
          trigger_name,
          table_name,
          operation,
          avg_execution_time_ms,
          max_execution_time_ms,
          min_execution_time_ms,
          execution_count,
          error_count,
          last_execution,
          date_bucket
        )
        VALUES (
          p_trigger_name,
          p_table_name,
          p_operation,
          p_execution_time_ms,
          p_execution_time_ms,
          p_execution_time_ms,
          1,
          CASE WHEN is_error THEN 1 ELSE 0 END,
          CURRENT_TIMESTAMP,
          current_date
        )
        ON CONFLICT (trigger_name, table_name, operation, date_bucket)
        DO UPDATE SET
          avg_execution_time_ms = (
            (trigger_performance_metrics.avg_execution_time_ms * trigger_performance_metrics.execution_count + p_execution_time_ms) / 
            (trigger_performance_metrics.execution_count + 1)
          ),
          max_execution_time_ms = GREATEST(trigger_performance_metrics.max_execution_time_ms, p_execution_time_ms),
          min_execution_time_ms = LEAST(trigger_performance_metrics.min_execution_time_ms, p_execution_time_ms),
          execution_count = trigger_performance_metrics.execution_count + 1,
          error_count = trigger_performance_metrics.error_count + CASE WHEN is_error THEN 1 ELSE 0 END,
          last_execution = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Performance monitoring table and functions created successfully');
    
  } catch (error) {
    console.error('❌ Error creating performance monitoring table:', error);
  } finally {
    await database.close();
  }
}

createPerformanceMetricsTable();