// Quick script to check what users exist in the database
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...');
    
    const result = await pool.query(`
      SELECT 
        id, 
        email, 
        name, 
        credits, 
        is_active, 
        created_at,
        email_verified
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Found ${result.rows.length} users:`);
    
    if (result.rows.length === 0) {
      console.log('✅ No users found - database is clean');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. User Details:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Credits: ${user.credits}`);
        console.log(`   Active: ${user.is_active}`);
        console.log(`   Verified: ${user.email_verified}`);
        console.log(`   Created: ${user.created_at}`);
      });
    }
    
    // Check for any test-related data
    const testUserCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE email ILIKE '%test%' OR name ILIKE '%test%'
    `);
    
    const testUserCount = parseInt(testUserCheck.rows[0].count);
    if (testUserCount > 0) {
      console.log(`\n⚠️  Found ${testUserCount} users with 'test' in email or name`);
    } else {
      console.log('\n✅ No test users found');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();