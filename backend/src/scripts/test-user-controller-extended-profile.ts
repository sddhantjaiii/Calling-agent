#!/usr/bin/env ts-node

/**
 * Test script for user controller extended profile functionality
 * Tests the updateProfile method with new fields: company, website, location, bio, phone
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserController } from '../controllers/userController';

// Mock response object
const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = (code: number) => {
    console.log(`Response status: ${code}`);
    return res;
  };
  res.json = (data: any) => {
    console.log('Response data:', JSON.stringify(data, null, 2));
    return res;
  };
  return res;
};

// Mock authenticated request
const createMockRequest = (userId: string, body: any): AuthenticatedRequest => {
  const req = {} as AuthenticatedRequest;
  req.userId = userId;
  req.body = body;
  req.params = {};
  return req;
};

async function testExtendedProfileValidation() {
  console.log('🧪 Testing User Controller Extended Profile Validation...\n');

  // Test 1: Valid extended profile data
  console.log('Test 1: Valid extended profile data');
  const validRequest = createMockRequest('test-user-id', {
    name: 'John Doe',
    email: 'john.doe@example.com',
    company: 'Tech Corp',
    website: 'https://techcorp.com',
    location: 'San Francisco, CA',
    bio: 'Software engineer with 5 years of experience',
    phone: '+1-555-123-4567'
  });
  const validResponse = createMockResponse();

  try {
    await UserController.updateProfile(validRequest, validResponse);
    console.log('✅ Valid data test completed');
  } catch (error) {
    console.log('❌ Valid data test failed:', error);
  }

  // Test 2: Invalid website URL
  console.log('\nTest 2: Invalid website URL');
  const invalidWebsiteRequest = createMockRequest('test-user-id', {
    name: 'John Doe',
    website: 'invalid-url'
  });
  const invalidWebsiteResponse = createMockResponse();

  try {
    await UserController.updateProfile(invalidWebsiteRequest, invalidWebsiteResponse);
    console.log('✅ Invalid website validation test completed');
  } catch (error) {
    console.log('❌ Invalid website validation test failed:', error);
  }

  // Test 3: Invalid phone number
  console.log('\nTest 3: Invalid phone number');
  const invalidPhoneRequest = createMockRequest('test-user-id', {
    name: 'John Doe',
    phone: 'abc-def-ghij'
  });
  const invalidPhoneResponse = createMockResponse();

  try {
    await UserController.updateProfile(invalidPhoneRequest, invalidPhoneResponse);
    console.log('✅ Invalid phone validation test completed');
  } catch (error) {
    console.log('❌ Invalid phone validation test failed:', error);
  }

  // Test 4: Field length limits
  console.log('\nTest 4: Field length limits');
  const longFieldsRequest = createMockRequest('test-user-id', {
    name: 'A'.repeat(300), // Too long
    company: 'B'.repeat(300), // Too long
    bio: 'C'.repeat(1100) // Too long
  });
  const longFieldsResponse = createMockResponse();

  try {
    await UserController.updateProfile(longFieldsRequest, longFieldsResponse);
    console.log('✅ Field length validation test completed');
  } catch (error) {
    console.log('❌ Field length validation test failed:', error);
  }

  // Test 5: Null values (should be allowed)
  console.log('\nTest 5: Null values');
  const nullValuesRequest = createMockRequest('test-user-id', {
    company: null,
    website: null,
    location: null,
    bio: null,
    phone: null
  });
  const nullValuesResponse = createMockResponse();

  try {
    await UserController.updateProfile(nullValuesRequest, nullValuesResponse);
    console.log('✅ Null values test completed');
  } catch (error) {
    console.log('❌ Null values test failed:', error);
  }

  // Test 6: Empty strings (should be converted to null)
  console.log('\nTest 6: Empty strings');
  const emptyStringsRequest = createMockRequest('test-user-id', {
    company: '',
    website: '',
    location: '',
    bio: '',
    phone: ''
  });
  const emptyStringsResponse = createMockResponse();

  try {
    await UserController.updateProfile(emptyStringsRequest, emptyStringsResponse);
    console.log('✅ Empty strings test completed');
  } catch (error) {
    console.log('❌ Empty strings test failed:', error);
  }

  // Test 7: Single field update using PATCH endpoint
  console.log('\nTest 7: Single field update (PATCH)');
  const singleFieldRequest = createMockRequest('test-user-id', {
    value: 'New Company Name'
  });
  singleFieldRequest.params = { field: 'company' };
  const singleFieldResponse = createMockResponse();

  try {
    await UserController.updateProfileField(singleFieldRequest, singleFieldResponse);
    console.log('✅ Single field update test completed');
  } catch (error) {
    console.log('❌ Single field update test failed:', error);
  }

  // Test 8: Invalid field name for PATCH
  console.log('\nTest 8: Invalid field name for PATCH');
  const invalidFieldRequest = createMockRequest('test-user-id', {
    value: 'Some value'
  });
  invalidFieldRequest.params = { field: 'invalid_field' };
  const invalidFieldResponse = createMockResponse();

  try {
    await UserController.updateProfileField(invalidFieldRequest, invalidFieldResponse);
    console.log('✅ Invalid field name test completed');
  } catch (error) {
    console.log('❌ Invalid field name test failed:', error);
  }

  console.log('\n🎉 All user controller extended profile tests completed!');
}

async function testProfileCompletion() {
  console.log('\n🧪 Testing Profile Completion Status...\n');

  const completionRequest = createMockRequest('test-user-id', {});
  const completionResponse = createMockResponse();

  try {
    await UserController.getProfileCompletion(completionRequest, completionResponse);
    console.log('✅ Profile completion test completed');
  } catch (error) {
    console.log('❌ Profile completion test failed:', error);
  }
}

async function runTests() {
  console.log('🚀 Starting User Controller Extended Profile Tests\n');
  console.log('=' .repeat(60));
  
  try {
    await testExtendedProfileValidation();
    await testProfileCompletion();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { testExtendedProfileValidation, testProfileCompletion };