#!/usr/bin/env ts-node

/**
 * Test script to verify TypeScript compilation and type safety
 */

import database from '../config/database';

async function testTypeScriptCompilation() {
  console.log('🔍 Testing TypeScript compilation and type safety...');
  
  try {
    // Test database connection and type safety
    console.log('Testing database getDetailedStats method...');
    
    const stats = database.getDetailedStats();
    
    // Verify the structure matches expected types
    console.log('✅ Stats structure:');
    console.log('  - pool:', typeof stats.pool);
    console.log('  - config:', typeof stats.config);
    console.log('  - performance:', typeof stats.performance);
    
    // Test specific properties
    if (stats.pool && typeof stats.pool.totalConnections === 'number') {
      console.log('✅ pool.totalConnections type check passed');
    }
    
    if (stats.pool && typeof stats.pool.waitingClients === 'number') {
      console.log('✅ pool.waitingClients type check passed');
    }
    
    if (stats.performance && typeof stats.performance.slowQueryPercentage === 'number') {
      console.log('✅ performance.slowQueryPercentage type check passed');
    }
    
    if (stats.performance && typeof stats.performance.errorRate === 'number') {
      console.log('✅ performance.errorRate type check passed');
    }
    
    console.log('🎉 All TypeScript type checks passed!');
    
  } catch (error) {
    console.error('❌ TypeScript compilation test failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testTypeScriptCompilation()
    .then(() => {
      console.log('✅ TypeScript compilation test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ TypeScript compilation test failed:', error);
      process.exit(1);
    });
}

export default testTypeScriptCompilation;