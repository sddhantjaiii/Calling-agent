#!/usr/bin/env ts-node

/**
 * Data Isolation Test Runner
 * 
 * This script runs all data isolation tests to verify zero cross-agent
 * data contamination and proper security measures.
 * 
 * Usage: npm run test:data-isolation
 */

import { execSync } from 'child_process';
import { pool } from '../config/database';

async function runDataIsolationTests() {
  console.log('🔒 Starting Data Isolation Test Suite...\n');

  try {
    // Check database connection
    console.log('📊 Checking database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection established\n');

    // Run backend integration tests
    console.log('🧪 Running Backend Data Isolation Tests...');
    try {
      execSync('npm run test -- --testPathPattern=dataIsolation.test.ts', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('✅ Backend data isolation tests passed\n');
    } catch (error) {
      console.error('❌ Backend data isolation tests failed');
      throw error;
    }

    // Run cross-tenant security tests
    console.log('🔐 Running Cross-Tenant Security Tests...');
    try {
      execSync('npm run test -- --testPathPattern=crossTenantDataAccess.test.ts', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('✅ Cross-tenant security tests passed\n');
    } catch (error) {
      console.error('❌ Cross-tenant security tests failed');
      throw error;
    }

    // Run middleware tests
    console.log('🛡️ Running Agent Ownership Middleware Tests...');
    try {
      execSync('npm run test -- --testPathPattern=agentOwnership.test.ts', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('✅ Agent ownership middleware tests passed\n');
    } catch (error) {
      console.error('❌ Agent ownership middleware tests failed');
      throw error;
    }

    // Run database constraint validation
    console.log('🗄️ Running Database Constraint Validation...');
    await validateDatabaseConstraints();
    console.log('✅ Database constraints validated\n');

    // Run data integrity checks
    console.log('🔍 Running Data Integrity Checks...');
    await runDataIntegrityChecks();
    console.log('✅ Data integrity checks passed\n');

    console.log('🎉 All Data Isolation Tests Passed Successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Backend Integration Tests');
    console.log('   ✅ Cross-Tenant Security Tests');
    console.log('   ✅ Agent Ownership Middleware Tests');
    console.log('   ✅ Database Constraint Validation');
    console.log('   ✅ Data Integrity Checks');
    console.log('\n🔒 Zero cross-agent data contamination confirmed!');

  } catch (error) {
    console.error('\n❌ Data Isolation Tests Failed!');
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await (pool as any).end();
  }
}

async function validateDatabaseConstraints() {
  console.log('   Checking foreign key constraints...');
  
  // Check that all calls have valid agent relationships with matching user_id
  const invalidCallAgentRelations = await pool.query(`
    SELECT COUNT(*) as count
    FROM calls c
    LEFT JOIN agents a ON c.agent_id = a.id
    WHERE a.id IS NULL OR c.user_id != a.user_id
  `);

  if (parseInt(invalidCallAgentRelations.rows[0].count) > 0) {
    throw new Error(`Found ${invalidCallAgentRelations.rows[0].count} calls with invalid agent relationships`);
  }

  console.log('   ✅ Call-Agent relationships validated');

  // Check that all lead analytics have valid call relationships with matching user_id
  const invalidLeadAnalyticsRelations = await pool.query(`
    SELECT COUNT(*) as count
    FROM lead_analytics la
    LEFT JOIN calls c ON la.call_id = c.id
    WHERE c.id IS NULL OR la.user_id != c.user_id
  `);

  if (parseInt(invalidLeadAnalyticsRelations.rows[0].count) > 0) {
    throw new Error(`Found ${invalidLeadAnalyticsRelations.rows[0].count} lead analytics with invalid call relationships`);
  }

  console.log('   ✅ Lead Analytics-Call relationships validated');

  // Check that all agent analytics have valid agent relationships with matching user_id
  const invalidAgentAnalyticsRelations = await pool.query(`
    SELECT COUNT(*) as count
    FROM agent_analytics aa
    LEFT JOIN agents a ON aa.agent_id = a.id
    WHERE a.id IS NULL OR aa.user_id != a.user_id
  `);

  if (parseInt(invalidAgentAnalyticsRelations.rows[0].count) > 0) {
    throw new Error(`Found ${invalidAgentAnalyticsRelations.rows[0].count} agent analytics with invalid agent relationships`);
  }

  console.log('   ✅ Agent Analytics-Agent relationships validated');
}

async function runDataIntegrityChecks() {
  console.log('   Checking for cross-user data contamination...');

  // Check for any cross-user contamination in the database
  const contaminationCheck = await pool.query(`
    SELECT 
      'calls_agents' as table_pair,
      COUNT(*) as violations
    FROM calls c
    JOIN agents a ON c.agent_id = a.id
    WHERE c.user_id != a.user_id
    
    UNION ALL
    
    SELECT 
      'calls_lead_analytics' as table_pair,
      COUNT(*) as violations
    FROM calls c
    JOIN lead_analytics la ON c.id = la.call_id
    WHERE c.user_id != la.user_id
    
    UNION ALL
    
    SELECT 
      'agents_agent_analytics' as table_pair,
      COUNT(*) as violations
    FROM agents a
    JOIN agent_analytics aa ON a.id = aa.agent_id
    WHERE a.user_id != aa.user_id
  `);

  const totalViolations = contaminationCheck.rows.reduce(
    (sum: number, row: any) => sum + parseInt(row.violations), 
    0
  );

  if (totalViolations > 0) {
    console.error('   ❌ Data contamination detected:');
    contaminationCheck.rows.forEach((row: any) => {
      if (parseInt(row.violations) > 0) {
        console.error(`      ${row.table_pair}: ${row.violations} violations`);
      }
    });
    throw new Error(`Found ${totalViolations} data integrity violations`);
  }

  console.log('   ✅ No cross-user data contamination detected');

  // Check for orphaned records
  console.log('   Checking for orphaned records...');

  const orphanedRecords = await pool.query(`
    SELECT 
      'orphaned_calls' as record_type,
      COUNT(*) as count
    FROM calls c
    LEFT JOIN agents a ON c.agent_id = a.id
    WHERE a.id IS NULL
    
    UNION ALL
    
    SELECT 
      'orphaned_lead_analytics' as record_type,
      COUNT(*) as count
    FROM lead_analytics la
    LEFT JOIN calls c ON la.call_id = c.id
    WHERE c.id IS NULL
    
    UNION ALL
    
    SELECT 
      'orphaned_agent_analytics' as record_type,
      COUNT(*) as count
    FROM agent_analytics aa
    LEFT JOIN agents a ON aa.agent_id = a.id
    WHERE a.id IS NULL
  `);

  const totalOrphaned = orphanedRecords.rows.reduce(
    (sum: number, row: any) => sum + parseInt(row.count), 
    0
  );

  if (totalOrphaned > 0) {
    console.error('   ❌ Orphaned records detected:');
    orphanedRecords.rows.forEach((row: any) => {
      if (parseInt(row.count) > 0) {
        console.error(`      ${row.record_type}: ${row.count} records`);
      }
    });
    throw new Error(`Found ${totalOrphaned} orphaned records`);
  }

  console.log('   ✅ No orphaned records detected');

  // Check user data distribution
  console.log('   Checking user data distribution...');

  const userDataDistribution = await pool.query(`
    SELECT 
      u.id as user_id,
      u.email,
      COUNT(DISTINCT a.id) as agent_count,
      COUNT(DISTINCT c.id) as call_count,
      COUNT(DISTINCT la.id) as lead_analytics_count,
      COUNT(DISTINCT aa.id) as agent_analytics_count
    FROM users u
    LEFT JOIN agents a ON u.id = a.user_id
    LEFT JOIN calls c ON u.id = c.user_id
    LEFT JOIN lead_analytics la ON u.id = la.user_id
    LEFT JOIN agent_analytics aa ON u.id = aa.user_id
    GROUP BY u.id, u.email
    HAVING COUNT(DISTINCT a.id) > 0 OR COUNT(DISTINCT c.id) > 0
    ORDER BY u.email
  `);

  console.log('   📊 User Data Distribution:');
  userDataDistribution.rows.forEach(row => {
    console.log(`      ${row.email}: ${row.agent_count} agents, ${row.call_count} calls, ${row.lead_analytics_count} lead analytics, ${row.agent_analytics_count} agent analytics`);
  });

  console.log('   ✅ User data distribution validated');
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runDataIsolationTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { runDataIsolationTests };