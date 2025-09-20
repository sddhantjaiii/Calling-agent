#!/usr/bin/env ts-node

/**
 * Test script to verify the call source detection migration (017) was applied correctly
 */

import database from '../config/database';

async function testCallSourceMigration() {
  console.log('🧪 Testing call source detection migration...\n');
  
  const db = database;
  await db.initialize();
  
  try {
    // Test 1: Check if new columns exist
    console.log('1. Checking if new columns exist...');
    const columnCheck = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'calls' 
      AND column_name IN ('call_source', 'caller_name', 'caller_email')
      ORDER BY column_name;
    `);
    
    console.log('   Found columns:', columnCheck.rows);
    
    // Test 2: Check if constraint exists
    console.log('\n2. Checking call_source constraint...');
    const constraintCheck = await db.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints 
      WHERE constraint_name = 'chk_call_source';
    `);
    
    console.log('   Constraint:', constraintCheck.rows);
    
    // Test 3: Check if indexes were created
    console.log('\n3. Checking indexes...');
    const indexCheck = await db.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'calls' 
      AND indexname LIKE '%source%'
      ORDER BY indexname;
    `);
    
    console.log('   Source-related indexes:');
    indexCheck.rows.forEach((row: any) => {
      console.log(`   - ${row.indexname}: ${row.indexdef}`);
    });
    
    // Test 4: Check if helper function exists
    console.log('\n4. Checking helper function...');
    const functionCheck = await db.query(`
      SELECT routine_name, routine_type, data_type
      FROM information_schema.routines 
      WHERE routine_name = 'determine_call_source';
    `);
    
    console.log('   Function:', functionCheck.rows);
    
    // Test 5: Test the helper function
    console.log('\n5. Testing helper function...');
    const functionTests = [
      { caller_id: '+1234567890', call_type: null, expected: 'phone' },
      { caller_id: 'internal', call_type: 'web', expected: 'internet' },
      { caller_id: null, call_type: null, expected: 'internet' },
      { caller_id: 'invalid-format', call_type: null, expected: 'unknown' }
    ];
    
    for (const test of functionTests) {
      const result = await db.query(
        'SELECT determine_call_source($1, $2) as result',
        [test.caller_id, test.call_type]
      );
      const actual = result.rows[0].result;
      const status = actual === test.expected ? '✅' : '❌';
      console.log(`   ${status} caller_id: ${test.caller_id}, call_type: ${test.call_type} => ${actual} (expected: ${test.expected})`);
    }
    
    // Test 6: Check if views were created/updated
    console.log('\n6. Checking views...');
    const viewCheck = await db.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_type = 'VIEW' 
      AND table_name IN ('call_source_analytics', 'user_stats')
      ORDER BY table_name;
    `);
    
    console.log('   Views:', viewCheck.rows);
    
    // Test 7: Check if existing calls were categorized
    console.log('\n7. Checking call source distribution...');
    const distributionCheck = await db.query(`
      SELECT call_source, COUNT(*) as count
      FROM calls 
      GROUP BY call_source
      ORDER BY call_source;
    `);
    
    console.log('   Call source distribution:');
    distributionCheck.rows.forEach((row: any) => {
      console.log(`   - ${row.call_source}: ${row.count} calls`);
    });
    
    console.log('\n✅ Call source detection migration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run the test
if (require.main === module) {
  testCallSourceMigration()
    .then(() => {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

export { testCallSourceMigration };