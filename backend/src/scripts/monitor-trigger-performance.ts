#!/usr/bin/env ts-node

/**
 * Production monitoring script for trigger performance
 * Provides real-time monitoring and alerting for database trigger performance
 */

import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

interface TriggerMetrics {
  trigger_name: string;
  table_name: string;
  operation: string;
  avg_execution_time_ms: number;
  max_execution_time_ms: number;
  execution_count: number;
  error_count: number;
  error_rate: number;
  last_execution: Date;
}

interface PerformanceAlert {
  type: 'SLOW_TRIGGER' | 'HIGH_ERROR_RATE' | 'TRIGGER_FAILURE';
  trigger_name: string;
  table_name: string;
  operation: string;
  metric_value: number;
  threshold: number;
  message: string;
  severity: 'WARNING' | 'CRITICAL';
}

class TriggerPerformanceMonitor {
  private pool: Pool;
  private readonly SLOW_TRIGGER_THRESHOLD_MS = 100;
  private readonly ERROR_RATE_THRESHOLD_PCT = 5.0;
  private readonly CRITICAL_SLOW_THRESHOLD_MS = 500;
  private readonly CRITICAL_ERROR_RATE_PCT = 15.0;

  constructor() {
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL || '',
      ssl: { rejectUnauthorized: false },
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };
    
    this.pool = new Pool(config);
  }

  async startMonitoring(intervalMinutes: number = 5): Promise<void> {
    console.log(`🔍 Starting trigger performance monitoring (checking every ${intervalMinutes} minutes)...`);
    
    // Initial check
    await this.performHealthCheck();
    
    // Set up periodic monitoring
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Error during monitoring check:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  async performHealthCheck(): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`\n📊 Trigger Performance Health Check - ${timestamp}`);
    
    try {
      // Get current performance metrics
      const metrics = await this.getCurrentMetrics();
      
      // Check for performance issues
      const alerts = await this.checkPerformanceAlerts(metrics);
      
      // Display current status
      this.displayMetricsSummary(metrics);
      
      // Handle alerts
      if (alerts.length > 0) {
        this.handleAlerts(alerts);
      } else {
        console.log('✅ All triggers performing within acceptable limits');
      }
      
      // Run automatic performance alert check
      await this.runAutomaticAlertCheck();
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
    }
  }

  private async getCurrentMetrics(): Promise<TriggerMetrics[]> {
    const result = await this.pool.query(`
      SELECT 
        trigger_name,
        table_name,
        operation,
        avg_execution_time_ms,
        max_execution_time_ms,
        execution_count,
        error_count,
        CASE 
          WHEN execution_count > 0 
          THEN ROUND((error_count::DECIMAL / execution_count * 100), 2)
          ELSE 0 
        END as error_rate,
        last_execution
      FROM trigger_performance_metrics
      WHERE date_bucket = CURRENT_DATE
        AND execution_count > 0
      ORDER BY avg_execution_time_ms DESC;
    `);

    return result.rows;
  }

  private async checkPerformanceAlerts(metrics: TriggerMetrics[]): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];

    for (const metric of metrics) {
      // Check for slow triggers
      if (metric.avg_execution_time_ms > this.CRITICAL_SLOW_THRESHOLD_MS) {
        alerts.push({
          type: 'SLOW_TRIGGER',
          trigger_name: metric.trigger_name,
          table_name: metric.table_name,
          operation: metric.operation,
          metric_value: metric.avg_execution_time_ms,
          threshold: this.CRITICAL_SLOW_THRESHOLD_MS,
          message: `Critical: Trigger ${metric.trigger_name} averaging ${metric.avg_execution_time_ms}ms (threshold: ${this.CRITICAL_SLOW_THRESHOLD_MS}ms)`,
          severity: 'CRITICAL'
        });
      } else if (metric.avg_execution_time_ms > this.SLOW_TRIGGER_THRESHOLD_MS) {
        alerts.push({
          type: 'SLOW_TRIGGER',
          trigger_name: metric.trigger_name,
          table_name: metric.table_name,
          operation: metric.operation,
          metric_value: metric.avg_execution_time_ms,
          threshold: this.SLOW_TRIGGER_THRESHOLD_MS,
          message: `Warning: Trigger ${metric.trigger_name} averaging ${metric.avg_execution_time_ms}ms (threshold: ${this.SLOW_TRIGGER_THRESHOLD_MS}ms)`,
          severity: 'WARNING'
        });
      }

      // Check for high error rates
      if (metric.error_rate > this.CRITICAL_ERROR_RATE_PCT) {
        alerts.push({
          type: 'HIGH_ERROR_RATE',
          trigger_name: metric.trigger_name,
          table_name: metric.table_name,
          operation: metric.operation,
          metric_value: metric.error_rate,
          threshold: this.CRITICAL_ERROR_RATE_PCT,
          message: `Critical: Trigger ${metric.trigger_name} has ${metric.error_rate}% error rate (threshold: ${this.CRITICAL_ERROR_RATE_PCT}%)`,
          severity: 'CRITICAL'
        });
      } else if (metric.error_rate > this.ERROR_RATE_THRESHOLD_PCT) {
        alerts.push({
          type: 'HIGH_ERROR_RATE',
          trigger_name: metric.trigger_name,
          table_name: metric.table_name,
          operation: metric.operation,
          metric_value: metric.error_rate,
          threshold: this.ERROR_RATE_THRESHOLD_PCT,
          message: `Warning: Trigger ${metric.trigger_name} has ${metric.error_rate}% error rate (threshold: ${this.ERROR_RATE_THRESHOLD_PCT}%)`,
          severity: 'WARNING'
        });
      }
    }

    return alerts;
  }

  private displayMetricsSummary(metrics: TriggerMetrics[]): void {
    if (metrics.length === 0) {
      console.log('📊 No trigger metrics available for today');
      return;
    }

    console.log('\n📈 Current Trigger Performance Metrics:');
    console.log('┌─────────────────────────────────────┬──────────┬───────────┬─────────┬───────────┬────────────┐');
    console.log('│ Trigger Name                        │ Table    │ Operation │ Avg(ms) │ Max(ms)   │ Error Rate │');
    console.log('├─────────────────────────────────────┼──────────┼───────────┼─────────┼───────────┼────────────┤');

    for (const metric of metrics.slice(0, 10)) { // Show top 10
      const triggerName = metric.trigger_name.substring(0, 35).padEnd(35);
      const tableName = metric.table_name.substring(0, 8).padEnd(8);
      const operation = metric.operation.padEnd(9);
      const avgTime = metric.avg_execution_time_ms.toFixed(1).padStart(7);
      const maxTime = metric.max_execution_time_ms.toString().padStart(9);
      const errorRate = `${metric.error_rate}%`.padStart(10);

      // Color coding based on performance
      let rowColor = '';
      if (metric.avg_execution_time_ms > this.CRITICAL_SLOW_THRESHOLD_MS || metric.error_rate > this.CRITICAL_ERROR_RATE_PCT) {
        rowColor = '🔴'; // Critical
      } else if (metric.avg_execution_time_ms > this.SLOW_TRIGGER_THRESHOLD_MS || metric.error_rate > this.ERROR_RATE_THRESHOLD_PCT) {
        rowColor = '🟡'; // Warning
      } else {
        rowColor = '🟢'; // Good
      }

      console.log(`│ ${triggerName} │ ${tableName} │ ${operation} │ ${avgTime} │ ${maxTime} │ ${errorRate} │ ${rowColor}`);
    }

    console.log('└─────────────────────────────────────┴──────────┴───────────┴─────────┴───────────┴────────────┘');

    if (metrics.length > 10) {
      console.log(`... and ${metrics.length - 10} more triggers`);
    }
  }

  private handleAlerts(alerts: PerformanceAlert[]): void {
    console.log(`\n🚨 Found ${alerts.length} performance alerts:`);

    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
    const warningAlerts = alerts.filter(a => a.severity === 'WARNING');

    if (criticalAlerts.length > 0) {
      console.log('\n🔴 CRITICAL ALERTS:');
      criticalAlerts.forEach(alert => {
        console.log(`   ${alert.message}`);
      });
    }

    if (warningAlerts.length > 0) {
      console.log('\n🟡 WARNING ALERTS:');
      warningAlerts.forEach(alert => {
        console.log(`   ${alert.message}`);
      });
    }

    // Log alerts to database for persistence
    this.logAlertsToDatabase(alerts);
  }

  private async logAlertsToDatabase(alerts: PerformanceAlert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        await this.pool.query(`
          INSERT INTO trigger_execution_log (
            trigger_name, table_name, operation, execution_status,
            error_message, execution_time_ms
          ) VALUES ($1, $2, $3, $4, $5, $6);
        `, [
          alert.trigger_name,
          alert.table_name,
          alert.operation,
          alert.severity === 'CRITICAL' ? 'CRITICAL_ALERT' : 'WARNING_ALERT',
          alert.message,
          Math.round(alert.metric_value)
        ]);
      } catch (error) {
        console.error('Failed to log alert to database:', error);
      }
    }
  }

  private async runAutomaticAlertCheck(): Promise<void> {
    try {
      await this.pool.query(`SELECT check_trigger_performance_alerts();`);
    } catch (error) {
      console.error('Failed to run automatic alert check:', error);
    }
  }

  async generatePerformanceReport(): Promise<void> {
    console.log('\n📋 Generating Trigger Performance Report...\n');

    try {
      // Get overall statistics
      const overallStats = await this.pool.query(`
        SELECT 
          COUNT(DISTINCT trigger_name) as total_triggers,
          AVG(avg_execution_time_ms) as overall_avg_time,
          MAX(max_execution_time_ms) as overall_max_time,
          SUM(execution_count) as total_executions,
          SUM(error_count) as total_errors,
          CASE 
            WHEN SUM(execution_count) > 0 
            THEN ROUND((SUM(error_count)::DECIMAL / SUM(execution_count) * 100), 2)
            ELSE 0 
          END as overall_error_rate
        FROM trigger_performance_metrics
        WHERE date_bucket = CURRENT_DATE;
      `);

      const stats = overallStats.rows[0];

      console.log('📊 Overall Performance Statistics (Today):');
      console.log(`   Total Triggers: ${stats.total_triggers}`);
      console.log(`   Total Executions: ${stats.total_executions}`);
      console.log(`   Average Execution Time: ${parseFloat(stats.overall_avg_time || 0).toFixed(2)}ms`);
      console.log(`   Maximum Execution Time: ${stats.overall_max_time}ms`);
      console.log(`   Total Errors: ${stats.total_errors}`);
      console.log(`   Overall Error Rate: ${stats.overall_error_rate}%`);

      // Get top slowest triggers
      const slowestTriggers = await this.pool.query(`
        SELECT trigger_name, table_name, operation, avg_execution_time_ms, execution_count
        FROM trigger_performance_metrics
        WHERE date_bucket = CURRENT_DATE
          AND execution_count >= 5
        ORDER BY avg_execution_time_ms DESC
        LIMIT 5;
      `);

      if (slowestTriggers.rows.length > 0) {
        console.log('\n🐌 Top 5 Slowest Triggers:');
        slowestTriggers.rows.forEach((trigger, index) => {
          console.log(`   ${index + 1}. ${trigger.trigger_name} (${trigger.table_name}.${trigger.operation}): ${trigger.avg_execution_time_ms}ms avg (${trigger.execution_count} executions)`);
        });
      }

      // Get triggers with errors
      const errorTriggers = await this.pool.query(`
        SELECT trigger_name, table_name, operation, error_count, execution_count,
               ROUND((error_count::DECIMAL / execution_count * 100), 2) as error_rate
        FROM trigger_performance_metrics
        WHERE date_bucket = CURRENT_DATE
          AND error_count > 0
        ORDER BY error_rate DESC;
      `);

      if (errorTriggers.rows.length > 0) {
        console.log('\n❌ Triggers with Errors:');
        errorTriggers.rows.forEach((trigger, index) => {
          console.log(`   ${index + 1}. ${trigger.trigger_name} (${trigger.table_name}.${trigger.operation}): ${trigger.error_rate}% error rate (${trigger.error_count}/${trigger.execution_count})`);
        });
      }

      // Get recent alerts
      const recentAlerts = await this.pool.query(`
        SELECT trigger_name, table_name, operation, execution_status, error_message, created_at
        FROM trigger_execution_log
        WHERE execution_status IN ('PERFORMANCE_ALERT', 'ERROR_RATE_ALERT', 'CRITICAL_ALERT', 'WARNING_ALERT')
          AND created_at >= CURRENT_DATE
        ORDER BY created_at DESC
        LIMIT 10;
      `);

      if (recentAlerts.rows.length > 0) {
        console.log('\n🚨 Recent Alerts (Today):');
        recentAlerts.rows.forEach((alert, index) => {
          const time = new Date(alert.created_at).toLocaleTimeString();
          console.log(`   ${index + 1}. [${time}] ${alert.execution_status}: ${alert.error_message}`);
        });
      }

    } catch (error) {
      console.error('❌ Failed to generate performance report:', error);
    }
  }

  async cleanup(): Promise<void> {
    await this.pool.end();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'monitor';

  const monitor = new TriggerPerformanceMonitor();

  try {
    switch (command) {
      case 'monitor':
        const interval = parseInt(args[1]) || 5;
        await monitor.startMonitoring(interval);
        break;

      case 'check':
        await monitor.performHealthCheck();
        await monitor.cleanup();
        break;

      case 'report':
        await monitor.generatePerformanceReport();
        await monitor.cleanup();
        break;

      default:
        console.log('Usage:');
        console.log('  npm run monitor-triggers monitor [interval_minutes]  - Start continuous monitoring');
        console.log('  npm run monitor-triggers check                       - Perform single health check');
        console.log('  npm run monitor-triggers report                      - Generate performance report');
        await monitor.cleanup();
        break;
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    await monitor.cleanup();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { TriggerPerformanceMonitor };