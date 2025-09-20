#!/usr/bin/env ts-node

/**
 * Reset Admin Password Script
 * Resets password for an admin user
 */

import { UserModel } from '../models/User';
import bcrypt from 'bcrypt';

async function resetAdminPassword() {
  console.log('🔧 Resetting admin password...\n');

  try {
    const userModel = new UserModel();
    
    // Find the admin user
    const adminUser = await userModel.findByEmail('test6@gmail.com');
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log(`Found admin user: ${adminUser.email} (${adminUser.name})`);
    console.log(`Role: ${adminUser.role}`);
    console.log(`Active: ${adminUser.is_active}`);

    // Hash new password
    const newPassword = 'admin123';
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password using the update method
    const updated = await userModel.update(adminUser.id, { password_hash: passwordHash });

    if (updated) {
      console.log('✅ Password reset successfully!');
      console.log(`Email: ${adminUser.email}`);
      console.log(`Password: ${newPassword}`);
    } else {
      console.log('❌ Failed to update password');
    }

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  }
}

// Run the script
resetAdminPassword()
  .then(() => {
    console.log('✅ Password reset completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });