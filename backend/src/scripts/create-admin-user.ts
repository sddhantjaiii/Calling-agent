#!/usr/bin/env ts-node

/**
 * Script to create an admin user for testing admin panel functionality
 */

import { UserModel } from '../models/User';
import bcrypt from 'bcrypt';

async function createAdminUser(): Promise<void> {
  try {
    console.log('🔧 Creating admin user...');

    const userModel = new UserModel();
    
    // Check if admin user already exists
    const existingAdmin = await userModel.findByEmail('admin@test.com');
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('Email: admin@test.com');
      console.log('Password: admin123');
      console.log('Role:', existingAdmin.role);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('admin123', 12);

    // Create admin user directly in database
    const query = `
      INSERT INTO users (
        email, name, password_hash, credits, is_active, 
        auth_provider, role, email_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      'admin@test.com',
      'Admin User',
      passwordHash,
      1000, // Give admin plenty of credits
      true,
      'email',
      'admin',
      true // Admin is pre-verified
    ];

    const result = await userModel.query(query, values);
    const adminUser = result.rows[0];

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@test.com');
    console.log('Password: admin123');
    console.log('Role:', adminUser.role);
    console.log('ID:', adminUser.id);
    console.log('Credits:', adminUser.credits);

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('🎉 Admin user setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error.message);
      process.exit(1);
    });
}