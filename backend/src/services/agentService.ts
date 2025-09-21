import Agent from '../models/Agent';
import { elevenlabsService, CreateAgentRequest, UpdateAgentRequest, ElevenLabsAgent } from './elevenLabsService';
import { elevenLabsApiManager } from './elevenLabsApiManager';
import { logger } from '../utils/logger';
import { AgentInterface } from '../models/Agent';
import database from '../config/database';
import { queryCache, QueryCache } from './queryCache';
import { agentCacheService } from './agentCache';

// Default data collection description for agent creation
const DEFAULT_DATA_COLLECTION_DESCRIPTION = "You are an AI lead evaluation system.   Your job: Analyze the full conversation history (in any language) and return a **single JSON object** with lead evaluation scores, reasoning, and extracted details.    Follow these strict steps:  ---  ### 1. Language Handling - Detect all languages in the conversation.   - If any part is in Hindi, Hinglish, or non-English → internally translate into English before applying rules.   - Use the English-translated text for evaluation.    ---  ### 2. Intent Recognition Intent = Why the lead is speaking with the AI.    - **Low Intent (1 point):**     Exploratory, background info only. No pricing/demo asks. Keywords: \"overview,\" \"high-level,\" \"curious,\" \"What does this do?\"    - **Medium Intent (2 points):**     Evaluating features, costs, integrations. Comparing vendors but not booking demo. Keywords: \"pricing,\" \"API support,\" \"integrates with Salesforce,\" \"limitations,\" \"trial?\"    - **High Intent (3 points):**     Ready for next step: demo, quote, contract, or implementation timeline. Keywords: \"Can I get a demo,\" \"Send me a quote,\" \"We're ready to sign,\" \"Book a call.\"    ---  ### 3. Urgency (How quickly they want problem solved) - **Low (1 point):** Researching/benchmarking, no timeline. Keywords: \"maybe next year,\" \"just exploring,\" \"future project.\"   - **Medium (2 points):** Clear problem, but planning for next month/quarter. Keywords: \"on roadmap,\" \"by Q2,\" \"end of month.\"   - **High (3 points):** Blocking issue, urgent deadlines, or lost revenue. Keywords: \"critical,\" \"urgent,\" \"mission-critical,\" \"blocking launch,\" \"we're losing customers.\"    ---  ### 4. Budget Constraint - **Yes (Constrained, 1 point):** Cost is a blocker. Keywords: \"free version,\" \"too expensive,\" \"not in our budget,\" \"we can't afford.\"   - **Maybe (Not sure, 2 points):** Asked about pricing, but no clear objection/approval. Default if budget not discussed.   - **No (Unconstrained, 3 points):** No cost concerns OR explicitly says budget approved. Keywords: \"fits our budget,\" \"we have funding,\" \"go ahead.\"    ---  ### 5. Fit Alignment - **Low (1 point):** Needs outside SniperThink scope (e.g., influencer marketing, social listening, no-code email builder).   - **Medium (2 points):** Partial overlap with extra needs (CRM integration, email sequences, funnel analytics).   - **High (3 points):** Direct match with SniperThink strengths (AI-driven lead scoring, automated qualification, MQL → SQL conversion).    ---  ### 6. Engagement Health - **Low (1 point):** 1–2 msgs/day, no CTA clicks, >12 hr response gap.   - **Medium (2 points):** 3–4 msgs/day, 1 CTA click, reply in 4–12 hrs.   - **High (3 points):** ≥5 msgs/day, ≥2 CTA clicks, reply <4 hrs, enthusiastic tone.    ---  ### 7. CTA Detection Rules Mark CTA fields as \\\"Yes\\\" or \\\"No\\\".   - **Pricing CTA:** Lead asks cost, budget numbers, or tier comparisons.   - **Demo CTA:** Lead asks for demo, trial, or hands-on test.   - **Follow-Up CTA:** Lead requests reminder, future contact, or materials to review later.   - **Sample CTA:** Lead asks for case study, whitepaper, sandbox account, or recorded session.   - **Escalation CTA:** Lead asks to speak to a human, sales rep, or expresses bot frustration.   - **Website CTA:** Lead requests website link, mentions content found there, or self-browses features/pricing pages.    ---  ### 8. Scoring & Thresholds - **Total Score = sum of Intent + Urgency + Budget + Fit + Engagement**   - Max possible = 15 points.   - Cap **total_score at 9** if: fewer than 3 replies OR no demo/follow-up CTA clicked.    **Lead Status Tag (based on total_score):**   - **Cold:** 5–8 points   - **Warm:** 9–11 points   - **Hot:** 12–15 points    ---  ### 9. Meeting Extraction (updated — timezone-aware) - Locate the `book_meeting` tool call in the conversation. If found, extract the date/time value(s) from that tool call. - Parse the extracted timestamp in a timezone-aware manner:   - If the `book_meeting` payload includes an explicit timezone or timezone offset (e.g., \\\"2025-09-18T11:30:00Z\\\" or \\\"2025-09-18T17:00:00+05:30\\\"), parse accordingly.   - If the `book_meeting` payload gives a local time **without** timezone (e.g., \\\"Sep 18, 2025 5:00 PM\\\"), assume the user's timezone is **Asia/Kolkata (UTC+05:30)** and parse as that local time. - **Output requirement for the JSON field `demo_book_datetime`:**   - Return a single ISO 8601 timestamp **in the user's local timezone with offset**, formatted like `YYYY-MM-DDTHH:MM:SS+05:30` (for Asia/Kolkata). Example: `\\\"2025-09-18T17:00:00+05:30\\\".   - Implementation rules:     - If the tool call provided a timezone-aware timestamp (any zone), convert it to **Asia/Kolkata** and output it with `+05:30` offset.     - If the tool call provided a UTC timestamp (`...Z`), convert it to Asia/Kolkata and output with `+05:30`.     - If the tool call provided a local time with no tz, treat it as Asia/Kolkata and output with `+05:30`. - If **no** `book_meeting` tool call exists or no parsable datetime is present, set `\\\"demo_book_datetime\\\": null`. - Examples:   - Input in tool call: `\\\"2025-09-18T11:30:00Z\\\"` → Output: `\\\"2025-09-18T17:00:00+05:30\\\".   - Input in tool call: `\\\"2025-09-18T17:00:00+05:30\\\"` → Output: `\\\"2025-09-18T17:00:00+05:30\\\".   - Input in tool call: `\\\"Sep 18, 2025 5:00 PM\\\"` (no tz) → treat as Asia/Kolkata → Output: `\\\"2025-09-18T17:00:00+05:30\\\". - Edge cases:   - If multiple `book_meeting` calls exist, use the one from the **most recent** tool call.   - If the timestamp is ambiguous (e.g., only a date, no time), return `null` (do not guess a time). - Do NOT ask clarifying questions; apply the above defaults automatically.   ---  ### 10. Smart Notification - Create a **short 4–5 word summary** of overall user interaction.   - Personalized (use extracted name if available).   - Examples:     - `\\\"Siddhant booked a meeting\\\"`     - `\\\"Shrey asked about pricing\\\"`     - `\\\"Priyanka confused about pricing\\\"`     - `\\\"Raj exploring technical queries\\\"`    ---  ### 11. Output JSON Format Always return this exact structure (no extra fields, no missing fields):  ###12.Rule Critical Reasoning: Be concise (≤10 words per category). Enough to justify score, no fluff. Output: Strict JSON only, ≤900 chars total. No extra text.  {   \\\"intent_level\\\": \\\"Low\\\",   \\\"intent_score\\\": 1,   \\\"urgency_level\\\": \\\"Low\\\",   \\\"urgency_score\\\": 1,   \\\"budget_constraint\\\": \\\"Maybe\\\",   \\\"budget_score\\\": 2,   \\\"fit_alignment\\\": \\\"Medium\\\",   \\\"fit_score\\\": 2,   \\\"engagement_health\\\": \\\"Medium\\\",   \\\"engagement_score\\\": 2,   \\\"cta_pricing_clicked\\\": \\\"No\\\",   \\\"cta_demo_clicked\\\": \\\"No\\\",   \\\"cta_followup_clicked\\\": \\\"No\\\",   \\\"cta_sample_clicked\\\": \\\"No\\\",   \\\"cta_website_clicked\\\": \\\"No\\\",   \\\"cta_escalated_to_human\\\": \\\"No\\\",   \\\"total_score\\\": 7,   \\\"lead_status_tag\\\": \\\"Cold\\\",   \\\"demo_book_datetime\\\": null,   \\\"reasoning\\\": {     \\\"intent\\\": \\\"Reasoning here\\\",     \\\"urgency\\\": \\\"Reasoning here\\\",     \\\"budget\\\": \\\"Reasoning here\\\",     \\\"fit\\\": \\\"Reasoning here\\\",     \\\"engagement\\\": \\\"Reasoning here\\\",     \\\"cta_behavior\\\": \\\"Reasoning here\\\"   },   \\\"extraction\\\": {     \\\"name\\\": null,     \\\"email_address\\\": null,     \\\"company_name\\\": null,     \\\"smartnotification\\\": \\\"Short 4–5 word summary\\\"   } }  ---";

export interface AgentCreateData {
  name: string;
  type?: 'ChatAgent' | 'CallAgent';
  voice_id?: string;
  description?: string;
  system_prompt?: string;
  first_message?: string;
  language?: string;
  max_duration_seconds?: number;
  response_engine?: {
    type: string;
    config?: any;
  };
  llm?: {
    model: string;
    temperature?: number;
    max_tokens?: number;
  };
  tts?: {
    voice_id: string;
    model?: string;
    voice_settings?: {
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
    };
  };
  data_collection?: {
    default?: {
      type?: string;
      description?: string;
    };
  };
}

export interface AgentUpdateData extends Partial<AgentCreateData> {
  is_active?: boolean;
  agent_type?: 'chat' | 'call';
}

export interface AgentWithConfig extends AgentInterface {
  config?: ElevenLabsAgent;
}

// Frontend-compatible agent interface
export interface FrontendAgent {
  id: string; // Changed from number to string to support UUID
  name: string;
  type: 'ChatAgent' | 'CallAgent';
  language: string;
  description: string;
  status: 'active' | 'draft';
  model: string;
  conversations: number;
  creditsRemaining: number;
  created: string;
  doc?: any;
  // Performance metrics
  successRate?: number;
  avgDuration?: string;
  // New: include ElevenLabs agent id for direct calls
  elevenlabsAgentId?: string;
  // Data collection field from ElevenLabs platform_settings
  data_collection?: {
    default?: {
      type?: string;
      description?: string;
    };
  };
}

class AgentService {
  /**
   * Create a new agent for a user
   */
  async createAgent(userId: string, agentData: AgentCreateData): Promise<AgentWithConfig> {
    try {
      // Debug logging to check what agentService receives
      if (agentData.data_collection?.default?.description) {
        const serviceReceivedLength = agentData.data_collection.default.description.length;
        logger.info(`[AgentService] Received data_collection description with ${serviceReceivedLength} characters`);
        logger.info(`[AgentService] First 200 chars: ${agentData.data_collection.default.description.substring(0, 200)}...`);
        logger.info(`[AgentService] Last 200 chars: ...${agentData.data_collection.default.description.substring(Math.max(0, serviceReceivedLength - 200))}`);
      }

      // Validate agent data
      this.validateAgentData(agentData);

      // Set up webhook URL for the agent (if configured)
      const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhooks/elevenlabs/call-completed`;
      const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;

      const createRequest: CreateAgentRequest = {
        name: agentData.name,
        conversation_config: {
          agent: {
            first_message: agentData.first_message || 'Hello! How can I help you today?',
            language: agentData.language || 'en'
          },
          ...(agentData.tts && {
            tts: {
              voice_id: agentData.tts.voice_id,
              model: agentData.tts.model || 'eleven_turbo_v2_5',
              stability: agentData.tts.voice_settings?.stability || 0.5,
              similarity_boost: agentData.tts.voice_settings?.similarity_boost || 0.8,
              style: agentData.tts.voice_settings?.style || 0.2,
              use_speaker_boost: agentData.tts.voice_settings?.use_speaker_boost || true
            }
          }),
          ...(agentData.llm && {
            llm: {
              model: agentData.llm.model || 'gpt-4o-mini',
              system_prompt: agentData.system_prompt,
              temperature: agentData.llm.temperature || 0.7,
              max_tokens: agentData.llm.max_tokens || 500
            }
          })
        },
        platform_settings: {
          ...(agentData.description && {
            widget_config: {
              description: agentData.description
            }
          }),
          data_collection: {
            default: {
              type: agentData.data_collection?.default?.type || 'string',
              description: agentData.data_collection?.default?.description !== undefined 
                ? agentData.data_collection.default.description 
                : DEFAULT_DATA_COLLECTION_DESCRIPTION
            }
          }
        }
      };

      // Create agent in ElevenLabs
      const elevenlabsAgent = await elevenlabsService.createAgent(createRequest);

      // Store agent association in our database
      const agent = await Agent.create({
        user_id: userId,
        elevenlabs_agent_id: elevenlabsAgent.agent_id,
        name: agentData.name,
        agent_type: agentData.type === 'ChatAgent' ? 'chat' : 'call',
        description: agentData.description || '',
        is_active: true,
      });

      logger.info(`Created agent ${agent.id} for user ${userId} with ElevenLabs ID ${elevenlabsAgent.agent_id}`);

      // Invalidate user's agent caches after creation
      agentCacheService.clearUserAgentCaches(userId);

      return {
        ...agent,
        config: elevenlabsAgent,
      };
    } catch (error) {
      logger.error('Failed to create agent:', error);
      throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get agent by ID with configuration from ElevenLabs
   * Requirements: 3.4, 5.2, 5.6
   */
  async getAgent(userId: string, agentId: string): Promise<AgentWithConfig | null> {
    try {
      const agent = await Agent.findOne({ id: agentId, user_id: userId });

      if (!agent) {
        return null;
      }

      // Fetch configuration from ElevenLabs with graceful degradation
      const config = await elevenLabsApiManager.fetchAgentConfigWithFallback(agent.elevenlabs_agent_id);
      
      return {
        ...agent,
        config: config || undefined,
      };
    } catch (error) {
      logger.error(`Failed to get agent ${agentId}:`, error);
      throw new Error(`Failed to get agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all agents for a user with their configurations using parallel ElevenLabs API calls
   * Requirements: 3.3, 5.2, 5.3, 5.4
   */
  async listAgents(userId: string): Promise<AgentWithConfig[]> {
    try {
      const agents = await Agent.findByUserId(userId);

      if (agents.length === 0) {
        return [];
      }

      // Extract ElevenLabs agent IDs for parallel fetching
      const elevenLabsAgentIds = agents.map(agent => agent.elevenlabs_agent_id);
      
      logger.info(`Starting parallel ElevenLabs config fetch for ${agents.length} agents`, {
        userId,
        agentCount: agents.length
      });

      // Use improved parallel processing - choose method based on agent count
      const { elevenLabsApiManager } = await import('./elevenLabsApiManager');
      let batchResult;
      
      if (elevenLabsAgentIds.length <= 20) {
        // For smaller sets, use full parallel processing with Promise.all
        batchResult = await elevenLabsApiManager.fetchAgentConfigsParallel(elevenLabsAgentIds);
      } else {
        // For larger sets, use batched parallel processing
        batchResult = await elevenLabsApiManager.fetchAgentConfigsBatch(elevenLabsAgentIds);
      }

      // Create a map of ElevenLabs configs for quick lookup
      const configMap = new Map<string, ElevenLabsAgent>();
      batchResult.results.forEach(result => {
        if (result.success && result.config) {
          configMap.set(result.agentId, result.config);
        }
      });

      // Combine agents with their configurations
      const agentsWithConfig: AgentWithConfig[] = agents.map(agent => ({
        ...agent,
        config: configMap.get(agent.elevenlabs_agent_id)
      }));

      logger.info(`Completed parallel agent listing for user ${userId}`, {
        totalAgents: agents.length,
        configsLoaded: batchResult.successCount,
        configsFailed: batchResult.errorCount,
        successRate: `${Math.round((batchResult.successCount / agents.length) * 100)}%`,
        totalTime: `${batchResult.totalTime}ms`,
        avgTimePerAgent: `${Math.round(batchResult.totalTime / agents.length)}ms`,
        parallelMethod: elevenLabsAgentIds.length <= 20 ? 'Promise.all' : 'batched'
      });

      return agentsWithConfig;
    } catch (error) {
      logger.error(`Failed to list agents for user ${userId}:`, error);
      throw new Error(`Failed to list agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an agent's configuration
   */
  async updateAgent(userId: string, agentId: string, agentData: AgentUpdateData): Promise<AgentWithConfig> {
    try {
      // Validate agent data
      this.validateAgentData(agentData);

      const agent = await Agent.findOne({ id: agentId, user_id: userId });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // Update configuration in ElevenLabs
      const updateRequest: UpdateAgentRequest = {
        ...(agentData.name && { name: agentData.name }),
        ...(agentData.first_message || agentData.system_prompt || agentData.language) && {
          conversation_config: {
            ...(agentData.first_message || agentData.language) && {
              agent: {
                ...(agentData.first_message && { first_message: agentData.first_message }),
                ...(agentData.language && { language: agentData.language })
              }
            },
            ...(agentData.tts) && {
              tts: {
                voice_id: agentData.tts.voice_id,
                model: agentData.tts.model || 'eleven_turbo_v2_5',
                stability: agentData.tts.voice_settings?.stability || 0.5,
                similarity_boost: agentData.tts.voice_settings?.similarity_boost || 0.8,
                style: agentData.tts.voice_settings?.style || 0.2,
                use_speaker_boost: agentData.tts.voice_settings?.use_speaker_boost || true
              }
            },
            ...(agentData.llm || agentData.system_prompt) && {
              llm: {
                model: agentData.llm?.model || 'gpt-4o-mini',
                system_prompt: agentData.system_prompt,
                temperature: agentData.llm?.temperature || 0.7,
                max_tokens: agentData.llm?.max_tokens || 500
              }
            }
          }
        },
        platform_settings: {
          ...(agentData.description && {
            widget_config: {
              description: agentData.description
            }
          }),
          ...(agentData.data_collection && {
            data_collection: {
              default: {
                type: agentData.data_collection.default?.type || 'string',
                description: agentData.data_collection.default?.description !== undefined 
                  ? agentData.data_collection.default.description 
                  : DEFAULT_DATA_COLLECTION_DESCRIPTION
              }
            }
          })
        }
      };

      const elevenlabsAgent = await elevenlabsService.updateAgent(agent.elevenlabs_agent_id, updateRequest);

      // Update local agent record if name, description, or status changed
      const localUpdates: any = {};
      if (agentData.name && agentData.name !== agent.name) {
        localUpdates.name = agentData.name;
      }
      if (agentData.description !== undefined && agentData.description !== agent.description) {
        localUpdates.description = agentData.description;
      }
      if ('is_active' in agentData && agentData.is_active !== agent.is_active) {
        localUpdates.is_active = agentData.is_active;
      }

      if (Object.keys(localUpdates).length > 0) {
        const updatedAgent = await Agent.update(agentId, localUpdates);
        if (updatedAgent) {
          Object.assign(agent, localUpdates);
        }
      }

      logger.info(`Updated agent ${agentId} for user ${userId}`);

      // Invalidate agent caches after update
      agentCacheService.invalidateAgentCache(userId, agentId);

      return {
        ...agent,
        config: elevenlabsAgent,
      };
    } catch (error) {
      logger.error(`Failed to update agent ${agentId}:`, error);
      throw new Error(`Failed to update agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(userId: string, agentId: string): Promise<void> {
    try {
      const agent = await Agent.findOne({ id: agentId, user_id: userId });

      if (!agent) {
        throw new Error('Agent not found');
      }

      // Delete from ElevenLabs
      await elevenlabsService.deleteAgent(agent.elevenlabs_agent_id);

      // Delete from our database
      await Agent.delete(agentId);

      // Invalidate agent caches after deletion
      agentCacheService.clearUserAgentCaches(userId);

      logger.info(`Deleted agent ${agentId} for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to delete agent ${agentId}:`, error);
      throw new Error(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<any[]> {
    try {
      return await elevenlabsService.getVoices();
    } catch (error) {
      logger.error('Failed to get voices:', error);
      throw new Error(`Failed to get voices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test ElevenLabs API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      return await elevenlabsService.testConnection();
    } catch (error) {
      logger.error('Failed to test ElevenLabs connection:', error);
      return false;
    }
  }

  /**
   * Transform backend agent data to frontend format
   */
  private async transformToFrontendFormat(agent: AgentWithConfig): Promise<FrontendAgent> {
    // Extract language from agent config
    const configLanguage = agent.config?.language || 'en';
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'pl': 'Polish',
      'tr': 'Turkish',
      'ru': 'Russian',
      'nl': 'Dutch',
      'cs': 'Czech',
      'ar': 'Arabic',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'hu': 'Hungarian',
      'ko': 'Korean'
    };

    // Extract description from database record (not ElevenLabs config)
    const description = agent.description || '';

    // Extract model from LLM config
    const model = agent.config?.llm?.model || 'gpt-4o-mini';

    // Get real performance data from database
    let conversations = 0;
    let successRate = 0;
    let avgDuration = '0m';
    let creditsRemaining = 0;

    try {
      // Get call statistics for this agent
      const callStatsQuery = `
        SELECT 
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
          COALESCE(AVG(duration_seconds), 0) / 60.0 as avg_duration,
          COALESCE(SUM(credits_used), 0) as total_credits_used
        FROM calls 
        WHERE agent_id = $1
      `;
      const callStatsResult = await database.query(callStatsQuery, [agent.id]);
      const callStats = callStatsResult.rows[0];

      conversations = parseInt(callStats.total_calls) || 0;
      const completedCalls = parseInt(callStats.completed_calls) || 0;
      successRate = conversations > 0 ? Math.round((completedCalls / conversations) * 100) : 0;
      const avgDurationMinutes = parseFloat(callStats.avg_duration) || 0;
      avgDuration = avgDurationMinutes > 0 ? avgDurationMinutes.toFixed(1) + 'm' : '0m';

      // For credits remaining, we'd need to get user's total credits and subtract used credits
      // For now, we'll use a placeholder calculation
      creditsRemaining = Math.max(1000 - (parseInt(callStats.total_credits_used) || 0), 0);
    } catch (error) {
      logger.error(`Failed to get performance data for agent ${agent.id}:`, error);
      // Fallback to default values (already set above)
    }

    // Extract data_collection from ElevenLabs config
    const dataCollection = agent.config?.platform_settings?.data_collection || undefined;

    return {
      id: agent.id, // Keep UUID as string for frontend
      name: agent.name,
      type: agent.agent_type === 'call' ? 'CallAgent' : 'ChatAgent',
      language: languageMap[configLanguage] || 'English',
      description: description,
      status: agent.is_active ? 'active' : 'draft',
      model: model,
      conversations: conversations,
      creditsRemaining: creditsRemaining,
      created: new Date(agent.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }),
      doc: null,
      successRate: successRate,
      avgDuration: avgDuration,
      elevenlabsAgentId: (agent as any).elevenlabs_agent_id,
      data_collection: dataCollection,
    };
  }

  /**
   * Batch transform agents to frontend format using single query for all performance data with caching
   * This replaces individual queries with a single batch query using JOINs and caches results
   */
  private async batchTransformToFrontendFormat(agents: AgentWithConfig[], userId: string): Promise<FrontendAgent[]> {
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'pl': 'Polish',
      'tr': 'Turkish',
      'ru': 'Russian',
      'nl': 'Dutch',
      'cs': 'Czech',
      'ar': 'Arabic',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'hu': 'Hungarian',
      'ko': 'Korean'
    };

    try {
      // Get all agent IDs for batch query
      const agentIds = agents.map(agent => agent.id);
      
      if (agentIds.length === 0) {
        return [];
      }

      // Check cache first for batch performance data
      const cacheKey = QueryCache.generateAgentKey(userId, 'batch_performance', agentIds.sort().join(','));
      let performanceMap = queryCache.get<Map<string, any>>(cacheKey);
      
      if (!performanceMap) {
        // Single batch query to get performance data for all agents
        // Uses the idx_calls_agent_performance index for optimal performance
        const batchStatsQuery = `
          SELECT 
            agent_id,
            COUNT(*) as total_calls,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
            COALESCE(AVG(duration_seconds), 0) / 60.0 as avg_duration,
            COALESCE(SUM(credits_used), 0) as total_credits_used
          FROM calls 
          WHERE agent_id = ANY($1) AND user_id = $2
          GROUP BY agent_id
        `;
        
        const batchStatsResult = await database.query(batchStatsQuery, [agentIds, userId]);
        
        // Create a map of agent performance data for quick lookup
        performanceMap = new Map();
        batchStatsResult.rows.forEach((row: any) => {
          const conversations = parseInt(row.total_calls) || 0;
          const completedCalls = parseInt(row.completed_calls) || 0;
          const successRate = conversations > 0 ? Math.round((completedCalls / conversations) * 100) : 0;
          const avgDurationMinutes = parseFloat(row.avg_duration) || 0;
          const avgDuration = avgDurationMinutes > 0 ? avgDurationMinutes.toFixed(1) + 'm' : '0m';
          const creditsUsed = parseInt(row.total_credits_used) || 0;
          
          performanceMap!.set(row.agent_id, {
            conversations,
            successRate,
            avgDuration,
            creditsRemaining: Math.max(1000 - creditsUsed, 0) // Placeholder calculation
          });
        });

        // Cache the performance map for 5 minutes
        queryCache.set(cacheKey, performanceMap, 5 * 60 * 1000);
        logger.debug(`Cached batch agent performance for user: ${userId}`);
      } else {
        logger.debug(`Cache hit for batch agent performance: ${userId}`);
      }

      // Transform all agents using the performance map
      return agents.map(agent => {
        const configLanguage = agent.config?.language || 'en';
        const description = agent.description || '';
        const model = agent.config?.llm?.model || 'gpt-4o-mini';
        
        // Get performance data from map or use defaults
        const performance = performanceMap.get(agent.id) || {
          conversations: 0,
          successRate: 0,
          avgDuration: '0m',
          creditsRemaining: 1000
        };

        return {
          id: agent.id, // Keep UUID as string for frontend
          name: agent.name,
          type: agent.agent_type === 'call' ? 'CallAgent' : 'ChatAgent',
          language: languageMap[configLanguage] || 'English',
          description: description,
          status: agent.is_active ? 'active' : 'draft',
          model: model,
          conversations: performance.conversations,
          creditsRemaining: performance.creditsRemaining,
          created: new Date(agent.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          }),
          doc: null,
          successRate: performance.successRate,
          avgDuration: performance.avgDuration,
          elevenlabsAgentId: (agent as any).elevenlabs_agent_id,
        };
      });
    } catch (error) {
      logger.error(`Failed to batch transform agents for user ${userId}:`, error);
      // Fallback to individual transformation
      logger.warn('Falling back to individual agent transformation');
      return Promise.all(agents.map(agent => this.transformToFrontendFormat(agent)));
    }
  }

  /**
   * Create a simple agent with minimal configuration
   */
  async createSimpleAgent(userId: string, name: string, voiceId?: string): Promise<AgentWithConfig> {
    const agentData: AgentCreateData = {
      name,
      type: 'CallAgent',
      description: `AI calling agent: ${name}`,
      system_prompt: 'You are a helpful AI assistant. Be concise and friendly.',
      first_message: 'Hello! How can I help you today?',
      language: 'en',
      ...(voiceId && {
        tts: {
          voice_id: voiceId,
          model: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        }
      }),
      llm: {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 500
      }
    };

    return this.createAgent(userId, agentData);
  }

  /**
   * Get agents in frontend format (OPTIMIZED with batch queries and caching)
   * Requirements: 3.5, 6.1, 6.5
   */
  async listAgentsForFrontend(userId: string): Promise<FrontendAgent[]> {
    try {
      // Use agent cache service for optimized performance
      return await agentCacheService.getBatchAgentPerformance(userId);
    } catch (error) {
      logger.error(`Failed to list agents for frontend for user ${userId}:`, error);
      
      // Fallback to original implementation if cache fails
      try {
        logger.warn(`Falling back to non-cached agent list for user ${userId}`);
        const agents = await this.listAgents(userId);
        
        if (agents.length === 0) {
          return [];
        }

        // Use batch transformation for better performance
        return await this.batchTransformToFrontendFormat(agents, userId);
      } catch (fallbackError) {
        logger.error(`Fallback agent list also failed for user ${userId}:`, fallbackError);
        throw error; // Throw original error
      }
    }
  }

  /**
   * Get single agent in frontend format (with caching)
   * Requirements: 3.5, 6.1
   */
  async getAgentForFrontend(userId: string, agentId: string): Promise<FrontendAgent | null> {
    try {
      // Try to get from cache first
      const cachedAgent = await agentCacheService.getAgentPerformance(userId, agentId);
      if (cachedAgent) {
        // Transform cache entry to frontend format
        return {
          id: cachedAgent.agentId, // Keep UUID as string - don't convert to number
          name: cachedAgent.basicInfo.name,
          type: cachedAgent.basicInfo.type as 'ChatAgent' | 'CallAgent',
          language: this.extractLanguageFromConfig(cachedAgent.elevenLabsConfig),
          description: cachedAgent.basicInfo.description,
          status: cachedAgent.basicInfo.status as 'active' | 'draft',
          model: this.extractModelFromConfig(cachedAgent.elevenLabsConfig),
          conversations: cachedAgent.performance.conversations,
          creditsRemaining: Math.max(1000 - cachedAgent.performance.creditsUsed, 0),
          created: new Date(cachedAgent.basicInfo.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          }),
          doc: null,
          successRate: cachedAgent.performance.successRate,
          avgDuration: cachedAgent.performance.avgDuration,
          elevenlabsAgentId: cachedAgent.elevenLabsConfig?.agent_id,
        };
      }

      // Fallback to original implementation
      const agent = await this.getAgent(userId, agentId);
      if (!agent) {
        return null;
      }
      return await this.transformToFrontendFormat(agent);
    } catch (error) {
      logger.error(`Failed to get agent for frontend: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * Extract language from ElevenLabs config (helper method)
   */
  private extractLanguageFromConfig(config?: ElevenLabsAgent): string {
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'pl': 'Polish',
      'tr': 'Turkish',
      'ru': 'Russian',
      'nl': 'Dutch',
      'cs': 'Czech',
      'ar': 'Arabic',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'hu': 'Hungarian',
      'ko': 'Korean'
    };

    const configLanguage = config?.language || 'en';
    return languageMap[configLanguage] || 'English';
  }

  /**
   * Extract model from ElevenLabs config (helper method)
   */
  private extractModelFromConfig(config?: ElevenLabsAgent): string {
    return config?.llm?.model || 'gpt-4o-mini';
  }

  /**
   * Get agent configuration in a structured format
   */
  async getAgentConfiguration(userId: string, agentId: string): Promise<any> {
    try {
      const agent = await this.getAgent(userId, agentId);
      if (!agent || !agent.config) {
        return null;
      }

      const config = agent.config;
      return {
        basic: {
          name: agent.name,
          type: agent.agent_type,
          language: config.language || 'en',
          description: config.description || ''
        },
        conversation: {
          first_message: config.first_message || '',
          system_prompt: config.system_prompt || ''
        },
        voice: {
          voice_id: config.tts?.voice_id || '',
          model: config.tts?.model || 'eleven_turbo_v2_5',
          settings: config.tts?.voice_settings || {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        },
        llm: {
          model: config.llm?.model || 'gpt-4o-mini',
          temperature: config.llm?.temperature || 0.7,
          max_tokens: config.llm?.max_tokens || 500
        },
        metadata: {
          agent_id: config.agent_id,
          created_at: config.created_at,
          updated_at: config.updated_at
        }
      };
    } catch (error) {
      logger.error(`Failed to get agent configuration: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * Validate agent data before creation/update
   */
  private validateAgentData(agentData: AgentCreateData | AgentUpdateData): void {
    if ('name' in agentData && agentData.name && agentData.name.length > 100) {
      throw new Error('Agent name must be 100 characters or less');
    }

    if ('system_prompt' in agentData && agentData.system_prompt && agentData.system_prompt.length > 2000) {
      throw new Error('System prompt must be 2000 characters or less');
    }

    if ('first_message' in agentData && agentData.first_message && agentData.first_message.length > 500) {
      throw new Error('First message must be 500 characters or less');
    }

    if ('language' in agentData && agentData.language) {
      const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl', 'cs', 'ar', 'zh', 'ja', 'hu', 'ko'];
      if (!supportedLanguages.includes(agentData.language)) {
        throw new Error(`Unsupported language: ${agentData.language}`);
      }
    }

    if ('llm' in agentData && agentData.llm) {
      if (agentData.llm.temperature && (agentData.llm.temperature < 0 || agentData.llm.temperature > 2)) {
        throw new Error('LLM temperature must be between 0 and 2');
      }
      if (agentData.llm.max_tokens && (agentData.llm.max_tokens < 1 || agentData.llm.max_tokens > 4000)) {
        throw new Error('LLM max_tokens must be between 1 and 4000');
      }
    }
  }
}

export const agentService = new AgentService();