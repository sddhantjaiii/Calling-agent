#!/usr/bin/env node

import dotenv from 'dotenv';
import database from '../config/database';

// Load environment variables
dotenv.config();

interface MaterializedViewInfo {
  schemaname: string;
  matviewname: string;
  matviewowner: string;
  tablespace: string | null;
  hasindexes: boolean;
  ispopulated: boolean;
  definition: string;
}

interface IndexInfo {
  indexname: string;
  tablename: string;
  indexdef: string;
}

interface KPISummaryRow {
  user_id: string;
  email: string;
  name: string;
  total_calls_30d: number;
  successful_calls_30d: number;
  success_rate_30d: number;
  total_leads_30d: number;
  qualified_leads_30d: number;
  conversion_rate_30d: number;
  total_agents: number;
  active_agents: number;
  calculated_at: Date;
}

async function verifyMaterializedView() {
  try {
    console.log('🔍 Verifying user_kpi_summary materialized view...\n');

    // Check if materialized view exists
    const viewExists = await database.query(`
      SELECT 
        schemaname,
        matviewname,
        matviewowner,
        tablespace,
        hasindexes,
        ispopulated,
        definition
      FROM pg_matviews 
      WHERE matviewname = 'user_kpi_summary'
    `);

    if (viewExists.rows.length === 0) {
      console.log('❌ Materialized view user_kpi_summary not found!');
      return;
    }

    const viewInfo = viewExists.rows[0];
    console.log('✅ Materialized view found:');
    console.log(`   Schema: ${viewInfo.schemaname}`);
    console.log(`   Name: ${viewInfo.matviewname}`);
    console.log(`   Owner: ${viewInfo.matviewowner}`);
    console.log(`   Has Indexes: ${viewInfo.hasindexes}`);
    console.log(`   Is Populated: ${viewInfo.ispopulated}`);

    // Check indexes on the materialized view
    const indexes = await database.query(`
      SELECT 
        indexname,
        tablename,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'user_kpi_summary'
      ORDER BY indexname
    `);

    console.log(`\n📊 Indexes (${indexes.rows.length} found):`);
    indexes.rows.forEach((index: any) => {
      console.log(`   - ${index.indexname}`);
      console.log(`     ${index.indexdef}`);
    });

    // Check if view is populated with data
    const rowCount = await database.query(`
      SELECT COUNT(*) as count FROM user_kpi_summary
    `);

    console.log(`\n📈 Data Summary:`);
    console.log(`   Total rows: ${rowCount.rows[0].count}`);

    if (parseInt(rowCount.rows[0].count) > 0) {
      // Get sample data
      const sampleData = await database.query(`
        SELECT 
          user_id,
          email,
          name,
          total_calls_30d,
          successful_calls_30d,
          success_rate_30d,
          total_leads_30d,
          qualified_leads_30d,
          conversion_rate_30d,
          total_agents,
          active_agents,
          calculated_at
        FROM user_kpi_summary 
        LIMIT 3
      `);

      console.log(`\n📋 Sample Data (first 3 rows):`);
      sampleData.rows.forEach((row: any, index: number) => {
        console.log(`\n   User ${index + 1}:`);
        console.log(`     Email: ${row.email}`);
        console.log(`     Name: ${row.name}`);
        console.log(`     Calls (30d): ${row.total_calls_30d}`);
        console.log(`     Success Rate: ${row.success_rate_30d}%`);
        console.log(`     Leads (30d): ${row.total_leads_30d}`);
        console.log(`     Conversion Rate: ${row.conversion_rate_30d}%`);
        console.log(`     Total Agents: ${row.total_agents}`);
        console.log(`     Active Agents: ${row.active_agents}`);
        console.log(`     Calculated At: ${row.calculated_at}`);
      });

      // Test performance by measuring query time
      console.log(`\n⚡ Performance Test:`);
      const startTime = Date.now();
      
      await database.query(`
        SELECT * FROM user_kpi_summary 
        WHERE user_id = (SELECT user_id FROM user_kpi_summary LIMIT 1)
      `);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      console.log(`   Single user lookup: ${queryTime}ms`);
      
      if (queryTime < 50) {
        console.log('   ✅ Performance: Excellent (< 50ms)');
      } else if (queryTime < 200) {
        console.log('   ✅ Performance: Good (< 200ms)');
      } else {
        console.log('   ⚠️  Performance: Needs optimization (> 200ms)');
      }
    }

    // Test refresh function
    console.log(`\n🔄 Testing refresh function:`);
    try {
      const refreshStart = Date.now();
      await database.query('SELECT refresh_user_kpi_summary()');
      const refreshEnd = Date.now();
      const refreshTime = refreshEnd - refreshStart;
      
      console.log(`   ✅ Refresh successful: ${refreshTime}ms`);
      
      if (refreshTime < 1000) {
        console.log('   ✅ Refresh Performance: Excellent (< 1s)');
      } else if (refreshTime < 5000) {
        console.log('   ✅ Refresh Performance: Good (< 5s)');
      } else {
        console.log('   ⚠️  Refresh Performance: Slow (> 5s)');
      }
    } catch (error) {
      console.log(`   ❌ Refresh function failed: ${error}`);
    }

    // Check system configuration
    const config = await database.query(`
      SELECT config_key, config_value, description 
      FROM system_config 
      WHERE config_key LIKE '%kpi%' OR config_key LIKE '%refresh%'
      ORDER BY config_key
    `);

    if (config.rows.length > 0) {
      console.log(`\n⚙️  Related Configuration:`);
      config.rows.forEach((row: any) => {
        console.log(`   ${row.config_key}: ${row.config_value}`);
        console.log(`     ${row.description}`);
      });
    }

    console.log(`\n🎉 Materialized view verification completed successfully!`);

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await verifyMaterializedView();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run the verification
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});