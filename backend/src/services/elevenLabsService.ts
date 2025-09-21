import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '../utils/logger';
import { RetryService, createElevenLabsRetryConfig, RetryResult, RetryConfig } from './retryService';

// ElevenLabs Conversational AI API interfaces based on official documentation
// https://elevenlabs.io/docs/conversational-ai

export interface ElevenLabsVoiceSettings {
  stability?: number; // 0.0 to 1.0
  similarity_boost?: number; // 0.0 to 1.0
  style?: number; // 0.0 to 1.0
  use_speaker_boost?: boolean;
}

export interface ElevenLabsLLMConfig {
  model: string; // e.g., "gpt-4", "gpt-3.5-turbo"
  temperature?: number; // 0.0 to 2.0
  max_tokens?: number;
  system_prompt?: string;
}

export interface ElevenLabsTTSConfig {
  voice_id: string;
  model?: string; // e.g., "eleven_turbo_v2"
  voice_settings?: ElevenLabsVoiceSettings;
}

export interface ElevenLabsWebhookConfig {
  url: string;
  secret?: string;
}

export interface ElevenLabsAgent {
  agent_id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  first_message?: string;
  language?: string; // e.g., "en", "es", "fr"
  max_duration_seconds?: number;
  response_engine?: {
    type: string;
    config?: any;
  };
  llm?: ElevenLabsLLMConfig;
  tts?: ElevenLabsTTSConfig;
  webhook?: ElevenLabsWebhookConfig;
  platform_settings?: {
    data_collection?: {
      default?: {
        type?: string;
        description?: string;
      };
    };
    widget_config?: {
      description?: string;
    };
  };
  created_at?: string;
  updated_at?: string;
}

export interface CreateAgentRequest {
  conversation_config: {
    agent?: {
      prompt?: {
        prompt?: string;
      };
      first_message?: string;
      language?: string;
    };
    asr?: {
      quality?: string;
      user_input_audio_format?: string;
    };
    tts?: {
      voice_id?: string;
      model?: string;
      language?: string;
      output_audio_format?: string;
      optimize_streaming_latency?: number;
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
    };
    llm?: {
      model?: string;
      system_prompt?: string;
      temperature?: number;
      max_tokens?: number;
    };
    tools?: any[];
  };
  platform_settings?: {
    widget_config?: {
      tint_color?: string;
      avatar_url?: string;
      description?: string;
    };
    data_collection?: {
      default?: {
        type?: string;
        description?: string;
      };
    };
  } | null;
  workflow?: any;
  name?: string | null;
  tags?: string[] | null;
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  available_for_tiers?: string[];
  settings?: ElevenLabsVoiceSettings;
}

export interface ElevenLabsConversation {
  conversation_id: string;
  agent_id: string;
  status: 'active' | 'ended' | 'error';
  created_at: string;
  ended_at?: string;
  duration_seconds?: number;
}

export interface StartConversationRequest {
  agent_id: string;
  phone_number?: string;
  webhook_url?: string;
}

export interface ElevenLabsError {
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

class ElevenLabsService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;
  private retryConfig: RetryConfig;
  private readonly REQUEST_TIMEOUT = 15000; // 15 seconds per individual request
  private readonly TOTAL_TIMEOUT = 30000; // 30 seconds total including retries

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.baseUrl = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io';
    this.retryConfig = createElevenLabsRetryConfig();

    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: this.REQUEST_TIMEOUT, // Individual request timeout
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`ElevenLabs API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('ElevenLabs API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.info(`ElevenLabs API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('ElevenLabs API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
        });
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 401:
          return new Error('ElevenLabs API authentication failed. Check API key.');
        case 403:
          return new Error('ElevenLabs API access forbidden. Check permissions.');
        case 404:
          return new Error('ElevenLabs API resource not found.');
        case 422:
          return new Error(`ElevenLabs API validation error: ${data?.error?.message || 'Invalid request data'}`);
        case 429:
          return new Error('ElevenLabs API rate limit exceeded. Please try again later.');
        case 500:
        case 502:
        case 503:
        case 504:
          return new Error('ElevenLabs API server error. Please try again later.');
        default:
          return new Error(data?.error?.message || `ElevenLabs API error: ${status}`);
      }
    } else if (error.request) {
      return new Error('ElevenLabs API request failed. Check network connection.');
    } else {
      return new Error(`ElevenLabs API client error: ${error.message}`);
    }
  }

  /**
   * Execute API call with retry logic and timeout handling
   * Requirements: 5.1, 5.5, 5.6
   */
  private async executeWithRetry<T>(
    operation: () => Promise<AxiosResponse<T>>,
    operationName: string
  ): Promise<T> {
    const result = await RetryService.executeWithRetryAndTimeout(
      operation,
      this.retryConfig,
      this.TOTAL_TIMEOUT,
      operationName
    );

    if (result.success && result.data) {
      logger.info(`ElevenLabs API ${operationName} succeeded`, {
        attempts: result.attempts,
        totalTime: `${result.totalTime}ms`
      });
      return result.data.data;
    } else {
      const error = result.error || new Error(`Failed to execute ${operationName}`);
      logger.error(`ElevenLabs API ${operationName} failed after ${result.attempts} attempts`, {
        error: error.message,
        totalTime: `${result.totalTime}ms`,
        attempts: result.attempts
      });
      throw error;
    }
  }

  /**
   * Create a new conversational agent
   * POST /v1/convai/agents/create
   * Requirements: 5.1, 5.5, 5.6
   */
  async createAgent(agentData: CreateAgentRequest): Promise<ElevenLabsAgent> {
    // Debug logging to check data_collection description length
    if (agentData.platform_settings?.data_collection?.default?.description) {
      const descLength = agentData.platform_settings.data_collection.default.description.length;
      logger.info(`[ElevenLabs] Sending data_collection description with ${descLength} characters`);
      logger.info(`[ElevenLabs] First 200 chars: ${agentData.platform_settings.data_collection.default.description.substring(0, 200)}...`);
      logger.info(`[ElevenLabs] Last 200 chars: ...${agentData.platform_settings.data_collection.default.description.substring(Math.max(0, descLength - 200))}`);
    }
    
    const result = await this.executeWithRetry(
      () => this.client.post('/v1/convai/agents/create', agentData),
      'createAgent'
    );
    
    // Debug logging to check what ElevenLabs returned
    if (result.platform_settings?.data_collection?.default?.description) {
      const returnedLength = result.platform_settings.data_collection.default.description.length;
      logger.info(`[ElevenLabs] Received data_collection description with ${returnedLength} characters`);
      if (agentData.platform_settings?.data_collection?.default?.description) {
        const originalLength = agentData.platform_settings.data_collection.default.description.length;
        if (returnedLength !== originalLength) {
          logger.warn(`[ElevenLabs] Description length mismatch! Sent: ${originalLength}, Received: ${returnedLength}`);
        }
      }
    }
    
    return result;
  }

  /**
   * Get agent by ID
   * GET /v1/convai/agents/{agent_id}
   * Requirements: 5.1, 5.5, 5.6
   */
  async getAgent(agentId: string): Promise<ElevenLabsAgent> {
    return this.executeWithRetry(
      () => this.client.get(`/v1/convai/agents/${agentId}`),
      `getAgent(${agentId})`
    );
  }

  /**
   * List all agents
   * GET /v1/convai/agents
   * Requirements: 5.1, 5.5, 5.6
   */
  async listAgents(): Promise<ElevenLabsAgent[]> {
    const result = await this.executeWithRetry(
      () => this.client.get('/v1/convai/agents'),
      'listAgents'
    );
    return (result as any).agents || [];
  }

  /**
   * Update an existing agent
   * PATCH /v1/convai/agents/{agent_id}
   * Requirements: 5.1, 5.5, 5.6
   */
  async updateAgent(agentId: string, agentData: UpdateAgentRequest): Promise<ElevenLabsAgent> {
    // Debug logging to check data_collection description length for updates
    if (agentData.platform_settings?.data_collection?.default?.description) {
      const descLength = agentData.platform_settings.data_collection.default.description.length;
      logger.info(`[ElevenLabs] Updating agent ${agentId} with data_collection description of ${descLength} characters`);
      logger.info(`[ElevenLabs] First 200 chars: ${agentData.platform_settings.data_collection.default.description.substring(0, 200)}...`);
      logger.info(`[ElevenLabs] Last 200 chars: ...${agentData.platform_settings.data_collection.default.description.substring(Math.max(0, descLength - 200))}`);
    }
    
    const result = await this.executeWithRetry(
      () => this.client.patch(`/v1/convai/agents/${agentId}`, agentData),
      `updateAgent(${agentId})`
    );
    
    // Debug logging to check what ElevenLabs returned for updates
    if (result.platform_settings?.data_collection?.default?.description) {
      const returnedLength = result.platform_settings.data_collection.default.description.length;
      logger.info(`[ElevenLabs] Agent ${agentId} updated, received data_collection description with ${returnedLength} characters`);
      if (agentData.platform_settings?.data_collection?.default?.description) {
        const originalLength = agentData.platform_settings.data_collection.default.description.length;
        if (returnedLength !== originalLength) {
          logger.warn(`[ElevenLabs] Agent ${agentId} description length mismatch! Sent: ${originalLength}, Received: ${returnedLength}`);
        }
      }
    }
    
    return result;
  }

  /**
   * Delete an agent
   * DELETE /v1/convai/agents/{agent_id}
   * Requirements: 5.1, 5.5, 5.6
   */
  async deleteAgent(agentId: string): Promise<void> {
    await this.executeWithRetry(
      () => this.client.delete(`/v1/convai/agents/${agentId}`),
      `deleteAgent(${agentId})`
    );
  }

  /**
   * Start a conversation with an agent
   * POST /v1/convai/conversations
   * Requirements: 5.1, 5.5, 5.6
   */
  async startConversation(request: StartConversationRequest): Promise<ElevenLabsConversation> {
    return this.executeWithRetry(
      () => this.client.post('/v1/convai/conversations', request),
      'startConversation'
    );
  }

  /**
   * Get conversation details
   * GET /v1/convai/conversations/{conversation_id}
   * Requirements: 5.1, 5.5, 5.6
   */
  async getConversation(conversationId: string): Promise<ElevenLabsConversation> {
    return this.executeWithRetry(
      () => this.client.get(`/v1/convai/conversations/${conversationId}`),
      `getConversation(${conversationId})`
    );
  }

  /**
   * End a conversation
   * DELETE /v1/convai/conversations/{conversation_id}
   * Requirements: 5.1, 5.5, 5.6
   */
  async endConversation(conversationId: string): Promise<void> {
    await this.executeWithRetry(
      () => this.client.delete(`/v1/convai/conversations/${conversationId}`),
      `endConversation(${conversationId})`
    );
  }

  /**
   * Get available voices
   * GET /v1/voices
   * Requirements: 5.1, 5.5, 5.6
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    const result = await this.executeWithRetry(
      () => this.client.get('/v1/voices'),
      'getVoices'
    );
    return (result as any).voices || [];
  }

  /**
   * Get voice details
   * GET /v1/voices/{voice_id}
   * Requirements: 5.1, 5.5, 5.6
   */
  async getVoice(voiceId: string): Promise<ElevenLabsVoice> {
    return this.executeWithRetry(
      () => this.client.get(`/v1/voices/${voiceId}`),
      `getVoice(${voiceId})`
    );
  }

  /**
   * Get user information (for API key validation)
   * GET /v1/user
   * Requirements: 5.1, 5.5, 5.6
   */
  async getUser(): Promise<any> {
    return this.executeWithRetry(
      () => this.client.get('/v1/user'),
      'getUser'
    );
  }

  /**
   * Test API connection
   * Requirements: 5.1, 5.5, 5.6
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getUser();
      logger.info('ElevenLabs API connection test successful');
      return true;
    } catch (error) {
      logger.error('ElevenLabs API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get conversation history for an agent
   * GET /v1/convai/agents/{agent_id}/conversations
   * Requirements: 5.1, 5.5, 5.6
   */
  async getAgentConversations(agentId: string, limit?: number): Promise<ElevenLabsConversation[]> {
    const params = limit ? { limit } : {};
    const result = await this.executeWithRetry(
      () => this.client.get(`/v1/convai/agents/${agentId}/conversations`, { params }),
      `getAgentConversations(${agentId})`
    );
    return (result as any).conversations || [];
  }

  /**
   * Get conversation transcript
   * GET /v1/convai/conversations/{conversation_id}/transcript
   * Requirements: 5.1, 5.5, 5.6
   */
  async getConversationTranscript(conversationId: string): Promise<any> {
    return this.executeWithRetry(
      () => this.client.get(`/v1/convai/conversations/${conversationId}/transcript`),
      `getConversationTranscript(${conversationId})`
    );
  }

  /**
   * Get conversation analytics
   * GET /v1/convai/conversations/{conversation_id}/analytics
   * Requirements: 5.1, 5.5, 5.6
   */
  async getConversationAnalytics(conversationId: string): Promise<any> {
    return this.executeWithRetry(
      () => this.client.get(`/v1/convai/conversations/${conversationId}/analytics`),
      `getConversationAnalytics(${conversationId})`
    );
  }
}

// Export the class for testing
export { ElevenLabsService };

// Create singleton instance
export const elevenlabsService = new ElevenLabsService();