#!/usr/bin/env ts-node

/**
 * Test script for admin user operations
 * Tests user update and credit adjustment endpoints
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

// Test admin credentials
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Test user ID - we'll get this from the users list
let TEST_USER_ID = '';

async function loginAsAdmin(): Promise<string> {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (response.data.token) {
      console.log('✅ Admin login successful');
      return response.data.token;
    } else {
      throw new Error('No token received');
    }
  } catch (error: any) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetUsers(token: string): Promise<void> {
  try {
    console.log('\n📋 Testing get users endpoint...');
    const response = await axios.get(`${BASE_URL}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Get users successful');
    console.log('Users count:', response.data.data?.users?.length || response.data.data?.length || 0);
    
    // Check if users have the expected fields
    const users = response.data.data?.users || response.data.data || [];
    if (users.length > 0) {
      const firstUser = users[0];
      // Set the test user ID for later tests
      TEST_USER_ID = firstUser.id;
      
      console.log('Sample user fields:', Object.keys(firstUser));
      console.log('Sample user data:', {
        id: firstUser.id,
        email: firstUser.email,
        name: firstUser.name,
        agentCount: firstUser.agentCount || firstUser.agentcount,
        callCount: firstUser.callCount || firstUser.callcount,
        creditsUsed: firstUser.creditsUsed || firstUser.creditsused,
        last_login: firstUser.last_login
      });
      console.log('Using user ID for tests:', TEST_USER_ID);
    }
  } catch (error: any) {
    console.error('❌ Get users failed:', error.response?.data || error.message);
  }
}

async function testUpdateUser(token: string): Promise<void> {
  try {
    console.log('\n✏️ Testing user update endpoint...');
    const response = await axios.put(`${BASE_URL}/admin/users/${TEST_USER_ID}`, {
      name: 'Updated Test User',
      is_active: true
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ User update successful');
    console.log('Updated user:', response.data.data);
  } catch (error: any) {
    console.error('❌ User update failed:', error.response?.data || error.message);
    console.error('Request details:', {
      url: `${BASE_URL}/admin/users/${TEST_USER_ID}`,
      method: 'PUT',
      data: { name: 'Updated Test User', is_active: true }
    });
  }
}

async function testAdjustCredits(token: string): Promise<void> {
  try {
    console.log('\n💰 Testing credit adjustment endpoint...');
    
    // Test with both description and reason to see which one works
    const testData = {
      amount: 10,
      type: 'add',
      description: 'Test credit adjustment',
      reason: 'Test credit adjustment'
    };
    
    console.log('Sending request with data:', testData);
    
    const response = await axios.post(`${BASE_URL}/admin/users/${TEST_USER_ID}/credits`, testData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Credit adjustment successful');
    console.log('Response data:', response.data);
    console.log('New balance:', response.data.data?.newBalance);
  } catch (error: any) {
    console.error('❌ Credit adjustment failed:', error.response?.data || error.message);
    console.error('Request details:', {
      url: `${BASE_URL}/admin/users/${TEST_USER_ID}/credits`,
      method: 'POST',
      data: { amount: 10, type: 'add', description: 'Test credit adjustment' }
    });
    
    // Try a simpler request without type
    try {
      console.log('\n🔄 Trying simpler credit adjustment...');
      const simpleResponse = await axios.post(`${BASE_URL}/admin/users/${TEST_USER_ID}/credits`, {
        amount: 5,
        description: 'Simple test adjustment'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Simple credit adjustment successful');
      console.log('Response data:', simpleResponse.data);
    } catch (simpleError: any) {
      console.error('❌ Simple credit adjustment also failed:', simpleError.response?.data || simpleError.message);
    }
  }
}

async function main(): Promise<void> {
  try {
    console.log('🧪 Starting admin user operations tests...\n');

    // Login as admin
    const token = await loginAsAdmin();

    // Test endpoints
    await testGetUsers(token);
    await testUpdateUser(token);
    await testAdjustCredits(token);

    console.log('\n🎉 All tests completed!');
  } catch (error: any) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main();
}