#!/usr/bin/env ts-node

/**
 * Script to make an existing user an admin and set a known password
 */

import { UserModel } from '../models/User';
import bcrypt from 'bcrypt';

async function makeUserAdmin(): Promise<void> {
  try {
    console.log('🔧 Making user admin...');

    const userModel = new UserModel();
    
    // Use the admin@example.com user
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    
    // Check if user exists
    const existingUser = await userModel.findByEmail(adminEmail);
    
    if (!existingUser) {
      console.log('❌ User not found:', adminEmail);
      return;
    }

    console.log('Found user:', existingUser.email, 'ID:', existingUser.id);

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Update user to be admin with known password
    const query = `
      UPDATE users 
      SET role = $1, password_hash = $2, email_verified = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const values = ['admin', passwordHash, existingUser.id];
    const result = await userModel.query(query, values);
    const adminUser = result.rows[0];

    console.log('✅ User updated to admin successfully!');
    console.log('Email:', adminUser.email);
    console.log('Password: admin123');
    console.log('Role:', adminUser.role);
    console.log('ID:', adminUser.id);
    console.log('Credits:', adminUser.credits);

  } catch (error) {
    console.error('❌ Failed to make user admin:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  makeUserAdmin()
    .then(() => {
      console.log('🎉 Admin user setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error.message);
      process.exit(1);
    });
}