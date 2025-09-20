import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import pool from '../config/database';

export class CustomersController {
  /**
   * Get all customers for the current user
   * GET /api/customers
   */
  async getCustomers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { status, assignedSalesRep, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT 
          c.*,
          co.phone_number as contact_phone,
          co.email as contact_email,
          -- Get interaction counts
          (SELECT COUNT(*) FROM calls ca 
           WHERE ca.user_id = c.user_id 
           AND ca.phone_number = c.phone
           AND ca.created_at >= c.conversion_date
          ) as interactions_since_conversion,
          -- Get latest interaction date
          (SELECT MAX(ca.created_at) FROM calls ca 
           WHERE ca.user_id = c.user_id 
           AND ca.phone_number = c.phone
           AND ca.created_at >= c.conversion_date
          ) as latest_interaction_date
        FROM customers c
        LEFT JOIN contacts co ON c.contact_id = co.id
        WHERE c.user_id = $1
      `;

      const queryParams: any[] = [userId];
      let paramIndex = 2;

      // Apply filters
      if (status) {
        query += ` AND c.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (assignedSalesRep) {
        query += ` AND c.assigned_sales_rep ILIKE $${paramIndex}`;
        queryParams.push(`%${assignedSalesRep}%`);
        paramIndex++;
      }

      // Add ordering and pagination
      query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM customers c
        WHERE c.user_id = $1
      `;
      const countParams = [userId];
      let countParamIndex = 2;

      if (status) {
        countQuery += ` AND c.status = $${countParamIndex}`;
        countParams.push(status as string);
        countParamIndex++;
      }

      if (assignedSalesRep) {
        countQuery += ` AND c.assigned_sales_rep ILIKE $${countParamIndex}`;
        countParams.push(`%${assignedSalesRep}%`);
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: (parseInt(offset as string) + parseInt(limit as string)) < total
        }
      });
    } catch (error) {
      logger.error('Error fetching customers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customers'
      });
    }
  }

  /**
   * Get customer by ID with interaction timeline
   * GET /api/customers/:id
   */
  async getCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const customerId = req.params.id;

      // Get customer details
      const customerQuery = `
        SELECT 
          c.*,
          co.phone_number as contact_phone,
          co.email as contact_email,
          co.company as contact_company
        FROM customers c
        LEFT JOIN contacts co ON c.contact_id = co.id
        WHERE c.id = $1 AND c.user_id = $2
      `;

      const customerResult = await pool.query(customerQuery, [customerId, userId]);

      if (customerResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
        return;
      }

      const customer = customerResult.rows[0];

      // Get interaction timeline (calls and analytics) - show ALL calls for this customer
      const timelineQuery = `
        SELECT 
          c.id,
          c.created_at as interaction_date,
          c.duration_minutes,
          c.status as call_status,
          a.name as agent_name,
          'call' as interaction_type,
          la.lead_status_tag,
          la.intent_level,
          la.engagement_health,
          la.budget_constraint,
          la.urgency_level,
          la.fit_alignment,
          la.total_score,
          la.cta_pricing_clicked,
          la.cta_demo_clicked,
          la.cta_followup_clicked,
          la.cta_sample_clicked,
          la.cta_escalated_to_human,
          -- Additional fields to match lead intelligence format
          la.company_name,
          CASE 
            WHEN c.duration_minutes IS NOT NULL THEN CONCAT(c.duration_minutes, ' min')
            ELSE 'N/A'
          END as duration
        FROM calls c
        LEFT JOIN agents a ON c.agent_id = a.id
        LEFT JOIN lead_analytics la ON c.id = la.call_id
        WHERE c.user_id = $1 
        AND c.phone_number = $2
        ORDER BY c.created_at DESC
      `;

      const timelineResult = await pool.query(timelineQuery, [
        userId,
        customer.phone
      ]);

      // Debug logging to help identify issues
      logger.info('Customer timeline query:', {
        userId,
        customerPhone: customer.phone,
        timelineResultsCount: timelineResult.rows.length
      });

      // If no timeline results, let's check if there are any calls for this user with similar phone numbers
      if (timelineResult.rows.length === 0) {
        const debugQuery = `
          SELECT phone_number, COUNT(*) as call_count
          FROM calls 
          WHERE user_id = $1 
          GROUP BY phone_number
          ORDER BY call_count DESC
          LIMIT 10
        `;
        const debugResult = await pool.query(debugQuery, [userId]);
        logger.info('Available phone numbers for user:', {
          userId,
          availablePhones: debugResult.rows
        });
      }

      res.json({
        success: true,
        data: {
          customer,
          timeline: timelineResult.rows.map((row: any) => ({
            id: row.id,
            interactionAgent: row.agent_name || 'Unknown Agent',
            interactionDate: row.interaction_date,
            platform: 'Phone',
            companyName: row.company_name || customer.company || 'Unknown',
            status: row.lead_status_tag || row.call_status || 'Unknown',
            useCase: 'Call Interaction', // You may want to add this field to lead_analytics
            duration: row.duration || (row.duration_minutes ? `${row.duration_minutes} min` : 'N/A'),
            engagementLevel: row.engagement_health || 'Unknown',
            intentLevel: row.intent_level || 'Unknown',
            budgetConstraint: row.budget_constraint || 'Unknown',
            timelineUrgency: row.urgency_level || 'Unknown',
            fitAlignment: row.fit_alignment || 'Unknown',
            totalScore: row.total_score || 0,
            // Keep original fields for the detailed view
            interaction_date: row.interaction_date,
            duration_minutes: row.duration_minutes,
            call_status: row.call_status,
            agent_name: row.agent_name,
            interaction_type: row.interaction_type,
            lead_status_tag: row.lead_status_tag,
            cta_pricing_clicked: row.cta_pricing_clicked,
            cta_demo_clicked: row.cta_demo_clicked,
            cta_followup_clicked: row.cta_followup_clicked,
            cta_sample_clicked: row.cta_sample_clicked,
            cta_escalated_to_human: row.cta_escalated_to_human
          }))
        }
      });
    } catch (error) {
      logger.error('Error fetching customer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer details'
      });
    }
  }

  /**
   * Convert lead to customer
   * POST /api/customers/convert
   */
  async convertLeadToCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        contactId,
        name,
        email,
        phone,
        company,
        originalLeadSource,
        assignedSalesRep,
        notes
      } = req.body;

      logger.info('Converting lead to customer:', { userId, contactId, name, email, phone });

      // Validate required fields
      if (!contactId || !name) {
        res.status(400).json({
          success: false,
          error: 'Contact ID and name are required'
        });
        return;
      }

      // Check if contact exists and belongs to user
      // contactId might be a phone number (lead group ID) or actual contact UUID
      let contactQuery = `
        SELECT id, name, phone_number, email, company, is_customer
        FROM contacts 
        WHERE user_id = $1 AND (
          id::text = $2 OR 
          phone_number = $2 OR
          ($3::text IS NOT NULL AND phone_number = $3) OR 
          ($4::text IS NOT NULL AND email = $4)
        )
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      let contactResult = await pool.query(contactQuery, [userId, contactId, phone, email]);

      let contact;
      let contactId_actual;

      if (contactResult.rows.length === 0) {
        // Create a new contact if none exists
        const createContactQuery = `
          INSERT INTO contacts (
            user_id, name, phone_number, email, company, is_customer, 
            is_auto_created, auto_creation_source, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, false, false, 'manual_conversion', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id, name, phone_number, email, company, is_customer
        `;

        // Use the phone from request body or try to extract from contactId if it looks like a phone
        const phoneToUse = phone || (contactId.replace(/[^0-9]/g, '').length >= 10 ? contactId : null);
        
        if (!phoneToUse) {
          res.status(400).json({
            success: false,
            error: 'Phone number is required to create contact'
          });
          return;
        }

        const newContactResult = await pool.query(createContactQuery, [
          userId,
          name || 'Unknown',
          phoneToUse,
          email || '',
          company || ''
        ]);
        contact = newContactResult.rows[0];
        contactId_actual = contact.id;
      } else {
        contact = contactResult.rows[0];
        contactId_actual = contact.id;

        if (contact.is_customer) {
          res.status(400).json({
            success: false,
            error: 'Contact is already converted to customer'
          });
          return;
        }
      }

      // Start transaction
      await pool.query('BEGIN');

      try {
        // Create customer record
        const insertCustomerQuery = `
          INSERT INTO customers (
            user_id, contact_id, name, email, phone, company,
            original_lead_source, assigned_sales_rep, notes,
            last_interaction_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
          RETURNING *
        `;

        const customerResult = await pool.query(insertCustomerQuery, [
          userId,
          contactId_actual,
          name,
          email || contact.email,
          phone || contact.phone_number,
          company || contact.company,
          originalLeadSource,
          assignedSalesRep,
          notes
        ]);

        // Update contact to mark as customer
        await pool.query(
          'UPDATE contacts SET is_customer = TRUE WHERE id = $1',
          [contactId_actual]
        );

        await pool.query('COMMIT');

        res.json({
          success: true,
          data: customerResult.rows[0],
          message: 'Lead successfully converted to customer'
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Error converting lead to customer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to convert lead to customer'
      });
    }
  }

  /**
   * Update customer
   * PUT /api/customers/:id
   */
  async updateCustomer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const customerId = req.params.id;
      const {
        name,
        email,
        phone,
        company,
        status,
        assignedSalesRep,
        notes
      } = req.body;

      // Check if customer exists and belongs to user
      const checkQuery = `
        SELECT id FROM customers 
        WHERE id = $1 AND user_id = $2
      `;
      const checkResult = await pool.query(checkQuery, [customerId, userId]);

      if (checkResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
        return;
      }

      // Update customer
      const updateQuery = `
        UPDATE customers 
        SET 
          name = COALESCE($3, name),
          email = COALESCE($4, email),
          phone = COALESCE($5, phone),
          company = COALESCE($6, company),
          status = COALESCE($7, status),
          assigned_sales_rep = COALESCE($8, assigned_sales_rep),
          notes = COALESCE($9, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        customerId,
        userId,
        name,
        email,
        phone,
        company,
        status,
        assignedSalesRep,
        notes
      ]);

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Customer updated successfully'
      });
    } catch (error) {
      logger.error('Error updating customer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update customer'
      });
    }
  }

  /**
   * Get customer analytics/stats
   * GET /api/customers/analytics
   */
  async getCustomerAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const analyticsQuery = `
        SELECT 
          COUNT(*) as total_customers,
          COUNT(*) FILTER (WHERE status = 'Active') as active_customers,
          COUNT(*) FILTER (WHERE status = 'Inactive') as inactive_customers,
          COUNT(*) FILTER (WHERE status = 'Churned') as churned_customers,
          COUNT(*) FILTER (WHERE conversion_date >= CURRENT_DATE - INTERVAL '30 days') as new_customers_30d,
          COUNT(*) FILTER (WHERE conversion_date >= CURRENT_DATE - INTERVAL '7 days') as new_customers_7d,
          COUNT(DISTINCT assigned_sales_rep) FILTER (WHERE assigned_sales_rep IS NOT NULL) as sales_reps_assigned
        FROM customers 
        WHERE user_id = $1
      `;

      const result = await pool.query(analyticsQuery, [userId]);

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error fetching customer analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer analytics'
      });
    }
  }
}
