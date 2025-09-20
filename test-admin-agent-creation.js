const axios = require('axios');

// Test admin agent creation functionality
async function testAdminAgentCreation() {
  console.log('🧪 Testing Admin Agent Creation Flow...\n');

  const baseURL = 'http://localhost:3000';
  
  try {
    // First, test admin validation endpoint
    console.log('1. Testing admin access validation...');
    
    try {
      const validateResponse = await axios.get(`${baseURL}/api/admin/validate`, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // You'll need to replace this
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Admin validation response:', validateResponse.data);
    } catch (error) {
      console.log('❌ Admin validation failed:', error.response?.data || error.message);
    }

    // Test agent creation endpoint
    console.log('\n2. Testing admin agent creation endpoint...');
    
    const agentData = {
      name: 'Test Admin Agent',
      type: 'outbound',
      voice_id: 'default',
      model: 'gpt-3.5-turbo',
      prompt: 'You are a helpful assistant.',
      assigned_user_id: null // Optional user assignment
    };

    try {
      const createResponse = await axios.post(`${baseURL}/api/admin/agents`, agentData, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // You'll need to replace this
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Agent creation response:', createResponse.data);
    } catch (error) {
      console.log('❌ Agent creation failed:', error.response?.data || error.message);
      
      if (error.response?.status === 403) {
        console.log('🔍 Access denied - checking admin privileges...');
      }
    }

    // Test regular agent endpoint (non-admin)
    console.log('\n3. Testing regular agent creation endpoint...');
    
    try {
      const regularCreateResponse = await axios.post(`${baseURL}/api/agents`, agentData, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // You'll need to replace this
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Regular agent creation response:', regularCreateResponse.data);
    } catch (error) {
      console.log('❌ Regular agent creation failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Instructions for running the test
console.log('📋 Instructions:');
console.log('1. Make sure your backend server is running on localhost:3000');
console.log('2. Replace "YOUR_TOKEN_HERE" with your actual admin authentication token');
console.log('3. You can get your token from browser DevTools > Application > Local Storage');
console.log('4. Run: node test-admin-agent-creation.js\n');

if (process.argv.includes('--run')) {
  testAdminAgentCreation();
} else {
  console.log('Add --run flag to execute the test');
}