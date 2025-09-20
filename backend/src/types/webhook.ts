// Webhook types - ElevenLabs and Stripe webhook payloads
export interface ElevenLabsWebhookPayload {
  conversation_id: string;
  agent_id: string;
  phone_number: string;
  duration_seconds: number;
  status: 'completed' | 'failed';
  recording_url?: string;
  transcript?: string;
  lead_analytics?: any;
  timestamp: string;
}

export interface StripeWebhookPayload {
  id: string;
  object: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}