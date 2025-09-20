const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAdminEndpoints() {
  console.log('🧪 Testing admin endpoints...\n');

  try {
    // Step 1: Login as admin
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test6@gmail.com',
      password: 'admin123'
    });

    console.log('Login response status:', loginResponse.status);
    console.log('Login response data:', JSON.stringify(loginResponse.data, null, 2));

    if (!loginResponse.data.token) {
      throw new Error('Login failed - no token received');
    }

    const adminToken = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Headers for authenticated requests
    const authHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Test get users
    console.log('📋 Testing GET /admin/users...');
    const usersResponse = await axios.get(`${API_BASE}/admin/users`, { headers: authHeaders });
    console.log('Users response status:', usersResponse.status);
    console.log('Users response keys:', Object.keys(usersResponse.data));
    
    if (usersResponse.data.data && usersResponse.data.data.users) {
      console.log('Users count:', usersResponse.data.data.users.length);
      console.log('Sample user:', usersResponse.data.data.users[0]);
    }
    console.log('✅ Get users successful\n');

    // Step 3: Test user update
    if (usersResponse.data.data?.users?.length > 0) {
      const testUser = usersResponse.data.data.users[0];
      console.log('✏️ Testing PUT /admin/users/:id...');
      console.log('Using user:', testUser.email, testUser.id);
      
      const updateResponse = await axios.put(
        `${API_BASE}/admin/users/${testUser.id}`,
        { name: 'Updated Test User' },
        { headers: authHeaders }
      );
      
      console.log('Update response status:', updateResponse.status);
      console.log('Update response keys:', Object.keys(updateResponse.data));
      console.log('✅ User update successful\n');
    }

    // Step 4: Test credit adjustment
    if (usersResponse.data.data?.users?.length > 0) {
      const testUser = usersResponse.data.data.users[0];
      console.log('💰 Testing POST /admin/users/:id/credits...');
      console.log('Using user:', testUser.email, testUser.id);
      
      const creditResponse = await axios.post(
        `${API_BASE}/admin/users/${testUser.id}/credits`,
        { 
          amount: 5,
          type: 'add',
          description: 'Test credit adjustment'
        },
        { headers: authHeaders }
      );
      
      console.log('Credit response status:', creditResponse.status);
      console.log('Credit response keys:', Object.keys(creditResponse.data));
      if (creditResponse.data.data) {
        console.log('New balance:', creditResponse.data.data.newBalance);
      }
      console.log('✅ Credit adjustment successful\n');
    }

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testAdminEndpoints();