import { dataIntegrityMonitor, ContaminationResult, TriggerFailure } from './dataIntegrityMonitor';

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  enabled: boolean;
}

export interface Alert {
  id: string;
  rule_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  created_at: Date;
  resolved_at?: Date;
  status: 'active' | 'resolved' | 'acknowledged';
}

export class DataIntegrityAlerts {
  private alertRules: AlertRule[] = [
    {
      id: 'cross-agent-contamination',
      name: 'Cross-Agent Data Contamination',
      condition: (metrics) => metrics.crossAgentContamination > 0,
      severity: 'critical',
      message: 'Cross-agent data contamination detected! Users may be seeing other users\' data.',
      enabled: true
    },
    {
      id: 'analytics-contamination',
      name: 'Analytics Data Contamination',
      condition: (details) => details.analyticsContamination && details.analyticsContamination.length > 0,
      severity: 'high',
      message: 'Analytics data contamination detected in lead_analytics or agent_analytics tables.',
      enabled: true
    },
    {
      id: 'high-orphaned-records',
      name: 'High Number of Orphaned Records',
      condition: (metrics) => metrics.orphanedRecords > 100,
      severity: 'medium',
      message: 'High number of orphaned records detected, indicating referential integrity issues.',
      enabled: true
    },
    {
      id: 'trigger-failures',
      name: 'Database Trigger Failures',
      condition: (metrics) => metrics.triggerFailures > 0,
      severity: 'high',
      message: 'Database triggers are failing, which may cause data inconsistencies.',
      enabled: true
    },
    {
      id: 'performance-degradation',
      name: 'Query Performance Degradation',
      condition: (metrics) => metrics.performanceIssues > 5,
      severity: 'medium',
      message: 'Multiple analytics queries are performing poorly (>2 seconds).',
      enabled: true
    },
    {
      id: 'critical-performance',
      name: 'Critical Performance Issues',
      condition: (details) => {
        if (!details.performanceIssues) return false;
        return details.performanceIssues.some((issue: any) => issue.severity === 'high');
      },
      severity: 'high',
      message: 'Critical query performance issues detected (>5 seconds).',
      enabled: true
    }
  ];

  private activeAlerts: Map<string, Alert> = new Map();

  /**
   * Check all alert rules against current metrics
   */
  async checkAlerts(): Promise<Alert[]> {
    try {
      const integrityCheck = await dataIntegrityMonitor.runFullIntegrityCheck();
      const { summary, details } = integrityCheck;

      const newAlerts: Alert[] = [];

      for (const rule of this.alertRules) {
        if (!rule.enabled) continue;

        const isTriggered = rule.condition(rule.id.includes('contamination') || rule.id.includes('performance') ? details : summary);

        if (isTriggered) {
          const alertId = `${rule.id}-${Date.now()}`;
          const alert: Alert = {
            id: alertId,
            rule_id: rule.id,
            severity: rule.severity,
            message: rule.message,
            details: this.getAlertDetails(rule.id, details, summary),
            created_at: new Date(),
            status: 'active'
          };

          newAlerts.push(alert);
          this.activeAlerts.set(alertId, alert);

          // Log the alert
          console.error(`[DATA INTEGRITY ALERT] ${rule.severity.toUpperCase()}: ${rule.message}`, {
            alertId,
            ruleId: rule.id,
            details: alert.details
          });

          // Send notification (in a real system, this would integrate with email/Slack/etc.)
          await this.sendNotification(alert);
        }
      }

      return newAlerts;
    } catch (error) {
      console.error('Error checking data integrity alerts:', error);
      return [];
    }
  }

  /**
   * Get detailed information for specific alert types
   */
  private getAlertDetails(ruleId: string, details: any, summary: any): any {
    switch (ruleId) {
      case 'cross-agent-contamination':
        return {
          contaminatedRecords: details.contamination,
          totalContamination: summary.crossAgentContamination,
          affectedUsers: details.contamination.map((c: ContaminationResult) => ({
            callUserId: c.call_user_id,
            agentUserId: c.agent_user_id,
            mismatchedCalls: c.mismatched_calls,
            severity: c.severity
          }))
        };

      case 'analytics-contamination':
        return {
          contaminatedTables: details.analyticsContamination,
          totalRecords: details.analyticsContamination.length
        };

      case 'high-orphaned-records':
        return {
          orphanedRecords: details.orphanedRecords.slice(0, 10), // First 10 for brevity
          totalOrphaned: summary.orphanedRecords,
          byType: this.groupOrphanedByType(details.orphanedRecords)
        };

      case 'trigger-failures':
        return {
          failedTriggers: details.triggerFailures,
          totalFailures: summary.triggerFailures
        };

      case 'performance-degradation':
      case 'critical-performance':
        return {
          slowQueries: details.performanceIssues,
          totalSlowQueries: summary.performanceIssues,
          worstPerformers: details.performanceIssues
            .sort((a: any, b: any) => b.mean_time - a.mean_time)
            .slice(0, 5)
        };

      default:
        return { summary, details };
    }
  }

  /**
   * Group orphaned records by type for better reporting
   */
  private groupOrphanedByType(orphanedRecords: any[]): Record<string, number> {
    return orphanedRecords.reduce((acc, record) => {
      const key = `${record.table_name}_${record.orphan_type}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Send notification for alert (placeholder for real notification system)
   */
  private async sendNotification(alert: Alert): Promise<void> {
    // In a real system, this would integrate with:
    // - Email notifications
    // - Slack/Teams webhooks
    // - PagerDuty/OpsGenie
    // - SMS alerts for critical issues

    const notification = {
      timestamp: alert.created_at.toISOString(),
      severity: alert.severity,
      message: alert.message,
      alertId: alert.id,
      ruleId: alert.rule_id,
      details: alert.details
    };

    // For now, just log the notification
    console.log('[NOTIFICATION]', JSON.stringify(notification, null, 2));

    // Store notification in database for dashboard display
    await this.storeNotification(notification);
  }

  /**
   * Store notification in database for dashboard display
   */
  private async storeNotification(notification: any): Promise<void> {
    // This would store in a notifications table for the dashboard to display
    // For now, we'll just log it
    console.log('Storing notification for dashboard:', notification.alertId);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.status === 'active');
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolved_at = new Date();
      return true;
    }
    return false;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      return true;
    }
    return false;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    active: number;
    resolved: number;
    acknowledged: number;
    bySeverity: Record<string, number>;
  } {
    const alerts = Array.from(this.activeAlerts.values());
    
    return {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      bySeverity: alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Run continuous monitoring (would be called by a scheduler)
   */
  async startContinuousMonitoring(intervalMinutes: number = 5): Promise<void> {
    console.log(`Starting continuous data integrity monitoring (every ${intervalMinutes} minutes)`);
    
    const runCheck = async () => {
      try {
        const alerts = await this.checkAlerts();
        if (alerts.length > 0) {
          console.log(`Generated ${alerts.length} new data integrity alerts`);
        }
      } catch (error) {
        console.error('Error in continuous monitoring:', error);
      }
    };

    // Run initial check
    await runCheck();

    // Schedule recurring checks
    setInterval(runCheck, intervalMinutes * 60 * 1000);
  }
}

export const dataIntegrityAlerts = new DataIntegrityAlerts();