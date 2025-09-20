/**
 * Minimal webhook test - just sends the webhook without waiting for database validation
 */
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

const CONFIG = {
  BACKEND_URL: 'http://localhost:3000',
  WEBHOOK_ENDPOINT: '/api/webhooks/elevenlabs/post-call',
  WEBHOOK_SECRET: process.env.ELEVENLABS_WEBHOOK_SECRET || 'test-secret-key',
  PAYLOAD_FILE: 'post_call_transcription_conv_5301k5a9gk76end8ayk25n22z97p_1758061082219.json'
};

function generateWebhookSignature(payload, secret, timestamp) {
  const signaturePayload = `${timestamp}.${payload}`;
  const hash = crypto.createHmac('sha256', secret).update(signaturePayload, 'utf8').digest('hex');
  return `t=${timestamp},v0=${hash}`;
}

async function sendMinimalWebhook() {
  try {
    console.log('📂 Loading payload...');
    const rawData = fs.readFileSync(CONFIG.PAYLOAD_FILE, 'utf8');
    const payload = JSON.parse(rawData);
    
    // Add required fields
    const enhancedPayload = {
      ...payload,
      phone_number: "+16578370997",
      duration_seconds: 170,
      timestamp: new Date().toISOString()
    };
    
    console.log('🚀 Sending webhook...');
    const payloadString = JSON.stringify(enhancedPayload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateWebhookSignature(payloadString, CONFIG.WEBHOOK_SECRET, timestamp);
    
    const response = await axios.post(`${CONFIG.BACKEND_URL}${CONFIG.WEBHOOK_ENDPOINT}`, payloadString, {
      headers: {
        'Content-Type': 'application/json',
        'X-ElevenLabs-Signature': signature,
        'User-Agent': 'ElevenLabs-Webhook/1.0'
      },
      timeout: 5000
    });
    
    console.log('✅ Webhook response:', response.status, response.data);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Webhook failed:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

sendMinimalWebhook();
