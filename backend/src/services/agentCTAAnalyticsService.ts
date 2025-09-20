import { logger } from '../utils/logger';
import { DatabaseConnection } from '../config/database';

export interface AgentCTAMetrics {
    agent_id: string;
    agent_name: string;
    date: string;
    total_cta_interactions: number;
    cta_conversion_rate: number;
    cta_pricing_clicks: number;
    cta_demo_clicks: number;
    cta_followup_clicks: number;
    cta_sample_clicks: number;
    cta_human_escalations: number;
    leads_generated: number;
}

export interface CTASummary {
    total_pricing_clicks: number;
    total_demo_clicks: number;
    total_followup_clicks: number;
    total_sample_clicks: number;
    total_human_escalations: number;
    total_cta_interactions: number;
    average_cta_conversion_rate: number;
}

/**
 * Service for querying CTA metrics from agent_analytics table
 * This service demonstrates how to use the new CTA columns added in task 1.2
 */
export class AgentCTAAnalyticsService {
    /**
     * Get CTA metrics for a specific agent over a date range
     * Requirements: US-2.1
     */
    static async getAgentCTAMetrics(
        userId: string,
        agentId: string,
        dateFrom: Date,
        dateTo: Date
    ): Promise<AgentCTAMetrics[]> {
        try {
            const query = `
        SELECT 
          aa.agent_id,
          a.name as agent_name,
          aa.date::text,
          aa.total_cta_interactions,
          aa.cta_conversion_rate,
          aa.cta_pricing_clicks,
          aa.cta_demo_clicks,
          aa.cta_followup_clicks,
          aa.cta_sample_clicks,
          aa.cta_human_escalations,
          aa.leads_generated
        FROM agent_analytics aa
        JOIN agents a ON aa.agent_id = a.id
        WHERE aa.user_id = $1 
          AND aa.agent_id = $2
          AND aa.date >= $3 
          AND aa.date <= $4
          AND aa.hour IS NULL -- Daily aggregates only
        ORDER BY aa.date DESC
      `;

            const result = await DatabaseConnection.query(query, [userId, agentId, dateFrom, dateTo]);

            return result.rows.map((row: any) => ({
                agent_id: row.agent_id,
                agent_name: row.agent_name,
                date: row.date,
                total_cta_interactions: parseInt(row.total_cta_interactions) || 0,
                cta_conversion_rate: parseFloat(row.cta_conversion_rate) || 0,
                cta_pricing_clicks: parseInt(row.cta_pricing_clicks) || 0,
                cta_demo_clicks: parseInt(row.cta_demo_clicks) || 0,
                cta_followup_clicks: parseInt(row.cta_followup_clicks) || 0,
                cta_sample_clicks: parseInt(row.cta_sample_clicks) || 0,
                cta_human_escalations: parseInt(row.cta_human_escalations) || 0,
                leads_generated: parseInt(row.leads_generated) || 0
            }));
        } catch (error) {
            logger.error(`Error getting agent CTA metrics for agent ${agentId}:`, error);
            throw error;
        }
    }

    /**
     * Get CTA summary for all agents of a user
     * Requirements: US-2.1
     */
    static async getUserCTASummary(
        userId: string,
        dateFrom: Date,
        dateTo: Date
    ): Promise<CTASummary> {
        try {
            const query = `
        SELECT 
          SUM(aa.cta_pricing_clicks) as total_pricing_clicks,
          SUM(aa.cta_demo_clicks) as total_demo_clicks,
          SUM(aa.cta_followup_clicks) as total_followup_clicks,
          SUM(aa.cta_sample_clicks) as total_sample_clicks,
          SUM(aa.cta_human_escalations) as total_human_escalations,
          SUM(aa.total_cta_interactions) as total_cta_interactions,
          AVG(aa.cta_conversion_rate) as average_cta_conversion_rate
        FROM agent_analytics aa
        WHERE aa.user_id = $1 
          AND aa.date >= $2 
          AND aa.date <= $3
          AND aa.hour IS NULL -- Daily aggregates only
      `;

            const result = await DatabaseConnection.query(query, [userId, dateFrom, dateTo]);
            const stats = result.rows[0];

            return {
                total_pricing_clicks: parseInt(stats.total_pricing_clicks) || 0,
                total_demo_clicks: parseInt(stats.total_demo_clicks) || 0,
                total_followup_clicks: parseInt(stats.total_followup_clicks) || 0,
                total_sample_clicks: parseInt(stats.total_sample_clicks) || 0,
                total_human_escalations: parseInt(stats.total_human_escalations) || 0,
                total_cta_interactions: parseInt(stats.total_cta_interactions) || 0,
                average_cta_conversion_rate: parseFloat(stats.average_cta_conversion_rate) || 0
            };
        } catch (error) {
            logger.error(`Error getting user CTA summary for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get top performing agents by CTA conversion rate
     * Requirements: US-2.1
     */
    static async getTopCTAPerformingAgents(
        userId: string,
        dateFrom: Date,
        dateTo: Date,
        limit: number = 10
    ): Promise<Array<{
        agent_id: string;
        agent_name: string;
        total_cta_interactions: number;
        cta_conversion_rate: number;
        leads_generated: number;
        most_popular_cta: string;
    }>> {
        try {
            const query = `
        SELECT 
          aa.agent_id,
          a.name as agent_name,
          SUM(aa.total_cta_interactions) as total_cta_interactions,
          AVG(aa.cta_conversion_rate) as avg_cta_conversion_rate,
          SUM(aa.leads_generated) as total_leads_generated,
          SUM(aa.cta_pricing_clicks) as total_pricing,
          SUM(aa.cta_demo_clicks) as total_demo,
          SUM(aa.cta_followup_clicks) as total_followup,
          SUM(aa.cta_sample_clicks) as total_sample,
          SUM(aa.cta_human_escalations) as total_human
        FROM agent_analytics aa
        JOIN agents a ON aa.agent_id = a.id
        WHERE aa.user_id = $1 
          AND aa.date >= $2 
          AND aa.date <= $3
          AND aa.hour IS NULL -- Daily aggregates only
          AND a.is_active = true
        GROUP BY aa.agent_id, a.name
        HAVING SUM(aa.total_cta_interactions) > 0
        ORDER BY AVG(aa.cta_conversion_rate) DESC, SUM(aa.total_cta_interactions) DESC
        LIMIT $4
      `;

            const result = await DatabaseConnection.query(query, [userId, dateFrom, dateTo, limit]);

            return result.rows.map((row: any) => {
                // Determine most popular CTA
                const ctaCounts = {
                    pricing: parseInt(row.total_pricing) || 0,
                    demo: parseInt(row.total_demo) || 0,
                    followup: parseInt(row.total_followup) || 0,
                    sample: parseInt(row.total_sample) || 0,
                    human: parseInt(row.total_human) || 0
                };

                const mostPopularCTA = Object.entries(ctaCounts)
                    .sort(([, a], [, b]) => b - a)[0][0];

                return {
                    agent_id: row.agent_id,
                    agent_name: row.agent_name,
                    total_cta_interactions: parseInt(row.total_cta_interactions) || 0,
                    cta_conversion_rate: parseFloat(row.avg_cta_conversion_rate) || 0,
                    leads_generated: parseInt(row.total_leads_generated) || 0,
                    most_popular_cta: mostPopularCTA
                };
            });
        } catch (error) {
            logger.error(`Error getting top CTA performing agents for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get CTA trends over time for a user
     * Requirements: US-2.1
     */
    static async getCTATrends(
        userId: string,
        dateFrom: Date,
        dateTo: Date,
        groupBy: 'day' | 'week' | 'month' = 'day'
    ): Promise<Array<{
        date: string;
        total_cta_interactions: number;
        cta_pricing_clicks: number;
        cta_demo_clicks: number;
        cta_followup_clicks: number;
        cta_sample_clicks: number;
        cta_human_escalations: number;
        average_conversion_rate: number;
    }>> {
        try {
            let dateFormat: string;
            let dateInterval: string;

            switch (groupBy) {
                case 'week':
                    dateFormat = 'YYYY-"W"WW';
                    dateInterval = '1 week';
                    break;
                case 'month':
                    dateFormat = 'YYYY-MM';
                    dateInterval = '1 month';
                    break;
                default:
                    dateFormat = 'YYYY-MM-DD';
                    dateInterval = '1 day';
            }

            const query = `
        WITH date_series AS (
          SELECT generate_series(
            date_trunc('${groupBy}', $2::timestamp),
            date_trunc('${groupBy}', $3::timestamp),
            interval '${dateInterval}'
          ) AS date
        ),
        cta_stats AS (
          SELECT 
            date_trunc('${groupBy}', aa.date) as period_date,
            SUM(aa.total_cta_interactions) as total_cta_interactions,
            SUM(aa.cta_pricing_clicks) as cta_pricing_clicks,
            SUM(aa.cta_demo_clicks) as cta_demo_clicks,
            SUM(aa.cta_followup_clicks) as cta_followup_clicks,
            SUM(aa.cta_sample_clicks) as cta_sample_clicks,
            SUM(aa.cta_human_escalations) as cta_human_escalations,
            AVG(aa.cta_conversion_rate) as avg_conversion_rate
          FROM agent_analytics aa
          WHERE aa.user_id = $1 
            AND aa.date >= $2 
            AND aa.date <= $3
            AND aa.hour IS NULL -- Daily aggregates only
          GROUP BY date_trunc('${groupBy}', aa.date)
        )
        SELECT 
          to_char(ds.date, '${dateFormat}') as date,
          COALESCE(cs.total_cta_interactions, 0) as total_cta_interactions,
          COALESCE(cs.cta_pricing_clicks, 0) as cta_pricing_clicks,
          COALESCE(cs.cta_demo_clicks, 0) as cta_demo_clicks,
          COALESCE(cs.cta_followup_clicks, 0) as cta_followup_clicks,
          COALESCE(cs.cta_sample_clicks, 0) as cta_sample_clicks,
          COALESCE(cs.cta_human_escalations, 0) as cta_human_escalations,
          COALESCE(cs.avg_conversion_rate, 0) as average_conversion_rate
        FROM date_series ds
        LEFT JOIN cta_stats cs ON ds.date = cs.period_date
        ORDER BY ds.date
      `;

            const result = await DatabaseConnection.query(query, [userId, dateFrom, dateTo]);

            return result.rows.map((row: any) => ({
                date: row.date,
                total_cta_interactions: parseInt(row.total_cta_interactions) || 0,
                cta_pricing_clicks: parseInt(row.cta_pricing_clicks) || 0,
                cta_demo_clicks: parseInt(row.cta_demo_clicks) || 0,
                cta_followup_clicks: parseInt(row.cta_followup_clicks) || 0,
                cta_sample_clicks: parseInt(row.cta_sample_clicks) || 0,
                cta_human_escalations: parseInt(row.cta_human_escalations) || 0,
                average_conversion_rate: parseFloat(row.average_conversion_rate) || 0
            }));
        } catch (error) {
            logger.error(`Error getting CTA trends for user ${userId}:`, error);
            throw error;
        }
    }
}