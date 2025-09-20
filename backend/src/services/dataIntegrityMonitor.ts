import { pool } from '../config/database';

export interface DataIntegrityMetrics {
  crossAgentContamination: number;
  orphanedRecords: number;
  triggerFailures: number;
  performanceIssues: number;
  lastChecked: Date;
}

export interface ContaminationResult {
  call_user_id: string;
  agent_user_id: string;
  mismatched_calls: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface OrphanedRecord {
  table_name: string;
  record_id: string;
  orphan_type: string;
  created_at: Date;
}

export interface TriggerFailure {
  trigger_name: string;
  table_name: string;
  error_message: string;
  failure_count: number;
  last_failure: Date;
}

export class DataIntegrityMonitor {
  constructor() {
    // Use the imported pool directly
  }

  /**
   * Detect cross-agent data contamination
   * This is the most critical check - ensures no user can see other users' data
   */
  async detectCrossAgentContamination(): Promise<ContaminationResult[]> {
    const query = `
      SELECT 
        c.user_id as call_user_id,
        a.user_id as agent_user_id,
        COUNT(*) as mismatched_calls,
        CASE 
          WHEN COUNT(*) > 100 THEN 'critical'
          WHEN COUNT(*) > 50 THEN 'high'
          WHEN COUNT(*) > 10 THEN 'medium'
          ELSE 'low'
        END as severity
      FROM calls c
      JOIN agents a ON c.agent_id = a.id
      WHERE c.user_id != a.user_id
      GROUP BY c.user_id, a.user_id
      ORDER BY mismatched_calls DESC;
    `;

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error detecting cross-agent contamination:', error);
      throw new Error(`Cross-agent contamination check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check for analytics data contamination
   * Ensures analytics queries are properly scoped to user_id
   */
  async detectAnalyticsContamination(): Promise<any[]> {
    const query = `
      SELECT 
        'lead_analytics' as table_name,
        la.user_id as analytics_user_id,
        c.user_id as call_user_id,
        COUNT(*) as contaminated_records
      FROM lead_analytics la
      JOIN calls c ON la.call_id = c.id
      WHERE la.user_id != c.user_id
      GROUP BY la.user_id, c.user_id
      
      UNION ALL
      
      SELECT 
        'agent_analytics' as table_name,
        aa.user_id as analytics_user_id,
        a.user_id as agent_user_id,
        COUNT(*) as contaminated_records
      FROM agent_analytics aa
      JOIN agents a ON aa.agent_id = a.id
      WHERE aa.user_id != a.user_id
      GROUP BY aa.user_id, a.user_id;
    `;

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error detecting analytics contamination:', error);
      throw new Error(`Analytics contamination check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find orphaned records that violate referential integrity
   */
  async detectOrphanedRecords(): Promise<OrphanedRecord[]> {
    const queries = [
      {
        name: 'calls_without_agents',
        query: `
          SELECT 
            'calls' as table_name,
            c.id::text as record_id,
            'missing_agent' as orphan_type,
            c.created_at
          FROM calls c
          LEFT JOIN agents a ON c.agent_id = a.id
          WHERE a.id IS NULL;
        `
      },
      {
        name: 'calls_without_users',
        query: `
          SELECT 
            'calls' as table_name,
            c.id::text as record_id,
            'missing_user' as orphan_type,
            c.created_at
          FROM calls c
          LEFT JOIN users u ON c.user_id = u.id
          WHERE u.id IS NULL;
        `
      },
      {
        name: 'analytics_without_calls',
        query: `
          SELECT 
            'lead_analytics' as table_name,
            la.id::text as record_id,
            'missing_call' as orphan_type,
            la.created_at
          FROM lead_analytics la
          LEFT JOIN calls c ON la.call_id = c.id
          WHERE c.id IS NULL;
        `
      },
      {
        name: 'agent_analytics_without_agents',
        query: `
          SELECT 
            'agent_analytics' as table_name,
            aa.id::text as record_id,
            'missing_agent' as orphan_type,
            aa.created_at
          FROM agent_analytics aa
          LEFT JOIN agents a ON aa.agent_id = a.id
          WHERE a.id IS NULL;
        `
      }
    ];

    const allOrphans: OrphanedRecord[] = [];

    for (const queryDef of queries) {
      try {
        const result = await pool.query(queryDef.query);
        allOrphans.push(...result.rows);
      } catch (error) {
        console.error(`Error in orphaned records check (${queryDef.name}):`, error);
      }
    }

    return allOrphans;
  }

  /**
   * Check trigger execution health and failures
   */
  async checkTriggerHealth(): Promise<TriggerFailure[]> {
    // First, check if trigger logging table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trigger_execution_log'
      );
    `;

    try {
      const tableExists = await pool.query(checkTableQuery);
      
      if (!tableExists.rows[0].exists) {
        // Create the trigger logging table if it doesn't exist
        await this.createTriggerLoggingTable();
        return []; // No failures to report yet
      }

      const query = `
        SELECT 
          trigger_name,
          table_name,
          error_message,
          COUNT(*) as failure_count,
          MAX(created_at) as last_failure
        FROM trigger_execution_log
        WHERE status = 'error'
          AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY trigger_name, table_name, error_message
        ORDER BY failure_count DESC, last_failure DESC;
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error checking trigger health:', error);
      return [];
    }
  }

  /**
   * Monitor query performance for analytics endpoints
   */
  async checkQueryPerformance(): Promise<any[]> {
    const query = `
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        max_time,
        stddev_time
      FROM pg_stat_statements 
      WHERE query LIKE '%calls%' 
        OR query LIKE '%analytics%'
        OR query LIKE '%agents%'
      ORDER BY mean_time DESC
      LIMIT 20;
    `;

    try {
      const result = await pool.query(query);
      return result.rows.map((row: any) => ({
        ...row,
        performance_issue: row.mean_time > 2000, // Flag queries over 2 seconds
        severity: row.mean_time > 5000 ? 'high' : row.mean_time > 2000 ? 'medium' : 'low'
      }));
    } catch (error) {
      // pg_stat_statements might not be enabled
      console.warn('pg_stat_statements not available for performance monitoring');
      return [];
    }
  }

  /**
   * Get comprehensive data integrity metrics
   */
  async getDataIntegrityMetrics(): Promise<DataIntegrityMetrics> {
    try {
      const [
        contamination,
        orphaned,
        triggerFailures,
        performanceIssues
      ] = await Promise.all([
        this.detectCrossAgentContamination(),
        this.detectOrphanedRecords(),
        this.checkTriggerHealth(),
        this.checkQueryPerformance()
      ]);

      return {
        crossAgentContamination: contamination.length,
        orphanedRecords: orphaned.length,
        triggerFailures: triggerFailures.length,
        performanceIssues: performanceIssues.filter(p => p.performance_issue).length,
        lastChecked: new Date()
      };
    } catch (error) {
      console.error('Error getting data integrity metrics:', error);
      throw new Error(`Failed to get data integrity metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create trigger logging table for monitoring trigger health
   */
  private async createTriggerLoggingTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS trigger_execution_log (
        id SERIAL PRIMARY KEY,
        trigger_name VARCHAR(255) NOT NULL,
        table_name VARCHAR(255) NOT NULL,
        operation VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'success',
        error_message TEXT,
        execution_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_trigger_log_status_time 
      ON trigger_execution_log(status, created_at);
      
      CREATE INDEX IF NOT EXISTS idx_trigger_log_trigger_name 
      ON trigger_execution_log(trigger_name);
    `;

    await pool.query(createTableQuery);
  }

  /**
   * Log trigger execution for monitoring
   */
  async logTriggerExecution(
    triggerName: string,
    status: 'success' | 'error',
    errorMessage?: string,
    executionTimeMs?: number
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO trigger_execution_log (trigger_name, table_name, operation, status, error_message, execution_time_ms)
        VALUES ($1, 'unknown', 'unknown', $2, $3, $4)
      `, [triggerName, status, errorMessage, executionTimeMs]);
    } catch (error) {
      console.error('Error logging trigger execution:', error);
    }
  }

  /**
   * Check for performance degradation
   */
  async checkPerformanceDegradation(): Promise<boolean> {
    try {
      const performanceIssues = await this.checkQueryPerformance();
      const criticalIssues = performanceIssues.filter(p => p.severity === 'high');
      return criticalIssues.length > 0;
    } catch (error) {
      console.error('Error checking performance degradation:', error);
      return false;
    }
  }

  /**
   * Validate user data isolation
   */
  async validateUserDataIsolation(userId: string): Promise<{
    isIsolated: boolean;
    violations: string[];
  }> {
    try {
      const violations: string[] = [];

      // Check for cross-agent contamination for this user
      const contamination = await this.detectCrossAgentContamination();
      const userContamination = contamination.filter(c => 
        c.call_user_id === userId || c.agent_user_id === userId
      );

      if (userContamination.length > 0) {
        violations.push(`Cross-agent contamination: ${userContamination.length} violations`);
      }

      // Check for analytics contamination
      const analyticsContamination = await this.detectAnalyticsContamination();
      const userAnalyticsContamination = analyticsContamination.filter((c: any) => 
        c.analytics_user_id === userId || c.call_user_id === userId || c.agent_user_id === userId
      );

      if (userAnalyticsContamination.length > 0) {
        violations.push(`Analytics contamination: ${userAnalyticsContamination.length} violations`);
      }

      return {
        isIsolated: violations.length === 0,
        violations
      };
    } catch (error) {
      console.error('Error validating user data isolation:', error);
      return {
        isIsolated: false,
        violations: ['Error during validation']
      };
    }
  }

  /**
   * Run all data integrity checks and return summary
   */
  async runFullIntegrityCheck(): Promise<{
    summary: DataIntegrityMetrics;
    details: {
      contamination: ContaminationResult[];
      analyticsContamination: any[];
      orphanedRecords: OrphanedRecord[];
      triggerFailures: TriggerFailure[];
      performanceIssues: any[];
    };
  }> {
    const [
      contamination,
      analyticsContamination,
      orphanedRecords,
      triggerFailures,
      performanceIssues,
      summary
    ] = await Promise.all([
      this.detectCrossAgentContamination(),
      this.detectAnalyticsContamination(),
      this.detectOrphanedRecords(),
      this.checkTriggerHealth(),
      this.checkQueryPerformance(),
      this.getDataIntegrityMetrics()
    ]);

    return {
      summary,
      details: {
        contamination,
        analyticsContamination,
        orphanedRecords,
        triggerFailures,
        performanceIssues: performanceIssues.filter(p => p.performance_issue)
      }
    };
  }
}

export const dataIntegrityMonitor = new DataIntegrityMonitor();