#!/usr/bin/env ts-node

/**
 * Test script for password update functionality
 * This script tests the password update endpoint to identify and fix issues
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function testPasswordUpdate() {
  console.log('🔐 Testing Password Update Functionality...\n');

  try {
    // First, let's try to login to get a valid token
    console.log('1. Attempting to login...');
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test3@gmail.com',
      password: 'password123'
    });

    if (loginResponse.data.token) {
      console.log('✅ Login successful');
      
      const token = loginResponse.data.token;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Test password update
      console.log('\n2. Testing password update...');
      
      try {
        const passwordUpdateResponse = await axios.put(`${BASE_URL}/user/password`, {
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        }, { headers });

        console.log('✅ Password update successful:', passwordUpdateResponse.data);
        
        // Test login with new password
        console.log('\n3. Testing login with new password...');
        const newLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: 'test3@gmail.com',
          password: 'newpassword123'
        });
        
        if (newLoginResponse.data.token) {
          console.log('✅ Login with new password successful');
          
          // Change password back
          console.log('\n4. Changing password back...');
          const revertResponse = await axios.put(`${BASE_URL}/user/password`, {
            currentPassword: 'newpassword123',
            newPassword: 'password123'
          }, { 
            headers: {
              'Authorization': `Bearer ${newLoginResponse.data.token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('✅ Password reverted successfully:', revertResponse.data);
        }
        
      } catch (passwordError: any) {
        console.error('❌ Password update failed:');
        console.error('Status:', passwordError.response?.status);
        console.error('Error:', passwordError.response?.data);
        
        if (passwordError.response?.data?.error) {
          console.error('Error details:', passwordError.response.data.error);
        }
      }
      
    } else {
      console.error('❌ Login failed - no token received');
    }

  } catch (error: any) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testPasswordUpdate().catch(console.error);