const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAdminCreateAgent() {
  console.log('🧪 Testing admin create agent functionality...\n');

  try {
    // Step 1: Login as admin
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test6@gmail.com',
      password: 'admin123'
    });

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
    console.log('Users count:', usersResponse.data.data.length);
    console.log('✅ Get users successful\n');

    // Step 3: Test get voices
    console.log('🎤 Testing GET /admin/agents/voices...');
    const voicesResponse = await axios.get(`${API_BASE}/admin/agents/voices`, { headers: authHeaders });
    console.log('Voices response status:', voicesResponse.status);
    console.log('Voices count:', voicesResponse.data.data.length);
    console.log('Sample voice:', voicesResponse.data.data[0]);
    console.log('✅ Get voices successful\n');

    // Step 4: Test create agent
    console.log('🤖 Testing POST /admin/agents/create...');
    const createAgentResponse = await axios.post(`${API_BASE}/admin/agents/create`, {
      name: 'Test Agent ' + Date.now(),
      type: 'call',
      voice: voicesResponse.data.data[0].voice_id,
      prompt: 'You are a helpful assistant.',
      userId: null // Don't assign to anyone initially
    }, { headers: authHeaders });

    console.log('Create agent response status:', createAgentResponse.status);
    console.log('Created agent:', createAgentResponse.data);
    console.log('✅ Create agent successful\n');

    console.log('🎉 All admin create agent tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testAdminCreateAgent();
