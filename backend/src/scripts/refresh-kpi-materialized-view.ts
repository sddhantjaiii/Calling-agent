#!/usr/bin/env node

import dotenv from 'dotenv';
import { DashboardKpiService } from '../services/dashboardKpiService';
import database from '../config/database';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

interface RefreshOptions {
  force?: boolean;
  verbose?: boolean;
  stats?: boolean;
}

async function refreshMaterializedView(options: RefreshOptions = {}) {
  try {
    console.log('🔄 KPI Materialized View Refresh Service\n');

    if (options.verbose) {
      console.log('📊 Getting current view statistics...');
      const stats = await DashboardKpiService.getViewStatistics();
      console.log('Current Statistics:');
      console.log(`   Total Users: ${stats.total_users}`);
      console.log(`   Active Users: ${stats.active_users}`);
      console.log(`   Last Refresh: ${stats.last_refresh}`);
      console.log(`   Avg Calls per User: ${parseFloat(stats.avg_calls_per_user || '0').toFixed(1)}`);
      console.log(`   Avg Success Rate: ${parseFloat(stats.avg_success_rate || '0').toFixed(1)}%\n`);
    }

    if (options.force) {
      console.log('🔧 Force refresh requested...');
      await DashboardKpiService.refreshMaterializedView();
      console.log('✅ Force refresh completed successfully!\n');
    } else {
      console.log('🔍 Checking if refresh is needed...');
      const refreshed = await DashboardKpiService.checkAndRefreshIfNeeded();
      
      if (refreshed) {
        console.log('✅ Materialized view was refreshed!\n');
      } else {
        console.log('ℹ️  Materialized view is up to date, no refresh needed.\n');
      }
    }

    if (options.stats) {
      console.log('📈 Updated view statistics:');
      const updatedStats = await DashboardKpiService.getViewStatistics();
      console.log(`   Total Users: ${updatedStats.total_users}`);
      console.log(`   Active Users: ${updatedStats.active_users}`);
      console.log(`   Last Refresh: ${updatedStats.last_refresh}`);
      console.log(`   Avg Calls per User: ${parseFloat(updatedStats.avg_calls_per_user || '0').toFixed(1)}`);
      console.log(`   Avg Success Rate: ${parseFloat(updatedStats.avg_success_rate || '0').toFixed(1)}%`);
    }

    console.log('🎉 KPI refresh service completed successfully!');

  } catch (error) {
    console.error('❌ KPI refresh service failed:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  const options: RefreshOptions = {
    force: args.includes('--force') || args.includes('-f'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    stats: args.includes('--stats') || args.includes('-s'),
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📚 KPI Materialized View Refresh Service

Usage: npm run refresh-kpi [options]

Options:
  --force, -f     Force refresh regardless of age
  --verbose, -v   Show detailed statistics before refresh
  --stats, -s     Show statistics after refresh
  --help, -h      Show this help message

Examples:
  npm run refresh-kpi                    # Check and refresh if needed
  npm run refresh-kpi --force            # Force refresh
  npm run refresh-kpi --verbose --stats  # Verbose mode with statistics
    `);
    return;
  }

  try {
    await refreshMaterializedView(options);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

// Run the main function
main().catch(async (error) => {
  console.error('❌ Unexpected error:', error);
  await database.close();
  process.exit(1);
});