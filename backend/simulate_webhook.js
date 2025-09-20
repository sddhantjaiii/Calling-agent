const axios = require('axios');

// Simulate ElevenLabs webhook payload
const webhookPayload = {
  conversation_id: "conv_test_" + Date.now(),
  agent_id: "ag_0a4d1af9a15b49e29fd4dccbab0e7b0e", 
  status: "done",
  transcript: [
    {
      role: "agent",
      message: "Hello! Thanks for calling. How can I help you today?",
      time_in_call_secs: 2.5
    },
    {
      role: "user", 
      message: "Hi, I'm interested in learning more about your pricing.",
      time_in_call_secs: 8.2
    },
    {
      role: "agent",
      message: "Great! I'd be happy to discuss our pricing options. Can I get your name and company first?",
      time_in_call_secs: 12.1
    },
    {
      role: "user",
      message: "Sure, I'm John Smith from Acme Corp. We're looking for a call center solution.",
      time_in_call_secs: 18.7
    },
    {
      role: "agent", 
      message: "Perfect John! Let me share some pricing information with you.",
      time_in_call_secs: 22.3
    }
  ],
  analysis: {
    value: "{'total_score': 85, 'lead_status_tag': 'hot', 'extraction': {'name': 'John Smith', 'email_address': 'john.smith@acme.com', 'company_name': 'Acme Corp', 'smartnotification': 'High interest prospect - follow up within 24 hours'}, 'cta_pricing_clicked': 'Yes', 'cta_demo_clicked': 'No', 'cta_followup_clicked': 'Yes', 'cta_sample_clicked': 'No', 'cta_escalated_to_human': 'No', 'demo_book_datetime': None}"
  },
  metadata: {
    start_time_unix_secs: Math.floor(Date.now() / 1000) - 180,
    call_duration_secs: 180, // 3 minutes
    cost: 0.15,
    call_id: "call_test_" + Date.now(),
    call_type: "phone",
    call_timestamp: new Date().toISOString(),
    call_timestamp_timezone: "UTC",
    latency_p50: 245,
    latency_p90: 512,
    latency_p95: 678,
    latency_p99: 1024,
    interruption_rate: 0.05,
    voice_activity_detection_rate: 0.87,
    silence_percentage: 0.12,
    phone_call: {
      direction: "inbound",
      phone_number_id: "pn_123456",
      external_number: "+1234567890",
      agent_number: "+1987654321"
    }
  }
};

async function simulateWebhook() {
  try {
    console.log('🚀 Sending webhook simulation...');
    console.log('Payload preview:', {
      conversation_id: webhookPayload.conversation_id,
      agent_id: webhookPayload.agent_id,
      status: webhookPayload.status,
      duration_secs: webhookPayload.metadata.call_duration_secs,
      phone_number: webhookPayload.metadata.phone_call.external_number,
      transcript_segments: webhookPayload.transcript.length
    });

    const response = await axios.post('http://localhost:3000/api/webhooks/elevenlabs/post-call', webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ElevenLabs-Webhook/1.0'
      },
      timeout: 10000
    });

    console.log('✅ Webhook simulation successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    console.log('\n🔍 Check the database for new records...');

  } catch (error) {
    console.error('❌ Webhook simulation failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run simulation
simulateWebhook().then(() => {
  console.log('\n📝 To inspect the results, run:');
  console.log('node -e "const { db } = require(\'./src/config/database\'); db.query(\'SELECT * FROM calls ORDER BY created_at DESC LIMIT 1\').then(result => console.log(result.rows)).catch(console.error).finally(() => process.exit());"');
});
