import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AgentOwnershipRequest } from '../middleware/agentOwnership';
import { logger } from '../utils/logger';
import database from '../config/database';

export class CallAnalyticsController {
  /**
   * Get call analytics KPIs
   * GET /api/call-analytics/kpis
   * Optional query parameter: agentId - filter by specific agent
   */
  async getCallAnalyticsKPIs(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { dateFrom, dateTo } = req.query;
      const agent = req.agent; // Validated agent if agentId was provided

      // Parse date filters
      const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const toDate = dateTo ? new Date(dateTo as string) : new Date();

      // Build query with optional agent filtering
      let kpiQuery = `
        SELECT 
          COUNT(DISTINCT c.id) as total_calls,
          COUNT(DISTINCT c.id) as total_calls_for_avg,
          COUNT(DISTINCT c.phone_number) as unique_phone_numbers,
          CASE 
            WHEN COUNT(DISTINCT c.id) > 0 
            THEN (COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'completed') * 100.0 / COUNT(DISTINCT c.id))
            ELSE 0 
          END as connection_rate,
          COALESCE(AVG(DISTINCT CASE WHEN c.status = 'completed' THEN c.duration_seconds END), 0) / 60.0 as avg_call_duration,
          -- Call Drop Off: calls with duration < 20 seconds
          COUNT(DISTINCT c.id) FILTER (WHERE c.duration_seconds < 20) as call_drop_off_count,
          CASE 
            WHEN COUNT(DISTINCT c.id) > 0 
            THEN (COUNT(DISTINCT c.id) FILTER (WHERE c.duration_seconds < 20) * 100.0 / COUNT(DISTINCT c.id))
            ELSE 0 
          END as call_drop_off_rate,
          -- Not Connected: sum of not_connected column from contacts table (Twilio unanswered calls)
          COALESCE(SUM(DISTINCT ct.not_connected), 0) as not_connected_calls,
          COUNT(DISTINCT c.id) FILTER (WHERE la.cta_interactions->>'demo_clicked' = 'true') as demos_scheduled,
          -- Hot leads: based on lead_status_tag indicating Hot
          COUNT(DISTINCT c.id) FILTER (WHERE COALESCE(la.lead_status_tag,'') ILIKE 'hot%') as hot_leads_generated,
          -- Pending follow-ups: flexible match for tag variants like 'Follow-Up Later'
          COUNT(DISTINCT c.id) FILTER (WHERE COALESCE(la.lead_status_tag,'') ILIKE 'follow%later%') as pending_followups
        FROM calls c
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        LEFT JOIN lead_analytics la ON c.id = la.call_id AND la.user_id = c.user_id
        WHERE c.user_id = $1 
          AND c.created_at >= $2 
          AND c.created_at <= $3`;

      const queryParams = [userId, fromDate, toDate];
      
      // Add agent filtering if agent is specified and validated
      if (agent) {
        kpiQuery += ` AND c.agent_id = $4`;
        queryParams.push(agent.id);
        logger.info('Analytics KPIs query with agent filter', { 
          agentId: agent.id, 
          agentName: agent.name,
          userId,
          dateFrom: fromDate.toISOString(),
          dateTo: toDate.toISOString() 
        });
      } else {
        logger.info('Analytics KPIs query for all agents', { 
          userId,
          dateFrom: fromDate.toISOString(),
          dateTo: toDate.toISOString() 
        });
      }

      console.log('📊 Executing KPIs Query:', kpiQuery);
      console.log('📊 Query Parameters:', queryParams);
      
      const result = await database.query(kpiQuery, queryParams);
      const stats = result.rows[0];

      // Get previous period for comparison
      const prevFromDate = new Date(fromDate.getTime() - (toDate.getTime() - fromDate.getTime()));
      const prevToDate = fromDate;

      // Build previous period query with same agent filtering
      let prevKpiQuery = kpiQuery.replace('AND c.created_at >= $2 AND c.created_at <= $3', 'AND c.created_at >= $2 AND c.created_at <= $3');
      const prevQueryParams = [userId, prevFromDate, prevToDate];
      
      if (agent) {
        prevQueryParams.push(agent.id);
      }

      const prevResult = await database.query(prevKpiQuery, prevQueryParams);
      const prevStats = prevResult.rows[0];

      // Calculate changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100 * 10) / 10;
      };

      const totalCalls = parseInt(stats.total_calls) || 0;
      const totalCallsForAvg = parseInt(stats.total_calls_for_avg) || 0;
      const uniquePhoneNumbers = parseInt(stats.unique_phone_numbers) || 0;
      const connectionRate = Math.round((parseFloat(stats.connection_rate) || 0) * 10) / 10;
      const avgCallDuration = parseFloat(stats.avg_call_duration) || 0;
      const callDropOffCount = parseInt(stats.call_drop_off_count) || 0;
      const callDropOffRate = Math.round((parseFloat(stats.call_drop_off_rate) || 0) * 10) / 10;
      const notConnectedCalls = parseInt(stats.not_connected_calls) || 0;
      const demosScheduled = parseInt(stats.demos_scheduled) || 0;
      const hotLeadsGenerated = parseInt(stats.hot_leads_generated) || 0;
      const pendingFollowups = parseInt(stats.pending_followups) || 0;

      const prevTotalCalls = parseInt(prevStats.total_calls) || 0;
      const prevTotalCallsForAvg = parseInt(prevStats.total_calls_for_avg) || 0;
      const prevUniquePhoneNumbers = parseInt(prevStats.unique_phone_numbers) || 0;
      const prevConnectionRate = parseFloat(prevStats.connection_rate) || 0;
      const prevAvgCallDuration = parseFloat(prevStats.avg_call_duration) || 0;
      const prevCallDropOffCount = parseInt(prevStats.call_drop_off_count) || 0;
      const prevNotConnectedCalls = parseInt(prevStats.not_connected_calls) || 0;
      const prevDemosScheduled = parseInt(prevStats.demos_scheduled) || 0;
      const prevHotLeadsGenerated = parseInt(prevStats.hot_leads_generated) || 0;

      const kpiData = [
        {
          title: "Total Calls Made",
          value: totalCalls.toLocaleString(),
          change: `${calculateChange(totalCalls, prevTotalCalls) >= 0 ? '+' : ''}${calculateChange(totalCalls, prevTotalCalls)}%`,
          changeValue: `${totalCalls - prevTotalCalls >= 0 ? '+' : ''}${totalCalls - prevTotalCalls}`,
          positive: calculateChange(totalCalls, prevTotalCalls) >= 0,
        },
        {
          title: "Avg Interaction (Calls) per Lead",
          value: uniquePhoneNumbers > 0 ? (totalCallsForAvg / uniquePhoneNumbers).toFixed(1) : "0",
          change: `${prevUniquePhoneNumbers > 0 ? calculateChange(totalCallsForAvg / uniquePhoneNumbers, prevTotalCallsForAvg / prevUniquePhoneNumbers) >= 0 ? '+' : '' : ''}${prevUniquePhoneNumbers > 0 ? calculateChange(totalCallsForAvg / uniquePhoneNumbers, prevTotalCallsForAvg / prevUniquePhoneNumbers) : 0}%`,
          changeValue: `${uniquePhoneNumbers > 0 && prevUniquePhoneNumbers > 0 ? ((totalCallsForAvg / uniquePhoneNumbers) - (prevTotalCallsForAvg / prevUniquePhoneNumbers)).toFixed(1) : '0'}`,
          positive: prevUniquePhoneNumbers > 0 ? calculateChange(totalCallsForAvg / uniquePhoneNumbers, prevTotalCallsForAvg / prevUniquePhoneNumbers) >= 0 : true,
        },
        {
          title: "Call Connection Rate",
          value: `${connectionRate}%`,
          change: `${calculateChange(connectionRate, prevConnectionRate) >= 0 ? '+' : ''}${calculateChange(connectionRate, prevConnectionRate)}%`,
          changeValue: `${(connectionRate - prevConnectionRate).toFixed(1)}%`,
          positive: calculateChange(connectionRate, prevConnectionRate) >= 0,
        },
        {
          title: "Avg. Call Duration",
          value: `${Math.floor(avgCallDuration)}m ${Math.round((avgCallDuration % 1) * 60)}s`,
          change: `${calculateChange(avgCallDuration, prevAvgCallDuration) >= 0 ? '+' : ''}${Math.round((avgCallDuration - prevAvgCallDuration) * 60)}s`,
          changeValue: `${calculateChange(avgCallDuration, prevAvgCallDuration) >= 0 ? '+' : ''}${calculateChange(avgCallDuration, prevAvgCallDuration)}%`,
          positive: calculateChange(avgCallDuration, prevAvgCallDuration) >= 0,
        },
        {
          title: "Call Drop Off",
          value: `${callDropOffRate}%`,
          change: `${calculateChange(callDropOffCount, prevCallDropOffCount) >= 0 ? '+' : ''}${calculateChange(callDropOffCount, prevCallDropOffCount)}%`,
          changeValue: `${callDropOffCount - prevCallDropOffCount >= 0 ? '+' : ''}${callDropOffCount - prevCallDropOffCount}`,
          positive: calculateChange(callDropOffCount, prevCallDropOffCount) <= 0,
        },
        {
          title: "Pending Follow-ups",
          value: pendingFollowups.toString(),
          change: `${calculateChange(pendingFollowups, parseInt(prevStats.pending_followups) || 0) >= 0 ? '+' : ''}${calculateChange(pendingFollowups, parseInt(prevStats.pending_followups) || 0)}%`,
          changeValue: `${pendingFollowups - (parseInt(prevStats.pending_followups) || 0) >= 0 ? '+' : ''}${pendingFollowups - (parseInt(prevStats.pending_followups) || 0)}`,
          positive: calculateChange(pendingFollowups, parseInt(prevStats.pending_followups) || 0) <= 0, // Lower is better for pending follow-ups
        },
      ];

      const additionalMetrics = [
        {
          title: "Not Connected",
          value: notConnectedCalls.toString(),
          change: `${calculateChange(notConnectedCalls, prevNotConnectedCalls) >= 0 ? '+' : ''}${calculateChange(notConnectedCalls, prevNotConnectedCalls)}%`,
          changeValue: `${notConnectedCalls - prevNotConnectedCalls >= 0 ? '+' : ''}${notConnectedCalls - prevNotConnectedCalls}`,
          positive: calculateChange(notConnectedCalls, prevNotConnectedCalls) <= 0, // Lower is better
        },
        {
          title: "Demo Scheduled",
          value: demosScheduled.toString(),
          change: `${calculateChange(demosScheduled, prevDemosScheduled) >= 0 ? '+' : ''}${calculateChange(demosScheduled, prevDemosScheduled)}%`,
          changeValue: `${demosScheduled - prevDemosScheduled >= 0 ? '+' : ''}${demosScheduled - prevDemosScheduled}`,
          positive: calculateChange(demosScheduled, prevDemosScheduled) >= 0,
        },
        {
          title: "Hot Leads Generated",
          value: hotLeadsGenerated.toString(),
          change: `${calculateChange(hotLeadsGenerated, prevHotLeadsGenerated) >= 0 ? '+' : ''}${calculateChange(hotLeadsGenerated, prevHotLeadsGenerated)}%`,
          changeValue: `${hotLeadsGenerated - prevHotLeadsGenerated >= 0 ? '+' : ''}${hotLeadsGenerated - prevHotLeadsGenerated}`,
          positive: calculateChange(hotLeadsGenerated, prevHotLeadsGenerated) >= 0,
        },
      ];

      res.json({
        success: true,
        data: {
          kpiData,
          additionalMetrics,
        },
      });
    } catch (error) {
      logger.error('Error fetching call analytics KPIs:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch call analytics KPIs',
      });
    }
  }

  /**
   * Get lead quality distribution
   * GET /api/call-analytics/lead-quality
   * Optional query parameter: agentId - filter by specific agent
   */
  async getLeadQualityDistribution(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { dateFrom, dateTo } = req.query;
      const agent = req.agent;

      const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = dateTo ? new Date(dateTo as string) : new Date();

      let query = `
        SELECT 
          quality_category,
          count,
          (count * 100.0 / SUM(count) OVER()) as percentage
        FROM (
          SELECT 
            CASE 
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'hot%' THEN 'Hot'
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'warm%' THEN 'Warm'
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'cold%' THEN 'Cold'
              ELSE 'Other'
            END as quality_category,
            COUNT(DISTINCT c.id) as count,
            CASE 
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'hot%' THEN 1
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'warm%' THEN 2
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'cold%' THEN 3
              ELSE 4
            END as sort_order
          FROM calls c
          JOIN lead_analytics la ON c.id = la.call_id AND la.user_id = c.user_id
          WHERE c.user_id = $1 
            AND c.created_at >= $2 
            AND c.created_at <= $3`;

      const queryParams = [userId, fromDate, toDate];
      
      if (agent) {
        query += ` AND c.agent_id = $4`;
        queryParams.push(agent.id);
        console.log('📊 Lead Quality Query with agent filter - Agent ID:', agent.id, 'Agent Name:', agent.name);
      }

      console.log('📊 Executing Lead Quality Query:', query);
      console.log('📊 Lead Quality Query Parameters:', queryParams);

      query += `
          GROUP BY 
            CASE 
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'hot%' THEN 'Hot'
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'warm%' THEN 'Warm'
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'cold%' THEN 'Cold'
              ELSE 'Other'
            END,
            CASE 
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'hot%' THEN 1
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'warm%' THEN 2
              WHEN COALESCE(la.lead_status_tag,'') ILIKE 'cold%' THEN 3
              ELSE 4
            END
        ) subquery
        ORDER BY sort_order
      `;

      const result = await database.query(query, queryParams);

      const colors = ["#1A6262", "#91C499", "#E1A940", "#FF6700", "#a855f7"];
      
      const leadQualityData = result.rows.map((row: any, index: number) => ({
        name: row.quality_category,
        value: Math.round((parseFloat(row.percentage) || 0) * 10) / 10,
        count: parseInt(row.count),
        color: colors[index % colors.length],
      }));

      res.json({
        success: true,
        data: leadQualityData,
      });
    } catch (error) {
      logger.error('Error fetching lead quality distribution:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch lead quality distribution',
      });
    }
  }

  /**
   * Get funnel conversion data
   * GET /api/call-analytics/funnel
   * Optional query parameter: agentId - filter by specific agent
   */
  async getFunnelData(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { dateFrom, dateTo } = req.query;
      const agent = req.agent;

      const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = dateTo ? new Date(dateTo as string) : new Date();

      // Get total contacts from contacts table
      let contactsQuery = `SELECT COUNT(DISTINCT id) as total_contacts FROM contacts WHERE user_id = $1`;
      const contactsParams = [userId];
      
      let query = `
        SELECT 
          COUNT(DISTINCT c.phone_number) as total_unique_calls,
          COUNT(DISTINCT c.phone_number) FILTER (WHERE la.cta_demo_clicked = true) as unique_demo_booked,
          COUNT(DISTINCT cont.id) FILTER (WHERE cont.is_customer = true) as customers
        FROM calls c
        LEFT JOIN lead_analytics la ON c.id = la.call_id AND la.user_id = c.user_id
        LEFT JOIN contacts cont ON cont.phone_number = c.phone_number AND cont.user_id = c.user_id
        WHERE c.user_id = $1 
          AND c.created_at >= $2 
          AND c.created_at <= $3`;

      const queryParams = [userId, fromDate, toDate];
      
      if (agent) {
        query += ` AND c.agent_id = $4`;
        queryParams.push(agent.id);
      }

      // Execute both queries
      const [contactsResult, callsResult] = await Promise.all([
        database.query(contactsQuery, contactsParams),
        database.query(query, queryParams)
      ]);
      
      const contactsStats = contactsResult.rows[0];
      const callsStats = callsResult.rows[0];

      const colors = ["#1A6262", "#91C499", "#E1A940", "#FF6700"];

      const funnelData = [
        {
          name: "Total Contacts",
          value: parseInt(contactsStats.total_contacts) || 0,
          fill: colors[0],
        },
        {
          name: "Total Unique Calls",
          value: parseInt(callsStats.total_unique_calls) || 0,
          fill: colors[1],
        },
        {
          name: "Unique Demo Booked",
          value: parseInt(callsStats.unique_demo_booked) || 0,
          fill: colors[2],
        },
        {
          name: "Customers",
          value: parseInt(callsStats.customers) || 0,
          fill: colors[3],
        },
      ];

      res.json({
        success: true,
        data: funnelData,
      });
    } catch (error) {
      logger.error('Error fetching funnel data:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch funnel data',
      });
    }
  }

  /**
   * Get intent vs budget scatter data
   * GET /api/call-analytics/intent-budget
   * Optional query parameter: agentId - filter by specific agent
   */
  async getIntentBudgetData(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { dateFrom, dateTo } = req.query;
      const agent = req.agent;

      const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = dateTo ? new Date(dateTo as string) : new Date();

      // Using 0-15 scale; consider >=12 as "High"
      let query = `
        SELECT 
          la.intent_score,
          la.budget_score,
          COUNT(*) as leads,
          CASE 
            WHEN la.intent_score >= 12 AND la.budget_score >= 12 THEN 'High Intent, High Budget'
            WHEN la.intent_score >= 12 AND la.budget_score < 12 THEN 'High Intent, Low Budget'
            WHEN la.intent_score < 12 AND la.budget_score >= 12 THEN 'Low Intent, High Budget'
            ELSE 'Low Intent, Low Budget'
          END as segment_name
        FROM calls c
        JOIN lead_analytics la ON c.id = la.call_id AND la.user_id = c.user_id
        WHERE c.user_id = $1 
          AND c.created_at >= $2 
          AND c.created_at <= $3`;

      const queryParams: any[] = [userId, fromDate, toDate];
      if (agent) {
        query += ` AND c.agent_id = $4`;
        queryParams.push(agent.id);
      }

      query += `
        GROUP BY la.intent_score, la.budget_score, segment_name
        ORDER BY leads DESC
        LIMIT 200
      `;

      const result = await database.query(query, queryParams);

      const colors = ["#1A6262", "#91C499", "#E1A940", "#FF6700", "#a855f7"];

      const intentBudgetData = result.rows.map((row: any, index: number) => ({
        intent: parseInt(row.intent_score), // 0-15 scale
        budget: parseInt(row.budget_score), // 0-15 scale
        leads: parseInt(row.leads),
        name: row.segment_name,
        color: colors[index % colors.length],
      }));

      res.json({
        success: true,
        data: intentBudgetData,
      });
    } catch (error) {
      logger.error('Error fetching intent vs budget data:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch intent vs budget data',
      });
    }
  }

  /**
   * Get call source breakdown (phone vs internet vs unknown)
   * GET /api/call-analytics/source-breakdown
   * Optional query parameter: agentId - filter by specific agent
   */
  async getSourceBreakdown(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { dateFrom, dateTo } = req.query;
      const agent = req.agent;

      const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = dateTo ? new Date(dateTo as string) : new Date();

      let query = `
        SELECT 
          call_source,
          COUNT(DISTINCT c.id) as call_count,
          COUNT(DISTINCT c.id) FILTER (WHERE status = 'completed') as successful_calls,
          ROUND(AVG(CASE WHEN status = 'completed' THEN duration_seconds END) / 60.0, 2) as avg_duration,
          -- Leads generated: Warm or Hot tags
          COUNT(DISTINCT c.id) FILTER (WHERE COALESCE(la.lead_status_tag,'') ILIKE 'warm%' OR COALESCE(la.lead_status_tag,'') ILIKE 'hot%') as leads_generated,
          CASE 
            WHEN COUNT(DISTINCT c.id) > 0 
            THEN ROUND((COUNT(DISTINCT c.id) FILTER (WHERE status = 'completed') * 100.0 / COUNT(DISTINCT c.id)), 1)
            ELSE 0 
          END as success_rate,
          CASE 
            WHEN COUNT(DISTINCT c.id) > 0 
            THEN ROUND((COUNT(DISTINCT c.id) FILTER (WHERE COALESCE(la.lead_status_tag,'') ILIKE 'warm%' OR COALESCE(la.lead_status_tag,'') ILIKE 'hot%') * 100.0 / COUNT(DISTINCT c.id)), 1)
            ELSE 0 
          END as conversion_rate
        FROM calls c
        LEFT JOIN lead_analytics la ON c.id = la.call_id AND la.user_id = c.user_id
        WHERE c.user_id = $1 
          AND c.created_at >= $2 
          AND c.created_at <= $3`;

      const queryParams = [userId, fromDate, toDate];
      
      if (agent) {
        query += ` AND c.agent_id = $4`;
        queryParams.push(agent.id);
      }

      query += ` GROUP BY call_source ORDER BY call_count DESC`;

      const result = await database.query(query, queryParams);

      // Calculate total calls for percentage calculation
      const totalCalls = result.rows.reduce((sum: number, row: any) => sum + parseInt(row.call_count), 0);

      const colors = ["#1A6262", "#91C499", "#E1A940"];
      const sourceLabels: { [key: string]: string } = {
        'phone': 'Phone Calls',
        'internet': 'Internet Calls', 
        'unknown': 'Unknown Source'
      };

      const sourceChartData = result.rows.map((row: any, index: number) => ({
        name: sourceLabels[row.call_source] || row.call_source,
        value: totalCalls > 0 ? Math.round((parseInt(row.call_count) / totalCalls) * 100 * 10) / 10 : 0,
        count: parseInt(row.call_count),
        successful_calls: parseInt(row.successful_calls),
        avg_duration: parseFloat(row.avg_duration) || 0,
        leads_generated: parseInt(row.leads_generated),
        success_rate: parseFloat(row.success_rate),
        conversion_rate: parseFloat(row.conversion_rate),
        color: colors[index % colors.length],
        source_type: row.call_source,
      }));

      // Ensure all source types are represented even if they have 0 calls
      const allSources = ['phone', 'internet', 'unknown'];
      allSources.forEach((source, index) => {
        if (!sourceChartData.find((item: any) => item.source_type === source)) {
          sourceChartData.push({
            name: sourceLabels[source],
            value: 0,
            count: 0,
            successful_calls: 0,
            avg_duration: 0,
            leads_generated: 0,
            success_rate: 0,
            conversion_rate: 0,
            color: colors[index % colors.length],
            source_type: source,
          });
        }
      });

      res.json({
        success: true,
        data: sourceChartData,
      });
    } catch (error) {
      logger.error('Error fetching call source breakdown:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch call source breakdown',
      });
    }
  }

  /**
   * Get call source analytics with detailed metrics
   * GET /api/call-analytics/call-source-analytics
   * Optional query parameter: agentId - filter by specific agent
   */
  async getCallSourceAnalytics(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { dateFrom, dateTo } = req.query;
      const agent = req.agent;

      const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = dateTo ? new Date(dateTo as string) : new Date();

      let query = `
        SELECT 
          call_source,
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_calls,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_calls,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_calls,
          ROUND(AVG(CASE WHEN status = 'completed' THEN duration_seconds END) / 60.0, 2) as avg_duration,
          SUM(credits_used) as total_credits_used,
          COUNT(CASE WHEN la.total_score >= 60 THEN 1 END) as leads_generated,
          COUNT(CASE WHEN la.total_score >= 80 THEN 1 END) as hot_leads,
          COUNT(CASE WHEN la.cta_interactions->>'demo_clicked' = 'true' THEN 1 END) as demos_scheduled,
          CASE 
            WHEN COUNT(*) > 0 
            THEN ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)), 1)
            ELSE 0 
          END as success_rate,
          CASE 
            WHEN COUNT(*) > 0 
            THEN ROUND((COUNT(CASE WHEN la.total_score >= 60 THEN 1 END) * 100.0 / COUNT(*)), 1)
            ELSE 0 
          END as conversion_rate,
          CASE 
            WHEN COUNT(CASE WHEN la.total_score >= 60 THEN 1 END) > 0 
            THEN ROUND((SUM(credits_used) / COUNT(CASE WHEN la.total_score >= 60 THEN 1 END)), 2)
            ELSE 0 
          END as cost_per_lead
        FROM calls c
        LEFT JOIN lead_analytics la ON c.id = la.call_id AND la.user_id = c.user_id
        WHERE c.user_id = $1 
          AND c.created_at >= $2 
          AND c.created_at <= $3`;

      const queryParams = [userId, fromDate, toDate];
      
      if (agent) {
        query += ` AND c.agent_id = $4`;
        queryParams.push(agent.id);
      }

      query += ` GROUP BY call_source ORDER BY total_calls DESC`;

      const result = await database.query(query, queryParams);

      // Get historical comparison (previous period)
      const prevFromDate = new Date(fromDate.getTime() - (toDate.getTime() - fromDate.getTime()));
      const prevToDate = fromDate;

      let prevQuery = query.replace('AND c.created_at >= $2 AND c.created_at <= $3', 'AND c.created_at >= $2 AND c.created_at <= $3');
      const prevQueryParams = [userId, prevFromDate, prevToDate];
      
      if (agent) {
        prevQueryParams.push(agent.id);
      }

      const prevResult = await database.query(prevQuery, prevQueryParams);

      // Create comparison data
      const sourceAnalytics = result.rows.map((row: any) => {
        const prevRow = prevResult.rows.find((p: any) => p.call_source === row.call_source);
        const prevTotalCalls = prevRow ? parseInt(prevRow.total_calls) : 0;
        const prevSuccessfulCalls = prevRow ? parseInt(prevRow.successful_calls) : 0;
        const prevLeadsGenerated = prevRow ? parseInt(prevRow.leads_generated) : 0;

        const totalCalls = parseInt(row.total_calls);
        const successfulCalls = parseInt(row.successful_calls);
        const leadsGenerated = parseInt(row.leads_generated);

        return {
          call_source: row.call_source,
          metrics: {
            total_calls: totalCalls,
            successful_calls: successfulCalls,
            failed_calls: parseInt(row.failed_calls),
            cancelled_calls: parseInt(row.cancelled_calls),
            avg_duration: parseFloat(row.avg_duration) || 0,
            total_credits_used: parseInt(row.total_credits_used) || 0,
            leads_generated: leadsGenerated,
            hot_leads: parseInt(row.hot_leads),
            demos_scheduled: parseInt(row.demos_scheduled),
            success_rate: parseFloat(row.success_rate),
            conversion_rate: parseFloat(row.conversion_rate),
            cost_per_lead: parseFloat(row.cost_per_lead) || 0,
          },
          changes: {
            calls_change: totalCalls - prevTotalCalls,
            calls_change_percent: prevTotalCalls > 0 ? Math.round(((totalCalls - prevTotalCalls) / prevTotalCalls) * 100 * 10) / 10 : 0,
            success_change: successfulCalls - prevSuccessfulCalls,
            leads_change: leadsGenerated - prevLeadsGenerated,
            leads_change_percent: prevLeadsGenerated > 0 ? Math.round(((leadsGenerated - prevLeadsGenerated) / prevLeadsGenerated) * 100 * 10) / 10 : 0,
          }
        };
      });

      res.json({
        success: true,
        data: {
          source_analytics: sourceAnalytics,
          period: {
            from: fromDate,
            to: toDate,
            previous_from: prevFromDate,
            previous_to: prevToDate,
          }
        },
      });
    } catch (error) {
      logger.error('Error fetching call source analytics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch call source analytics',
      });
    }
  }

  /**
   * Get call analytics summary for header
   * GET /api/call-analytics/summary
   * Optional query parameter: agentId - filter by specific agent
   */
  async getAnalyticsSummary(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // Get user's current credit balance
      const creditQuery = `SELECT credits FROM users WHERE id = $1`;
      const creditResult = await database.query(creditQuery, [userId]);
      const credits = parseInt(creditResult.rows[0]?.credits) || 0;

      res.json({
        success: true,
        data: {
          minutes: credits, // Assuming 1 credit = 1 minute
          totalMinutes: 500, // This could be made configurable
        },
      });
    } catch (error) {
      logger.error('Error fetching analytics summary:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics summary',
      });
    }
  }
}

export const callAnalyticsController = new CallAnalyticsController();