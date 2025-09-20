import { Request, Response } from 'express';
import { Pool, PoolConfig } from 'pg';
import { AuthenticatedRequest } from '../middleware/auth';
import * as dotenv from 'dotenv';

dotenv.config();

export interface FollowUp {
  id: string;
  userId: string;
  leadPhone?: string;
  leadEmail?: string;
  leadName?: string;
  followUpDate: string;
  remark?: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface CreateFollowUpRequest {
  leadPhone?: string;
  leadEmail?: string;
  leadName?: string;
  followUpDate: string;
  remark?: string;
}

export class FollowUpController {
  private pool: Pool;

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

  async getFollowUps(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { completed, leadPhone, leadEmail } = req.query;
      
      let query = `
        SELECT 
          id,
          user_id,
          lead_phone,
          lead_email,
          lead_name,
          follow_up_date,
          remark,
          is_completed,
          created_at,
          updated_at,
          created_by,
          completed_at,
          completed_by
        FROM follow_ups 
        WHERE user_id = $1
      `;
      
      const queryParams: any[] = [userId];
      let paramCount = 1;

      if (completed !== undefined) {
        paramCount++;
        query += ` AND is_completed = $${paramCount}`;
        queryParams.push(completed === 'true');
      }

      if (leadPhone) {
        paramCount++;
        query += ` AND lead_phone = $${paramCount}`;
        queryParams.push(leadPhone);
      }

      if (leadEmail) {
        paramCount++;
        query += ` AND lead_email = $${paramCount}`;
        queryParams.push(leadEmail);
      }

      query += ` ORDER BY follow_up_date ASC, created_at DESC`;

      const result = await this.pool.query(query, queryParams);
      
      const followUps: FollowUp[] = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        leadPhone: row.lead_phone,
        leadEmail: row.lead_email,
        leadName: row.lead_name,
        followUpDate: row.follow_up_date,
        remark: row.remark,
        isCompleted: row.is_completed,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        completedAt: row.completed_at,
        completedBy: row.completed_by
      }));

      res.json(followUps);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { leadPhone, leadEmail, leadName, followUpDate, remark }: CreateFollowUpRequest = req.body;

      // Validate that at least phone or email is provided
      if (!leadPhone && !leadEmail) {
        res.status(400).json({ error: 'Either leadPhone or leadEmail must be provided' });
        return;
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(followUpDate)) {
        res.status(400).json({ error: 'followUpDate must be in YYYY-MM-DD format' });
        return;
      }

      const query = `
        INSERT INTO follow_ups (
          user_id, 
          lead_phone, 
          lead_email, 
          lead_name, 
          follow_up_date, 
          remark, 
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;

      const result = await this.pool.query(query, [
        userId,
        leadPhone || null,
        leadEmail || null,
        leadName || null,
        followUpDate,
        remark || null,
        userId
      ]);

      const followUp: FollowUp = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        leadPhone: result.rows[0].lead_phone,
        leadEmail: result.rows[0].lead_email,
        leadName: result.rows[0].lead_name,
        followUpDate: result.rows[0].follow_up_date,
        remark: result.rows[0].remark,
        isCompleted: result.rows[0].is_completed,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        createdBy: result.rows[0].created_by
      };

      res.status(201).json(followUp);
    } catch (error) {
      console.error('Error creating follow-up:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { followUpDate, remark } = req.body;

      // Validate date format if provided
      if (followUpDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(followUpDate)) {
          res.status(400).json({ error: 'followUpDate must be in YYYY-MM-DD format' });
          return;
        }
      }

      const query = `
        UPDATE follow_ups 
        SET 
          follow_up_date = COALESCE($1, follow_up_date),
          remark = COALESCE($2, remark),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND user_id = $4
        RETURNING *;
      `;

      const result = await this.pool.query(query, [
        followUpDate || null,
        remark || null,
        id,
        userId
      ]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Follow-up not found' });
        return;
      }

      const followUp: FollowUp = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        leadPhone: result.rows[0].lead_phone,
        leadEmail: result.rows[0].lead_email,
        leadName: result.rows[0].lead_name,
        followUpDate: result.rows[0].follow_up_date,
        remark: result.rows[0].remark,
        isCompleted: result.rows[0].is_completed,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        createdBy: result.rows[0].created_by,
        completedAt: result.rows[0].completed_at,
        completedBy: result.rows[0].completed_by
      };

      res.json(followUp);
    } catch (error) {
      console.error('Error updating follow-up:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async completeFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const query = `
        UPDATE follow_ups 
        SET 
          is_completed = true,
          completed_at = CURRENT_TIMESTAMP,
          completed_by = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $1
        RETURNING *;
      `;

      const result = await this.pool.query(query, [userId, id]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Follow-up not found' });
        return;
      }

      const followUp: FollowUp = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        leadPhone: result.rows[0].lead_phone,
        leadEmail: result.rows[0].lead_email,
        leadName: result.rows[0].lead_name,
        followUpDate: result.rows[0].follow_up_date,
        remark: result.rows[0].remark,
        isCompleted: result.rows[0].is_completed,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        createdBy: result.rows[0].created_by,
        completedAt: result.rows[0].completed_at,
        completedBy: result.rows[0].completed_by
      };

      res.json(followUp);
    } catch (error) {
      console.error('Error completing follow-up:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const query = `
        DELETE FROM follow_ups 
        WHERE id = $1 AND user_id = $2
        RETURNING id;
      `;

      const result = await this.pool.query(query, [id, userId]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Follow-up not found' });
        return;
      }

      res.json({ message: 'Follow-up deleted successfully', id: result.rows[0].id });
    } catch (error) {
      console.error('Error deleting follow-up:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}