import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { logAdminActionManual } from '../middleware/adminAuth';

// Validation schemas
const createPhoneNumberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  phone_number: z.string().min(10, 'Phone number must be at least 10 characters').max(20, 'Phone number must be less than 20 characters'),
  elevenlabs_phone_id: z.string().min(1, 'ElevenLabs phone number ID is required'),
  assigned_to_user_id: z.string().uuid('Invalid user ID format').nullable().optional(),
});

const updatePhoneNumberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  phone_number: z.string().min(10, 'Phone number must be at least 10 characters').max(20, 'Phone number must be less than 20 characters').optional(),
  elevenlabs_phone_id: z.string().min(1, 'ElevenLabs phone number ID is required').optional(),
  assigned_to_user_id: z.string().uuid('Invalid user ID format').nullable().optional(),
  is_active: z.boolean().optional(),
});

const assignPhoneNumberSchema = z.object({
  assigned_to_user_id: z.string().uuid('Invalid user ID format').nullable(),
});

export class PhoneNumberController {
  /**
   * Get all phone numbers with filtering and pagination
   */
  static async getAllPhoneNumbers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = (page - 1) * limit;
      
      const search = req.query.search as string;
      const assigned_to = req.query.assigned_to as string;
      const is_active = req.query.is_active as string;

      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramCount = 0;

      // Add filters
      if (search) {
        paramCount++;
        whereClause += ` AND (pn.name ILIKE $${paramCount} OR pn.phone_number ILIKE $${paramCount + 1})`;
        queryParams.push(`%${search}%`, `%${search}%`);
        paramCount++;
      }

      if (assigned_to) {
        paramCount++;
        if (assigned_to === 'unassigned') {
          whereClause += ` AND pn.assigned_to_user_id IS NULL`;
        } else {
          whereClause += ` AND pn.assigned_to_user_id = $${paramCount}`;
          queryParams.push(assigned_to);
        }
      }

      if (is_active) {
        paramCount++;
        whereClause += ` AND pn.is_active = $${paramCount}`;
        queryParams.push(is_active === 'true');
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) 
        FROM phone_numbers pn 
        ${whereClause}
      `;
      
      const countResult = await pool.query(countQuery, queryParams);
      const totalItems = parseInt(countResult.rows[0].count);

      // Get phone numbers with user details
      const dataQuery = `
        SELECT 
          pn.id,
          pn.name,
          pn.phone_number,
          pn.elevenlabs_phone_number_id,
          pn.assigned_to_user_id,
          pn.created_by_admin_id,
          pn.is_active,
          pn.created_at,
          pn.updated_at,
          assigned_user.name as assigned_user_name,
          assigned_user.email as assigned_user_email,
          creator_admin.name as creator_admin_name,
          creator_admin.email as creator_admin_email
        FROM phone_numbers pn
        LEFT JOIN users assigned_user ON pn.assigned_to_user_id = assigned_user.id
        LEFT JOIN users creator_admin ON pn.created_by_admin_id = creator_admin.id
        ${whereClause}
        ORDER BY pn.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      queryParams.push(limit, offset);
      const dataResult = await pool.query(dataQuery, queryParams);

      const totalPages = Math.ceil(totalItems / limit);
      
      res.json({
        success: true,
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } catch (error) {
      console.error('Error getting phone numbers:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PHONE_NUMBERS_FETCH_FAILED',
          message: 'Failed to fetch phone numbers',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
      });
    }
  }

  /**
   * Get phone number statistics
   */
  static async getPhoneNumberStats(req: Request, res: Response): Promise<void> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN assigned_to_user_id IS NOT NULL THEN 1 END) as assigned,
          COUNT(CASE WHEN assigned_to_user_id IS NULL THEN 1 END) as unassigned,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
        FROM phone_numbers
      `;
      
      const result = await pool.query(statsQuery);
      const stats = result.rows[0];

      res.json({
        success: true,
        data: {
          total: parseInt(stats.total),
          assigned: parseInt(stats.assigned),
          unassigned: parseInt(stats.unassigned),
          active: parseInt(stats.active),
          inactive: parseInt(stats.inactive),
        },
      });
    } catch (error) {
      console.error('Error getting phone number stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PHONE_NUMBER_STATS_FAILED',
          message: 'Failed to fetch phone number statistics',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
      });
    }
  }

  /**
   * Get users that can be assigned phone numbers
   */
  static async getAssignableUsers(req: Request, res: Response): Promise<void> {
    try {
      const usersQuery = `
        SELECT 
          id,
          name,
          email,
          role,
          is_active,
          created_at
        FROM users 
        WHERE is_active = true 
        ORDER BY name ASC
      `;
      
      const result = await pool.query(usersQuery);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Error getting assignable users:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ASSIGNABLE_USERS_FETCH_FAILED',
          message: 'Failed to fetch assignable users',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
      });
    }
  }

  /**
   * Get specific phone number by ID
   */
  static async getPhoneNumberById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PHONE_NUMBER_ID',
            message: 'Valid phone number ID is required',
          },
        });
        return;
      }

      const query = `
        SELECT 
          pn.id,
          pn.name,
          pn.phone_number,
          pn.elevenlabs_phone_number_id,
          pn.assigned_to_user_id,
          pn.created_by_admin_id,
          pn.is_active,
          pn.created_at,
          pn.updated_at,
          assigned_user.name as assigned_user_name,
          assigned_user.email as assigned_user_email,
          creator_admin.name as creator_admin_name,
          creator_admin.email as creator_admin_email
        FROM phone_numbers pn
        LEFT JOIN users assigned_user ON pn.assigned_to_user_id = assigned_user.id
        LEFT JOIN users creator_admin ON pn.created_by_admin_id = creator_admin.id
        WHERE pn.id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PHONE_NUMBER_NOT_FOUND',
            message: 'Phone number not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Error getting phone number:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PHONE_NUMBER_FETCH_FAILED',
          message: 'Failed to fetch phone number',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
      });
    }
  }

  /**
   * Create new phone number
   */
  static async createPhoneNumber(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = createPhoneNumberSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validationResult.error.issues,
          },
        });
        return;
      }

      const { name, phone_number, elevenlabs_phone_id, assigned_to_user_id } = validationResult.data;
      const created_by_admin_id = req.userId; // From auth middleware

      // Check if phone number or ElevenLabs ID already exists
      const existingQuery = `
        SELECT id 
        FROM phone_numbers 
        WHERE phone_number = $1 OR elevenlabs_phone_number_id = $2
      `;
      
      const existingResult = await pool.query(existingQuery, [phone_number, elevenlabs_phone_id]);
      
      if (existingResult.rows.length > 0) {
        res.status(409).json({
          success: false,
          error: {
            code: 'PHONE_NUMBER_EXISTS',
            message: 'Phone number or ElevenLabs ID already exists',
          },
        });
        return;
      }

      // If assigned_to_user_id is provided, verify user exists
      if (assigned_to_user_id) {
        const userQuery = `SELECT id FROM users WHERE id = $1 AND is_active = true`;
        const userResult = await pool.query(userQuery, [assigned_to_user_id]);
        
        if (userResult.rows.length === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_USER_ASSIGNMENT',
              message: 'Assigned user not found or inactive',
            },
          });
          return;
        }
      }

      // Create phone number
      const insertQuery = `
        INSERT INTO phone_numbers (
          name, 
          phone_number, 
          elevenlabs_phone_number_id, 
          assigned_to_user_id, 
          created_by_admin_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const insertResult = await pool.query(insertQuery, [
        name,
        phone_number,
        elevenlabs_phone_id,
        assigned_to_user_id || null,
        created_by_admin_id,
      ]);

      // Log admin action
      await logAdminActionManual(
        req.userId!,
        'CREATE_PHONE_NUMBER',
        'phone_number',
        insertResult.rows[0].id,
        {
          name,
          phone_number,
          elevenlabs_phone_id,
          assigned_to_user_id,
        }
      );

      res.status(201).json({
        success: true,
        data: insertResult.rows[0],
        message: 'Phone number created successfully',
      });
    } catch (error) {
      console.error('Error creating phone number:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PHONE_NUMBER_CREATE_FAILED',
          message: 'Failed to create phone number',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
      });
    }
  }

  /**
   * Update phone number
   */
  static async updatePhoneNumber(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validationResult = updatePhoneNumberSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validationResult.error.issues,
          },
        });
        return;
      }

      const updateData = validationResult.data;

      // Check if phone number exists
      const existingQuery = `SELECT * FROM phone_numbers WHERE id = $1`;
      const existingResult = await pool.query(existingQuery, [id]);
      
      if (existingResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PHONE_NUMBER_NOT_FOUND',
            message: 'Phone number not found',
          },
        });
        return;
      }

      // Check for conflicts if updating phone_number or elevenlabs_phone_id
      if (updateData.phone_number || updateData.elevenlabs_phone_id) {
        const conflictQuery = `
          SELECT id 
          FROM phone_numbers 
          WHERE id != $1 AND (
            ${updateData.phone_number ? 'phone_number = $2' : 'false'}
            ${updateData.phone_number && updateData.elevenlabs_phone_id ? ' OR ' : ''}
            ${updateData.elevenlabs_phone_id ? 'elevenlabs_phone_number_id = $' + (updateData.phone_number ? '3' : '2') : 'false'}
          )
        `;
        
        const conflictParams = [id];
        if (updateData.phone_number) conflictParams.push(updateData.phone_number);
        if (updateData.elevenlabs_phone_id) conflictParams.push(updateData.elevenlabs_phone_id);
        
        const conflictResult = await pool.query(conflictQuery, conflictParams);
        
        if (conflictResult.rows.length > 0) {
          res.status(409).json({
            success: false,
            error: {
              code: 'PHONE_NUMBER_CONFLICT',
              message: 'Phone number or ElevenLabs ID already exists',
            },
          });
          return;
        }
      }

      // If assigned_to_user_id is being updated, verify user exists
      if (updateData.assigned_to_user_id !== undefined && updateData.assigned_to_user_id !== null) {
        const userQuery = `SELECT id FROM users WHERE id = $1 AND is_active = true`;
        const userResult = await pool.query(userQuery, [updateData.assigned_to_user_id]);
        
        if (userResult.rows.length === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_USER_ASSIGNMENT',
              message: 'Assigned user not found or inactive',
            },
          });
          return;
        }
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramCount + 1}`);
          updateValues.push(value);
          paramCount++;
        }
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const updateQuery = `
        UPDATE phone_numbers 
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      
      const updateResult = await pool.query(updateQuery, [id, ...updateValues]);

      // Log admin action
      await logAdminActionManual(
        req.userId!,
        'UPDATE_PHONE_NUMBER',
        'phone_number',
        id,
        updateData
      );

      res.json({
        success: true,
        data: updateResult.rows[0],
        message: 'Phone number updated successfully',
      });
    } catch (error) {
      console.error('Error updating phone number:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PHONE_NUMBER_UPDATE_FAILED',
          message: 'Failed to update phone number',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
      });
    }
  }

  /**
   * Delete phone number
   */
  static async deletePhoneNumber(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if phone number exists
      const existingQuery = `SELECT * FROM phone_numbers WHERE id = $1`;
      const existingResult = await pool.query(existingQuery, [id]);
      
      if (existingResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PHONE_NUMBER_NOT_FOUND',
            message: 'Phone number not found',
          },
        });
        return;
      }

      // Delete phone number
      const deleteQuery = `DELETE FROM phone_numbers WHERE id = $1 RETURNING *`;
      const deleteResult = await pool.query(deleteQuery, [id]);

      // Log admin action
      await logAdminActionManual(
        req.userId!,
        'DELETE_PHONE_NUMBER',
        'phone_number',
        id,
        { deleted_phone_number: existingResult.rows[0] }
      );

      res.json({
        success: true,
        data: deleteResult.rows[0],
        message: 'Phone number deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting phone number:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PHONE_NUMBER_DELETE_FAILED',
          message: 'Failed to delete phone number',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
      });
    }
  }

  /**
   * Assign phone number to user
   */
  static async assignPhoneNumber(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validationResult = assignPhoneNumberSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validationResult.error.errors,
          },
        });
        return;
      }

      const { assigned_to_user_id } = validationResult.data;

      // Check if phone number exists
      const existingQuery = `SELECT * FROM phone_numbers WHERE id = $1`;
      const existingResult = await pool.query(existingQuery, [id]);
      
      if (existingResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PHONE_NUMBER_NOT_FOUND',
            message: 'Phone number not found',
          },
        });
        return;
      }

      // If assigning to a user, verify user exists
      if (assigned_to_user_id) {
        const userQuery = `SELECT id FROM users WHERE id = $1 AND is_active = true`;
        const userResult = await pool.query(userQuery, [assigned_to_user_id]);
        
        if (userResult.rows.length === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_USER_ASSIGNMENT',
              message: 'Assigned user not found or inactive',
            },
          });
          return;
        }
      }

      // Update assignment
      const updateQuery = `
        UPDATE phone_numbers 
        SET assigned_to_user_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const updateResult = await pool.query(updateQuery, [assigned_to_user_id, id]);

      // Log admin action
      await logAdminActionManual(
        req.userId!,
        'ASSIGN_PHONE_NUMBER',
        'phone_number',
        id,
        { 
          assigned_to_user_id, 
          previous_assignment: existingResult.rows[0].assigned_to_user_id 
        }
      );

      res.json({
        success: true,
        data: updateResult.rows[0],
        message: assigned_to_user_id ? 'Phone number assigned successfully' : 'Phone number unassigned successfully',
      });
    } catch (error) {
      console.error('Error assigning phone number:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PHONE_NUMBER_ASSIGN_FAILED',
          message: 'Failed to assign phone number',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
      });
    }
  }
}
