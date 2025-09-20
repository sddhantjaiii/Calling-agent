import { agentCache, performanceCache } from './memoryCache';
import { CacheKeyGenerator } from './cacheInvalidation';
import { FrontendAgent } from './agentService';
import { elevenlabsService, ElevenLabsAgent } from './elevenLabsService';
import database from '../config/database';
import { logger } from '../utils/logger';

/**
 * Agent cache entry interface for agent-specific performance data
 * Requirements: 3.5, 6.1, 6.5
 */
export interface AgentCacheEntry {
    agentId: string;
    userId: string;
    basicInfo: {
        id: string;
        name: string;
        type: string;
        status: string;
        description: string;
        agent_type: 'chat' | 'call';
        is_active: boolean;
        created_at: string;
        elevenlabs_agent_id?: string;
    };
    performance: {
        conversations: number;
        successRate: number;
        avgDuration: string;
        creditsUsed: number;
        totalCalls: number;
        completedCalls: number;
        avgDurationMinutes: number;
    };
    elevenLabsConfig?: ElevenLabsAgent;
    calculatedAt: Date;
    expiresAt: Date;
    source: 'cache' | 'database' | 'elevenlabs';
}

/**
 * Batch agent cache entry for multiple agents
 */
export interface BatchAgentCacheEntry {
    userId: string;
    agents: Map<string, AgentCacheEntry>;
    calculatedAt: Date;
    expiresAt: Date;
    agentCount: number;
}

/**
 * Agent performance statistics interface
 */
export interface AgentPerformanceStats {
    agentId: string;
    totalCalls: number;
    completedCalls: number;
    successRate: number;
    avgDurationMinutes: number;
    creditsUsed: number;
    lastCallAt?: Date;
    firstCallAt?: Date;
}

/**
 * Cache refresh configuration for agent data
 */
export interface AgentCacheRefreshConfig {
    enabled: boolean;
    backgroundRefresh: boolean;
    refreshThreshold: number; // Percentage of TTL when to refresh in background
    batchRefreshSize: number; // Number of agents to refresh in a single batch
    elevenLabsRefreshInterval: number; // How often to refresh ElevenLabs config (ms)
}

/**
 * Agent cache service implementing cache-first strategy for agent performance data
 * Requirements: 3.5, 6.1, 6.5
 */
export class AgentCacheService {
    private static refreshConfig: AgentCacheRefreshConfig = {
        enabled: true,
        backgroundRefresh: true,
        refreshThreshold: 0.7, // Refresh when 70% of TTL has passed
        batchRefreshSize: 10,
        elevenLabsRefreshInterval: 30 * 60 * 1000 // 30 minutes
    };

    /**
     * Get agent performance data with cache-first strategy
     * Requirements: 3.5, 6.1
     */
    static async getAgentPerformance(userId: string, agentId: string): Promise<AgentCacheEntry | null> {
        try {
            // Step 1: Check cache first
            const cacheKey = CacheKeyGenerator.agent.performance(userId, agentId);
            const cachedEntry = agentCache.get(cacheKey) as AgentCacheEntry | null;

            if (cachedEntry && this.isCacheEntryValid(cachedEntry)) {
                logger.debug(`Cache hit for agent performance: ${agentId}`);

                // Check if we need background refresh
                if (this.shouldBackgroundRefresh(cachedEntry)) {
                    this.backgroundRefreshAgent(userId, agentId).catch(error => {
                        logger.error('Background agent refresh failed:', error);
                    });
                }

                return cachedEntry;
            }

            // Step 2: Cache miss - fetch from database
            logger.debug(`Cache miss for agent performance: ${agentId}`);
            const agentData = await this.fetchAndCacheAgentData(userId, agentId);

            return agentData;
        } catch (error) {
            logger.error(`Error getting agent performance from cache: ${agentId}`, error);
            throw error;
        }
    }

    /**
     * Get multiple agents' performance data using batch operations
     * Requirements: 3.5, 6.1
     */
    static async getBatchAgentPerformance(userId: string, agentIds?: string[]): Promise<FrontendAgent[]> {
        try {
            // Step 1: Check batch cache first
            const batchCacheKey = CacheKeyGenerator.agent.batchPerformance(userId);
            const cachedBatch = agentCache.get(batchCacheKey) as BatchAgentCacheEntry | null;

            if (cachedBatch && this.isBatchCacheValid(cachedBatch)) {
                logger.debug(`Batch cache hit for user agents: ${userId}`);

                // Filter by specific agent IDs if provided
                const agents = agentIds
                    ? Array.from(cachedBatch.agents.values()).filter(agent => agentIds.includes(agent.agentId))
                    : Array.from(cachedBatch.agents.values());

                // Debug: Check if agents have elevenLabsConfig
                logger.debug(`Cache agents count: ${agents.length}`);
                agents.forEach(agent => {
                    logger.debug(`Agent ${agent.agentId}: elevenLabsConfig exists: ${!!agent.elevenLabsConfig}, agent_id: ${agent.elevenLabsConfig?.agent_id}`);
                });

                // Check if we need background refresh
                if (this.shouldBackgroundRefresh(cachedBatch)) {
                    this.backgroundRefreshBatchAgents(userId).catch(error => {
                        logger.error('Background batch agent refresh failed:', error);
                    });
                }

                return this.transformCacheEntriesToFrontend(agents);
            }

            // Step 2: Cache miss - fetch all agents for user
            logger.debug(`Batch cache miss for user agents: ${userId}`);
            const agentsData = await this.fetchAndCacheBatchAgentData(userId);
            
            // Debug: Check if fresh data has elevenlabsAgentId
            logger.debug(`Fresh agents count: ${agentsData.length}`);
            agentsData.forEach(agent => {
                logger.debug(`Fresh agent ${agent.id}: elevenlabsAgentId: ${agent.elevenlabsAgentId}`);
            });

            // Filter by specific agent IDs if provided
            const filteredAgents = agentIds
                ? agentsData.filter(agent => agentIds.includes(agent.id.toString()))
                : agentsData;

            return filteredAgents;
        } catch (error) {
            logger.error(`Error getting batch agent performance for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Cache agent statistics and basic agent information
     * Requirements: 3.5, 6.1
     */
    static async cacheAgentStatistics(userId: string, agentId: string): Promise<AgentCacheEntry> {
        try {
            const agentData = await this.fetchAndCacheAgentData(userId, agentId);

            // Also cache individual performance stats
            const performanceCacheKey = CacheKeyGenerator.performance.agentStats(userId, agentId);
            const performanceStats: AgentPerformanceStats = {
                agentId,
                totalCalls: agentData.performance.totalCalls,
                completedCalls: agentData.performance.completedCalls,
                successRate: agentData.performance.successRate,
                avgDurationMinutes: agentData.performance.avgDurationMinutes,
                creditsUsed: agentData.performance.creditsUsed
            };

            performanceCache.set(performanceCacheKey, performanceStats, 15 * 60 * 1000); // 15 minutes

            logger.info(`Cached agent statistics for agent ${agentId} (user ${userId})`);
            return agentData;
        } catch (error) {
            logger.error(`Error caching agent statistics for agent ${agentId}:`, error);
            throw error;
        }
    }

    /**
     * Implement batch cache operations for multiple agents
     * Requirements: 3.5, 6.1
     */
    static async cacheBatchAgentOperations(userId: string, operations: Array<{
        agentId: string;
        operation: 'refresh' | 'invalidate' | 'warm';
    }>): Promise<void> {
        try {
            const batchSize = this.refreshConfig.batchRefreshSize;
            const batches = this.chunkArray(operations, batchSize);

            for (const batch of batches) {
                const batchPromises = batch.map(async ({ agentId, operation }) => {
                    try {
                        switch (operation) {
                            case 'refresh':
                                await this.fetchAndCacheAgentData(userId, agentId);
                                break;
                            case 'invalidate':
                                this.invalidateAgentCache(userId, agentId);
                                break;
                            case 'warm':
                                await this.warmAgentCache(userId, agentId);
                                break;
                        }
                    } catch (error) {
                        logger.error(`Batch operation ${operation} failed for agent ${agentId}:`, error);
                    }
                });

                await Promise.allSettled(batchPromises);
            }

            logger.info(`Completed batch cache operations for ${operations.length} agents (user ${userId})`);
        } catch (error) {
            logger.error(`Error in batch cache operations for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Add cache refresh strategies for stale data
     * Requirements: 6.5
     */
    static async refreshStaleAgentCaches(userId: string): Promise<void> {
        if (!this.refreshConfig.enabled) {
            return;
        }

        try {
            // Get all cached agent keys for the user
            const agentKeys = agentCache.keys().filter(key =>
                key.includes(`agent:${userId}:`) && key.includes(':performance')
            );

            const staleAgents: string[] = [];

            // Check each cached agent for staleness
            for (const key of agentKeys) {
                const cachedEntry = agentCache.get(key) as AgentCacheEntry | null;
                if (cachedEntry && this.shouldBackgroundRefresh(cachedEntry)) {
                    const agentId = this.extractAgentIdFromKey(key);
                    if (agentId) {
                        staleAgents.push(agentId);
                    }
                }
            }

            if (staleAgents.length > 0) {
                logger.info(`Refreshing ${staleAgents.length} stale agent caches for user ${userId}`);

                const refreshOperations = staleAgents.map(agentId => ({
                    agentId,
                    operation: 'refresh' as const
                }));

                await this.cacheBatchAgentOperations(userId, refreshOperations);
            }
        } catch (error) {
            logger.error(`Error refreshing stale agent caches for user ${userId}:`, error);
        }
    }

    /**
     * Warm agent cache proactively
     * Requirements: 6.5
     */
    static async warmAgentCache(userId: string, agentId: string): Promise<void> {
        if (!this.refreshConfig.enabled) {
            return;
        }

        try {
            logger.debug(`Warming agent cache: ${agentId}`);

            // Warm basic agent data
            await this.fetchAndCacheAgentData(userId, agentId);

            // Warm ElevenLabs config separately with longer TTL
            await this.warmElevenLabsConfig(userId, agentId);

            logger.debug(`Agent cache warming completed: ${agentId}`);
        } catch (error) {
            logger.error(`Agent cache warming failed for agent ${agentId}:`, error);
        }
    }

    /**
     * Warm ElevenLabs configuration cache
     */
    private static async warmElevenLabsConfig(userId: string, agentId: string): Promise<void> {
        try {
            const cacheKey = CacheKeyGenerator.agent.elevenLabsConfig(userId, agentId);

            // Check if already cached and not expired
            const cached = agentCache.get(cacheKey);
            if (cached) {
                return;
            }

            // Fetch from ElevenLabs API with user ownership verification
            const agent = await database.query('SELECT elevenlabs_agent_id FROM agents WHERE id = $1 AND user_id = $2', [agentId, userId]);
            if (agent.rows.length === 0) {
                logger.warn(`Agent ${agentId} not found or not owned by user ${userId} during cache warming`);
                return;
            }

            const elevenLabsAgentId = agent.rows[0].elevenlabs_agent_id;
            const config = await elevenlabsService.getAgent(elevenLabsAgentId);

            // Cache with longer TTL for ElevenLabs config
            agentCache.set(cacheKey, config, this.refreshConfig.elevenLabsRefreshInterval);

            logger.debug(`Warmed ElevenLabs config cache for agent: ${agentId} (user: ${userId})`);
        } catch (error) {
            logger.debug(`Failed to warm ElevenLabs config for agent ${agentId} (user: ${userId}):`, error);
            // Don't throw - this is a non-critical operation
        }
    }

    /**
     * Fetch agent data from database and cache it
     */
    private static async fetchAndCacheAgentData(userId: string, agentId: string): Promise<AgentCacheEntry> {
        try {
            const startTime = Date.now();

            // Fetch basic agent info
            const agentQuery = `
        SELECT id, name, agent_type, description, is_active, created_at, elevenlabs_agent_id
        FROM agents 
        WHERE id = $1 AND user_id = $2
      `;
            const agentResult = await database.query(agentQuery, [agentId, userId]);

            if (agentResult.rows.length === 0) {
                throw new Error(`Agent ${agentId} not found for user ${userId}`);
            }

            const agent = agentResult.rows[0];

            // Fetch performance data
            const performanceQuery = `
        SELECT 
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
          COALESCE(AVG(duration_minutes), 0) as avg_duration,
          COALESCE(SUM(credits_used), 0) as total_credits_used,
          MIN(created_at) as first_call_at,
          MAX(created_at) as last_call_at
        FROM calls 
        WHERE agent_id = $1 AND user_id = $2
      `;
            const performanceResult = await database.query(performanceQuery, [agentId, userId]);
            const performance = performanceResult.rows[0];

            // Calculate performance metrics
            const totalCalls = parseInt(performance.total_calls) || 0;
            const completedCalls = parseInt(performance.completed_calls) || 0;
            const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
            const avgDurationMinutes = parseFloat(performance.avg_duration) || 0;
            const avgDuration = avgDurationMinutes > 0 ? avgDurationMinutes.toFixed(1) + 'm' : '0m';
            const creditsUsed = parseInt(performance.total_credits_used) || 0;

            // Try to get ElevenLabs config from cache first
            const elevenLabsCacheKey = CacheKeyGenerator.agent.elevenLabsConfig(userId, agentId);
            let elevenLabsConfig = agentCache.get(elevenLabsCacheKey) as ElevenLabsAgent | undefined;

            // If not cached, try to fetch using improved parallel-capable API manager (but don't block on failure)
            if (!elevenLabsConfig) {
                try {
                    const { elevenLabsApiManager } = await import('./elevenLabsApiManager');
                    const fetchedConfig = await elevenLabsApiManager.fetchAgentConfigWithFallback(agent.elevenlabs_agent_id);
                    elevenLabsConfig = fetchedConfig || undefined;

                    if (elevenLabsConfig) {
                        // Cache the config with longer TTL
                        agentCache.set(elevenLabsCacheKey, elevenLabsConfig, this.refreshConfig.elevenLabsRefreshInterval);
                        logger.debug(`Cached ElevenLabs config for agent ${agentId} (user: ${userId})`);
                    }
                } catch (error) {
                    logger.debug(`Failed to fetch ElevenLabs config for agent ${agentId} (user: ${userId}):`, error);
                    // Continue without ElevenLabs config - graceful degradation
                }
            }

            const fetchTime = Date.now() - startTime;

            // Create cache entry
            const cacheEntry: AgentCacheEntry = {
                agentId,
                userId,
                basicInfo: {
                    id: agent.id,
                    name: agent.name,
                    type: agent.agent_type === 'call' ? 'CallAgent' : 'ChatAgent',
                    status: agent.is_active ? 'active' : 'draft',
                    description: agent.description || '',
                    agent_type: agent.agent_type,
                    is_active: agent.is_active,
                    created_at: agent.created_at,
                    elevenlabs_agent_id: agent.elevenlabs_agent_id
                },
                performance: {
                    conversations: totalCalls,
                    successRate,
                    avgDuration,
                    creditsUsed,
                    totalCalls,
                    completedCalls,
                    avgDurationMinutes
                },
                elevenLabsConfig,
                calculatedAt: new Date(),
                expiresAt: new Date(Date.now() + (15 * 60 * 1000)), // 15 minutes TTL
                source: 'database'
            };

            // Cache the data
            const cacheKey = CacheKeyGenerator.agent.performance(userId, agentId);
            const cached = agentCache.set(cacheKey, cacheEntry, 15 * 60 * 1000); // 15 minutes

            if (cached) {
                logger.info(`Cached agent performance for agent ${agentId} (fetch: ${fetchTime}ms)`);
            } else {
                logger.warn(`Failed to cache agent performance for agent ${agentId}`);
            }

            return cacheEntry;
        } catch (error) {
            logger.error(`Error fetching and caching agent data for agent ${agentId}:`, error);
            throw error;
        }
    }

    /**
     * Fetch ElevenLabs configurations for multiple agents in parallel and cache them
     * Requirements: 3.3, 5.3, 5.4
     */
    private static async fetchAndCacheBatchElevenLabsConfigs(userId: string, agents: any[]): Promise<Map<string, ElevenLabsAgent>> {
        if (agents.length === 0) {
            return new Map();
        }

        try {
            const startTime = Date.now();
            const elevenLabsAgentIds = agents.map(agent => agent.elevenlabs_agent_id);

            logger.debug(`Starting parallel ElevenLabs config fetch for ${agents.length} agents`);

            // Use the improved parallel ElevenLabs API manager
            const { elevenLabsApiManager } = await import('./elevenLabsApiManager');

            let batchResult;
            if (elevenLabsAgentIds.length <= 20) {
                // For smaller sets, use full parallel processing with Promise.all
                batchResult = await elevenLabsApiManager.fetchAgentConfigsParallel(elevenLabsAgentIds);
            } else {
                // For larger sets, use batched parallel processing
                batchResult = await elevenLabsApiManager.fetchAgentConfigsBatch(elevenLabsAgentIds);
            }

            // Create a map of ElevenLabs configs and cache them individually
            const configMap = new Map<string, ElevenLabsAgent>();

            batchResult.results.forEach(result => {
                if (result.success && result.config) {
                    configMap.set(result.agentId, result.config);

                    // Cache individual config with longer TTL
                    const agent = agents.find(a => a.elevenlabs_agent_id === result.agentId);
                    if (agent) {
                        const elevenLabsCacheKey = CacheKeyGenerator.agent.elevenLabsConfig(userId, agent.id);
                        agentCache.set(elevenLabsCacheKey, result.config, this.refreshConfig.elevenLabsRefreshInterval);
                    }
                }
            });

            const fetchTime = Date.now() - startTime;
            logger.info(`Completed parallel ElevenLabs config batch fetch`, {
                totalAgents: agents.length,
                configsLoaded: batchResult.successCount,
                configsFailed: batchResult.errorCount,
                successRate: `${Math.round((batchResult.successCount / agents.length) * 100)}%`,
                fetchTime: `${fetchTime}ms`,
                avgTimePerAgent: `${Math.round(fetchTime / agents.length)}ms`,
                parallelMethod: elevenLabsAgentIds.length <= 20 ? 'Promise.all' : 'batched'
            });

            return configMap;
        } catch (error) {
            logger.error(`Error in batch ElevenLabs config fetch:`, error);
            return new Map(); // Return empty map on error - graceful degradation
        }
    }

    /**
     * Fetch and cache batch agent data for all user agents with parallel ElevenLabs processing
     */
    private static async fetchAndCacheBatchAgentData(userId: string): Promise<FrontendAgent[]> {
        try {
            const startTime = Date.now();

            // Directly fetch agents without using the agent service to avoid circular dependency
            const agents = await this.fetchAgentsDirectly(userId);

            // Fetch ElevenLabs configurations in parallel for all agents
            const elevenLabsConfigMap = await this.fetchAndCacheBatchElevenLabsConfigs(userId, agents);

            // Transform agents to frontend format with ElevenLabs configs
            const frontendAgents = await this.batchTransformToFrontendFormatWithConfigs(agents, userId, elevenLabsConfigMap);

            // Create batch cache entry
            const agentMap = new Map<string, AgentCacheEntry>();

            // Convert frontend agents back to cache entries for storage
            for (const frontendAgent of frontendAgents) {
                // Find the corresponding ElevenLabs config and original agent data for this agent
                const agentId = frontendAgent.id.toString();
                const elevenLabsConfig = elevenLabsConfigMap.get(agentId);
                const originalAgent = agents.find(a => a.id === agentId);
                
                const cacheEntry: AgentCacheEntry = {
                    agentId: frontendAgent.id.toString(),
                    userId,
                    basicInfo: {
                        id: frontendAgent.id.toString(),
                        name: frontendAgent.name,
                        type: frontendAgent.type,
                        status: frontendAgent.status,
                        description: frontendAgent.description,
                        agent_type: frontendAgent.type === 'CallAgent' ? 'call' : 'chat',
                        is_active: frontendAgent.status === 'active',
                        created_at: frontendAgent.created,
                        elevenlabs_agent_id: originalAgent?.elevenlabs_agent_id
                    },
                    performance: {
                        conversations: frontendAgent.conversations,
                        successRate: frontendAgent.successRate || 0,
                        avgDuration: frontendAgent.avgDuration || '0m',
                        creditsUsed: Math.max(1000 - frontendAgent.creditsRemaining, 0),
                        totalCalls: frontendAgent.conversations,
                        completedCalls: Math.round((frontendAgent.conversations * (frontendAgent.successRate || 0)) / 100),
                        avgDurationMinutes: parseFloat(frontendAgent.avgDuration?.replace('m', '') || '0')
                    },
                    elevenLabsConfig,
                    calculatedAt: new Date(),
                    expiresAt: new Date(Date.now() + (15 * 60 * 1000)),
                    source: 'database'
                };

                agentMap.set(frontendAgent.id.toString(), cacheEntry);

                // Also cache individual agent entries
                const individualCacheKey = CacheKeyGenerator.agent.performance(userId, frontendAgent.id.toString());
                agentCache.set(individualCacheKey, cacheEntry, 15 * 60 * 1000);
            }

            const batchCacheEntry: BatchAgentCacheEntry = {
                userId,
                agents: agentMap,
                calculatedAt: new Date(),
                expiresAt: new Date(Date.now() + (10 * 60 * 1000)), // 10 minutes TTL for batch
                agentCount: agentMap.size
            };

            // Cache the batch data
            const batchCacheKey = CacheKeyGenerator.agent.batchPerformance(userId);
            const cached = agentCache.set(batchCacheKey, batchCacheEntry, 10 * 60 * 1000); // 10 minutes

            const fetchTime = Date.now() - startTime;

            if (cached) {
                logger.info(`Cached batch agent performance for user ${userId} (${agentMap.size} agents, fetch: ${fetchTime}ms)`);
            } else {
                logger.warn(`Failed to cache batch agent performance for user ${userId}`);
            }

            return frontendAgents;
        } catch (error) {
            logger.error(`Error fetching and caching batch agent data for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Transform cache entries to frontend format
     */
    private static transformCacheEntriesToFrontend(cacheEntries: AgentCacheEntry[]): FrontendAgent[] {
        return cacheEntries.map(entry => {
            // Use ElevenLabs config agent_id if available, otherwise fallback to database elevenlabs_agent_id
            const elevenlabsAgentId = entry.elevenLabsConfig?.agent_id || entry.basicInfo.elevenlabs_agent_id;
            logger.debug(`Transform cache entry ${entry.agentId}: elevenLabsConfig exists: ${!!entry.elevenLabsConfig}, agent_id from config: ${entry.elevenLabsConfig?.agent_id}, agent_id from db: ${entry.basicInfo.elevenlabs_agent_id}, final: ${elevenlabsAgentId}`);
            
            return {
                id: entry.agentId, // Keep UUID as string - don't convert to number
                name: entry.basicInfo.name,
                type: entry.basicInfo.type as 'ChatAgent' | 'CallAgent',
                language: this.extractLanguageFromConfig(entry.elevenLabsConfig),
                description: entry.basicInfo.description,
                status: entry.basicInfo.status as 'active' | 'draft',
                model: this.extractModelFromConfig(entry.elevenLabsConfig),
                conversations: entry.performance.conversations,
                creditsRemaining: Math.max(1000 - entry.performance.creditsUsed, 0),
                created: new Date(entry.basicInfo.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                }),
                doc: null,
                successRate: entry.performance.successRate,
                avgDuration: entry.performance.avgDuration,
                elevenlabsAgentId,
            };
        });
    }

    /**
     * Extract language from ElevenLabs config
     */
    private static extractLanguageFromConfig(config?: ElevenLabsAgent): string {
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
     * Extract model from ElevenLabs config
     */
    private static extractModelFromConfig(config?: ElevenLabsAgent): string {
        return config?.llm?.model || 'gpt-4o-mini';
    }

    /**
     * Background refresh of agent data
     */
    private static async backgroundRefreshAgent(userId: string, agentId: string): Promise<void> {
        try {
            logger.debug(`Background refresh started for agent: ${agentId}`);
            await this.fetchAndCacheAgentData(userId, agentId);
            logger.debug(`Background refresh completed for agent: ${agentId}`);
        } catch (error) {
            logger.error(`Background refresh failed for agent ${agentId}:`, error);
        }
    }

    /**
     * Background refresh of batch agent data
     */
    private static async backgroundRefreshBatchAgents(userId: string): Promise<void> {
        try {
            logger.debug(`Background batch refresh started for user: ${userId}`);
            await this.fetchAndCacheBatchAgentData(userId);
            logger.debug(`Background batch refresh completed for user: ${userId}`);
        } catch (error) {
            logger.error(`Background batch refresh failed for user ${userId}:`, error);
        }
    }

    /**
     * Invalidate agent cache
     */
    static invalidateAgentCache(userId: string, agentId: string): void {
        const keys = [
            CacheKeyGenerator.agent.performance(userId, agentId),
            CacheKeyGenerator.agent.details(userId, agentId),
            CacheKeyGenerator.agent.config(userId, agentId),
            CacheKeyGenerator.agent.elevenLabsConfig(userId, agentId),
            CacheKeyGenerator.performance.agentStats(userId, agentId)
        ];

        let invalidated = 0;
        keys.forEach(key => {
            if (agentCache.delete(key) || performanceCache.delete(key)) {
                invalidated++;
            }
        });

        // Also invalidate batch cache
        const batchKey = CacheKeyGenerator.agent.batchPerformance(userId);
        if (agentCache.delete(batchKey)) {
            invalidated++;
        }

        logger.info(`Invalidated ${invalidated} cache entries for agent ${agentId} (user ${userId})`);
    }

    /**
     * Check if cache entry is valid (not expired)
     */
    private static isCacheEntryValid(entry: AgentCacheEntry): boolean {
        return new Date() < entry.expiresAt;
    }

    /**
     * Check if batch cache entry is valid
     */
    private static isBatchCacheValid(entry: BatchAgentCacheEntry): boolean {
        return new Date() < entry.expiresAt;
    }

    /**
     * Check if cache entry should be refreshed in background
     */
    private static shouldBackgroundRefresh(entry: AgentCacheEntry | BatchAgentCacheEntry): boolean {
        if (!this.refreshConfig.backgroundRefresh) {
            return false;
        }

        const now = Date.now();
        const created = entry.calculatedAt.getTime();
        const expires = entry.expiresAt.getTime();
        const ttl = expires - created;
        const age = now - created;

        return (age / ttl) >= this.refreshConfig.refreshThreshold;
    }

    /**
     * Extract agent ID from cache key
     */
    private static extractAgentIdFromKey(key: string): string | null {
        const match = key.match(/agent:([^:]+):([^:]+):performance/);
        return match ? match[2] : null;
    }

    /**
     * Utility function to chunk array into smaller arrays
     */
    private static chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Get cache statistics for monitoring
     */
    static getCacheStatistics(): any {
        return {
            agent: agentCache.getStatistics(),
            performance: performanceCache.getStatistics(),
            refreshConfig: this.refreshConfig
        };
    }

    /**
     * Update cache refresh configuration
     */
    static updateRefreshConfig(config: Partial<AgentCacheRefreshConfig>): void {
        this.refreshConfig = { ...this.refreshConfig, ...config };
        logger.info('Agent cache refresh configuration updated:', this.refreshConfig);
    }

    /**
     * Clear all agent caches for a user
     */
    static clearUserAgentCaches(userId: string): void {
        const patterns = [
            `agent:${userId}:`,
            `agents:${userId}:`,
            `performance:${userId}:`,
            `elevenlabs:${userId}:`
        ];

        let totalCleared = 0;
        patterns.forEach(pattern => {
            totalCleared += agentCache.invalidatePattern(pattern);
            totalCleared += performanceCache.invalidatePattern(pattern);
        });

        logger.info(`Cleared ${totalCleared} agent cache entries for user ${userId}`);
    }

    /**
     * Fetch agents directly from database without circular dependency
     */
    private static async fetchAgentsDirectly(userId: string): Promise<any[]> {
        try {
            // Fetch basic agent info directly from database
            const agentQuery = `
        SELECT id, name, agent_type, description, is_active, created_at, elevenlabs_agent_id
        FROM agents 
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
            const agentResult = await database.query(agentQuery, [userId]);
            return agentResult.rows;
        } catch (error) {
            logger.error(`Error fetching agents directly for user ${userId}:`, error);
            return [];
        }
    }

    /**
     * Transform agents to frontend format using batch queries with ElevenLabs configurations
     * Requirements: 3.3, 5.3, 5.4
     */
    private static async batchTransformToFrontendFormatWithConfigs(
        agents: any[],
        userId: string,
        elevenLabsConfigMap: Map<string, ElevenLabsAgent>
    ): Promise<FrontendAgent[]> {
        if (agents.length === 0) {
            return [];
        }

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

            // Single batch query to get performance data for all agents
            const batchStatsQuery = `
        SELECT 
          agent_id,
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
          COALESCE(AVG(duration_minutes), 0) as avg_duration,
          COALESCE(SUM(credits_used), 0) as total_credits_used
        FROM calls 
        WHERE agent_id = ANY($1) AND user_id = $2
        GROUP BY agent_id
      `;

            const batchStatsResult = await database.query(batchStatsQuery, [agentIds, userId]);

            // Create a map of agent performance data for quick lookup
            const performanceMap = new Map();
            batchStatsResult.rows.forEach((row: any) => {
                const conversations = parseInt(row.total_calls) || 0;
                const completedCalls = parseInt(row.completed_calls) || 0;
                const successRate = conversations > 0 ? Math.round((completedCalls / conversations) * 100) : 0;
                const avgDurationMinutes = parseFloat(row.avg_duration) || 0;
                const avgDuration = avgDurationMinutes > 0 ? avgDurationMinutes.toFixed(1) + 'm' : '0m';
                const creditsUsed = parseInt(row.total_credits_used) || 0;

                performanceMap.set(row.agent_id, {
                    conversations,
                    successRate,
                    avgDuration,
                    creditsRemaining: Math.max(1000 - creditsUsed, 0) // Placeholder calculation
                });
            });

            // Transform all agents using the performance map and ElevenLabs configs
            return agents.map(agent => {
                const description = agent.description || '';

                // Get ElevenLabs config for language and model information
                const elevenLabsConfig = elevenLabsConfigMap.get(agent.elevenlabs_agent_id);
                const configLanguage = elevenLabsConfig?.language || 'en';
                const model = elevenLabsConfig?.llm?.model || 'gpt-4o-mini';

                // Get performance data from map or use defaults
                const performance = performanceMap.get(agent.id) || {
                    conversations: 0,
                    successRate: 0,
                    avgDuration: '0m',
                    creditsRemaining: 1000
                };

                return {
                    id: agent.id, // Keep UUID as string - don't convert to integer
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
                    elevenlabsAgentId: agent.elevenlabs_agent_id,
                };
            });
        } catch (error) {
            logger.error(`Failed to batch transform agents with configs for user ${userId}:`, error);
            // Fallback to transformation without ElevenLabs configs
            return this.batchTransformToFrontendFormat(agents, userId);
        }
    }

    /**
     * Transform agents to frontend format using batch queries (fallback without ElevenLabs configs)
     */
    private static async batchTransformToFrontendFormat(agents: any[], userId: string): Promise<FrontendAgent[]> {
        if (agents.length === 0) {
            return [];
        }

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

            // Single batch query to get performance data for all agents
            const batchStatsQuery = `
        SELECT 
          agent_id,
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
          COALESCE(AVG(duration_minutes), 0) as avg_duration,
          COALESCE(SUM(credits_used), 0) as total_credits_used
        FROM calls 
        WHERE agent_id = ANY($1) AND user_id = $2
        GROUP BY agent_id
      `;

            const batchStatsResult = await database.query(batchStatsQuery, [agentIds, userId]);

            // Create a map of agent performance data for quick lookup
            const performanceMap = new Map();
            batchStatsResult.rows.forEach((row: any) => {
                const conversations = parseInt(row.total_calls) || 0;
                const completedCalls = parseInt(row.completed_calls) || 0;
                const successRate = conversations > 0 ? Math.round((completedCalls / conversations) * 100) : 0;
                const avgDurationMinutes = parseFloat(row.avg_duration) || 0;
                const avgDuration = avgDurationMinutes > 0 ? avgDurationMinutes.toFixed(1) + 'm' : '0m';
                const creditsUsed = parseInt(row.total_credits_used) || 0;

                performanceMap.set(row.agent_id, {
                    conversations,
                    successRate,
                    avgDuration,
                    creditsRemaining: Math.max(1000 - creditsUsed, 0) // Placeholder calculation
                });
            });

            // Transform all agents using the performance map
            return agents.map(agent => {
                const description = agent.description || '';

                // Get performance data from map or use defaults
                const performance = performanceMap.get(agent.id) || {
                    conversations: 0,
                    successRate: 0,
                    avgDuration: '0m',
                    creditsRemaining: 1000
                };

                return {
                    id: agent.id, // Keep UUID as string - don't convert to integer
                    name: agent.name,
                    type: agent.agent_type === 'call' ? 'CallAgent' : 'ChatAgent',
                    language: 'English', // Default since we don't have ElevenLabs config here
                    description: description,
                    status: agent.is_active ? 'active' : 'draft',
                    model: 'gpt-4o-mini', // Default model
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
                    elevenlabsAgentId: agent.elevenlabs_agent_id,
                };
            });
        } catch (error) {
            logger.error(`Failed to batch transform agents for user ${userId}:`, error);
            // Return basic transformation without performance data
            return agents.map(agent => ({
                id: agent.id, // Keep UUID as string - don't convert to integer
                name: agent.name,
                type: agent.agent_type === 'call' ? 'CallAgent' : 'ChatAgent',
                language: 'English',
                description: agent.description || '',
                status: agent.is_active ? 'active' : 'draft',
                model: 'gpt-4o-mini',
                conversations: 0,
                creditsRemaining: 1000,
                created: new Date(agent.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                }),
                doc: null,
                successRate: 0,
                avgDuration: '0m',
                elevenlabsAgentId: agent.elevenlabs_agent_id,
            }));
        }
    }
}

// Export the service
export const agentCacheService = AgentCacheService;