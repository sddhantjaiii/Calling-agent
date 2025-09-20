#!/usr/bin/env ts-node

/**
 * Reset test user password to a known value
 */

import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetTestUserPassword() {
  console.log('🔧 Resetting test user password...\n');

  try {
    const email = 'test3@gmail.com';
    const newPassword = 'password123';

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    console.log(`🔒 New password hash: ${passwordHash.substring(0, 30)}...`);

    // Update the user's password
    const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE email = $2
      RETURNING id, email, name
    `, [passwordHash, email]);

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log(`✅ Password updated for user: ${user.email}`);

    // Verify the new password works
    console.log('\n🧪 Verifying new password...');
    const isValid = await bcrypt.compare(newPassword, passwordHash);
    console.log(`Verification result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

    console.log(`\n🎉 Test user credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

resetTestUserPassword().catch(console.error);