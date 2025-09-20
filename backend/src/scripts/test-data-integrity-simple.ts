#!/usr/bin/env ts-node

/**
 * Simple Data Integrity Monitoring Test
 * 
 * This script tests the basic functionality of the data integrity monitoring system
 */

import { dataIntegrityMonitor } from '../services/dataIntegrityMonitor';
import { dataIntegrityAlerts } from '../services/dataIntegrityAlerts';

async function testDataIntegrityMonitoring(): Promise<void> {
  console.log('🧪 Testing Data Integrity Monitoring System');
  console.log('=' .repeat(50));

  try {
    // Test 1: Get basic metrics
    console.log('📊 Testing basic metrics...');
    const metrics = await dataIntegrityMonitor.getDataIntegrityMetrics();
    console.log('✅ Metrics retrieved:', {
      crossAgentContamination: metrics.crossAgentContamination,
      orphanedRecords: metrics.orphanedRecords,
      triggerFailures: metrics.triggerFailures,
      performanceIssues: metrics.performanceIssues,
      lastChecked: metrics.lastChecked
    });

    // Test 2: Check cross-agent contamination
    console.log('\n🔍 Testing cross-agent contamination detection...');
    const contamination = await dataIntegrityMonitor.detectCrossAgentContamination();
    console.log(`✅ Contamination check completed: ${contamination.length} issues found`);
    if (contamination.length > 0) {
      console.log('⚠️  Contamination details:', contamination.slice(0, 3));
    }

    // Test 3: Check orphaned records
    console.log('\n🔍 Testing orphaned records detection...');
    const orphaned = await dataIntegrityMonitor.detectOrphanedRecords();
    console.log(`✅ Orphaned records check completed: ${orphaned.length} orphaned records found`);
    if (orphaned.length > 0) {
      console.log('📋 Orphaned record types:', 
        [...new Set(orphaned.map(r => `${r.table_name}_${r.orphan_type}`))].slice(0, 5)
      );
    }

    // Test 4: Check trigger health
    console.log('\n🔍 Testing trigger health monitoring...');
    const triggerFailures = await dataIntegrityMonitor.checkTriggerHealth();
    console.log(`✅ Trigger health check completed: ${triggerFailures.length} failures found`);

    // Test 5: Check query performance
    console.log('\n🔍 Testing query performance monitoring...');
    const performanceIssues = await dataIntegrityMonitor.checkQueryPerformance();
    console.log(`✅ Performance check completed: ${performanceIssues.length} queries analyzed`);
    const slowQueries = performanceIssues.filter(p => p.performance_issue);
    console.log(`⚠️  Slow queries found: ${slowQueries.length}`);

    // Test 6: Run full integrity check
    console.log('\n🔍 Testing full integrity check...');
    const fullCheck = await dataIntegrityMonitor.runFullIntegrityCheck();
    console.log('✅ Full integrity check completed');
    console.log('📊 Summary:', fullCheck.summary);

    // Test 7: Test alert system
    console.log('\n🚨 Testing alert system...');
    const alerts = await dataIntegrityAlerts.checkAlerts();
    console.log(`✅ Alert check completed: ${alerts.length} new alerts generated`);
    
    const activeAlerts = dataIntegrityAlerts.getActiveAlerts();
    console.log(`📢 Active alerts: ${activeAlerts.length}`);
    
    const alertStats = dataIntegrityAlerts.getAlertStats();
    console.log('📊 Alert statistics:', alertStats);

    // Test 8: Performance degradation check
    console.log('\n⚡ Testing performance degradation check...');
    const performanceDegradation = await dataIntegrityMonitor.checkPerformanceDegradation();
    console.log(`✅ Performance degradation status: ${performanceDegradation ? 'DEGRADED' : 'NORMAL'}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 SYSTEM STATUS SUMMARY:');
    console.log(`  Cross-Agent Contamination: ${metrics.crossAgentContamination === 0 ? '✅ CLEAN' : '⚠️  ISSUES FOUND'}`);
    console.log(`  Orphaned Records: ${metrics.orphanedRecords < 10 ? '✅ MINIMAL' : '⚠️  HIGH COUNT'}`);
    console.log(`  Trigger Health: ${metrics.triggerFailures === 0 ? '✅ HEALTHY' : '⚠️  FAILURES DETECTED'}`);
    console.log(`  Query Performance: ${metrics.performanceIssues < 5 ? '✅ GOOD' : '⚠️  DEGRADED'}`);
    console.log(`  Alert System: ${alerts.length === 0 ? '✅ NO NEW ALERTS' : '⚠️  NEW ALERTS GENERATED'}`);

    if (metrics.crossAgentContamination === 0 && 
        metrics.triggerFailures === 0 && 
        metrics.performanceIssues < 5) {
      console.log('\n🎯 OVERALL STATUS: ✅ SYSTEM HEALTHY');
    } else {
      console.log('\n🎯 OVERALL STATUS: ⚠️  ATTENTION REQUIRED');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDataIntegrityMonitoring()
    .then(() => {
      console.log('\n🏁 Data integrity monitoring test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Data integrity monitoring test failed:', error);
      process.exit(1);
    });
}

export { testDataIntegrityMonitoring };