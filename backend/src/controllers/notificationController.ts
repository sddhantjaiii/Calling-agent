import { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

interface Notification {
  id: string;
  leadId: string;
  contactId: string;
  phoneNumber: string;
  email: string;
  smartNotification: string;
  demoBookDateTime: string | null;
  createdAt: string;
  isRead: boolean;
  leadType: string;
  totalScore: number;
}

// Get smart notifications for the authenticated user
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    // Get recent smart notifications from lead analytics
    const query = `
      SELECT 
        la.id,
        la.call_id as lead_id,
        c.contact_id,
        c.phone_number,
        c.caller_email as email,
        la.smart_notification,
        la.demo_book_datetime,
        la.created_at,
        la.is_read,
        c.lead_type,
        la.total_score
      FROM lead_analytics la
      JOIN calls c ON c.id = la.call_id
      WHERE c.user_id = $1 
        AND la.smart_notification IS NOT NULL
        AND la.smart_notification != ''
      ORDER BY la.created_at DESC
      LIMIT 20
    `;

    const result = await pool.query(query, [userId]);
    
    const notifications: Notification[] = result.rows.map((row: any) => ({
      id: row.id,
      leadId: row.lead_id,
      contactId: row.contact_id,
      phoneNumber: row.phone_number,
      email: row.email,
      smartNotification: row.smart_notification,
      demoBookDateTime: row.demo_book_datetime,
      createdAt: row.created_at,
      isRead: row.is_read || false,
      leadType: row.lead_type || 'unknown',
      totalScore: row.total_score || 0
    }));

    // Get unread count
    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });

  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch notifications' 
    });
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    // Update the notification as read
    const query = `
      UPDATE lead_analytics 
      SET is_read = true
      WHERE id = $1 
        AND call_id IN (
          SELECT id FROM calls WHERE user_id = $2
        )
      RETURNING id
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ 
        success: false, 
        message: 'Notification not found' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark notification as read' 
    });
  }
};
