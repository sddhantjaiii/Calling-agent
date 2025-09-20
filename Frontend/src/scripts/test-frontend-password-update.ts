#!/usr/bin/env ts-node

/**
 * Test frontend password update functionality
 */

import { apiService } from '../services/apiService';

async function testFrontendPasswordUpdate() {
  console.log('🔐 Testing Frontend Password Update...\n');

  try {
    // First login to get a token
    console.log('1. Logging in...');
    const loginResult = await apiService.login('test3@gmail.com', 'password123');
    
    if (loginResult.success && loginResult.data) {
      console.log('✅ Login successful');
      
      // Test password update
      console.log('\n2. Testing password update...');
      
      try {
        const passwordResult = await apiService.updatePassword('password123', 'newpassword123');
        
        if (passwordResult.success) {
          console.log('✅ Password update successful:', passwordResult.data);
          
          // Test login with new password
          console.log('\n3. Testing login with new password...');
          const newLoginResult = await apiService.login('test3@gmail.com', 'newpassword123');
          
          if (newLoginResult.success) {
            console.log('✅ Login with new password successful');
            
            // Change password back
            console.log('\n4. Changing password back...');
            const revertResult = await apiService.updatePassword('newpassword123', 'password123');
            
            if (revertResult.success) {
              console.log('✅ Password reverted successfully');
            } else {
              console.log('❌ Failed to revert password:', revertResult.error);
            }
          } else {
            console.log('❌ Login with new password failed:', newLoginResult.error);
          }
        } else {
          console.log('❌ Password update failed:', passwordResult.error);
        }
        
      } catch (passwordError) {
        console.error('❌ Password update error:', passwordError);
      }
      
    } else {
      console.log('❌ Login failed:', loginResult.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFrontendPasswordUpdate().catch(console.error);