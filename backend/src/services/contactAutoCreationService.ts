import database from '../config/database';
import { logger } from '../utils/logger';
import { EnhancedLeadData } from './webhookDataProcessor';

export interface ContactCreationResult {
  contactId: string | null;
  created: boolean;
  updated: boolean;
  error?: string;
}

/**
 * ContactAutoCreationService - Handles automatic contact creation from webhook extraction data
 * Implements logic to check for existing contacts, create new ones, and prevent duplicates
 */
export class ContactAutoCreationService {
  /**
   * Normalize phone number format to [ISD code] [space] [rest of the number]
   * Takes last 10 digits as number and other digits at front as ISD codes
   */
  private static normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Remove leading + to work with digits only
    const digitsOnly = cleaned.replace(/^\+/, '');
    
    // Basic validation - should have at least 10 digits
    if (digitsOnly.length < 10) {
      throw new Error('Invalid phone number format');
    }
    
    // Take last 10 digits as the main number
    const mainNumber = digitsOnly.slice(-10);
    
    // Take everything before the last 10 digits as ISD code
    const isdCode = digitsOnly.slice(0, -10);
    
    // If no ISD code found, default to +91 (India)
    const finalIsdCode = isdCode || '91';
    
    // Return formatted as +[ISD] [main number]
    return `+${finalIsdCode} ${mainNumber}`;
  }

  /**
   * Create or update contact from webhook extraction data
   * 
   * @param userId - The user ID who owns the contact
   * @param leadData - Enhanced lead data extracted from webhook
   * @param callId - The call ID to link the contact to
   * @param phoneNumber - Phone number from webhook (optional)
   * @returns ContactCreationResult with contact ID and operation details
   */
  static async createOrUpdateContact(
    userId: string,
    leadData: EnhancedLeadData,
    callId: string,
    phoneNumber?: string
  ): Promise<ContactCreationResult> {
    try {
      // Skip if no meaningful contact data
      if (!leadData.extractedName && !leadData.extractedEmail && !phoneNumber) {
        logger.debug('No meaningful contact data available, skipping contact creation', {
          userId,
          callId,
          leadData
        });
        return {
          contactId: null,
          created: false,
          updated: false,
          error: 'No meaningful contact data available'
        };
      }

      // Check for existing contact by email or phone
      let existingContact = null;

      if (leadData.extractedEmail) {
        existingContact = await this.findContactByEmail(userId, leadData.extractedEmail);
        logger.debug('Checked for existing contact by email', {
          userId,
          email: leadData.extractedEmail,
          found: !!existingContact
        });
      }

      if (!existingContact && phoneNumber) {
        existingContact = await this.findContactByPhone(userId, phoneNumber);
        logger.debug('Checked for existing contact by phone', {
          userId,
          phoneNumber,
          found: !!existingContact
        });
      }

      if (existingContact) {
        // Update existing contact with better data
        const updated = await this.updateContactIfBetter(existingContact.id, leadData, phoneNumber);
        logger.info('Updated existing contact with better data', {
          userId,
          contactId: existingContact.id,
          callId,
          updated
        });

        return {
          contactId: existingContact.id,
          created: false,
          updated,
        };
      } else {
        // Create new contact
        const contactId = await this.createNewContact(userId, leadData, phoneNumber, callId);
        logger.info('Created new contact from webhook data', {
          userId,
          contactId,
          callId,
          companyName: leadData.companyName,
          extractedName: leadData.extractedName,
          extractedEmail: leadData.extractedEmail
        });

        return {
          contactId,
          created: true,
          updated: false,
        };
      }
    } catch (error) {
      logger.error('Error in contact auto-creation', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        callId,
        leadData
      });

      return {
        contactId: null,
        created: false,
        updated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Find existing contact by email address
   * 
   * @param userId - The user ID who owns the contact
   * @param email - Email address to search for
   * @returns Contact record or null if not found
   */
  private static async findContactByEmail(userId: string, email: string): Promise<any> {
    try {
      const query = `
        SELECT id, name, email, phone_number, company, notes, created_at, updated_at
        FROM contacts 
        WHERE user_id = $1 AND LOWER(email) = LOWER($2)
        LIMIT 1
      `;

      const result = await database.query(query, [userId, email]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding contact by email', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        email
      });
      throw error;
    }
  }

  /**
   * Find existing contact by phone number
   * 
   * @param userId - The user ID who owns the contact
   * @param phoneNumber - Phone number to search for
   * @returns Contact record or null if not found
   */
  private static async findContactByPhone(userId: string, phoneNumber: string): Promise<any> {
    try {
      const query = `
        SELECT id, name, email, phone_number, company, notes, created_at, updated_at
        FROM contacts 
        WHERE user_id = $1 AND phone_number = $2
        LIMIT 1
      `;

      const result = await database.query(query, [userId, phoneNumber]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding contact by phone', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        phoneNumber
      });
      throw error;
    }
  }

  /**
   * Create new contact record from webhook extraction data
   * 
   * @param userId - The user ID who owns the contact
   * @param leadData - Enhanced lead data extracted from webhook
   * @param phoneNumber - Phone number from webhook (optional)
   * @param callId - The call ID that triggered contact creation
   * @returns Contact ID of the created contact
   */
  private static async createNewContact(
    userId: string,
    leadData: EnhancedLeadData,
    phoneNumber: string | undefined,
    callId: string
  ): Promise<string> {
    try {
      const query = `
        INSERT INTO contacts (
          user_id, name, email, phone_number, company, notes,
          auto_created_from_call_id, is_auto_created, auto_creation_source
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;

      const notes = `Auto-created from call ${callId}`;
      const values = [
        userId,
        leadData.extractedName || null,
        leadData.extractedEmail || null,
        phoneNumber ? this.normalizePhoneNumber(phoneNumber) : null,
        leadData.companyName || null,
        notes,
        callId, // auto_created_from_call_id
        true,   // is_auto_created
        'webhook' // auto_creation_source
      ];

      const result = await database.query(query, values);

      if (!result.rows[0]?.id) {
        throw new Error('Failed to create contact - no ID returned');
      }

      return result.rows[0].id;
    } catch (error) {
      logger.error('Error creating new contact', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        leadData,
        phoneNumber,
        callId
      });
      throw error;
    }
  }

  /**
   * Update existing contact with better data when available
   * Only updates fields that are currently null or empty
   * 
   * @param contactId - ID of the contact to update
   * @param leadData - Enhanced lead data extracted from webhook
   * @param phoneNumber - Phone number from webhook (optional)
   * @returns Boolean indicating if any updates were made
   */
  private static async updateContactIfBetter(
    contactId: string,
    leadData: EnhancedLeadData,
    phoneNumber: string | undefined
  ): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Only update fields that are currently null or empty
      if (leadData.extractedName) {
        updateFields.push(`name = COALESCE(NULLIF(name, ''), $${paramIndex})`);
        values.push(leadData.extractedName);
        paramIndex++;
      }

      if (leadData.extractedEmail) {
        updateFields.push(`email = COALESCE(NULLIF(email, ''), $${paramIndex})`);
        values.push(leadData.extractedEmail);
        paramIndex++;
      }

      if (phoneNumber) {
        updateFields.push(`phone_number = COALESCE(NULLIF(phone_number, ''), $${paramIndex})`);
        values.push(this.normalizePhoneNumber(phoneNumber));
        paramIndex++;
      }

      if (leadData.companyName) {
        updateFields.push(`company = COALESCE(NULLIF(company, ''), $${paramIndex})`);
        values.push(leadData.companyName);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        logger.debug('No fields to update for contact', { contactId });
        return false;
      }

      // Add contact ID as the last parameter
      values.push(contactId);

      const query = `
        UPDATE contacts 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
      `;

      const result = await database.query(query, values);

      const updated = result.rowCount > 0;
      logger.debug('Contact update completed', {
        contactId,
        fieldsUpdated: updateFields.length,
        rowsAffected: result.rowCount,
        updated
      });

      return updated;
    } catch (error) {
      logger.error('Error updating contact with better data', {
        error: error instanceof Error ? error.message : String(error),
        contactId,
        leadData,
        phoneNumber
      });
      throw error;
    }
  }

  /**
   * Link created contact to call record
   * Updates the call record to reference the contact
   * 
   * @param callId - ID of the call to link
   * @param contactId - ID of the contact to link
   * @returns Boolean indicating if the link was successful
   */
  static async linkContactToCall(callId: string, contactId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE calls 
        SET contact_id = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      const result = await database.query(query, [callId, contactId]);

      const linked = result.rowCount > 0;
      logger.debug('Contact linked to call', {
        callId,
        contactId,
        linked,
        rowsAffected: result.rowCount
      });

      return linked;
    } catch (error) {
      logger.error('Error linking contact to call', {
        error: error instanceof Error ? error.message : String(error),
        callId,
        contactId
      });
      throw error;
    }
  }

  /**
   * Validate contact data before creation/update
   * Ensures data meets minimum requirements and constraints
   * 
   * @param leadData - Enhanced lead data to validate
   * @param phoneNumber - Phone number to validate (optional)
   * @returns Validation result with any errors
   */
  static validateContactData(
    leadData: EnhancedLeadData,
    phoneNumber?: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if we have at least one meaningful piece of contact data
    const hasValidEmail = leadData.extractedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.extractedEmail);
    const hasValidPhone = phoneNumber && /^[+]?[0-9\-()\s]+$/.test(phoneNumber);
    const hasValidName = leadData.extractedName && leadData.extractedName.trim().length > 0;

    if (!hasValidName && !hasValidEmail && !hasValidPhone) {
      errors.push('At least one of name, email, or phone number is required');
    }

    // Validate email format if provided
    if (leadData.extractedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(leadData.extractedEmail)) {
        errors.push('Invalid email format');
      }
    }

    // Validate phone number format if provided
    if (phoneNumber) {
      // Basic phone number validation - should contain digits and common phone characters
      const phoneRegex = /^[+]?[0-9\-()\s]+$/;
      if (!phoneRegex.test(phoneNumber)) {
        errors.push('Invalid phone number format');
      }
    }

    // Validate name length if provided
    if (leadData.extractedName && leadData.extractedName.length > 255) {
      errors.push('Name is too long (maximum 255 characters)');
    }

    // Validate company name length if provided
    if (leadData.companyName && leadData.companyName.length > 255) {
      errors.push('Company name is too long (maximum 255 characters)');
    }

    // Validate email length if provided
    if (leadData.extractedEmail && leadData.extractedEmail.length > 255) {
      errors.push('Email is too long (maximum 255 characters)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get contact creation statistics for monitoring
   * Returns metrics about contact auto-creation performance
   * 
   * @param userId - User ID to get statistics for (optional)
   * @param dateRange - Date range for statistics (optional)
   * @returns Contact creation statistics
   */
  static async getContactCreationStats(
    userId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalAutoCreated: number;
    totalUpdated: number;
    createdToday: number;
    updatedToday: number;
    averagePerDay: number;
  }> {
    try {
      let whereClause = "WHERE notes LIKE 'Auto-created from call%'";
      const params: any[] = [];
      let paramIndex = 1;

      if (userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (dateRange) {
        whereClause += ` AND created_at >= $${paramIndex} AND created_at <= $${paramIndex + 1}`;
        params.push(dateRange.start, dateRange.end);
        paramIndex += 2;
      }

      const query = `
        SELECT 
          COUNT(*) as total_auto_created,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as created_today,
          COUNT(CASE WHEN DATE(updated_at) = CURRENT_DATE AND updated_at > created_at THEN 1 END) as updated_today,
          CASE 
            WHEN COUNT(*) > 0 THEN 
              COUNT(*) / GREATEST(1, DATE_PART('day', CURRENT_DATE - MIN(DATE(created_at))) + 1)
            ELSE 0 
          END as average_per_day
        FROM contacts 
        ${whereClause}
      `;

      const result = await database.query(query, params);
      const stats = result.rows[0];

      return {
        totalAutoCreated: parseInt(stats.total_auto_created) || 0,
        totalUpdated: 0, // Would need additional tracking to implement this accurately
        createdToday: parseInt(stats.created_today) || 0,
        updatedToday: parseInt(stats.updated_today) || 0,
        averagePerDay: parseFloat(stats.average_per_day) || 0
      };
    } catch (error) {
      logger.error('Error getting contact creation statistics', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        dateRange
      });

      // Return zero stats on error
      return {
        totalAutoCreated: 0,
        totalUpdated: 0,
        createdToday: 0,
        updatedToday: 0,
        averagePerDay: 0
      };
    }
  }
}