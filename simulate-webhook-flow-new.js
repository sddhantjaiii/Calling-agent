/**
 * Complete Webhook Flow Simulation Script
 * Tests the NEW webhook service with the exact JSON payload format
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

const CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  WEBHOOK_ENDPOINT: '/api/webhooks/elevenlabs/post-call',
  PAYLOAD_FILE: './post_call_transcription_conv_5301k5a9gk76end8ayk25n22z97p_1758061082219.json',
  WEBHOOK_SECRET: process.env.ELEVENLABS_WEBHOOK_SECRET || 'test-secret-123'
};

/**
 * Create ElevenLabs webhook signature
 */
function createWebhookSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  return `t=${timestamp},v0=${signature}`;
}

/**
 * Format duration for display
 */
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds} sec`;
  } else if (remainingSeconds === 0) {
    return `${minutes} min`;
  } else {
    return `${minutes} min ${remainingSeconds} sec`;
  }
}

/**
 * Calculate billing minutes (rounded up)
 */
function calculateBillingMinutes(seconds) {
  return Math.ceil(seconds / 60);
}

/**
 * Main simulation function
 */
async function runWebhookSimulation() {
  console.log('🎭 ElevenLabs Webhook Flow Simulation');
  console.log('=====================================\\n');

  try {
    // Step 1: Health check
    console.log('🏥 Checking backend health...');
    try {
      const healthResponse = await axios.get(`${CONFIG.BACKEND_URL}/api/webhooks/health`);
      console.log('✅ Backend is healthy');
      console.log(`   - Status: ${healthResponse.status}`);
      console.log(`   - Response: ${JSON.stringify(healthResponse.data)}`);
    } catch (healthError) {
      console.log('❌ Backend health check failed:', healthError.message);
      console.log('💡 Make sure backend is running: npm run dev');
      return;
    }

    // Step 2: Load webhook payload
    console.log('\\n📂 Loading webhook payload from file...');
    let payload;
    try {
      const rawPayload = fs.readFileSync(CONFIG.PAYLOAD_FILE, 'utf8');
      payload = JSON.parse(rawPayload);
      console.log('✅ Payload loaded successfully');
      console.log(`   - Conversation ID: ${payload.conversation_id}`);
      console.log(`   - Agent ID: ${payload.agent_id}`);
      console.log(`   - Status: ${payload.status}`);
      console.log(`   - Transcript Segments: ${payload.transcript?.segments?.length || 0}`);
      console.log(`   - Has Analysis: ${!!payload.analysis}`);
      console.log(`   - Has Metadata: ${!!payload.metadata}`);
    } catch (error) {
      console.log('❌ Failed to load payload:', error.message);
      return;
    }

    // Step 3: Analyze payload content
    console.log('\\n🔍 Analyzing payload content...');
    
    // Duration analysis
    const callDurationSecs = payload.metadata?.call_duration_secs || 0;
    const displayDuration = formatDuration(callDurationSecs);
    const billingMinutes = calculateBillingMinutes(callDurationSecs);
    
    console.log('⏱️ Duration Analysis:');
    console.log(`   - Exact Duration: ${callDurationSecs} seconds`);
    console.log(`   - Display Format: ${displayDuration}`);
    console.log(`   - Billing Minutes: ${billingMinutes} (rounded up)`);
    console.log(`   - Credits to Deduct: ${billingMinutes}`);

    // Analysis data parsing
    if (payload.analysis && payload.analysis.value) {
      try {
        // Convert Python-style format to proper JSON
        const jsonStr = payload.analysis.value
          .replace(/'/g, '"')
          .replace(/False/g, 'false')
          .replace(/True/g, 'true')
          .replace(/None/g, 'null');
        
        const parsedAnalysis = JSON.parse(jsonStr);
        
        console.log('\\n📊 Analytics Data Found:');
        console.log(`   - Intent Level: ${parsedAnalysis.intent_level} (${parsedAnalysis.intent_score})`);
        console.log(`   - Urgency Level: ${parsedAnalysis.urgency_level} (${parsedAnalysis.urgency_score})`);
        console.log(`   - Budget Constraint: ${parsedAnalysis.budget_constraint} (${parsedAnalysis.budget_score})`);
        console.log(`   - Fit Alignment: ${parsedAnalysis.fit_alignment} (${parsedAnalysis.fit_score})`);
        console.log(`   - Engagement Health: ${parsedAnalysis.engagement_health} (${parsedAnalysis.engagement_score})`);
        console.log(`   - Total Score: ${parsedAnalysis.total_score}`);
        console.log(`   - Lead Status: ${parsedAnalysis.lead_status_tag}`);
        
        if (parsedAnalysis.extraction) {
          console.log('\\n📝 Extracted Data:');
          console.log(`   - Name: ${parsedAnalysis.extraction.name || 'Not found'}`);
          console.log(`   - Email: ${parsedAnalysis.extraction.email_address || 'Not found'}`);
          console.log(`   - Company: ${parsedAnalysis.extraction.company_name || 'Not found'}`);
          console.log(`   - Smart Notification: ${parsedAnalysis.extraction.smartnotification || 'Not found'}`);
          console.log(`   - Demo Scheduled: ${parsedAnalysis.demo_book_datetime || 'Not found'}`);
          console.log(`   - CTA Interactions: Pricing: ${parsedAnalysis.cta_pricing_clicked}, Demo: ${parsedAnalysis.cta_demo_clicked}, Follow-up: ${parsedAnalysis.cta_followup_clicked}, Sample: ${parsedAnalysis.cta_sample_clicked}, Escalated: ${parsedAnalysis.cta_escalated_to_human}`);
        }
      } catch (parseError) {
        console.log('⚠️ Failed to parse analysis data:', parseError.message);
      }
    }

    // Call information
    console.log('\\n📞 Call Information:');
    console.log(`   - Caller ID: ${payload.metadata?.caller_number || 'Not found'}`);
    console.log(`   - Called Number: ${payload.metadata?.called_number || 'Not found'}`);
    console.log(`   - Duration: ${callDurationSecs}s`);
    console.log(`   - Time: ${payload.metadata?.call_timestamp || 'Not found'}`);
    console.log(`   - Timezone: ${payload.metadata?.call_timestamp_timezone || 'Not found'}`);

    // Transcript summary
    if (payload.transcript && payload.transcript.segments) {
      const transcriptText = payload.transcript.segments
        .map(seg => `${seg.speaker}: ${seg.text}`)
        .join(' ')
        .substring(0, 200);
      console.log('\\n📝 Conversation Summary:');
      console.log(`   ${transcriptText}...`);
    }

    // Step 4: Send webhook to backend
    console.log('\\n🚀 Sending webhook to backend...');
    const payloadString = JSON.stringify(payload);
    const signature = createWebhookSignature(payloadString, CONFIG.WEBHOOK_SECRET);
    
    console.log(`   - URL: ${CONFIG.BACKEND_URL}${CONFIG.WEBHOOK_ENDPOINT}`);
    console.log(`   - Payload Size: ${(payloadString.length / 1024).toFixed(2)} KB`);
    console.log(`   - Signature: ${signature.substring(0, 50)}...`);

    try {
      const webhookResponse = await axios.post(
        `${CONFIG.BACKEND_URL}${CONFIG.WEBHOOK_ENDPOINT}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-ElevenLabs-Signature': signature,
            'User-Agent': 'ElevenLabs-Webhook/1.0'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('\\n🎉 Webhook processed successfully!');
      console.log(`   - Status: ${webhookResponse.status}`);
      console.log(`   - Response: ${JSON.stringify(webhookResponse.data, null, 2)}`);
      
      // Step 5: Verify processing results
      console.log('\\n🔍 Processing Results:');
      if (webhookResponse.data.success) {
        console.log('✅ All webhook processing completed');
        console.log('\\n📊 Expected Database Changes:');
        console.log(`   - Call record: Created/Updated with ${callDurationSecs}s duration`);
        console.log(`   - Display duration: ${displayDuration}`);
        console.log(`   - Billing: ${billingMinutes} credits deducted`);
        console.log('   - Transcript: Stored with segments and full text');
        console.log('   - Analytics: Enhanced lead scoring processed');
        console.log('   - Contact: Auto-created/updated from extracted data');
        console.log('   - Smart notification: Stored for follow-up actions');
        
        if (payload.analysis?.value) {
          try {
            const parsedAnalysis = JSON.parse(
              payload.analysis.value
                .replace(/'/g, '"')
                .replace(/False/g, 'false')
                .replace(/True/g, 'true')
                .replace(/None/g, 'null')
            );
            
            if (parsedAnalysis.demo_book_datetime) {
              console.log(`   - Demo booking: ${parsedAnalysis.demo_book_datetime} tracked`);
            }
          } catch (e) {
            // Ignore parsing errors in final summary
          }
        }
      } else {
        console.log('⚠️ Webhook processing completed with warnings');
      }

    } catch (webhookError) {
      console.log('❌ Webhook failed with response:', {
        status: webhookError.response?.status,
        statusText: webhookError.response?.statusText,
        data: webhookError.response?.data
      });
      
      if (webhookError.code === 'ECONNREFUSED') {
        console.log('\\n💡 Connection refused - ensure backend is running on port 3000');
      }
      
      throw webhookError;
    }

  } catch (error) {
    console.log('\\n💥 Simulation failed:', error.message);
    
    console.log('\\n🔧 Troubleshooting:');
    console.log('   1. Ensure backend is running: npm run dev');
    console.log('   2. Check database connection');
    console.log('   3. Verify webhook endpoint exists');
    console.log('   4. Check console for detailed errors');
    
    process.exit(1);
  }
}

// Run the simulation
if (require.main === module) {
  runWebhookSimulation().catch(console.error);
}

module.exports = { runWebhookSimulation };
