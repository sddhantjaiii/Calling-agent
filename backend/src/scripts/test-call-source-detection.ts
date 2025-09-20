#!/usr/bin/env ts-node

/**
 * Test script for call source detection logic
 * Tests the WebhookDataProcessor.determineCallSource() function
 */

import { WebhookDataProcessor } from '../services/webhookDataProcessor';

console.log('🧪 Testing Call Source Detection Logic\n');

// Test Case 1: Phone call with real phone number
console.log('📞 Test Case 1: Phone call with real phone number');
const phoneCallWebhook = {
  conversation_initiation_client_data: {
    dynamic_variables: {
      system__caller_id: '+1234567890',
      system__call_type: 'phone'
    }
  }
};

const phoneCallSource = WebhookDataProcessor.determineCallSource(phoneCallWebhook);
console.log(`   Result: ${phoneCallSource}`);
console.log(`   Expected: phone`);
console.log(`   ✅ ${phoneCallSource === 'phone' ? 'PASS' : 'FAIL'}\n`);

// Test Case 2: Internet call with internal caller_id
console.log('🌐 Test Case 2: Internet call with internal caller_id');
const internetCallWebhook = {
  conversation_initiation_client_data: {
    dynamic_variables: {
      system__caller_id: 'internal',
      system__call_type: 'web'
    }
  }
};

const internetCallSource = WebhookDataProcessor.determineCallSource(internetCallWebhook);
console.log(`   Result: ${internetCallSource}`);
console.log(`   Expected: internet`);
console.log(`   ✅ ${internetCallSource === 'internet' ? 'PASS' : 'FAIL'}\n`);

// Test Case 3: Web call without caller_id but with web call_type
console.log('🌐 Test Case 3: Web call with browser call_type');
const webCallWebhook = {
  conversation_initiation_client_data: {
    dynamic_variables: {
      system__call_type: 'browser'
    }
  }
};

const webCallSource = WebhookDataProcessor.determineCallSource(webCallWebhook);
console.log(`   Result: ${webCallSource}`);
console.log(`   Expected: internet`);
console.log(`   ✅ ${webCallSource === 'internet' ? 'PASS' : 'FAIL'}\n`);

// Test Case 4: Unknown call source (missing data)
console.log('❓ Test Case 4: Unknown call source (missing data)');
const unknownCallWebhook = {
  conversation_initiation_client_data: {
    dynamic_variables: {}
  }
};

const unknownCallSource = WebhookDataProcessor.determineCallSource(unknownCallWebhook);
console.log(`   Result: ${unknownCallSource}`);
console.log(`   Expected: unknown`);
console.log(`   ✅ ${unknownCallSource === 'unknown' ? 'PASS' : 'FAIL'}\n`);

// Test Case 5: Malformed webhook data
console.log('⚠️  Test Case 5: Malformed webhook data');
const malformedWebhook = {};

const malformedCallSource = WebhookDataProcessor.determineCallSource(malformedWebhook);
console.log(`   Result: ${malformedCallSource}`);
console.log(`   Expected: unknown`);
console.log(`   ✅ ${malformedCallSource === 'unknown' ? 'PASS' : 'FAIL'}\n`);

// Test Contact Info Extraction
console.log('📇 Testing Contact Info Extraction\n');

// Test Case 6: Phone call with contact info
console.log('📞 Test Case 6: Phone call with contact info');
const phoneContactWebhook = {
  conversation_initiation_client_data: {
    dynamic_variables: {
      system__caller_id: '+1234567890',
      caller_name: 'John Doe',
      caller_email: 'john@example.com'
    }
  }
};

const phoneContactInfo = WebhookDataProcessor.extractContactInfo(phoneContactWebhook);
console.log(`   Result:`, phoneContactInfo);
console.log(`   Expected: { phoneNumber: '+1234567890', name: 'John Doe', email: 'john@example.com' }`);
console.log(`   ✅ ${phoneContactInfo?.phoneNumber === '+1234567890' && phoneContactInfo?.name === 'John Doe' ? 'PASS' : 'FAIL'}\n`);

// Test Case 7: Internet call with no contact info
console.log('🌐 Test Case 7: Internet call with no contact info');
const internetNoContactWebhook = {
  conversation_initiation_client_data: {
    dynamic_variables: {
      system__caller_id: 'internal'
    }
  }
};

const internetContactInfo = WebhookDataProcessor.extractContactInfo(internetNoContactWebhook);
console.log(`   Result:`, internetContactInfo);
console.log(`   Expected: null`);
console.log(`   ✅ ${internetContactInfo === null ? 'PASS' : 'FAIL'}\n`);

// Test comprehensive call source info
console.log('🔍 Testing Comprehensive Call Source Info\n');

// Test Case 8: Get complete call source info
console.log('📊 Test Case 8: Complete call source info for phone call');
const completeInfo = WebhookDataProcessor.getCallSourceInfo(phoneContactWebhook);
console.log(`   Call Source: ${completeInfo.callSource}`);
console.log(`   Contact Info:`, completeInfo.contactInfo);
console.log(`   ✅ ${completeInfo.callSource === 'phone' && completeInfo.contactInfo?.phoneNumber === '+1234567890' ? 'PASS' : 'FAIL'}\n`);

// Test edge case handling
console.log('🛡️  Testing Edge Case Handling\n');

// Test Case 9: Handle missing dynamic_variables
console.log('⚠️  Test Case 9: Missing dynamic_variables');
const missingDynamicVars = {
  conversation_initiation_client_data: {}
};

const processedWebhook = WebhookDataProcessor.handleWebhookEdgeCases(missingDynamicVars);
const edgeCaseSource = WebhookDataProcessor.determineCallSource(processedWebhook);
console.log(`   Result: ${edgeCaseSource}`);
console.log(`   Expected: internet (default for internal)`);
console.log(`   ✅ ${edgeCaseSource === 'internet' ? 'PASS' : 'FAIL'}\n`);

console.log('🎉 Call Source Detection Tests Complete!');