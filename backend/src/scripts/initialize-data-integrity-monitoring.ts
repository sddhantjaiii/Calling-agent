#!/usr/bin/env ts-node

/**
 * Initialize Data Integrity Monitoring System
 * 
 * This script sets up the data integrity monitoring system and runs initial checks
 * to ensure everything is working correctly.
 */

import { pool } from '../config/database';
import { dataIntegrityMonitor } from '../services/dataIntegrityMonitor';
import { dataIntegrityAlerts } from '../services/dataIntegrityAlerts';

async function initializeDataIntegrityMonitoring() {
  console.log('🔍 Initializing Data Integrity Monitoring System...\n');

  try {
    // 1. Create trigger logging table if it doesn't exist
    console.log('📋 Setting up trigger logging table...');
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

      CREATE INDEX IF NOT EXISTS idx_trigger_log_status_time 
      ON trigger_execution_log(status, created_at);
      
      CREATE INDEX IF NOT EXISTS idx_trigger_log_trigger_name 
      ON trigger_execution_log(trigger_name);
    `);
    console.log('✅ Trigger logging table ready\n');

    // 2. Run initial data integrity check
    console.log('🔍 Running initial data integrity check...');
    const integrityCheck = await dataIntegrityMonitor.runFullIntegrityCheck();
    
    console.log('📊 Data Integrity Summary:');
    console.log(`   Cross-Agent Contamination: ${integrityCheck.summary.crossAgentContamination}`);
    console.log(`   Orphaned Records: ${integrityCheck.summary.orphanedRecords}`);
    console.log(`   Trigger Failures: ${integrityCheck.summary.triggerFailures}`);
    console.log(`   Performance Issues: ${integrityCheck.summary.performanceIssues}`);
    console.log(`   Last Checked: ${integrityCheck.summary.lastChecked}\n`);

    // 3. Check for critical issues
    if (integrityCheck.summary.crossAgentContamination > 0) {
      console.log('🚨 CRITICAL ALERT: Cross-agent data contamination detected!');
      console.log('   This means users may be seeing other users\' data.');
      console.log('   Immediate action required!\n');
      
      console.log('📋 Contamination Details:');
      integrityCheck.details.contamination.forEach((item: any, index: number) => {
        console.log(`   ${index + 1}. User ${item.call_user_id} has ${item.mismatched_calls} calls`);
        console.log(`      assigned to agents owned by user ${item.agent_user_id}`);
        console.log(`      Severity: ${item.severity.toUpperCase()}`);
      });
      console.log();
    }

    if (integrityCheck.details.analyticsContamination.length > 0) {
      console.log('⚠️  Analytics contamination detected:');
      integrityCheck.details.analyticsContamination.forEach((item: any) => {
        console.log(`   ${item.table_name}: ${item.contaminated_records} contaminated records`);
      });
      console.log();
    }

    if (integrityCheck.summary.orphanedRecords > 0) {
      console.log(`📋 Found ${integrityCheck.summary.orphanedRecords} orphaned records:`);
      const orphanedByType = integrityCheck.details.orphanedRecords.reduce((acc: any, record: any) => {
        const key = `${record.table_name}_${record.orphan_type}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(orphanedByType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} records`);
      });
      console.log();
    }

    if (integrityCheck.summary.triggerFailures > 0) {
      console.log(`⚠️  Found ${integrityCheck.summary.triggerFailures} trigger failures:`);
      integrityCheck.details.triggerFailures.forEach((failure: any) => {
        console.log(`   ${failure.trigger_name} on ${failure.table_name}`);
        console.log(`   Error: ${failure.error_message}`);
        console.log(`   Failures: ${failure.failure_count}`);
      });
      console.log();
    }

    // 4. Run alert checks
    console.log('🚨 Running alert checks...');
    const alerts = await dataIntegrityAlerts.checkAlerts();
    
    if (alerts.length > 0) {
      console.log(`📢 Generated ${alerts.length} alerts:`);
      alerts.forEach((alert: any, index: number) => {
        console.log(`   ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.message}`);
      });
      console.log();
    } else {
      console.log('✅ No alerts generated - system looks healthy\n');
    }

    // 5. Display alert statistics
    const alertStats = dataIntegrityAlerts.getAlertStats();
    console.log('📊 Alert Statistics:');
    console.log(`   Total Alerts: ${alertStats.total}`);
    console.log(`   Active: ${alertStats.active}`);
    console.log(`   Resolved: ${alertStats.resolved}`);
    console.log(`   Acknowledged: ${alertStats.acknowledged}`);
    
    if (Object.keys(alertStats.bySeverity).length > 0) {
      console.log('   By Severity:');
      Object.entries(alertStats.bySeverity).forEach(([severity, count]) => {
        console.log(`     ${severity}: ${count}`);
      });
    }
    console.log();

    // 6. Calculate and display health score
    const healthScore = calculateHealthScore(integrityCheck.summary);
    console.log(`🏥 System Health Score: ${healthScore}/100`);
    
    if (healthScore >= 90) {
      console.log('   Status: Excellent ✅');
    } else if (healthScore >= 70) {
      console.log('   Status: Good ⚠️');
    } else if (healthScore >= 50) {
      console.log('   Status: Fair ⚠️');
    } else {
      console.log('   Status: Poor ❌');
    }
    console.log();

    // 7. Generate recommendations
    const recommendations = generateRecommendations(integrityCheck.summary, integrityCheck.details);
    console.log('💡 Recommendations:');
    recommendations.forEach((rec: string, index: number) => {
      const prefix = rec.includes('CRITICAL') ? '🚨' : '💡';
      console.log(`   ${prefix} ${rec}`);
    });
    console.log();

    // 8. Test API endpoints (if server is running)
    console.log('🔌 Testing API endpoints...');
    try {
      // This would require the server to be running
      console.log('   Note: API endpoint testing requires server to be running');
      console.log('   Use the following endpoints for monitoring:');
      console.log('   GET /api/data-integrity/metrics');
      console.log('   GET /api/data-integrity/full-check');
      console.log('   GET /api/data-integrity/dashboard');
      console.log('   GET /api/data-integrity/alerts');
    } catch (error) {
      console.log('   Server not running - skipping API tests');
    }
    console.log();

    // 9. Setup continuous monitoring recommendation
    console.log('⏰ Continuous Monitoring Setup:');
    console.log('   To enable continuous monitoring, add this to your application startup:');
    console.log('   ```typescript');
    console.log('   import { dataIntegrityAlerts } from "./services/dataIntegrityAlerts";');
    console.log('   dataIntegrityAlerts.startContinuousMonitoring(5); // Check every 5 minutes');
    console.log('   ```');
    console.log();

    console.log('✅ Data Integrity Monitoring System initialized successfully!');
    
    if (integrityCheck.summary.crossAgentContamination > 0) {
      console.log('\n🚨 CRITICAL: Please address cross-agent contamination immediately!');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error initializing data integrity monitoring:', error);
    process.exit(1);
  }
}

function calculateHealthScore(metrics: any): number {
  let score = 100;

  // Critical issues
  if (metrics.crossAgentContamination > 0) score -= 50;
  
  // High impact issues
  if (metrics.triggerFailures > 0) score -= 20;
  if (metrics.performanceIssues > 5) score -= 15;
  
  // Medium impact issues
  if (metrics.orphanedRecords > 100) score -= 10;
  if (metrics.performanceIssues > 0) score -= 5;

  return Math.max(0, score);
}

function generateRecommendations(metrics: any, details: any): string[] {
  const recommendations: string[] = [];

  if (metrics.crossAgentContamination > 0) {
    recommendations.push('CRITICAL: Fix cross-agent data contamination immediately');
    recommendations.push('Review agent ownership validation middleware');
    recommendations.push('Audit all analytics queries for proper user_id filtering');
  }

  if (details.analyticsContamination && details.analyticsContamination.length > 0) {
    recommendations.push('Fix analytics data contamination in tables');
    recommendations.push('Add database constraints to prevent cross-user analytics data');
  }

  if (metrics.triggerFailures > 0) {
    recommendations.push('Investigate and fix failing database triggers');
    recommendations.push('Review trigger error handling');
  }

  if (metrics.orphanedRecords > 50) {
    recommendations.push('Clean up orphaned records');
    recommendations.push('Add foreign key constraints where missing');
  }

  if (metrics.performanceIssues > 5) {
    recommendations.push('Optimize slow-performing analytics queries');
    recommendations.push('Consider adding database indexes');
  }

  if (recommendations.length === 0) {
    recommendations.push('Data integrity looks good! Continue regular monitoring.');
  }

  return recommendations;
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeDataIntegrityMonitoring()
    .then(() => {
      console.log('🎉 Initialization complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Initialization failed:', error);
      process.exit(1);
    });
}

export { initializeDataIntegrityMonitoring };