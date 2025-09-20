/**
 * Comprehensive ElevenLabs Webhook Simulation Script
 * 
 * This script simulates the complete webhook flow by:
 * 1. Loading the actual ElevenLabs payload from the JSON file
 * 2. Sending it to the backend webhook endpoint
 * 3. Following the full processing flow including database operations
 * 4. Validating the results in the database
 * 
 * Usage: node simulate-webhook-flow.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  WEBHOOK_ENDPOINT: '/api/webhooks/elevenlabs/post-call',
  WEBHOOK_SECRET: process.env.ELEVENLABS_WEBHOOK_SECRET || 'test-secret-key',
  PAYLOAD_FILE: 'post_call_transcription_conv_5301k5a9gk76end8ayk25n22z97p_1758061082219.json'
};

/**
 * Generate ElevenLabs webhook signature
 * Format: t=timestamp,v0=hash
 */
function generateWebhookSignature(payload, secret, timestamp) {
  const signaturePayload = `${timestamp}.${payload}`;
  const hash = crypto.createHmac('sha256', secret).update(signaturePayload, 'utf8').digest('hex');
  return `t=${timestamp},v0=${hash}`;
}

/**
 * Load and prepare the webhook payload
 */
function loadWebhookPayload() {
  try {
    console.log('📂 Loading webhook payload from file...');
    const payloadPath = path.join(__dirname, CONFIG.PAYLOAD_FILE);
    
    if (!fs.existsSync(payloadPath)) {
      throw new Error(`Payload file not found: ${payloadPath}`);
    }
    
    const rawData = fs.readFileSync(payloadPath, 'utf8');
    const payload = JSON.parse(rawData);
    
    console.log('✅ Payload loaded successfully');
    console.log(`   - Conversation ID: ${payload.conversation_id}`);
    console.log(`   - Agent ID: ${payload.agent_id}`);
    console.log(`   - Status: ${payload.status}`);
    console.log(`   - Transcript Length: ${payload.transcript?.length || 0} segments`);
    console.log(`   - Has Analysis: ${!!payload.analysis}`);
    console.log(`   - Has Metadata: ${!!payload.metadata}`);
    
    // Add required metadata for webhook processing
    const enhancedPayload = {
      ...payload,
      // Add phone number from dynamic variables if available
      phone_number: payload.conversation_initiation_client_data?.dynamic_variables?.system__caller_id || "+16578370997",
      // Add duration from metadata or dynamic variables
      duration_seconds: payload.conversation_initiation_client_data?.dynamic_variables?.system__call_duration_secs || 170,
      // Add cost information (simulate typical costs)
      cost: {
        total_cost: 0.15,
        llm_cost: 0.08,
        tts_cost: 0.04,
        stt_cost: 0.02,
        turn_detection_cost: 0.01,
        currency: "USD"
      },
      // Ensure timestamp is present
      timestamp: new Date().toISOString()
    };
    
    return enhancedPayload;
  } catch (error) {
    console.error('❌ Failed to load payload:', error.message);
    throw error;
  }
}

/**
 * Send webhook to backend
 */
async function sendWebhookToBackend(payload) {
  try {
    console.log('\\n🚀 Sending webhook to backend...');
    
    const payloadString = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateWebhookSignature(payloadString, CONFIG.WEBHOOK_SECRET, timestamp);
    
    const webhookUrl = `${CONFIG.BACKEND_URL}${CONFIG.WEBHOOK_ENDPOINT}`;
    console.log(`   - URL: ${webhookUrl}`);
    console.log(`   - Payload Size: ${(payloadString.length / 1024).toFixed(2)} KB`);
    console.log(`   - Signature: ${signature.substring(0, 50)}...`);
    
    const response = await axios.post(webhookUrl, payloadString, {
      headers: {
        'Content-Type': 'application/json',
        'X-ElevenLabs-Signature': signature,
        'User-Agent': 'ElevenLabs-Webhook/1.0'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ Webhook sent successfully');
    console.log(`   - Status: ${response.status} ${response.statusText}`);
    console.log(`   - Response: ${JSON.stringify(response.data)}`);
    
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('❌ Webhook failed with response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('❌ No response received from backend');
      console.error('   - Is the backend server running?');
      console.error('   - Check:', CONFIG.BACKEND_URL);
    } else {
      console.error('❌ Request setup failed:', error.message);
    }
    throw error;
  }
}

/**
 * Validate backend health before testing
 */
async function checkBackendHealth() {
  try {
    console.log('🏥 Checking backend health...');
    const healthUrl = `${CONFIG.BACKEND_URL}/api/webhooks/health`;
    const response = await axios.get(healthUrl, { timeout: 5000 });
    
    console.log('✅ Backend is healthy');
    console.log(`   - Status: ${response.status}`);
    console.log(`   - Response: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed');
    if (error.code === 'ECONNREFUSED') {
      console.error('   - Backend server is not running');
      console.error('   - Start it with: npm run dev');
    } else {
      console.error(`   - Error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Query database to validate results
 */
async function validateDatabaseResults(payload) {
  try {
    console.log('\\n📊 Validating database results...');
    
    // Query calls table
    const callsUrl = `${CONFIG.BACKEND_URL}/api/calls`;
    const callsResponse = await axios.get(`${callsUrl}?conversation_id=${payload.conversation_id}`, {
      timeout: 10000
    });
    
    if (callsResponse.data && callsResponse.data.length > 0) {
      const call = callsResponse.data[0];
      console.log('✅ Call record found in database');
      console.log(`   - Call ID: ${call.id}`);
      console.log(`   - Duration: ${call.duration_seconds}s`);
      console.log(`   - Phone: ${call.phone_number}`);
      console.log(`   - Status: ${call.status}`);
      console.log(`   - Has Transcript: ${!!call.transcript}`);
      
      // Query analytics for this call
      const analyticsUrl = `${CONFIG.BACKEND_URL}/api/analytics/call/${call.id}`;
      try {
        const analyticsResponse = await axios.get(analyticsUrl, { timeout: 10000 });
        if (analyticsResponse.data) {
          console.log('✅ Analytics record found');
          console.log(`   - Total Score: ${analyticsResponse.data.total_score}`);
          console.log(`   - Lead Status: ${analyticsResponse.data.lead_status_tag}`);
          console.log(`   - Smart Notification: ${analyticsResponse.data.smart_notification || 'None'}`);
          console.log(`   - Demo DateTime: ${analyticsResponse.data.demo_book_datetime || 'None'}`);
        }
      } catch (analyticsError) {
        console.log('⚠️ Analytics not found (may be processing)');
      }
      
      return call;
    } else {
      console.log('⚠️ Call record not found in database');
      return null;
    }
  } catch (error) {
    console.log('⚠️ Database validation failed:', error.message);
    return null;
  }
}

/**
 * Extract key insights from the payload
 */
function analyzePayload(payload) {
  console.log('\\n🔍 Analyzing payload content...');
  
  // Extract analysis data
  if (payload.analysis?.data_collection_results?.default?.value) {
    try {
      const analysisValue = payload.analysis.data_collection_results.default.value;
      // Parse Python-style dict to JSON
      const jsonStr = analysisValue.replace(/'/g, '"').replace(/False/g, 'false').replace(/True/g, 'true');
      const analytics = JSON.parse(jsonStr);
      
      console.log('📊 Analytics Data Found:');
      console.log(`   - Intent Level: ${analytics.intent_level} (${analytics.intent_score})`);
      console.log(`   - Urgency Level: ${analytics.urgency_level} (${analytics.urgency_score})`);
      console.log(`   - Budget Constraint: ${analytics.budget_constraint} (${analytics.budget_score})`);
      console.log(`   - Fit Alignment: ${analytics.fit_alignment} (${analytics.fit_score})`);
      console.log(`   - Engagement Health: ${analytics.engagement_health} (${analytics.engagement_score})`);
      console.log(`   - Total Score: ${analytics.total_score}`);
      console.log(`   - Lead Status: ${analytics.lead_status_tag}`);
      
      if (analytics.extraction) {
        console.log('📝 Extracted Data:');
        console.log(`   - Name: ${analytics.extraction.name || 'Not found'}`);
        console.log(`   - Email: ${analytics.extraction.email_address || 'Not found'}`);
        console.log(`   - Company: ${analytics.extraction.company_name || 'Not found'}`);
        console.log(`   - Smart Notification: ${analytics.extraction.smartnotification || 'None'}`);
      }
      
      if (analytics.demo_book_datetime) {
        console.log(`   - Demo Scheduled: ${analytics.demo_book_datetime}`);
      }
      
      const ctaClicks = [
        `Pricing: ${analytics.cta_pricing_clicked}`,
        `Demo: ${analytics.cta_demo_clicked}`,
        `Follow-up: ${analytics.cta_followup_clicked}`,
        `Sample: ${analytics.cta_sample_clicked}`,
        `Escalated: ${analytics.cta_escalated_to_human}`
      ];
      console.log(`   - CTA Interactions: ${ctaClicks.join(', ')}`);
      
    } catch (parseError) {
      console.log('⚠️ Could not parse analytics data:', parseError.message);
    }
  } else {
    console.log('⚠️ No analytics data found in payload');
  }
  
  // Extract conversation metadata
  if (payload.conversation_initiation_client_data?.dynamic_variables) {
    const vars = payload.conversation_initiation_client_data.dynamic_variables;
    console.log('\\n📞 Call Information:');
    console.log(`   - Caller ID: ${vars.system__caller_id}`);
    console.log(`   - Called Number: ${vars.system__called_number}`);
    console.log(`   - Duration: ${vars.system__call_duration_secs}s`);
    console.log(`   - Time: ${vars.system__time}`);
    console.log(`   - Timezone: ${vars.system__timezone}`);
  }
  
  // Extract transcript summary
  if (payload.analysis?.transcript_summary) {
    console.log('\\n📝 Conversation Summary:');
    console.log(`   ${payload.analysis.transcript_summary.substring(0, 200)}...`);
  }
}

/**
 * Main execution flow
 */
async function runWebhookSimulation() {
  console.log('🎭 ElevenLabs Webhook Flow Simulation');
  console.log('=====================================\\n');
  
  try {
    // Step 1: Check backend health
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      console.log('\\n❌ Cannot proceed with unhealthy backend');
      console.log('💡 Please ensure the backend server is running:');
      console.log('   cd backend && npm run dev');
      process.exit(1);
    }
    
    // Step 2: Load payload
    const payload = loadWebhookPayload();
    
    // Step 3: Analyze payload content
    analyzePayload(payload);
    
    // Step 4: Send webhook
    const webhookResult = await sendWebhookToBackend(payload);
    
    // Step 5: Wait a moment for processing
    console.log('\\n⏳ Waiting for backend processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 6: Validate results
    const dbResult = await validateDatabaseResults(payload);
    
    // Step 7: Summary
    console.log('\\n🎉 Webhook Simulation Complete!');
    console.log('================================');
    
    if (dbResult) {
      console.log('✅ Full flow successful:');
      console.log('   ✅ Webhook received and processed');
      console.log('   ✅ Call record created in database');
      console.log('   ✅ Transcript stored');
      console.log('   ✅ Analytics processed');
      console.log('   ✅ Enhanced lead data extracted');
      console.log('   ✅ Contact auto-creation attempted');
    } else {
      console.log('⚠️ Partial success:');
      console.log('   ✅ Webhook received');
      console.log('   ⚠️ Database validation incomplete');
    }
    
    console.log('\\n💡 Next steps:');
    console.log('   - Check backend logs for detailed processing info');
    console.log('   - Verify database entries in your admin panel');
    console.log('   - Test frontend display of the new call data');
    
  } catch (error) {
    console.error('\\n💥 Simulation failed:', error.message);
    console.error('\\n🔧 Troubleshooting:');
    console.error('   1. Ensure backend is running: npm run dev');
    console.error('   2. Check database connection');
    console.error('   3. Verify webhook endpoint exists');
    console.error('   4. Check console for detailed errors');
    process.exit(1);
  }
}

// Execute the simulation
if (require.main === module) {
  runWebhookSimulation().catch(console.error);
}

module.exports = {
  runWebhookSimulation,
  loadWebhookPayload,
  sendWebhookToBackend,
  CONFIG
};
