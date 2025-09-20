#!/usr/bin/env ts-node

/**
 * Integration test for dashboard analytics controller
 * Tests the complete analytics endpoint with optimized service
 */

import express from 'express';
import request from 'supertest';
import { DashboardController } from '../controllers/dashboardController';
import { AuthenticatedRequest } from '../middleware/auth';
import database from '../config/database';

// Mock authenticated request
const createMockAuthenticatedRequest = (userId: string) => {
  return {
    user: { id: userId }
  } as AuthenticatedRequest;
};

async function testDashboardAnalyticsIntegration() {
  console.log('🚀 Testing Dashboard Analytics Integration...\n');

  try {
    // Get a test user
    const userQuery = 'SELECT id FROM users LIMIT 1';
    const userResult = await database.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('⚠️  No users found, creating test user...');
      
      // Create a test user
      const createUserQuery = `
        INSERT INTO users (id, email, password_hash, is_active, credits)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      const testUserId = 'test-user-' + Date.now();
      const testUserResult = await database.query(createUserQuery, [
        testUserId,
        'test@example.com',
        'hashed_password',
        true,
        1000
      ]);
      
      console.log(`✅ Created test user: ${testUserResult.rows[0].id}`);
    }

    const userId = userResult.rows.length > 0 ? userResult.rows[0].id : 'test-user-' + Date.now();
    console.log(`Using test user ID: ${userId}`);

    // Test the dashboard controller directly
    const controller = new DashboardController();
    
    // Mock response object
    let responseData: any = null;
    let responseStatus = 200;
    
    const mockResponse = {
      json: (data: any) => {
        responseData = data;
        return mockResponse;
      },
      status: (code: number) => {
        responseStatus = code;
        return mockResponse;
      }
    } as any;

    // Test analytics endpoint
    console.log('📊 Testing analytics endpoint...');
    const startTime = Date.now();
    
    const mockRequest = createMockAuthenticatedRequest(userId);
    await controller.getAnalytics(mockRequest, mockResponse);
    
    const duration = Date.now() - startTime;
    
    // Verify response
    if (responseStatus === 200 && responseData) {
      console.log(`✅ Analytics endpoint responded in ${duration}ms`);
      console.log(`✅ Response status: ${responseStatus}`);
      console.log(`✅ Response success: ${responseData.success}`);
      
      if (responseData.data) {
        const data = responseData.data;
        console.log(`✅ Leads over time data points: ${data.leadsOverTimeData?.length || 0}`);
        console.log(`✅ Interactions over time data points: ${data.interactionsOverTimeData?.length || 0}`);
        console.log(`✅ Lead quality categories: ${data.leadQualityData?.length || 0}`);
        console.log(`✅ Agent performance entries: ${data.agentPerformance?.length || 0}`);
        
        // Verify performance metadata
        if (responseData.performance) {
          console.log(`✅ Query time: ${responseData.performance.queryTime}ms`);
          console.log(`✅ Source: ${responseData.performance.source}`);
          console.log(`✅ Optimized: ${responseData.performance.optimized}`);
        }
        
        // Check performance requirement
        if (duration < 2000) {
          console.log(`✅ Performance requirement met: ${duration}ms < 2000ms`);
        } else {
          console.log(`⚠️  Performance requirement not met: ${duration}ms >= 2000ms`);
        }
        
        // Verify data structure
        const requiredFields = [
          'leadsOverTimeData',
          'interactionsOverTimeData', 
          'leadQualityData',
          'engagementFunnelData',
          'agentPerformance'
        ];
        
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ All required data fields present');
        } else {
          console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
        }
        
      } else {
        console.log('❌ No data in response');
      }
      
    } else {
      console.log(`❌ Analytics endpoint failed with status ${responseStatus}`);
      if (responseData?.error) {
        console.log(`   Error: ${responseData.error}`);
      }
    }

    // Test overview endpoint for comparison
    console.log('\n📈 Testing overview endpoint...');
    const overviewStartTime = Date.now();
    
    responseData = null;
    responseStatus = 200;
    
    await controller.getOverview(mockRequest, mockResponse);
    
    const overviewDuration = Date.now() - overviewStartTime;
    
    if (responseStatus === 200 && responseData) {
      console.log(`✅ Overview endpoint responded in ${overviewDuration}ms`);
      console.log(`✅ Overview response success: ${responseData.success}`);
      
      if (overviewDuration < 2000) {
        console.log(`✅ Overview performance requirement met: ${overviewDuration}ms < 2000ms`);
      } else {
        console.log(`⚠️  Overview performance requirement not met: ${overviewDuration}ms >= 2000ms`);
      }
    } else {
      console.log(`❌ Overview endpoint failed with status ${responseStatus}`);
    }

    // Summary
    console.log('\n📋 Integration Test Summary:');
    console.log('=' .repeat(50));
    console.log(`Analytics Endpoint: ${duration}ms`);
    console.log(`Overview Endpoint: ${overviewDuration}ms`);
    console.log(`Total Test Time: ${Date.now() - startTime}ms`);
    
    if (responseStatus === 200 && duration < 2000 && overviewDuration < 2000) {
      console.log('🎉 Integration test passed! All endpoints meet performance requirements.');
    } else {
      console.log('⚠️  Integration test completed with warnings. Check performance metrics above.');
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run the integration test
async function main() {
  await testDashboardAnalyticsIntegration();
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Integration test execution failed:', error);
    process.exit(1);
  });
}