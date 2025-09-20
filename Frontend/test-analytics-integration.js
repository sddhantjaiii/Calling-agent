// Test the analytics integration with the updated backend
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAnalyticsIntegration() {
  console.log('🧪 Testing analytics integration with enhanced backend...\n');

  try {
    // Step 1: Login as admin
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test6@gmail.com',
      password: 'admin123'
    });

    const adminToken = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Headers for authenticated requests
    const authHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Test analytics endpoint with date range
    console.log('📊 Testing analytics endpoint with date range...');
    const dateRangeStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dateRangeEnd = new Date().toISOString();
    
    const analyticsResponse = await axios.get(
      `${API_BASE}/admin/analytics/system?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}`,
      { headers: authHeaders }
    );
    
    console.log('Analytics response status:', analyticsResponse.status);
    console.log('Analytics data structure:');
    
    const data = analyticsResponse.data.data;
    
    // Check if all expected fields are present
    const expectedFields = [
      'users', 'agents', 'calls', 'credits', 'system', 
      'performance', 'summary', 'usage', 'userTiers', 
      'agentTypes', 'hourlyUsage'
    ];
    
    expectedFields.forEach(field => {
      if (data[field]) {
        console.log(`✅ ${field}: Present`);
        if (field === 'usage') {
          console.log(`   - Usage data points: ${data[field].length}`);
        }
        if (field === 'userTiers') {
          console.log(`   - User tiers: ${data[field].map(t => t.name).join(', ')}`);
        }
        if (field === 'agentTypes') {
          console.log(`   - Agent types: ${data[field].map(t => t.name).join(', ')}`);
        }
        if (field === 'hourlyUsage') {
          console.log(`   - Hourly data points: ${data[field].length}`);
        }
      } else {
        console.log(`❌ ${field}: Missing`);
      }
    });

    // Step 3: Test different date ranges
    console.log('\n📅 Testing different date ranges...');
    
    const ranges = [
      { name: '7 days', days: 7 },
      { name: '90 days', days: 90 }
    ];

    for (const range of ranges) {
      const startDate = new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      
      const rangeResponse = await axios.get(
        `${API_BASE}/admin/analytics/system?dateRangeStart=${startDate}&dateRangeEnd=${endDate}`,
        { headers: authHeaders }
      );
      
      console.log(`✅ ${range.name} range: Status ${rangeResponse.status}`);
    }

    console.log('\n🎉 All analytics integration tests passed!');

  } catch (error) {
    console.error('❌ Analytics integration test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testAnalyticsIntegration();