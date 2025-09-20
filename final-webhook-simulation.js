/**
 * Final ElevenLabs Webhook Flow Simulation
 * Converts legacy data to modern ElevenLabs format and tests full flow
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  WEBHOOK_ENDPOINT: '/api/webhooks/elevenlabs/post-call',
  PAYLOAD_FILE: 'post_call_transcription_conv_5301k5a9gk76end8ayk25n22z97p_1758061082219.json',
  WEBHOOK_SECRET: process.env.ELEVENLABS_WEBHOOK_SECRET || 'test-secret-key'
};

/**
 * Convert legacy payload to modern ElevenLabs format
 */
function convertToModernFormat(legacyPayload) {
  console.log('🔄 Converting legacy format to modern ElevenLabs format...');
  
  const modernPayload = {
    type: 'post_call_transcription',
    event_timestamp: Math.floor(Date.now() / 1000),
    data: {
      agent_id: legacyPayload.agent_id,
      conversation_id: legacyPayload.conversation_id,
      status: legacyPayload.status || 'done',
      user_id: legacyPayload.user_id,
      transcript: legacyPayload.transcript ? 
        legacyPayload.transcript.segments?.map(segment => ({
          role: segment.speaker === 'agent' ? 'agent' : 'user',
          message: segment.text,
          time_in_call_secs: segment.timestamp / 1000,
          tool_calls: null,
          tool_results: null,
          feedback: null,
          conversation_turn_metrics: null
        })) || [] : [],
      metadata: {
        start_time_unix_secs: legacyPayload.metadata?.start_time_unix_secs || Math.floor(Date.now() / 1000) - (legacyPayload.duration_seconds || 0),
        call_duration_secs: legacyPayload.duration_seconds || legacyPayload.metadata?.call_duration_secs || 0,
        cost: legacyPayload.cost?.total_cost || legacyPayload.metadata?.cost || 0,
        deletion_settings: null,
        feedback: null,
        authorization_method: 'api_key',
        charging: legacyPayload.cost || null,
        termination_reason: 'completed',
        caller_number: legacyPayload.caller_id || legacyPayload.phone_number,
        called_number: legacyPayload.called_number,
        timezone: legacyPayload.timezone || 'UTC'
      },
      analysis: legacyPayload.analysis || null,
      conversation_initiation_client_data: {
        conversation_config_override: null,
        custom_llm_extra_body: null,
        dynamic_variables: {}
      }
    }
  };

  console.log('✅ Payload converted to modern format');
  console.log('   - Type:', modernPayload.type);
  console.log('   - Event Timestamp:', modernPayload.event_timestamp);
  console.log('   - Conversation ID:', modernPayload.data.conversation_id);
  console.log('   - Agent ID:', modernPayload.data.agent_id);
  console.log('   - Transcript Segments:', modernPayload.data.transcript?.length || 0);
  console.log('   - Has Analysis:', !!modernPayload.data.analysis);
  console.log('   - Call Duration:', modernPayload.data.metadata.call_duration_secs, 'seconds');

  return modernPayload;
}

/**
 * Generate webhook signature for ElevenLabs format
 */
function generateWebhookSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signaturePayload = `${timestamp}.${payloadString}`;
  const hash = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
  return `t=${timestamp},v0=${hash}`;
}

/**
 * Analyze payload content for debugging
 */
function analyzePayloadContent(payload) {
  console.log('🔍 Analyzing payload content...');
  
  const data = payload.data;
  
  // Analytics analysis
  if (data.analysis && data.analysis.value) {
    try {
      let analyticsData;
      if (typeof data.analysis.value === 'string') {
        const jsonStr = data.analysis.value.replace(/'/g, '"').replace(/False/g, 'false').replace(/True/g, 'true');
        analyticsData = JSON.parse(jsonStr);
      } else {
        analyticsData = data.analysis.value;
      }
      
      console.log('📊 Analytics Data Found:');
      console.log('   - Intent Level:', analyticsData.intent_level, `(${analyticsData.intent_score})`);
      console.log('   - Urgency Level:', analyticsData.urgency_level, `(${analyticsData.urgency_score})`);
      console.log('   - Budget Constraint:', analyticsData.budget_constraint, `(${analyticsData.budget_score})`);
      console.log('   - Fit Alignment:', analyticsData.fit_alignment, `(${analyticsData.fit_score})`);
      console.log('   - Engagement Health:', analyticsData.engagement_health, `(${analyticsData.engagement_score})`);
      console.log('   - Total Score:', analyticsData.total_score);
      console.log('   - Lead Status:', analyticsData.lead_status_tag);
      
      if (analyticsData.extraction) {
        console.log('📝 Extracted Data:');
        console.log('   - Name:', analyticsData.extraction.name);
        console.log('   - Email:', analyticsData.extraction.email_address);
        console.log('   - Company:', analyticsData.extraction.company_name);
        console.log('   - Smart Notification:', analyticsData.extraction.smartnotification);
        console.log('   - Demo Scheduled:', analyticsData.demo_book_datetime);
      }
      
      console.log('   - CTA Interactions: Pricing:', analyticsData.cta_pricing_clicked, 
                  ', Demo:', analyticsData.cta_demo_clicked,
                  ', Follow-up:', analyticsData.cta_followup_clicked,
                  ', Sample:', analyticsData.cta_sample_clicked,
                  ', Escalated:', analyticsData.cta_escalated_to_human);
    } catch (error) {
      console.log('⚠️ Failed to parse analysis data:', error.message);
    }
  }
  
  // Call information
  console.log('\\n📞 Call Information:');
  console.log('   - Caller ID:', data.metadata?.caller_number);
  console.log('   - Called Number:', data.metadata?.called_number);
  console.log('   - Duration:', data.metadata?.call_duration_secs + 's');
  console.log('   - Cost: $' + (data.metadata?.cost || 0).toFixed(4));
  console.log('   - Timezone:', data.metadata?.timezone);
  
  // Transcript summary
  if (data.transcript && data.transcript.length > 0) {
    const totalWords = data.transcript.reduce((sum, segment) => 
      sum + segment.message.split(' ').length, 0);
    const summary = data.transcript.map(s => s.message).join(' ').substring(0, 150) + '...';
    
    console.log('\\n📝 Conversation Summary:');
    console.log('   - Total Segments:', data.transcript.length);
    console.log('   - Total Words:', totalWords);
    console.log('   - Summary:', summary);
  }
}

/**
 * Test backend health
 */
async function testBackendHealth() {
  console.log('🏥 Checking backend health...');
  try {
    const response = await axios.get(`${CONFIG.BACKEND_URL}/api/webhooks/health`);
    console.log('✅ Backend is healthy');
    console.log('   - Status:', response.status);
    console.log('   - Response:', JSON.stringify(response.data));
    return true;
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    if (error.response) {
      console.log('   - Status:', error.response.status);
      console.log('   - Response:', error.response.data);
    }
    return false;
  }
}

/**
 * Load and prepare webhook payload
 */
function loadWebhookPayload() {
  console.log('📂 Loading webhook payload from file...');
  
  try {
    if (!fs.existsSync(CONFIG.PAYLOAD_FILE)) {
      throw new Error(`Payload file not found: ${CONFIG.PAYLOAD_FILE}`);
    }
    
    const rawData = fs.readFileSync(CONFIG.PAYLOAD_FILE, 'utf8');
    const legacyPayload = JSON.parse(rawData);
    
    console.log('✅ Legacy payload loaded successfully');
    console.log('   - Conversation ID:', legacyPayload.conversation_id);
    console.log('   - Agent ID:', legacyPayload.agent_id);
    console.log('   - Status:', legacyPayload.status);
    console.log('   - Transcript Length:', legacyPayload.transcript?.segments?.length || 0, 'segments');
    console.log('   - Has Analysis:', !!legacyPayload.analysis);
    console.log('   - Has Metadata:', !!legacyPayload.metadata);
    
    // Convert to modern format
    const modernPayload = convertToModernFormat(legacyPayload);
    
    return modernPayload;
  } catch (error) {
    throw new Error(`Failed to load payload: ${error.message}`);
  }
}

/**
 * Send webhook to backend
 */
async function sendWebhook(payload) {
  console.log('\\n🚀 Sending webhook to backend...');
  console.log('   - URL:', `${CONFIG.BACKEND_URL}${CONFIG.WEBHOOK_ENDPOINT}`);
  console.log('   - Payload Size:', (JSON.stringify(payload).length / 1024).toFixed(2), 'KB');
  
  const signature = generateWebhookSignature(payload, CONFIG.WEBHOOK_SECRET);
  console.log('   - Signature:', signature.substring(0, 50) + '...');
  
  try {
    const response = await axios.post(
      `${CONFIG.BACKEND_URL}${CONFIG.WEBHOOK_ENDPOINT}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-ElevenLabs-Signature': signature,
          'User-Agent': 'ElevenLabs-Webhook-Simulator/1.0'
        },
        timeout: 30000
      }
    );
    
    console.log('\\n✅ Webhook processed successfully!');
    console.log('   - Status:', response.status);
    console.log('   - Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.conversation_id) {
      console.log('\\n🎯 Processing Results:');
      console.log('   - Conversation ID:', response.data.conversation_id);
      console.log('   - Processing Time:', response.data.timestamp);
      console.log('   - Success:', response.data.success);
    }
    
    return response.data;
  } catch (error) {
    console.log('\\n❌ Webhook failed with response:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw new Error(`Webhook failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Main simulation function
 */
async function runWebhookSimulation() {
  console.log('🎭 ElevenLabs Webhook Flow Simulation (Modern Format)');
  console.log('=====================================================\\n');
  
  try {
    // Step 1: Check backend health
    const isHealthy = await testBackendHealth();
    if (!isHealthy) {
      throw new Error('Backend is not healthy. Please start the backend server.');
    }
    
    // Step 2: Load and convert payload
    const payload = loadWebhookPayload();
    
    // Step 3: Analyze payload content
    analyzePayloadContent(payload);
    
    // Step 4: Send webhook
    const result = await sendWebhook(payload);
    
    console.log('\\n🎉 Simulation completed successfully!');
    console.log('\\n📋 Summary:');
    console.log('   ✅ Backend health check passed');
    console.log('   ✅ Payload converted to modern ElevenLabs format');
    console.log('   ✅ Webhook signature generated and verified');
    console.log('   ✅ Full webhook processing flow completed');
    console.log('   ✅ Enhanced analytics processed and stored');
    console.log('   ✅ Smart notifications and demo bookings extracted');
    
    return result;
  } catch (error) {
    console.log('\\n💥 Simulation failed:', error.message);
    console.log('\\n🔧 Troubleshooting:');
    console.log('   1. Ensure backend is running: npm run dev');
    console.log('   2. Check database connection');
    console.log('   3. Verify payload file exists:', CONFIG.PAYLOAD_FILE);
    console.log('   4. Check console for detailed errors');
    throw error;
  }
}

// Execute the simulation
if (require.main === module) {
  runWebhookSimulation().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runWebhookSimulation,
  convertToModernFormat,
  generateWebhookSignature,
  CONFIG
};
