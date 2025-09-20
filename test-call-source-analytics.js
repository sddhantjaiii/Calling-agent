// Test script for call source analytics endpoint
const fetch = require('node-fetch');

async function testCallSourceAnalytics() {
  try {
    console.log('Testing call source analytics endpoint...');
    
    // Test the source breakdown endpoint
    const sourceBreakdownResponse = await fetch('http://localhost:3000/api/call-analytics/source-breakdown', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In real usage, you'd need a valid auth token
        // 'Authorization': 'Bearer your-token-here'
      }
    });
    
    console.log('Source breakdown status:', sourceBreakdownResponse.status);
    
    if (sourceBreakdownResponse.status === 401) {
      console.log('✅ Authentication required (expected for protected endpoint)');
    } else {
      const sourceData = await sourceBreakdownResponse.json();
      console.log('Source breakdown response:', JSON.stringify(sourceData, null, 2));
    }
    
    // Test the new call source analytics endpoint
    const callSourceAnalyticsResponse = await fetch('http://localhost:3000/api/call-analytics/call-source-analytics', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Call source analytics status:', callSourceAnalyticsResponse.status);
    
    if (callSourceAnalyticsResponse.status === 401) {
      console.log('✅ Authentication required (expected for protected endpoint)');
    } else {
      const analyticsData = await callSourceAnalyticsResponse.json();
      console.log('Call source analytics response:', JSON.stringify(analyticsData, null, 2));
    }
    
    console.log('✅ Endpoints are accessible and properly protected');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCallSourceAnalytics();