const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkNDhmOThhZS0yZjgyLTRiMDQtYmYwYy0wZGJkZTgwNjU5MzkiLCJlbWFpbCI6InRlc3Q2QGdtYWlsLmNvbSIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NTY1OTYxMDAsImV4cCI6MTc1NjY4MjUwMH0.kV1P4UsHQVO-vpIPaDK6dh_mqPm3xE4iplG3Y223-CU';

async function testAnalyticsEndpoint() {
  console.log('🧪 Testing analytics endpoint...\n');

  try {
    const authHeaders = {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    };

    // Test the analytics endpoint
    console.log('📊 Testing GET /admin/analytics/system...');
    const analyticsResponse = await axios.get(`${API_BASE}/admin/analytics/system`, { headers: authHeaders });
    
    console.log('Analytics response status:', analyticsResponse.status);
    console.log('Analytics response keys:', Object.keys(analyticsResponse.data));
    console.log('Analytics response data structure:');
    console.log(JSON.stringify(analyticsResponse.data, null, 2));
    console.log('✅ Analytics endpoint successful\n');

    // Test with date range filter
    console.log('📊 Testing GET /admin/analytics/system with filters...');
    const filteredResponse = await axios.get(`${API_BASE}/admin/analytics/system?dateRange=30d`, { headers: authHeaders });
    
    console.log('Filtered analytics response status:', filteredResponse.status);
    console.log('Filtered analytics response keys:', Object.keys(filteredResponse.data));
    console.log('✅ Filtered analytics endpoint successful\n');

    console.log('🎉 All analytics tests passed!');

  } catch (error) {
    console.error('❌ Analytics test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testAnalyticsEndpoint();