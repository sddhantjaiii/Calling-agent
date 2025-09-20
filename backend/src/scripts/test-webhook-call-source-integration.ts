#!/usr/bin/env ts-node

/**
 * Test script to verify webhook service integration with call source detection
 * This script tests the updated webhook service with call source detection logic
 */

import { webhookService } from '../services/webhookService';
import { WebhookDataProcessor } from '../services/webhookDataProcessor';
import { logger } from '../utils/logger';

// Mock webhook payloads for testing
const phoneCallWebhook = {
  type: 'post_call_transcription',
  event_timestamp: Math.floor(Date.now() / 1000),
  data: {
    agent_id: 'test-agent-id',
    conversation_id: 'test-phone-call-123',
    status: 'completed',
    metadata: {
      call_duration_secs: 120,
      cost: 50 // 50 cents
    },
    conversation_initiation_client_data: {
      dynamic_variables: {
        system__caller_id: '+1234567890',
        system__call_type: 'phone',
        caller_name: 'John Doe',
        caller_email: 'john@example.com'
      }
    }
  }
};

const internetCallWebhook = {
  type: 'post_call_transcription',
  event_timestamp: Math.floor(Date.now() / 1000),
  data: {
    agent_id: 'test-agent-id',
    conversation_id: 'test-internet-call-456',
    status: 'completed',
    metadata: {
      call_duration_secs: 90,
      cost: 30 // 30 cents
    },
    conversation_initiation_client_data: {
      dynamic_variables: {
        system__caller_id: 'internal',
        system__call_type: 'web'
      }
    }
  }
};

const unknownCallWebhook = {
  type: 'post_call_transcription',
  event_timestamp: Math.floor(Date.now() / 1000),
  data: {
    agent_id: 'test-agent-id',
    conversation_id: 'test-unknown-call-789',
    status: 'completed',
    metadata: {
      call_duration_secs: 60,
      cost: 20 // 20 cents
    },
    conversation_initiation_client_data: {
      dynamic_variables: {
        // Missing caller_id and call_type to test unknown detection
      }
    }
  }
};

const legacyWebhook = {
  conversation_id: 'test-legacy-call-999',
  agent_id: 'test-agent-id',
  status: 'completed',
  duration_seconds: 150,
  phone_number: '+9876543210',
  timestamp: new Date().toISOString()
};

async function testCallSourceDetection() {
  console.log('\n=== Testing Call Source Detection ===\n');

  // Test phone call detection
  console.log('1. Testing phone call detection:');
  const phoneCallSource = WebhookDataProcessor.getCallSourceInfo(phoneCallWebhook);
  console.log('   Call Source:', phoneCallSource.callSource);
  console.log('   Contact Info:', phoneCallSource.contactInfo);
  console.log('   Expected: phone source with contact info\n');

  // Test internet call detection
  console.log('2. Testing internet call detection:');
  const internetCallSource = WebhookDataProcessor.getCallSourceInfo(internetCallWebhook);
  console.log('   Call Source:', internetCallSource.callSource);
  console.log('   Contact Info:', internetCallSource.contactInfo);
  console.log('   Expected: internet source with no contact info\n');

  // Test unknown call detection
  console.log('3. Testing unknown call detection:');
  const unknownCallSource = WebhookDataProcessor.getCallSourceInfo(unknownCallWebhook);
  console.log('   Call Source:', unknownCallSource.callSource);
  console.log('   Contact Info:', unknownCallSource.contactInfo);
  console.log('   Expected: unknown source with no contact info\n');

  // Test legacy webhook handling
  console.log('4. Testing legacy webhook handling:');
  const legacyCallSource = WebhookDataProcessor.getCallSourceInfo(legacyWebhook);
  console.log('   Call Source:', legacyCallSource.callSource);
  console.log('   Contact Info:', legacyCallSource.contactInfo);
  console.log('   Expected: unknown source (no conversation_initiation_client_data)\n');
}

async function testWebhookValidation() {
  console.log('\n=== Testing Webhook Validation ===\n');

  // Test new format validation
  console.log('1. Testing new format validation:');
  const isValidNew = webhookService.validateWebhookPayload(phoneCallWebhook);
  console.log('   New format valid:', isValidNew);
  console.log('   Expected: true\n');

  // Test legacy format validation
  console.log('2. Testing legacy format validation:');
  const isValidLegacy = webhookService.validateWebhookPayload(legacyWebhook);
  console.log('   Legacy format valid:', isValidLegacy);
  console.log('   Expected: true\n');

  // Test invalid payload
  console.log('3. Testing invalid payload:');
  const isValidInvalid = webhookService.validateWebhookPayload({ invalid: 'payload' });
  console.log('   Invalid payload valid:', isValidInvalid);
  console.log('   Expected: false\n');
}

async function testBackwardCompatibility() {
  console.log('\n=== Testing Backward Compatibility ===\n');

  // Test webhook without conversation_initiation_client_data
  const minimalWebhook = {
    type: 'post_call_transcription',
    event_timestamp: Math.floor(Date.now() / 1000),
    data: {
      agent_id: 'test-agent-id',
      conversation_id: 'test-minimal-call-111',
      status: 'completed',
      metadata: {
        call_duration_secs: 45,
        cost: 15
      }
      // No conversation_initiation_client_data
    }
  };

  console.log('1. Testing minimal webhook (no conversation_initiation_client_data):');
  const minimalCallSource = WebhookDataProcessor.getCallSourceInfo(minimalWebhook);
  console.log('   Call Source:', minimalCallSource.callSource);
  console.log('   Contact Info:', minimalCallSource.contactInfo);
  console.log('   Expected: unknown source with no contact info\n');

  // Test webhook with malformed dynamic_variables
  const malformedWebhook = {
    type: 'post_call_transcription',
    event_timestamp: Math.floor(Date.now() / 1000),
    data: {
      agent_id: 'test-agent-id',
      conversation_id: 'test-malformed-call-222',
      status: 'completed',
      metadata: {
        call_duration_secs: 75,
        cost: 25
      },
      conversation_initiation_client_data: {
        dynamic_variables: null // Malformed
      }
    }
  };

  console.log('2. Testing malformed webhook (null dynamic_variables):');
  const malformedCallSource = WebhookDataProcessor.getCallSourceInfo(malformedWebhook);
  console.log('   Call Source:', malformedCallSource.callSource);
  console.log('   Contact Info:', malformedCallSource.contactInfo);
  console.log('   Expected: unknown source with no contact info\n');
}

async function runTests() {
  try {
    console.log('🧪 Starting Webhook Call Source Integration Tests');
    console.log('================================================');

    await testCallSourceDetection();
    await testWebhookValidation();
    await testBackwardCompatibility();

    console.log('✅ All tests completed successfully!');
    console.log('\nNote: These are unit tests for the call source detection logic.');
    console.log('Integration tests with actual database operations would require');
    console.log('a test database and proper agent setup.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };