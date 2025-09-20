#!/usr/bin/env ts-node

/**
 * Test password verification for specific user
 */

import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testPasswordVerification() {
  console.log('🔐 Testing password verification...\n');

  try {
    // Get user and password hash
    const result = await pool.query(`
      SELECT id, email, name, password_hash 
      FROM users 
      WHERE email = 'test3@gmail.com'
    `);

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log(`👤 User: ${user.email}`);
    console.log(`🔒 Password Hash: ${user.password_hash.substring(0, 30)}...`);

    // Test different passwords
    const testPasswords = ['password123', 'password', '123456', 'test123'];

    for (const password of testPasswords) {
      console.log(`\n🧪 Testing password: "${password}"`);
      
      try {
        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log(`   Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
        
        if (isValid) {
          console.log(`🎉 Found correct password: "${password}"`);
          break;
        }
      } catch (error) {
        console.log(`   Error: ${error}`);
      }
    }

    // Also test creating a new hash for 'password123'
    console.log('\n🔧 Creating new hash for "password123"...');
    const newHash = await bcrypt.hash('password123', 12);
    console.log(`New hash: ${newHash.substring(0, 30)}...`);
    
    const testNewHash = await bcrypt.compare('password123', newHash);
    console.log(`New hash verification: ${testNewHash ? '✅ VALID' : '❌ INVALID'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testPasswordVerification().catch(console.error);