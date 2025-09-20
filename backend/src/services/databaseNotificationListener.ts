import { Client } from 'pg';
import { logger } from '../utils/logger';
import { CacheInvalidationService } from './cacheInvalidation';
import { dashboardCacheService } from './dashboardCache';

/**
 * Database notification interface
 */
interface CacheInvalidationNotification {
    table: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'TEST';
    user_id: string;
    record_id?: string;
    agent_id?: string;
    timestamp: number;
    batch_id?: string;
    test?: boolean;
}

/**
 * Database notification listener for automatic cache invalidation
 * Requirements: 6.2 - Add automatic cache invalidation when user data changes
 */
export class DatabaseNotificationListener {
    private client: Client | null = null;
    private isListening = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // Start with 1 second
    
    // Batching support for efficient cache invalidation
    private batchBuffer = new Map<string, CacheInvalidationNotification[]>();
    private batchTimer: any | null = null;
    private batchDelay = 100; // 100ms batch window
    private maxBatchSize = 50; // Maximum notifications per batch

    /**
     * Start listening for database notifications
     */
    async startListening(): Promise<void> {
        try {
            if (this.isListening) {
                logger.warn('Database notification listener is already running');
                return;
            }

            // Create a dedicated client for notifications using DATABASE_URL
            this.client = new Client({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }, // Required for Neon database
                // Keep connection alive for notifications
                keepAlive: true,
                keepAliveInitialDelayMillis: 10000,
            });

            await this.client.connect();

            // Listen for cache invalidation notifications
            await this.client.query('LISTEN cache_invalidation');

            // Set up notification handler
            this.client.on('notification', this.handleNotification.bind(this));

            // Set up error handler
            this.client.on('error', this.handleError.bind(this));

            // Set up connection end handler
            this.client.on('end', this.handleConnectionEnd.bind(this));

            this.isListening = true;
            this.reconnectAttempts = 0;

            logger.info('Database notification listener started successfully');
        } catch (error) {
            logger.error('Failed to start database notification listener:', error);
            await this.handleReconnect();
        }
    }

    /**
     * Stop listening for database notifications
     */
    async stopListening(): Promise<void> {
        try {
            if (!this.isListening || !this.client) {
                return;
            }

            this.isListening = false;

            // Process any remaining batched notifications
            await this.processBatchedNotifications();

            // Clear batch timer
            if (this.batchTimer) {
                clearTimeout(this.batchTimer);
                this.batchTimer = null;
            }

            // Unlisten from notifications
            await this.client.query('UNLISTEN cache_invalidation');

            // Close the connection
            await this.client.end();
            this.client = null;

            logger.info('Database notification listener stopped');
        } catch (error) {
            logger.error('Error stopping database notification listener:', error);
        }
    }

    /**
     * Handle incoming notifications
     */
    private handleNotification(msg: any): void {
        try {
            if (msg.channel !== 'cache_invalidation') {
                return;
            }

            const notification: CacheInvalidationNotification = JSON.parse(msg.payload);

            logger.debug('Received cache invalidation notification:', notification);

            // Handle test notifications immediately
            if (notification.test) {
                logger.info('Test cache invalidation notification received:', notification);
                return;
            }

            // Add to batch for efficient processing
            this.addToBatch(notification);

        } catch (error) {
            logger.error('Error processing cache invalidation notification:', error);
        }
    }

    /**
     * Add notification to batch for efficient processing
     */
    private addToBatch(notification: CacheInvalidationNotification): void {
        const batchKey = notification.batch_id || 'default';
        
        if (!this.batchBuffer.has(batchKey)) {
            this.batchBuffer.set(batchKey, []);
        }
        
        const batch = this.batchBuffer.get(batchKey)!;
        batch.push(notification);

        // Process batch if it reaches max size
        if (batch.length >= this.maxBatchSize) {
            this.processBatch(batchKey, batch);
            this.batchBuffer.delete(batchKey);
        } else {
            // Set timer to process batch after delay
            this.scheduleBatchProcessing();
        }
    }

    /**
     * Schedule batch processing with debouncing
     */
    private scheduleBatchProcessing(): void {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        this.batchTimer = setTimeout(() => {
            this.processBatchedNotifications();
        }, this.batchDelay);
    }

    /**
     * Process all batched notifications
     */
    private async processBatchedNotifications(): Promise<void> {
        if (this.batchBuffer.size === 0) {
            return;
        }

        const batches = Array.from(this.batchBuffer.entries());
        this.batchBuffer.clear();

        for (const [batchKey, notifications] of batches) {
            this.processBatch(batchKey, notifications);
        }
    }

    /**
     * Process a batch of notifications efficiently
     */
    private processBatch(batchKey: string, notifications: CacheInvalidationNotification[]): void {
        try {
            logger.debug(`Processing batch ${batchKey} with ${notifications.length} notifications`);

            // Group notifications by user_id for efficient cache invalidation
            const userGroups = new Map<string, CacheInvalidationNotification[]>();
            
            for (const notification of notifications) {
                if (!userGroups.has(notification.user_id)) {
                    userGroups.set(notification.user_id, []);
                }
                userGroups.get(notification.user_id)!.push(notification);
            }

            // Process each user's notifications together
            for (const [userId, userNotifications] of userGroups) {
                this.processUserNotifications(userId, userNotifications);
            }

            logger.debug(`Completed processing batch ${batchKey}`);
        } catch (error) {
            logger.error(`Error processing batch ${batchKey}:`, error);
        }
    }

    /**
     * Process notifications for a specific user efficiently
     */
    private processUserNotifications(userId: string, notifications: CacheInvalidationNotification[]): void {
        try {
            // Determine what types of cache invalidation are needed
            const invalidationNeeds = {
                dashboard: false,
                agents: false,
                calls: false,
                credits: false,
                cta: false, // US-2.1 - CTA metrics invalidation
                company: false, // US-2.1 - Company data invalidation
                specificAgents: new Set<string>()
            };

            // Analyze notifications to determine invalidation needs
            for (const notification of notifications) {
                switch (notification.table) {
                    case 'calls':
                    case 'lead_analytics':
                        invalidationNeeds.dashboard = true;
                        invalidationNeeds.calls = true;
                        // US-2.1 - Invalidate CTA and company caches for lead_analytics changes
                        if (notification.table === 'lead_analytics') {
                            invalidationNeeds.cta = true;
                            invalidationNeeds.company = true;
                        }
                        if (notification.agent_id) {
                            invalidationNeeds.specificAgents.add(notification.agent_id);
                        }
                        break;

                    case 'agents':
                        invalidationNeeds.dashboard = true;
                        invalidationNeeds.agents = true;
                        if (notification.record_id) {
                            invalidationNeeds.specificAgents.add(notification.record_id);
                        }
                        break;

                    case 'agent_analytics':
                        invalidationNeeds.dashboard = true;
                        if (notification.agent_id) {
                            invalidationNeeds.specificAgents.add(notification.agent_id);
                        }
                        break;

                    case 'users':
                    case 'credit_transactions':
                        invalidationNeeds.dashboard = true;
                        invalidationNeeds.credits = true;
                        break;
                }
            }

            // Perform efficient cache invalidation based on needs
            if (invalidationNeeds.dashboard) {
                dashboardCacheService.invalidateDashboardCache(userId);
            }

            if (invalidationNeeds.agents) {
                CacheInvalidationService.invalidateUserAgents(userId);
            }

            if (invalidationNeeds.calls) {
                CacheInvalidationService.invalidateCallData(userId);
            }

            if (invalidationNeeds.credits) {
                CacheInvalidationService.invalidateUserCredits(userId);
            }

            // US-2.1 - Invalidate CTA and company caches if needed
            if (invalidationNeeds.cta) {
                dashboardCacheService.invalidateCTACache(userId);
            }

            if (invalidationNeeds.company) {
                dashboardCacheService.invalidateCompanyCache(userId);
            }

            // Invalidate specific agents if needed
            for (const agentId of invalidationNeeds.specificAgents) {
                CacheInvalidationService.invalidateAgent(userId, agentId);
            }

            logger.debug(`Processed ${notifications.length} notifications for user ${userId}`, {
                invalidationNeeds: {
                    dashboard: invalidationNeeds.dashboard,
                    agents: invalidationNeeds.agents,
                    calls: invalidationNeeds.calls,
                    credits: invalidationNeeds.credits,
                    cta: invalidationNeeds.cta,
                    company: invalidationNeeds.company,
                    specificAgents: invalidationNeeds.specificAgents.size
                }
            });

        } catch (error) {
            logger.error(`Error processing notifications for user ${userId}:`, error);
        }
    }

    /**
     * Legacy method - kept for backward compatibility
     * New batched processing is handled by processUserNotifications
     */
    private processCacheInvalidation(notification: CacheInvalidationNotification): void {
        // Process single notification (fallback for non-batched notifications)
        this.processUserNotifications(notification.user_id, [notification]);
    }

    /**
     * Handle database connection errors
     */
    private handleError(error: Error): void {
        logger.error('Database notification listener error:', error);

        // Attempt to reconnect on error
        this.handleReconnect();
    }

    /**
     * Handle connection end
     */
    private handleConnectionEnd(): void {
        logger.warn('Database notification listener connection ended');
        this.isListening = false;

        // Attempt to reconnect
        this.handleReconnect();
    }

    /**
     * Handle reconnection logic
     */
    private async handleReconnect(): Promise<void> {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping listener.`);
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

        logger.info(`Attempting to reconnect database notification listener (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

        setTimeout(async () => {
            try {
                // Clean up existing connection
                if (this.client) {
                    try {
                        await this.client.end();
                    } catch (error) {
                        // Ignore cleanup errors
                    }
                    this.client = null;
                }

                this.isListening = false;

                // Restart listening
                await this.startListening();

            } catch (error) {
                logger.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
                // Will try again due to error handler
            }
        }, delay);
    }

    /**
     * Get listener status
     */
    getStatus(): { 
        isListening: boolean; 
        reconnectAttempts: number;
        batchBufferSize: number;
        hasPendingBatch: boolean;
    } {
        return {
            isListening: this.isListening,
            reconnectAttempts: this.reconnectAttempts,
            batchBufferSize: this.batchBuffer.size,
            hasPendingBatch: this.batchTimer !== null
        };
    }

    /**
     * Reset reconnection attempts (for manual recovery)
     */
    resetReconnectAttempts(): void {
        this.reconnectAttempts = 0;
        logger.info('Database notification listener reconnect attempts reset');
    }
}

// Export singleton instance
export const databaseNotificationListener = new DatabaseNotificationListener();