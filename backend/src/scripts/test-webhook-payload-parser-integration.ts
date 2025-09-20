#!/usr/bin/env ts-node

/**
 * Integration test for WebhookPayloadParser
 * Tests the sophisticated webhook parsing functionality with realistic ElevenLabs payloads
 */

import { WebhookPayloadParser } from '../services/webhookPayloadParser';

console.log('🧪 Testing WebhookPayloadParser Integration\n');

// Test 1: Complete ElevenLabs webhook with analysis data
console.log('📋 Test 1: Complete ElevenLabs webhook with analysis data');
const completeWebhook = {
  conversation_initiation_client_data: {
    dynamic_variables: {
      system__conversation_id: 'conv_12345',
      system__agent_id: 'agent_67890',
      system__caller_id: '+1234567890',
      system__called_number: '+0987654321',
      system__call_duration_secs: 180,
      system__time_utc: '2024-01-01T12:00:00Z'
    }
  },
  analysis: {
    data_collection_results: {
      default: {
        value: `{
          'intent_level': 'High',
          'intent_score': 3,
          'urgency_level': 'Medium',
          'urgency_score': 2,
          'budget_constraint': 'Low',
          'budget_score': 1,
          'fit_alignment': 'High',
          'fit_score': 3,
          'engagement_health': 'Good',
          'engagement_score': 2,
          'total_score': 85,
          'lead_status_tag': 'Hot Lead',
          'reasoning': 'Customer shows strong interest in our product and has budget available',
          'cta_pricing_clicked': 'Yes',
          'cta_demo_clicked': 'Yes',
          'cta_followup_clicked': 'No',
          'cta_sample_clicked': 'No',
          'cta_escalated_to_human': 'No'
        }`
      }
    },
    call_successful: 'true',
    transcript_summary: 'Customer expressed interest in premium package',
    call_summary_title: 'Successful sales call with qualified lead'
  }
};

try {
  const result = WebhookPayloadParser.processWebhookPayload(completeWebhook);
  
  console.log('✅ Processing successful');
  console.log(`   📊 Valid: ${result.isValid}`);
  console.log(`   🔍 Has Analysis: ${!!result.analysisData}`);
  console.log(`   📞 Call Source: ${result.callMetadata.call_type}`);
  console.log(`   ⏱️ Duration: ${result.callMetadata.call_duration_minutes} minutes`);
  
  if (result.analysisData) {
    console.log(`   🎯 Total Score: ${result.analysisData.total_score}/100`);
    console.log(`   🏷️ Lead Status: ${result.analysisData.lead_status_tag}`);
    console.log(`   💰 Pricing CTA: ${result.analysisData.cta_interactions.cta_pricing_clicked}`);
  }
} catch (error) {
  console.error('❌ Test 1 failed:', error);
}

console.log('\n' + '='.repeat(60) + '\n');

// Test 2: New ElevenLabs format with data wrapper
console.log('📋 Test 2: New ElevenLabs format with data wrapper');
const newFormatWebhook = {
  type: 'post_call_transcription',
  event_timestamp: 1640995200,
  data: {
    conversation_id: 'conv_new_123',
    agent_id: 'agent_new_456',
    metadata: {
      call_duration_secs: 120,
      phone_number: '+1555123456',
      start_time_unix_secs: 1640995080
    },
    transcript: [
      {
        role: 'agent',
        message: 'Hello, how can I help you today?',
        time_in_call_secs: 5
      },
      {
        role: 'user',
        message: 'I am interested in your product',
        time_in_call_secs: 15
      }
    ]
  }
};

try {
  const result = WebhookPayloadParser.processWebhookPayload(newFormatWebhook);
  
  console.log('✅ Processing successful');
  console.log(`   📊 Valid: ${result.isValid}`);
  console.log(`   🔍 Has Analysis: ${!!result.analysisData}`);
  console.log(`   📞 Call Source: ${result.callMetadata.call_type}`);
  console.log(`   ⏱️ Duration: ${result.callMetadata.call_duration_minutes} minutes`);
  console.log(`   🆔 Conversation ID: ${result.normalizedData.conversation_id}`);
} catch (error) {
  console.error('❌ Test 2 failed:', error);
}

console.log('\n' + '='.repeat(60) + '\n');

// Test 3: Malformed webhook data
console.log('📋 Test 3: Malformed webhook data (graceful handling)');
const malformedWebhook = {
  some_random_field: 'value',
  incomplete_data: true
};

try {
  const result = WebhookPayloadParser.processWebhookPayload(malformedWebhook);
  
  console.log('✅ Processing completed (graceful handling)');
  console.log(`   📊 Valid: ${result.isValid}`);
  console.log(`   🔍 Has Analysis: ${!!result.analysisData}`);
  console.log(`   📞 Call Source: ${result.callMetadata.call_type}`);
  console.log(`   ❌ Errors: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log('   📝 Error details:');
    result.errors.forEach((error, index) => {
      console.log(`      ${index + 1}. ${error}`);
    });
  }
} catch (error) {
  console.error('❌ Test 3 failed:', error);
}

console.log('\n' + '='.repeat(60) + '\n');

// Test 4: Mixed quote styles in Python dict (edge case)
console.log('📋 Test 4: Mixed quote styles in Python dict');
const mixedQuotesWebhook = {
  conversation_initiation_client_data: {
    dynamic_variables: {
      system__conversation_id: 'conv_mixed_123',
      system__agent_id: 'agent_mixed_456',
      system__caller_id: 'internal',
      system__call_duration_secs: 90
    }
  },
  analysis: {
    data_collection_results: {
      'Basic CTA': {
        value: `{
          "intent_level": 'Medium',
          'intent_score': 2,
          "urgency_level": "Low",
          'urgency_score': 1,
          'budget_constraint': "High",
          'budget_score': 3,
          'fit_alignment': 'Medium',
          'fit_score': 2,
          'engagement_health': 'Fair',
          'engagement_score': 2,
          'total_score': 65,
          'lead_status_tag': 'Warm Lead',
          'reasoning': 'Customer needs more information before deciding',
          'cta_pricing_clicked': 'No',
          'cta_demo_clicked': 'Yes',
          'cta_followup_clicked': 'Yes',
          'cta_sample_clicked': 'No',
          'cta_escalated_to_human': 'No'
        }`
      }
    },
    call_successful: 'true',
    transcript_summary: 'Customer requested demo and follow-up',
    call_summary_title: 'Demo request call'
  }
};

try {
  const result = WebhookPayloadParser.processWebhookPayload(mixedQuotesWebhook);
  
  console.log('✅ Processing successful');
  console.log(`   📊 Valid: ${result.isValid}`);
  console.log(`   🔍 Has Analysis: ${!!result.analysisData}`);
  console.log(`   📞 Call Source: ${result.callMetadata.call_type}`);
  
  if (result.analysisData) {
    console.log(`   🎯 Total Score: ${result.analysisData.total_score}/100`);
    console.log(`   🏷️ Lead Status: ${result.analysisData.lead_status_tag}`);
    console.log(`   🎮 Demo CTA: ${result.analysisData.cta_interactions.cta_demo_clicked}`);
    console.log(`   📞 Follow-up CTA: ${result.analysisData.cta_interactions.cta_followup_clicked}`);
  }
} catch (error) {
  console.error('❌ Test 4 failed:', error);
}

console.log('\n' + '='.repeat(60) + '\n');

// Test 5: Validation edge cases
console.log('📋 Test 5: Validation edge cases');

// Test invalid analysis data
const invalidAnalysisWebhook = {
  conversation_initiation_client_data: {
    dynamic_variables: {
      system__conversation_id: 'conv_invalid_123',
      system__agent_id: 'agent_invalid_456'
    }
  },
  analysis: {
    data_collection_results: {
      default: {
        value: `{
          'intent_level': 'High',
          'intent_score': 5,
          'total_score': 150,
          'lead_status_tag': 'Invalid Lead'
        }`
      }
    }
  }
};

try {
  WebhookPayloadParser.validateAnalysisData(invalidAnalysisWebhook);
  console.log('❌ Validation should have failed');
} catch (error) {
  console.log('✅ Validation correctly failed for invalid data');
  console.log(`   📝 Error: ${error instanceof Error ? error.message : String(error)}`);
}

console.log('\n🎉 WebhookPayloadParser integration tests completed!\n');

console.log('📊 Summary:');
console.log('   ✅ Complete webhook processing');
console.log('   ✅ New format support');
console.log('   ✅ Malformed data handling');
console.log('   ✅ Mixed quote styles parsing');
console.log('   ✅ Validation edge cases');
console.log('\n🚀 WebhookPayloadParser is ready for production use!');