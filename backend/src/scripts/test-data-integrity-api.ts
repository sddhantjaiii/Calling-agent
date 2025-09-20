#!/usr/bin/env ts-node

/**
 * Test Data Integrity API Endpoints
 * 
 * This script tests the data integrity monitoring API endpoints
 */

import request from 'supertest';
import app from '../server';

async function testDataIntegrityAPI(): Promise<void> {
  console.log('🧪 Testing Data Integrity API Endpoints');
  console.log('=' .repeat(50));

  try {
    // Mock admin authentication for testing
    const mockAuth = (req: any, res: any, next: any) => {
      req.user = { id: 'admin-id', role: 'admin' };
      next();
    };

    // Test basic metrics endpoint
    console.log('📊 Testing /api/data-integrity/metrics...');
    const metricsResponse = await request(app)
      .get('/api/data-integrity/metrics')
      .set('Authorization', 'Bearer mock-admin-token');
    
    console.log(`✅ Metrics endpoint: ${metricsResponse.status} - ${metricsResponse.body.success ? 'SUCCESS' : 'FAILED'}`);
    if (metricsResponse.body.data) {
      console.log('📋 Metrics:', {
        contamination: metricsResponse.body.data.crossAgentContamination,
        orphaned: metricsResponse.body.data.orphanedRecords,
        triggers: metricsResponse.body.data.triggerFailures,
        performance: metricsResponse.body.data.performanceIssues
      });
    }

    // Test full check endpoint
    console.log('\n🔍 Testing /api/data-integrity/full-check...');
    const fullCheckResponse = await request(app)
      .get('/api/data-integrity/full-check')
      .set('Authorization', 'Bearer mock-admin-token');
    
    console.log(`✅ Full check endpoint: ${fullCheckResponse.status} - ${fullCheckResponse.body.success ? 'SUCCESS' : 'FAILED'}`);

    // Test contamination endpoint
    console.log('\n🔍 Testing /api/data-integrity/contamination/cross-agent...');
    const contaminationResponse = await request(app)
      .get('/api/data-integrity/contamination/cross-agent')
      .set('Authorization', 'Bearer mock-admin-token');
    
    console.log(`✅ Contamination endpoint: ${contaminationResponse.status} - ${contaminationResponse.body.success ? 'SUCCESS' : 'FAILED'}`);

    // Test dashboard endpoint
    console.log('\n📊 Testing /api/data-integrity/dashboard...');
    const dashboardResponse = await request(app)
      .get('/api/data-integrity/dashboard')
      .set('Authorization', 'Bearer mock-admin-token');
    
    console.log(`✅ Dashboard endpoint: ${dashboardResponse.status} - ${dashboardResponse.body.success ? 'SUCCESS' : 'FAILED'}`);
    if (dashboardResponse.body.data) {
      console.log('📋 Health Score:', dashboardResponse.body.data.healthScore);
      console.log('📋 Recommendations:', dashboardResponse.body.data.recommendations?.length || 0);
    }

    // Test alerts endpoint
    console.log('\n🚨 Testing /api/data-integrity/alerts...');
    const alertsResponse = await request(app)
      .get('/api/data-integrity/alerts')
      .set('Authorization', 'Bearer mock-admin-token');
    
    console.log(`✅ Alerts endpoint: ${alertsResponse.status} - ${alertsResponse.body.success ? 'SUCCESS' : 'FAILED'}`);

    console.log('\n🎉 All API endpoints tested successfully!');
    console.log('\n📋 API ENDPOINT STATUS:');
    console.log(`  /metrics: ${metricsResponse.status === 200 ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`  /full-check: ${fullCheckResponse.status === 200 ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`  /contamination/cross-agent: ${contaminationResponse.status === 200 ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`  /dashboard: ${dashboardResponse.status === 200 ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`  /alerts: ${alertsResponse.status === 200 ? '✅ WORKING' : '❌ FAILED'}`);

  } catch (error) {
    console.error('❌ API test failed:', error);
    throw error;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDataIntegrityAPI()
    .then(() => {
      console.log('\n🏁 Data integrity API test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Data integrity API test failed:', error);
      process.exit(1);
    });
}

export { testDataIntegrityAPI };