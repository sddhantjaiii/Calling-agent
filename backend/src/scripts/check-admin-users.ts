#!/usr/bin/env ts-node

/**
 * Check Admin Users Script
 * Lists all admin users in the database
 */

import { UserModel } from '../models/User';

async function checkAdminUsers() {
  console.log('🔍 Checking admin users in database...\n');

  try {
    const userModel = new UserModel();
    
    // Get all users and filter for admin roles
    const allUsers = await userModel.getAllUsersForAdmin({ page: 1, limit: 100 });
    
    const adminUsers = allUsers.users?.filter((user: any) => user.role === 'admin') || [];
    const superAdminUsers = allUsers.users?.filter((user: any) => user.role === 'super_admin') || [];
    
    console.log(`Found ${adminUsers.length} admin users:`);
    
    adminUsers.forEach((user: any, index: number) => {
      console.log(`${index + 1}. ${user.email} (${user.name || 'No name'})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.is_active}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    console.log(`Found ${superAdminUsers.length} super admin users:`);
    
    superAdminUsers.forEach((user: any, index: number) => {
      console.log(`${index + 1}. ${user.email} (${user.name || 'No name'})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.is_active}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    console.log(`Total users in system: ${allUsers.total}`);
    console.log('Sample users:');
    
    if (allUsers.users) {
      allUsers.users.slice(0, 5).forEach((user: any, index: number) => {
        console.log(`${index + 1}. ${user.email} - Role: ${user.role} - Active: ${user.is_active}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking admin users:', error);
  }
}

// Run the check
checkAdminUsers()
  .then(() => {
    console.log('✅ Admin user check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error.message);
    process.exit(1);
  });