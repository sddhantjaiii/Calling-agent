import { logger } from '../utils/logger';
import { elevenlabsService, ElevenLabsAgent } from './elevenLabsService';
import { RetryService } from './retryService';

export interface ElevenLabsConfigResult {
  agentId: string;
  config?: ElevenLabsAgent;
  error?: string;
  success: boolean;
}

export interface BatchConfigResult {
  results: ElevenLabsConfigResult[];
  successCount: number;
  errorCount: number;
  totalTime: number;
}

/**
 * Manager for handling ElevenLabs API calls with parallel processing and graceful degradation
 * Requirements: 3.3, 5.2, 5.3, 5.4, 5.6
 */
export class ElevenLabsApiManager {
  private readonly CONCURRENT_LIMIT = 10; // Increased concurrent limit for better parallel processing
  private readonly INDIVIDUAL_TIMEOUT = 15000; // 15 seconds per individual request (accept API delays as normal)
  private readonly BATCH_TIMEOUT = 30000; // 30 seconds total timeout for entire batch
  
  /**
   * Fetch ElevenLabs configurations for multiple agents in parallel using Promise.all
   * Requirements: 3.3, 5.3, 5.4
   */
  async fetchAgentConfigsBatch(agentIds: string[]): Promise<BatchConfigResult> {
    const startTime = Date.now();
    
    if (agentIds.length === 0) {
      return {
        results: [],
        successCount: 0,
        errorCount: 0,
        totalTime: 0
      };
    }

    logger.info(`Starting parallel ElevenLabs config fetch for ${agentIds.length} agents`, {
      agentIds: agentIds.slice(0, 5), // Log first 5 IDs for debugging
      totalCount: agentIds.length,
      concurrentLimit: this.CONCURRENT_LIMIT,
      individualTimeout: `${this.INDIVIDUAL_TIMEOUT}ms`,
      batchTimeout: `${this.BATCH_TIMEOUT}ms`
    });

    try {
      // Use Promise.all with batching for optimal parallel processing
      const results = await this.executeParallelBatches(agentIds);
      
      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      logger.info(`Completed parallel ElevenLabs config fetch`, {
        totalAgents: agentIds.length,
        successCount,
        errorCount,
        successRate: `${Math.round((successCount / agentIds.length) * 100)}%`,
        totalTime: `${totalTime}ms`,
        avgTimePerAgent: `${Math.round(totalTime / agentIds.length)}ms`
      });

      return {
        results,
        successCount,
        errorCount,
        totalTime
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`Batch ElevenLabs config fetch failed`, {
        totalAgents: agentIds.length,
        totalTime: `${totalTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return failed results for all agents
      const results: ElevenLabsConfigResult[] = agentIds.map(agentId => ({
        agentId,
        success: false,
        error: error instanceof Error ? error.message : 'Batch operation failed'
      }));

      return {
        results,
        successCount: 0,
        errorCount: agentIds.length,
        totalTime
      };
    }
  }

  /**
   * Execute parallel batches with Promise.all for optimal concurrent processing
   * Requirements: 3.3, 5.3, 5.4
   */
  private async executeParallelBatches(agentIds: string[]): Promise<ElevenLabsConfigResult[]> {
    // Create batches to respect concurrent limits while maximizing parallelism
    const batches = this.createBatches(agentIds, this.CONCURRENT_LIMIT);
    const allResults: ElevenLabsConfigResult[] = [];

    // Process all batches with Promise.all for maximum parallelism
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.debug(`Processing parallel batch ${i + 1}/${batches.length} with ${batch.length} agents`);
      
      const batchStartTime = Date.now();
      
      // Use Promise.all for true parallel execution within each batch
      const batchResults = await this.processParallelBatch(batch);
      
      const batchTime = Date.now() - batchStartTime;
      logger.debug(`Completed parallel batch ${i + 1}/${batches.length}`, {
        batchSize: batch.length,
        batchTime: `${batchTime}ms`,
        successCount: batchResults.filter(r => r.success).length,
        errorCount: batchResults.filter(r => !r.success).length
      });
      
      allResults.push(...batchResults);
    }

    return allResults;
  }

  /**
   * Process a single batch of agent IDs with true parallel execution using Promise.all
   * Requirements: 5.3, 5.4, 5.6
   */
  private async processParallelBatch(agentIds: string[]): Promise<ElevenLabsConfigResult[]> {
    // Create individual promises with timeout handling for each agent
    const promises = agentIds.map(agentId => this.fetchSingleAgentConfigWithTimeout(agentId));
    
    // Use Promise.allSettled for graceful handling of individual failures
    // This ensures that one failed request doesn't block others
    const settledResults = await Promise.allSettled(promises);
    
    return settledResults.map((result, index) => {
      const agentId = agentIds[index];
      
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        logger.warn(`Parallel fetch failed for agent ${agentId}`, {
          error: result.reason?.message || 'Unknown error',
          agentId
        });
        
        return {
          agentId,
          success: false,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  /**
   * Legacy method for backward compatibility - now uses parallel processing
   * @deprecated Use processParallelBatch instead
   */
  private async processBatch(agentIds: string[]): Promise<ElevenLabsConfigResult[]> {
    return this.processParallelBatch(agentIds);
  }

  /**
   * Fetch configuration for a single agent with individual timeout handling within parallel execution
   * Requirements: 5.1, 5.5, 5.6
   */
  private async fetchSingleAgentConfigWithTimeout(agentId: string): Promise<ElevenLabsConfigResult> {
    const requestStartTime = Date.now();
    
    try {
      logger.debug(`Starting parallel ElevenLabs request for agent ${agentId}`);
      
      // Use individual timeout wrapper for each parallel request
      const config = await RetryService.withTimeout(
        () => elevenlabsService.getAgent(agentId),
        this.INDIVIDUAL_TIMEOUT,
        `parallelFetchAgentConfig(${agentId})`
      );

      const requestTime = Date.now() - requestStartTime;
      logger.debug(`Parallel ElevenLabs request completed for agent ${agentId}`, {
        requestTime: `${requestTime}ms`,
        agentId
      });

      return {
        agentId,
        config,
        success: true
      };
    } catch (error) {
      const requestTime = Date.now() - requestStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Accept ElevenLabs API response times as normal operation
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.info(`ElevenLabs API timeout for agent ${agentId} - accepting as normal operation`, {
          error: errorMessage,
          requestTime: `${requestTime}ms`,
          agentId
        });
      } else {
        logger.warn(`Failed to fetch ElevenLabs config for agent ${agentId}`, {
          error: errorMessage,
          requestTime: `${requestTime}ms`,
          agentId
        });
      }

      return {
        agentId,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use fetchSingleAgentConfigWithTimeout instead
   */
  private async fetchSingleAgentConfig(agentId: string): Promise<ElevenLabsConfigResult> {
    return this.fetchSingleAgentConfigWithTimeout(agentId);
  }

  /**
   * Fetch configuration for a single agent with graceful degradation
   * Requirements: 3.4, 5.2, 5.6
   */
  async fetchAgentConfigWithFallback(agentId: string): Promise<ElevenLabsAgent | null> {
    try {
      const result = await this.fetchSingleAgentConfig(agentId);
      
      if (result.success && result.config) {
        return result.config;
      } else {
        logger.warn(`ElevenLabs config unavailable for agent ${agentId}, using fallback`, {
          error: result.error
        });
        return null;
      }
    } catch (error) {
      logger.warn(`ElevenLabs API call failed for agent ${agentId}, using fallback`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Create batches from array of agent IDs
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Get basic agent information when ElevenLabs config is unavailable
   * Requirements: 3.4, 5.2
   */
  getBasicAgentFallback(agentId: string, name: string): Partial<ElevenLabsAgent> {
    return {
      agent_id: agentId,
      name: name,
      language: 'en',
      llm: {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 500
      },
      tts: {
        voice_id: 'default',
        model: 'eleven_turbo_v2_5'
      }
    };
  }

  /**
   * Fetch configurations for multiple agents using full parallel processing with Promise.all
   * This method uses Promise.all for maximum parallelism when agent count is manageable
   * Requirements: 3.3, 5.3, 5.4
   */
  async fetchAgentConfigsParallel(agentIds: string[]): Promise<BatchConfigResult> {
    const startTime = Date.now();
    
    if (agentIds.length === 0) {
      return {
        results: [],
        successCount: 0,
        errorCount: 0,
        totalTime: 0
      };
    }

    logger.info(`Starting full parallel ElevenLabs config fetch for ${agentIds.length} agents`, {
      agentIds: agentIds.slice(0, 5),
      totalCount: agentIds.length,
      method: 'Promise.all',
      individualTimeout: `${this.INDIVIDUAL_TIMEOUT}ms`
    });

    try {
      // Use Promise.all for maximum parallel execution of all requests
      const promises = agentIds.map(agentId => this.fetchSingleAgentConfigWithTimeout(agentId));
      
      // Execute all requests in parallel with Promise.allSettled for graceful error handling
      const settledResults = await Promise.allSettled(promises);
      
      const results: ElevenLabsConfigResult[] = settledResults.map((result, index) => {
        const agentId = agentIds[index];
        
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          logger.warn(`Full parallel fetch failed for agent ${agentId}`, {
            error: result.reason?.message || 'Unknown error',
            agentId
          });
          
          return {
            agentId,
            success: false,
            error: result.reason?.message || 'Unknown error'
          };
        }
      });

      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      logger.info(`Completed full parallel ElevenLabs config fetch`, {
        totalAgents: agentIds.length,
        successCount,
        errorCount,
        successRate: `${Math.round((successCount / agentIds.length) * 100)}%`,
        totalTime: `${totalTime}ms`,
        avgTimePerAgent: `${Math.round(totalTime / agentIds.length)}ms`,
        method: 'Promise.all'
      });

      return {
        results,
        successCount,
        errorCount,
        totalTime
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`Full parallel ElevenLabs config fetch failed`, {
        totalAgents: agentIds.length,
        totalTime: `${totalTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return failed results for all agents
      const results: ElevenLabsConfigResult[] = agentIds.map(agentId => ({
        agentId,
        success: false,
        error: error instanceof Error ? error.message : 'Parallel operation failed'
      }));

      return {
        results,
        successCount: 0,
        errorCount: agentIds.length,
        totalTime
      };
    }
  }

  /**
   * Check if ElevenLabs API is currently available
   * Requirements: 5.2, 5.6
   */
  async checkApiAvailability(): Promise<boolean> {
    try {
      const result = await RetryService.withTimeout(
        () => elevenlabsService.testConnection(),
        5000, // 5 second timeout for availability check
        'checkElevenLabsAvailability'
      );
      
      return result;
    } catch (error) {
      logger.warn('ElevenLabs API availability check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

// Export singleton instance
export const elevenLabsApiManager = new ElevenLabsApiManager();