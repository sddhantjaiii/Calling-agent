const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

let adminToken = '';

async function testAdminAgentFeatures() {
  try {
    console.log('🚀 Testing Admin Agent Management Features\n');

    // Step 1: Admin Login
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    if (loginResponse.data.success) {
      adminToken = loginResponse.data.data.token;
      console.log('✅ Admin login successful');
    } else {
      console.log('❌ Admin login failed');
      return;
    }

    // Step 2: Test get voices endpoint
    console.log('\n2. Testing get voices endpoint...');
    try {
      const voicesResponse = await axios.get(`${API_BASE}/api/admin/voices`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (voicesResponse.data.success) {
        console.log(`✅ Voices endpoint working - ${voicesResponse.data.data.length} voices available`);
      } else {
        console.log('❌ Voices endpoint failed');
      }
    } catch (error) {
      console.log(`❌ Voices endpoint error: ${error.response?.data?.error?.message || error.message}`);
    }

    // Step 3: Test get users endpoint
    console.log('\n3. Testing get users endpoint...');
    try {
      const usersResponse = await axios.get(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (usersResponse.data.success) {
        console.log(`✅ Users endpoint working - ${usersResponse.data.data.length} users found`);
        
        // Show first few users for verification
        console.log('First 3 users:');
        usersResponse.data.data.slice(0, 3).forEach(user => {
          console.log(`  - ${user.name} (${user.email}) - Active: ${user.is_active}`);
        });
      } else {
        console.log('❌ Users endpoint failed');
      }
    } catch (error) {
      console.log(`❌ Users endpoint error: ${error.response?.data?.error?.message || error.message}`);
    }

    // Step 4: Test get agents endpoint
    console.log('\n4. Testing get agents endpoint...');
    try {
      const agentsResponse = await axios.get(`${API_BASE}/api/admin/agents`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (agentsResponse.data.success) {
        console.log(`✅ Agents endpoint working - ${agentsResponse.data.data.agents?.length || 0} agents found`);
      } else {
        console.log('❌ Agents endpoint failed');
      }
    } catch (error) {
      console.log(`❌ Agents endpoint error: ${error.response?.data?.error?.message || error.message}`);
    }

    // Step 5: Test create agent endpoint
    console.log('\n5. Testing create agent endpoint...');
    try {
      const testAgentData = {
        name: 'Test Admin Agent',
        description: 'Agent created by admin for testing',
        type: 'CallAgent',
        first_message: 'Hello! I am a test agent created by admin.',
        system_prompt: 'You are a helpful assistant created by admin.',
        language: 'en',
        tts: {
          voice_id: 'rachel', // Default voice
          model: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        },
        llm: {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 500
        }
      };

      const createResponse = await axios.post(`${API_BASE}/api/admin/agents`, testAgentData, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (createResponse.data.success) {
        console.log(`✅ Agent creation successful - Agent ID: ${createResponse.data.data.id}`);
        
        // Store the agent ID for assignment test
        const testAgentId = createResponse.data.data.id;
        
        // Step 6: Test assign agent endpoint
        console.log('\n6. Testing assign agent endpoint...');
        
        // Get a user to assign to
        const usersResponse = await axios.get(`${API_BASE}/api/admin/users?limit=1`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (usersResponse.data.success && usersResponse.data.data.length > 0) {
          const testUserId = usersResponse.data.data[0].id;
          console.log(`Attempting to assign agent ${testAgentId} to user ${testUserId}`);
          
          const assignResponse = await axios.post(`${API_BASE}/api/admin/agents/${testAgentId}/assign`, {
            userId: testUserId
          }, {
            headers: { Authorization: `Bearer ${adminToken}` }
          });
          
          if (assignResponse.data.success) {
            console.log('✅ Agent assignment successful');
          } else {
            console.log('❌ Agent assignment failed');
          }
        } else {
          console.log('⚠️ No users available for assignment test');
        }
        
      } else {
        console.log('❌ Agent creation failed');
      }
    } catch (error) {
      console.log(`❌ Agent creation error: ${error.response?.data?.error?.message || error.message}`);
    }

    console.log('\n🎉 Admin Agent Management Testing Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
testAdminAgentFeatures();
