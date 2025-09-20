#!/usr/bin/env ts-node

/**
 * Simple test for user controller validation logic
 */

import { UserController } from '../controllers/userController';

// Access the private validation method using reflection
const validateProfileUpdateRequest = (UserController as any).validateProfileUpdateRequest;

function testValidation() {
  console.log('🧪 Testing User Controller Validation Logic...\n');

  // Test 1: Valid data
  console.log('Test 1: Valid extended profile data');
  const validData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    company: 'Tech Corp',
    website: 'https://techcorp.com',
    location: 'San Francisco, CA',
    bio: 'Software engineer with 5 years of experience',
    phone: '+1-555-123-4567'
  };
  
  const result1 = validateProfileUpdateRequest(validData);
  console.log('Valid data result:', {
    isValid: result1.isValid,
    errors: result1.errors,
    updateFields: Object.keys(result1.updates)
  });

  // Test 2: Invalid website
  console.log('\nTest 2: Invalid website URL');
  const invalidWebsite = {
    name: 'John Doe',
    website: 'invalid-url'
  };
  
  const result2 = validateProfileUpdateRequest(invalidWebsite);
  console.log('Invalid website result:', {
    isValid: result2.isValid,
    errors: result2.errors
  });

  // Test 3: Invalid phone
  console.log('\nTest 3: Invalid phone number');
  const invalidPhone = {
    name: 'John Doe',
    phone: 'abc-def-ghij'
  };
  
  const result3 = validateProfileUpdateRequest(invalidPhone);
  console.log('Invalid phone result:', {
    isValid: result3.isValid,
    errors: result3.errors
  });

  // Test 4: Field length limits
  console.log('\nTest 4: Field length limits');
  const longFields = {
    name: 'A'.repeat(300), // Too long
    company: 'B'.repeat(300), // Too long
    bio: 'C'.repeat(1100) // Too long
  };
  
  const result4 = validateProfileUpdateRequest(longFields);
  console.log('Long fields result:', {
    isValid: result4.isValid,
    errors: result4.errors
  });

  // Test 5: Null values
  console.log('\nTest 5: Null values (should be allowed)');
  const nullValues = {
    company: null,
    website: null,
    location: null,
    bio: null,
    phone: null
  };
  
  const result5 = validateProfileUpdateRequest(nullValues);
  console.log('Null values result:', {
    isValid: result5.isValid,
    errors: result5.errors,
    updateFields: Object.keys(result5.updates)
  });

  // Test 6: Empty strings
  console.log('\nTest 6: Empty strings (should be converted to null)');
  const emptyStrings = {
    company: '',
    website: '',
    location: '',
    bio: '',
    phone: ''
  };
  
  const result6 = validateProfileUpdateRequest(emptyStrings);
  console.log('Empty strings result:', {
    isValid: result6.isValid,
    errors: result6.errors,
    updates: result6.updates
  });

  console.log('\n✅ All validation tests completed!');
}

// Run the test
testValidation();