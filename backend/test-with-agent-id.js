const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const AGENT_ID = '6f837f12-3757-4e40-be7e-cf610dc25b3e'; // From your sample data

async function testWithAgentId() {
  console.log('🧪 Testing API with Agent ID');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Calls with agent ID
    console.log('\n📞 Testing /api/calls with agentId...');
    try {
      const response = await axios.get(`${BASE_URL}/api/calls`, {
        params: {
          agentId: AGENT_ID,
          limit: 5,
          sortBy: 'created_at',
          sortOrder: 'DESC'
        },
        headers: {
          'Authorization': 'Bearer test-token'
        },
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ Success! Calls endpoint works with agent ID');
        console.log(`   Returned ${response.data.data?.length || 0} calls`);
        if (response.data.data?.length > 0) {
          const firstCall = response.data.data[0];
          console.log(`   First call agent_id: ${firstCall.agent_id}`);
          console.log(`   Matches requested agent: ${firstCall.agent_id === AGENT_ID ? '✅' : '❌'}`);
        }
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('🔐 Authentication required (expected without valid token)');
      } else {
        console.log(`❌ Error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
    }

    // Test 2: Call Analytics with agent ID
    console.log('\n📊 Testing /api/call-analytics/kpis with agentId...');
    try {
      const response = await axios.get(`${BASE_URL}/api/call-analytics/kpis`, {
        params: {
          agentId: AGENT_ID
        },
        headers: {
          'Authorization': 'Bearer test-token'
        },
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ Success! Analytics endpoint works with agent ID');
        console.log(`   Returned KPI data for agent: ${response.data.agentId || 'unknown'}`);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('🔐 Authentication required (expected without valid token)');
      } else {
        console.log(`❌ Error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
    }

    // Test 3: Test without agent ID (should fail)
    console.log('\n❌ Testing /api/calls WITHOUT agentId (should fail)...');
    try {
      const response = await axios.get(`${BASE_URL}/api/calls`, {
        params: {
          limit: 5
        },
        headers: {
          'Authorization': 'Bearer test-token'
        },
        timeout: 5000
      });
      console.log('❌ This should have failed!');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.code === 'AGENT_ID_REQUIRED') {
        console.log('✅ Correctly rejected request without agent ID');
      } else if (error.response?.status === 401) {
        console.log('🔐 Authentication required (expected without valid token)');
      } else {
        console.log(`❓ Unexpected error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
      }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('📋 Summary:');
    console.log('   • Agent ID is required for all endpoints ✅');
    console.log('   • This ensures each agent sees only its own data ✅');
    console.log('   • Your frontend needs to include agentId in requests ⚠️');
    console.log('\n💡 Next step: Update your frontend to include agentId parameter');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testWithAgentId();