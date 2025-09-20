import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import database from '../config/database';
import { logger } from '../utils/logger';

export class AgentAnalyticsController {
  /**
   * Get agent performance overview
   */
  async getAgentOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const userId = req.user!.id;

      // Verify agent ownership
      const agentCheck = await database.query(
        'SELECT id FROM agents WHERE id = $1 AND user_id = $2',
        [agentId, userId]
      );

      if (agentCheck.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      // Get comprehensive agent overview
      const overviewQuery = `
        SELECT 
          a.id,
          a.name,
          a.agent_type,
          a.description,
          a.created_at,
          
          -- Today's metrics
          COALESCE(today.total_calls, 0) as today_calls,
          COALESCE(today.successful_calls, 0) as today_successful_calls,
          COALESCE(today.success_rate, 0) as today_success_rate,
          COALESCE(today.leads_generated, 0) as today_leads,
          COALESCE(today.credits_used, 0) as today_credits_used,
          
          -- This week's metrics
          COALESCE(week.total_calls, 0) as week_calls,
          COALESCE(week.successful_calls, 0) as week_successful_calls,
          COALESCE(week.success_rate, 0) as week_success_rate,
          COALESCE(week.leads_generated, 0) as week_leads,
          
          -- This month's metrics
          COALESCE(month.total_calls, 0) as month_calls,
          COALESCE(month.successful_calls, 0) as month_successful_calls,
          COALESCE(month.success_rate, 0) as month_success_rate,
          COALESCE(month.leads_generated, 0) as month_leads,
          COALESCE(month.conversion_rate, 0) as month_conversion_rate,
          COALESCE(month.avg_duration_minutes, 0) as month_avg_duration,
          
          -- All-time metrics
          COALESCE(total.total_calls, 0) as total_calls,
          COALESCE(total.successful_calls, 0) as total_successful_calls,
          COALESCE(total.total_duration_minutes, 0) as total_duration_minutes,
          COALESCE(total.avg_duration_minutes, 0) as avg_duration_minutes,
          COALESCE(total.leads_generated, 0) as total_leads,
          COALESCE(total.qualified_leads, 0) as qualified_leads,
          COALESCE(total.credits_used, 0) as total_credits_used,
          
          -- Performance scores
          COALESCE(scores.avg_engagement_score, 0) as avg_engagement_score,
          COALESCE(scores.avg_intent_score, 0) as avg_intent_score,
          COALESCE(scores.avg_urgency_score, 0) as avg_urgency_score,
          COALESCE(scores.avg_budget_score, 0) as avg_budget_score,
          COALESCE(scores.avg_fit_score, 0) as avg_fit_score
          
        FROM agents a
        
        -- Today's metrics
        LEFT JOIN (
          SELECT 
            agent_id,
            SUM(total_calls) as total_calls,
            SUM(successful_calls) as successful_calls,
            CASE WHEN SUM(total_calls) > 0 THEN (SUM(successful_calls)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as success_rate,
            SUM(leads_generated) as leads_generated,
            SUM(credits_used) as credits_used
          FROM agent_analytics 
          WHERE date = CURRENT_DATE AND hour IS NULL AND user_id = $2
          GROUP BY agent_id
        ) today ON a.id = today.agent_id
        
        -- This week's metrics
        LEFT JOIN (
          SELECT 
            agent_id,
            SUM(total_calls) as total_calls,
            SUM(successful_calls) as successful_calls,
            CASE WHEN SUM(total_calls) > 0 THEN (SUM(successful_calls)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as success_rate,
            SUM(leads_generated) as leads_generated
          FROM agent_analytics 
          WHERE date >= DATE_TRUNC('week', CURRENT_DATE) AND hour IS NULL AND user_id = $2
          GROUP BY agent_id
        ) week ON a.id = week.agent_id
        
        -- This month's metrics
        LEFT JOIN (
          SELECT 
            agent_id,
            SUM(total_calls) as total_calls,
            SUM(successful_calls) as successful_calls,
            CASE WHEN SUM(total_calls) > 0 THEN (SUM(successful_calls)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as success_rate,
            SUM(leads_generated) as leads_generated,
            CASE WHEN SUM(leads_generated) > 0 THEN (SUM(qualified_leads)::DECIMAL / SUM(total_calls) * 100) ELSE 0 END as conversion_rate,
            AVG(avg_duration_minutes) as avg_duration_minutes
          FROM agent_analytics 
          WHERE date >= DATE_TRUNC('month', CURRENT_DATE) AND hour IS NULL AND user_id = $2
          GROUP BY agent_id
        ) month ON a.id = month.agent_id
        
        -- All-time metrics
        LEFT JOIN (
          SELECT 
            agent_id,
            SUM(total_calls) as total_calls,
            SUM(successful_calls) as successful_calls,
            SUM(total_duration_minutes) as total_duration_minutes,
            AVG(avg_duration_minutes) as avg_duration_minutes,
            SUM(leads_generated) as leads_generated,
            SUM(qualified_leads) as qualified_leads,
            SUM(credits_used) as credits_used
          FROM agent_analytics 
          WHERE hour IS NULL AND user_id = $2
          GROUP BY agent_id
        ) total ON a.id = total.agent_id
        
        -- Performance scores
        LEFT JOIN (
          SELECT 
            agent_id,
            AVG(avg_engagement_score) as avg_engagement_score,
            AVG(avg_intent_score) as avg_intent_score,
            AVG(avg_urgency_score) as avg_urgency_score,
            AVG(avg_budget_score) as avg_budget_score,
            AVG(avg_fit_score) as avg_fit_score
          FROM agent_analytics 
          WHERE date >= CURRENT_DATE - INTERVAL '30 days' AND hour IS NULL AND user_id = $2
          GROUP BY agent_id
        ) scores ON a.id = scores.agent_id
        
        WHERE a.id = $1 AND a.user_id = $2
      `;

      const result = await database.query(overviewQuery, [agentId, userId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      const agentData = result.rows[0];

      // Calculate derived metrics
      const totalSuccessRate = agentData.total_calls > 0 
        ? (agentData.total_successful_calls / agentData.total_calls * 100).toFixed(2)
        : '0';

      const totalConversionRate = agentData.total_leads > 0
        ? (agentData.qualified_leads / agentData.total_leads * 100).toFixed(2)
        : '0';

      const costPerLead = agentData.total_leads > 0
        ? (agentData.total_credits_used / agentData.total_leads).toFixed(2)
        : '0';

      res.json({
        success: true,
        data: {
          agent: {
            id: agentData.id,
            name: agentData.name,
            type: agentData.agent_type,
            description: agentData.description,
            created_at: agentData.created_at
          },
          metrics: {
            today: {
              calls: parseInt(agentData.today_calls),
              successful_calls: parseInt(agentData.today_successful_calls),
              success_rate: parseFloat(agentData.today_success_rate),
              leads: parseInt(agentData.today_leads),
              credits_used: parseInt(agentData.today_credits_used)
            },
            week: {
              calls: parseInt(agentData.week_calls),
              successful_calls: parseInt(agentData.week_successful_calls),
              success_rate: parseFloat(agentData.week_success_rate),
              leads: parseInt(agentData.week_leads)
            },
            month: {
              calls: parseInt(agentData.month_calls),
              successful_calls: parseInt(agentData.month_successful_calls),
              success_rate: parseFloat(agentData.month_success_rate),
              leads: parseInt(agentData.month_leads),
              conversion_rate: parseFloat(agentData.month_conversion_rate),
              avg_duration: parseFloat(agentData.month_avg_duration)
            },
            total: {
              calls: parseInt(agentData.total_calls),
              successful_calls: parseInt(agentData.total_successful_calls),
              success_rate: parseFloat(totalSuccessRate),
              total_duration_minutes: parseInt(agentData.total_duration_minutes),
              avg_duration_minutes: parseFloat(agentData.avg_duration_minutes),
              leads: parseInt(agentData.total_leads),
              qualified_leads: parseInt(agentData.qualified_leads),
              conversion_rate: parseFloat(totalConversionRate),
              credits_used: parseInt(agentData.total_credits_used),
              cost_per_lead: parseFloat(costPerLead)
            }
          },
          performance_scores: {
            engagement: parseFloat(agentData.avg_engagement_score),
            intent: parseFloat(agentData.avg_intent_score),
            urgency: parseFloat(agentData.avg_urgency_score),
            budget: parseFloat(agentData.avg_budget_score),
            fit: parseFloat(agentData.avg_fit_score)
          }
        }
      });

    } catch (error) {
      logger.error('Error getting agent overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent overview'
      });
    }
  }

  /**
   * Get agent metrics for specific time periods
   */
  async getAgentMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const userId = req.user!.id;
      const { 
        dateFrom, 
        dateTo, 
        groupBy = 'day',
        includeHourly = false 
      } = req.query;

      // Verify agent ownership
      const agentCheck = await database.query(
        'SELECT id FROM agents WHERE id = $1 AND user_id = $2',
        [agentId, userId]
      );

      if (agentCheck.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      // If hourly view requested, compute from today's calls grouped by hour
      if (includeHourly === 'true') {
        const hourlyQuery = `
          SELECT 
            DATE_TRUNC('hour', c.created_at) AS hour,
            COUNT(*) AS total_calls,
            COUNT(*) FILTER (WHERE c.status = 'completed') AS successful_calls,
            COUNT(*) FILTER (WHERE c.status = 'failed') AS failed_calls,
            COALESCE(SUM(c.duration_minutes), 0) AS total_duration_minutes,
            CASE WHEN COUNT(*) > 0 THEN AVG(c.duration_minutes) ELSE 0 END AS avg_duration_minutes,
            COUNT(la.id) AS leads_generated,
            COUNT(*) FILTER (WHERE la.total_score >= 70) AS qualified_leads,
            CASE WHEN COUNT(la.id) > 0 THEN (COUNT(*) FILTER (WHERE la.total_score >= 70))::DECIMAL / COUNT(la.id) * 100 ELSE 0 END AS conversion_rate,
            CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE c.status = 'completed'))::DECIMAL / COUNT(*) * 100 ELSE 0 END AS success_rate,
            AVG(la.engagement_score) AS avg_engagement_score,
            AVG(la.intent_score) AS avg_intent_score
          FROM calls c
          LEFT JOIN lead_analytics la ON la.call_id = c.id
          WHERE c.agent_id = $1 AND c.user_id = $2 AND DATE(c.created_at) = CURRENT_DATE
          GROUP BY DATE_TRUNC('hour', c.created_at)
          ORDER BY hour
        `;

        const result = await database.query(hourlyQuery, [agentId, userId]);

        res.json({
          success: true,
          data: {
            metrics: result.rows.map((row: any) => ({
              date: row.hour, // timestamp for the hour bucket
              hour: row.hour,
              calls: {
                total: parseInt(row.total_calls) || 0,
                successful: parseInt(row.successful_calls) || 0,
                failed: parseInt(row.failed_calls) || 0,
                success_rate: parseFloat(row.success_rate) || 0
              },
              duration: {
                total_minutes: parseInt(row.total_duration_minutes) || 0,
                avg_minutes: parseFloat(row.avg_duration_minutes) || 0
              },
              leads: {
                generated: parseInt(row.leads_generated) || 0,
                qualified: parseInt(row.qualified_leads) || 0,
                conversion_rate: parseFloat(row.conversion_rate) || 0
              },
              credits_used: 0,
              scores: {
                engagement: parseFloat(row.avg_engagement_score) || 0,
                intent: parseFloat(row.avg_intent_score) || 0
              }
            }))
          }
        });
        return;
      }

      // DAILY/AGGREGATED PATH (agent_analytics, hour IS NULL)
      let query = `
        SELECT 
          date,
          SUM(total_calls) as total_calls,
          SUM(successful_calls) as successful_calls,
          SUM(failed_calls) as failed_calls,
          SUM(total_duration_minutes) as total_duration_minutes,
          AVG(avg_duration_minutes) as avg_duration_minutes,
          SUM(leads_generated) as leads_generated,
          SUM(qualified_leads) as qualified_leads,
          AVG(conversion_rate) as conversion_rate,
          AVG(success_rate) as success_rate,
          AVG(avg_engagement_score) as avg_engagement_score,
          AVG(avg_intent_score) as avg_intent_score
        FROM agent_analytics 
        WHERE agent_id = $1 AND user_id = $2 AND hour IS NULL
      `;

      const params = [agentId, userId];
      let paramIndex = 3;

      if (dateFrom) {
        query += ` AND date >= $${paramIndex}`;
        params.push(dateFrom as string);
        paramIndex++;
      }

      if (dateTo) {
        query += ` AND date <= $${paramIndex}`;
        params.push(dateTo as string);
        paramIndex++;
      }

      if (groupBy === 'week') {
        query = query.replace('date,', ''); // no hour column here
        query += ` GROUP BY DATE_TRUNC('week', date)`;
        query = query.replace('SELECT \n          date,', `SELECT \n          DATE_TRUNC('week', date) as date,`);
      } else if (groupBy === 'month') {
        query = query.replace('date,', '');
        query += ` GROUP BY DATE_TRUNC('month', date)`;
        query = query.replace('SELECT \n          date,', `SELECT \n          DATE_TRUNC('month', date) as date,`);
      } else {
        query += ` GROUP BY date`;
      }

      query += ` ORDER BY date`;

      const result = await database.query(query, params);

      res.json({
        success: true,
        data: {
          metrics: result.rows.map((row: any) => ({
            date: row.date,
            calls: {
              total: parseInt(row.total_calls) || 0,
              successful: parseInt(row.successful_calls) || 0,
              failed: parseInt(row.failed_calls) || 0,
              success_rate: parseFloat(row.success_rate) || 0
            },
            duration: {
              total_minutes: parseInt(row.total_duration_minutes) || 0,
              avg_minutes: parseFloat(row.avg_duration_minutes) || 0
            },
            leads: {
              generated: parseInt(row.leads_generated) || 0,
              qualified: parseInt(row.qualified_leads) || 0,
              conversion_rate: parseFloat(row.conversion_rate) || 0
            },
            credits_used: 0,
            scores: {
              engagement: parseFloat(row.avg_engagement_score) || 0,
              intent: parseFloat(row.avg_intent_score) || 0
            }
          }))
        }
      });

    } catch (error) {
      logger.error('Error getting agent metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent metrics'
      });
    }
  }

  /**
   * Get call outcomes for an agent
   */
  async getCallOutcomes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const userId = req.user!.id;
      const { 
        limit = 50, 
        offset = 0,
        outcome,
        dateFrom,
        dateTo 
      } = req.query;

      // Verify agent ownership
      const agentCheck = await database.query(
        'SELECT id FROM agents WHERE id = $1 AND user_id = $2',
        [agentId, userId]
      );

      if (agentCheck.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      let query = `
        SELECT 
          aco.*,
          c.phone_number,
          c.duration_minutes,
          c.created_at as call_date,
          ct.name as contact_name,
          ct.company as contact_company
        FROM agent_call_outcomes aco
        JOIN calls c ON aco.call_id = c.id
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        WHERE aco.agent_id = $1 AND aco.user_id = $2
      `;

      const params = [agentId, userId];
      let paramIndex = 3;

      if (outcome) {
        query += ` AND aco.outcome = $${paramIndex}`;
        params.push(outcome as string);
        paramIndex++;
      }

      if (dateFrom) {
        query += ` AND c.created_at >= $${paramIndex}`;
        params.push(dateFrom as string);
        paramIndex++;
      }

      if (dateTo) {
        query += ` AND c.created_at <= $${paramIndex}`;
        params.push(dateTo as string);
        paramIndex++;
      }

      query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit as string, offset as string);

      const result = await database.query(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM agent_call_outcomes aco
        JOIN calls c ON aco.call_id = c.id
        WHERE aco.agent_id = $1 AND aco.user_id = $2
      `;

      const countParams = [agentId, userId];
      let countParamIndex = 3;

      if (outcome) {
        countQuery += ` AND aco.outcome = $${countParamIndex}`;
        countParams.push(outcome as string);
        countParamIndex++;
      }

      if (dateFrom) {
        countQuery += ` AND c.created_at >= $${countParamIndex}`;
        countParams.push(dateFrom as string);
        countParamIndex++;
      }

      if (dateTo) {
        countQuery += ` AND c.created_at <= $${countParamIndex}`;
        countParams.push(dateTo as string);
      }

      const countResult = await database.query(countQuery, countParams);

      res.json({
        success: true,
        data: {
          call_outcomes: result.rows,
          pagination: {
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            has_more: parseInt(countResult.rows[0].total) > parseInt(offset as string) + parseInt(limit as string)
          }
        }
      });

    } catch (error) {
      logger.error('Error getting call outcomes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get call outcomes'
      });
    }
  }

  /**
   * Get performance trends for an agent
   */
  async getPerformanceTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const userId = req.user!.id;
      const { period = 'weekly' } = req.query;

      // Verify agent ownership
      const agentCheck = await database.query(
        'SELECT id FROM agents WHERE id = $1 AND user_id = $2',
        [agentId, userId]
      );

      if (agentCheck.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      const trendsQuery = `
        SELECT *
        FROM agent_performance_trends
        WHERE agent_id = $1 AND user_id = $2 AND period_type = $3
        ORDER BY period_start DESC
        LIMIT 12
      `;

      const result = await database.query(trendsQuery, [agentId, userId, period]);

      res.json({
        success: true,
        data: {
          trends: result.rows
        }
      });

    } catch (error) {
      logger.error('Error getting performance trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get performance trends'
      });
    }
  }

  /**
   * Get agent targets
   */
  async getAgentTargets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const userId = req.user!.id;

      // Verify agent ownership
      const agentCheck = await database.query(
        'SELECT id FROM agents WHERE id = $1 AND user_id = $2',
        [agentId, userId]
      );

      if (agentCheck.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      const targetsQuery = `
        SELECT *
        FROM agent_targets
        WHERE agent_id = $1 AND user_id = $2
        ORDER BY target_date DESC
      `;

      const result = await database.query(targetsQuery, [agentId, userId]);

      res.json({
        success: true,
        data: {
          targets: result.rows
        }
      });

    } catch (error) {
      logger.error('Error getting agent targets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent targets'
      });
    }
  }

  /**
   * Set agent targets
   */
  async setAgentTargets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const userId = req.user!.id;
      const targetData = req.body;

      // Verify agent ownership
      const agentCheck = await database.query(
        'SELECT id FROM agents WHERE id = $1 AND user_id = $2',
        [agentId, userId]
      );

      if (agentCheck.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      const insertQuery = `
        INSERT INTO agent_targets (
          agent_id, user_id, target_date, target_type,
          target_calls, target_success_rate, target_leads, 
          target_conversion_rate, target_cost_per_lead
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (agent_id, target_date, target_type)
        DO UPDATE SET
          target_calls = EXCLUDED.target_calls,
          target_success_rate = EXCLUDED.target_success_rate,
          target_leads = EXCLUDED.target_leads,
          target_conversion_rate = EXCLUDED.target_conversion_rate,
          target_cost_per_lead = EXCLUDED.target_cost_per_lead,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await database.query(insertQuery, [
        agentId,
        userId,
        targetData.target_date,
        targetData.target_type,
        targetData.target_calls,
        targetData.target_success_rate,
        targetData.target_leads,
        targetData.target_conversion_rate,
        targetData.target_cost_per_lead
      ]);

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error setting agent targets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set agent targets'
      });
    }
  }

  /**
   * Update agent targets
   */
  async updateAgentTargets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId, targetId } = req.params;
      const userId = req.user!.id;
      const updateData = req.body;

      // Verify agent ownership and target ownership
      const targetCheck = await database.query(
        'SELECT id FROM agent_targets WHERE id = $1 AND agent_id = $2 AND user_id = $3',
        [targetId, agentId, userId]
      );

      if (targetCheck.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Target not found'
        });
        return;
      }

      const updateQuery = `
        UPDATE agent_targets 
        SET 
          target_calls = COALESCE($1, target_calls),
          target_success_rate = COALESCE($2, target_success_rate),
          target_leads = COALESCE($3, target_leads),
          target_conversion_rate = COALESCE($4, target_conversion_rate),
          target_cost_per_lead = COALESCE($5, target_cost_per_lead),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `;

      const result = await database.query(updateQuery, [
        updateData.target_calls,
        updateData.target_success_rate,
        updateData.target_leads,
        updateData.target_conversion_rate,
        updateData.target_cost_per_lead,
        targetId
      ]);

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      logger.error('Error updating agent targets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update agent targets'
      });
    }
  }

  /**
   * Get agent comparison with other agents
   */
  async getAgentComparison(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const userId = req.user!.id;

      // Get comparison data for all user's agents
      const comparisonQuery = `
        SELECT 
          a.id,
          a.name,
          a.agent_type,
          COALESCE(SUM(aa.total_calls), 0) as total_calls,
          COALESCE(SUM(aa.successful_calls), 0) as successful_calls,
          CASE WHEN SUM(aa.total_calls) > 0 THEN (SUM(aa.successful_calls)::DECIMAL / SUM(aa.total_calls) * 100) ELSE 0 END as success_rate,
          COALESCE(SUM(aa.leads_generated), 0) as leads_generated,
          COALESCE(SUM(aa.qualified_leads), 0) as qualified_leads,
          CASE WHEN SUM(aa.leads_generated) > 0 THEN (SUM(aa.qualified_leads)::DECIMAL / SUM(aa.leads_generated) * 100) ELSE 0 END as conversion_rate,
          COALESCE(AVG(aa.avg_duration_minutes), 0) as avg_duration_minutes,
          COALESCE(SUM(aa.credits_used), 0) as credits_used,
          CASE WHEN SUM(aa.leads_generated) > 0 THEN (SUM(aa.credits_used)::DECIMAL / SUM(aa.leads_generated)) ELSE 0 END as cost_per_lead
        FROM agents a
        LEFT JOIN agent_analytics aa ON a.id = aa.agent_id 
          AND aa.user_id = a.user_id
          AND aa.date >= CURRENT_DATE - INTERVAL '30 days' 
          AND aa.hour IS NULL
        WHERE a.user_id = $1 AND a.is_active = true
        GROUP BY a.id, a.name, a.agent_type
        ORDER BY success_rate DESC
      `;

      const result = await database.query(comparisonQuery, [userId]);

      // Find the current agent's position
      const currentAgentIndex = result.rows.findIndex((row: any) => row.id === agentId);
      const currentAgent = result.rows[currentAgentIndex];

      if (!currentAgent) {
        res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          current_agent: {
            ...currentAgent,
            rank: currentAgentIndex + 1,
            total_agents: result.rows.length
          },
          all_agents: result.rows.map((agent: any, index: number) => ({
            ...agent,
            rank: index + 1,
            is_current: agent.id === agentId
          }))
        }
      });

    } catch (error) {
      logger.error('Error getting agent comparison:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent comparison'
      });
    }
  }

  /**
   * Get agent ranking
   */
  async getAgentRanking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const userId = req.user!.id;

      // Get latest performance trends for ranking
      const rankingQuery = `
        SELECT 
          agent_id,
          performance_rank,
          total_agents_count,
          calls_change_percent,
          success_rate_change_percent,
          conversion_rate_change_percent
        FROM agent_performance_trends
        WHERE agent_id = $1 AND user_id = $2 AND period_type = 'monthly'
        ORDER BY period_start DESC
        LIMIT 1
      `;

      const result = await database.query(rankingQuery, [agentId, userId]);

      if (result.rows.length === 0) {
        res.json({
          success: true,
          data: {
            ranking: null,
            message: 'No ranking data available yet'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          ranking: result.rows[0]
        }
      });

    } catch (error) {
      logger.error('Error getting agent ranking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent ranking'
      });
    }
  }

  /**
   * Get real-time agent statistics
   */
  async getRealtimeStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const userId = req.user!.id;

      // Hourly stats from today's calls
      const hourlyQuery = `
        SELECT 
          DATE_TRUNC('hour', c.created_at) AS hour,
          COUNT(*) AS total_calls,
          COUNT(*) FILTER (WHERE c.status = 'completed') AS successful_calls,
          COUNT(*) FILTER (WHERE c.status = 'failed') AS failed_calls,
          COUNT(la.id) AS leads_generated,
          AVG(la.engagement_score) AS avg_engagement_score
        FROM calls c
        LEFT JOIN lead_analytics la ON la.call_id = c.id
        WHERE c.agent_id = $1 AND c.user_id = $2 AND DATE(c.created_at) = CURRENT_DATE
        GROUP BY DATE_TRUNC('hour', c.created_at)
        ORDER BY hour
      `;

      const hourlyResult = await database.query(hourlyQuery, [agentId, userId]);

      // Get current active calls
      const activeCallsQuery = `
        SELECT COUNT(*) as active_calls
        FROM calls
        WHERE agent_id = $1 AND status = 'in_progress'
      `;

      const activeCallsResult = await database.query(activeCallsQuery, [agentId]);

      res.json({
        success: true,
        data: {
          hourly_stats: hourlyResult.rows,
          active_calls: parseInt(activeCallsResult.rows[0].active_calls),
          last_updated: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error getting realtime stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get realtime stats'
      });
    }
  }
}

export const agentAnalyticsController = new AgentAnalyticsController();