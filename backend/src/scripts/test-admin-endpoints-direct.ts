#!/usr/bin/env ts-node

/**
 * Direct Admin Endpoints Test
 * Tests admin endpoints by making direct HTTP requests
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

interface TestResult {
  endpoint: string;
  method: string;
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
}

async function testAdminEndpoints() {
  console.log('🧪 Testing admin endpoints directly...\n');

  const results: TestResult[] = [];
  let adminToken = '';

  // Step 1: Login as admin
  try {
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test6@gmail.com',
      password: 'admin123'
    });

    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.data.success && loginResponse.data.data?.token) {
      adminToken = loginResponse.data.data.token;
      console.log('✅ Admin login successful');
      results.push({
        endpoint: '/auth/login',
        method: 'POST',
        success: true,
        status: loginResponse.status
      });
    } else if (loginResponse.data.token) {
      // Handle different response format
      adminToken = loginResponse.data.token;
      console.log('✅ Admin login successful (alternative format)');
      results.push({
        endpoint: '/auth/login',
        method: 'POST',
        success: true,
        status: loginResponse.status
      });
    } else {
      throw new Error('Login failed - no token received');
    }
  } catch (error: any) {
    console.log('❌ Admin login failed:', error.response?.data || error.message);
    results.push({
      endpoint: '/auth/login',
      method: 'POST',
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
    return results;
  }

  // Headers for authenticated requests
  const authHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  // Test endpoints
  const endpoints = [
    { method: 'GET', path: '/admin/users', description: 'Get users list' },
    { method: 'GET', path: '/admin/dashboard', description: 'Get dashboard data' },
    { method: 'GET', path: '/admin/validate', description: 'Validate admin access' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📋 Testing ${endpoint.method} ${endpoint.path}...`);
      
      const response = await axios({
        method: endpoint.method.toLowerCase() as any,
        url: `${API_BASE}${endpoint.path}`,
        headers: authHeaders,
        timeout: 10000
      });

      console.log(`✅ ${endpoint.description} successful`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Data keys: ${Object.keys(response.data).join(', ')}`);
      
      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        success: true,
        status: response.status,
        data: response.data
      });

    } catch (error: any) {
      console.log(`❌ ${endpoint.description} failed:`, error.response?.data || error.message);
      results.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        success: false,
        status: error.response?.status,
        error: error.response?.data?.error?.message || error.message
      });
    }
  }

  // Test user update endpoint
  try {
    console.log('\n✏️ Testing user update endpoint...');
    
    // First get a user to update
    const usersResponse = await axios.get(`${API_BASE}/admin/users`, { headers: authHeaders });
    
    if (usersResponse.data.success && usersResponse.data.data) {
      let users = [];
      if (Array.isArray(usersResponse.data.data)) {
        users = usersResponse.data.data;
      } else if (usersResponse.data.data.users) {
        users = usersResponse.data.data.users;
      }
      
      if (users.length > 0) {
        const testUser = users[0];
        console.log(`   Using user: ${testUser.email} (${testUser.id})`);
        
        const updateResponse = await axios.put(
          `${API_BASE}/admin/users/${testUser.id}`,
          { name: 'Updated Test User' },
          { headers: authHeaders }
        );
        
        console.log('✅ User update successful');
        console.log(`   Status: ${updateResponse.status}`);
        
        results.push({
          endpoint: `/admin/users/${testUser.id}`,
          method: 'PUT',
          success: true,
          status: updateResponse.status,
          data: updateResponse.data
        });
      }
    }
  } catch (error: any) {
    console.log('❌ User update failed:', error.response?.data || error.message);
    results.push({
      endpoint: '/admin/users/:id',
      method: 'PUT',
      success: false,
      status: error.response?.status,
      error: error.response?.data?.error?.message || error.message
    });
  }

  // Test credit adjustment endpoint
  try {
    console.log('\n💰 Testing credit adjustment endpoint...');
    
    // Get a user to adjust credits for
    const usersResponse = await axios.get(`${API_BASE}/admin/users`, { headers: authHeaders });
    
    if (usersResponse.data.success && usersResponse.data.data) {
      let users = [];
      if (Array.isArray(usersResponse.data.data)) {
        users = usersResponse.data.data;
      } else if (usersResponse.data.data.users) {
        users = usersResponse.data.data.users;
      }
      
      if (users.length > 0) {
        const testUser = users[0];
        console.log(`   Using user: ${testUser.email} (${testUser.id})`);
        
        const creditResponse = await axios.post(
          `${API_BASE}/admin/users/${testUser.id}/credits`,
          { 
            amount: 5,
            type: 'add',
            description: 'Test credit adjustment'
          },
          { headers: authHeaders }
        );
        
        console.log('✅ Credit adjustment successful');
        console.log(`   Status: ${creditResponse.status}`);
        console.log(`   New balance: ${creditResponse.data.data?.newBalance}`);
        
        results.push({
          endpoint: `/admin/users/${testUser.id}/credits`,
          method: 'POST',
          success: true,
          status: creditResponse.status,
          data: creditResponse.data
        });
      }
    }
  } catch (error: any) {
    console.log('❌ Credit adjustment failed:', error.response?.data || error.message);
    results.push({
      endpoint: '/admin/users/:id/credits',
      method: 'POST',
      success: false,
      status: error.response?.status,
      error: error.response?.data?.error?.message || error.message
    });
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (total - successful > 0) {
    console.log('\n❌ Failed endpoints:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ${r.method} ${r.endpoint}: ${r.error}`);
    });
  }

  return results;
}

// Run the test
testAdminEndpoints()
  .then(() => {
    console.log('\n🎉 Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  });