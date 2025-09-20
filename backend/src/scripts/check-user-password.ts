#!/usr/bin/env ts-node

/**
 * Check if users have password hashes set
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkUserPasswords() {
  console.log('🔍 Checking user password hashes...\n');

  try {
    const result = await pool.query(`
      SELECT id, email, name, password_hash, auth_provider 
      FROM users 
      WHERE email IN ('test3@gmail.com', 'test5@gmail.com', 'admin@example.com')
      ORDER BY email
    `);

    console.log(`Found ${result.rows.length} users:\n`);

    for (const user of result.rows) {
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Name: ${user.name}`);
      console.log(`🔐 Has Password: ${user.password_hash ? 'YES' : 'NO'}`);
      console.log(`🔑 Auth Provider: ${user.auth_provider}`);
      if (user.password_hash) {
        console.log(`🔒 Password Hash: ${user.password_hash.substring(0, 20)}...`);
      }
      console.log('---');
    }

  } catch (error) {
    console.error('❌ Error checking passwords:', error);
  } finally {
    await pool.end();
  }
}

checkUserPasswords().catch(console.error);