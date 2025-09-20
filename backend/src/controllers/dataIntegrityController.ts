import { Request, Response } from 'express';
import { dataIntegrityMonitor } from '../services/dataIntegrityMonitor';
import { dataIntegrityAlerts } from '../services/dataIntegrityAlerts';

export class DataIntegrityController {
  /**
   * Get comprehensive data integrity metrics
   */
  async getIntegrityMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await dataIntegrityMonitor.getDataIntegrityMetrics();
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting integrity metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get data integrity metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Run full integrity check with detailed results
   */
  async runFullIntegrityCheck(req: Request, res: Response): Promise<void> {
    try {
      const result = await dataIntegrityMonitor.runFullIntegrityCheck();
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error running full integrity check:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run integrity check',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check for cross-agent data contamination
   */
  async checkCrossAgentContamination(req: Request, res: Response): Promise<void> {
    try {
      const contamination = await dataIntegrityMonitor.detectCrossAgentContamination();
      
      const response = {
        success: true,
        data: {
          contamination,
          count: contamination.length,
          hasCriticalIssues: contamination.some(c => c.severity === 'critical'),
          hasAnyIssues: contamination.length > 0
        },
        timestamp: new Date().toISOString()
      };

      // If contamination is found, this is a critical issue
      if (contamination.length > 0) {
        console.error('CRITICAL: Cross-agent data contamination detected!', contamination);
        response.success = false;
      }

      res.json(response);
    } catch (error) {
      console.error('Error checking cross-agent contamination:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check cross-agent contamination',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check for analytics data contamination
   */
  async checkAnalyticsContamination(req: Request, res: Response): Promise<void> {
    try {
      const contamination = await dataIntegrityMonitor.detectAnalyticsContamination();
      
      res.json({
        success: true,
        data: {
          contamination,
          count: contamination.length,
          hasIssues: contamination.length > 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking analytics contamination:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check analytics contamination',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check for orphaned records
   */
  async checkOrphanedRecords(req: Request, res: Response): Promise<void> {
    try {
      const orphanedRecords = await dataIntegrityMonitor.detectOrphanedRecords();
      
      res.json({
        success: true,
        data: {
          orphanedRecords,
          count: orphanedRecords.length,
          byType: this.groupByType(orphanedRecords)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking orphaned records:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check orphaned records',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check trigger health
   */
  async checkTriggerHealth(req: Request, res: Response): Promise<void> {
    try {
      const triggerFailures = await dataIntegrityMonitor.checkTriggerHealth();
      
      res.json({
        success: true,
        data: {
          triggerFailures,
          count: triggerFailures.length,
          hasFailures: triggerFailures.length > 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking trigger health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check trigger health',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check query performance
   */
  async checkQueryPerformance(req: Request, res: Response): Promise<void> {
    try {
      const performanceIssues = await dataIntegrityMonitor.checkQueryPerformance();
      
      res.json({
        success: true,
        data: {
          performanceIssues,
          count: performanceIssues.length,
          slowQueries: performanceIssues.filter(p => p.performance_issue),
          criticalQueries: performanceIssues.filter(p => p.severity === 'high')
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error checking query performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check query performance',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(req: Request, res: Response): Promise<void> {
    try {
      const activeAlerts = dataIntegrityAlerts.getActiveAlerts();
      const alertStats = dataIntegrityAlerts.getAlertStats();
      
      res.json({
        success: true,
        data: {
          alerts: activeAlerts,
          stats: alertStats
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting active alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get active alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Run alert checks manually
   */
  async runAlertChecks(req: Request, res: Response): Promise<void> {
    try {
      const newAlerts = await dataIntegrityAlerts.checkAlerts();
      
      res.json({
        success: true,
        data: {
          newAlerts,
          count: newAlerts.length,
          message: newAlerts.length > 0 
            ? `Generated ${newAlerts.length} new alerts` 
            : 'No new alerts generated'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error running alert checks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run alert checks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const success = dataIntegrityAlerts.acknowledgeAlert(alertId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Alert acknowledged successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const success = dataIntegrityAlerts.resolveAlert(alertId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Alert resolved successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get data integrity dashboard data
   */
  async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const [integrityCheck, activeAlerts, alertStats] = await Promise.all([
        dataIntegrityMonitor.runFullIntegrityCheck(),
        dataIntegrityAlerts.getActiveAlerts(),
        dataIntegrityAlerts.getAlertStats()
      ]);

      const dashboardData = {
        metrics: integrityCheck.summary,
        details: integrityCheck.details,
        alerts: {
          active: activeAlerts,
          stats: alertStats
        },
        healthScore: this.calculateHealthScore(integrityCheck.summary),
        recommendations: this.generateRecommendations(integrityCheck.summary, integrityCheck.details)
      };

      res.json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(metrics: any): number {
    let score = 100;

    // Critical issues
    if (metrics.crossAgentContamination > 0) score -= 50; // Major penalty for data contamination
    
    // High impact issues
    if (metrics.triggerFailures > 0) score -= 20;
    if (metrics.performanceIssues > 5) score -= 15;
    
    // Medium impact issues
    if (metrics.orphanedRecords > 100) score -= 10;
    if (metrics.performanceIssues > 0) score -= 5;

    return Math.max(0, score);
  }

  /**
   * Generate recommendations based on current issues
   */
  private generateRecommendations(metrics: any, details: any): string[] {
    const recommendations: string[] = [];

    if (metrics.crossAgentContamination > 0) {
      recommendations.push('CRITICAL: Fix cross-agent data contamination immediately - users can see other users\' data');
      recommendations.push('Review agent ownership validation middleware');
      recommendations.push('Audit all analytics queries for proper user_id filtering');
    }

    if (details.analyticsContamination && details.analyticsContamination.length > 0) {
      recommendations.push('Fix analytics data contamination in lead_analytics and agent_analytics tables');
      recommendations.push('Add database constraints to prevent cross-user analytics data');
    }

    if (metrics.triggerFailures > 0) {
      recommendations.push('Investigate and fix failing database triggers');
      recommendations.push('Review trigger error handling and add proper exception management');
    }

    if (metrics.orphanedRecords > 50) {
      recommendations.push('Clean up orphaned records to maintain referential integrity');
      recommendations.push('Add foreign key constraints where missing');
    }

    if (metrics.performanceIssues > 5) {
      recommendations.push('Optimize slow-performing analytics queries');
      recommendations.push('Consider adding database indexes for frequently queried columns');
    }

    if (recommendations.length === 0) {
      recommendations.push('Data integrity looks good! Continue regular monitoring.');
    }

    return recommendations;
  }

  /**
   * Helper method to group records by type
   */
  private groupByType(records: any[]): Record<string, number> {
    return records.reduce((acc, record) => {
      const key = `${record.table_name}_${record.orphan_type}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}

export const dataIntegrityController = new DataIntegrityController();