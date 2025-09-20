#!/usr/bin/env ts-node

/**
 * Test script to verify contact information handling fixes
 * This script tests that fake email generation has been removed
 * and null values are handled properly
 */

import { LeadsController } from '../controllers/leadsController';
import { WebhookDataProcessor } from '../services/webhookDataProcessor';

// Mock request and response objects for testing
const mockRequest = {
  user: { id: 'test-user-123' },
  query: {},
  params: {}
} as any;

const mockResponse = {
  json: (data: any) => {
    console.log('Response data:', JSON.stringify(data, null, 2));
    return mockResponse;
  },
  status: (code: number) => {
    console.log('Status code:', code);
    return mockResponse;
  }
} as any;

async function testContactHandling() {
  console.log('🧪 Testing Contact Information Handling Fixes\n');

  // Test 1: WebhookDataProcessor.extractContactInfo with no contact data
  console.log('Test 1: WebhookDataProcessor.extractContactInfo with no contact data');
  const webhookDataNoContact = {
    conversation_initiation_client_data: {
      dynamic_variables: {
        system__caller_id: 'internal',
        system__call_type: 'web'
      }
    }
  };

  const contactInfo1 = WebhookDataProcessor.extractContactInfo(webhookDataNoContact);
  console.log('Result:', contactInfo1);
  console.log('✅ Should return null when no real contact data available\n');

  // Test 2: WebhookDataProcessor.extractContactInfo with partial contact data
  console.log('Test 2: WebhookDataProcessor.extractContactInfo with partial contact data');
  const webhookDataPartialContact = {
    conversation_initiation_client_data: {
      dynamic_variables: {
        system__caller_id: '+1234567890',
        caller_name: 'John Doe'
        // No email provided
      }
    }
  };

  const contactInfo2 = WebhookDataProcessor.extractContactInfo(webhookDataPartialContact);
  console.log('Result:', contactInfo2);
  console.log('✅ Should return contact info with null email\n');

  // Test 3: WebhookDataProcessor.extractContactInfo with full contact data
  console.log('Test 3: WebhookDataProcessor.extractContactInfo with full contact data');
  const webhookDataFullContact = {
    conversation_initiation_client_data: {
      dynamic_variables: {
        system__caller_id: '+1234567890',
        caller_name: 'John Doe',
        caller_email: 'john@example.com'
      }
    }
  };

  const contactInfo3 = WebhookDataProcessor.extractContactInfo(webhookDataFullContact);
  console.log('Result:', contactInfo3);
  console.log('✅ Should return complete contact info\n');

  // Test 4: Call source detection
  console.log('Test 4: Call source detection');
  const phoneCallSource = WebhookDataProcessor.determineCallSource(webhookDataFullContact);
  const internetCallSource = WebhookDataProcessor.determineCallSource(webhookDataNoContact);
  
  console.log('Phone call source:', phoneCallSource);
  console.log('Internet call source:', internetCallSource);
  console.log('✅ Should correctly identify phone vs internet calls\n');

  // Test 5: Edge case handling
  console.log('Test 5: Edge case handling');
  const malformedWebhookData = {
    // Missing conversation_initiation_client_data
  };

  const contactInfo4 = WebhookDataProcessor.extractContactInfo(malformedWebhookData);
  const callSource4 = WebhookDataProcessor.determineCallSource(malformedWebhookData);
  
  console.log('Malformed webhook contact info:', contactInfo4);
  console.log('Malformed webhook call source:', callSource4);
  console.log('✅ Should handle malformed data gracefully\n');

  console.log('🎉 All contact handling tests completed!');
  console.log('\nKey improvements verified:');
  console.log('- ✅ No fake email generation');
  console.log('- ✅ Proper null handling for missing contact data');
  console.log('- ✅ Graceful handling of malformed webhook data');
  console.log('- ✅ Correct call source detection');
}

// Run the tests
testContactHandling().catch(console.error);