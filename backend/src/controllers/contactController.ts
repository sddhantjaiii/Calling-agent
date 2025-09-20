import { Request, Response } from 'express';
import { ContactService } from '../services/contactService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth';

// Contact controller - handles contact management and bulk uploads
export class ContactController {
  /**
   * Get all contacts for the authenticated user
   */
  static async getContacts(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { 
        search, 
        limit = '50', 
        offset = '0', 
        sortBy = 'name', 
        sortOrder = 'asc' 
      } = req.query;

      const options = {
        search: search as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as 'name' | 'created_at' | 'phone_number',
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await ContactService.getUserContacts(userId, options);
      
      res.json({
        success: true,
        data: {
          contacts: result.contacts,
          pagination: {
            total: result.total,
            limit: options.limit,
            offset: options.offset,
            hasMore: result.total > options.offset + options.limit
          }
        }
      });
    } catch (error) {
      logger.error('Error in getContacts:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve contacts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a new contact
   */
  static async createContact(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { name, phone_number, phoneNumber, email, company, notes } = req.body;
      
      // Handle both field names for compatibility
      const phone = phone_number || phoneNumber;

      // Validate required fields
      if (!name || !phone) {
        return res.status(400).json({ 
          error: 'Name and phone number are required' 
        });
      }

      // Validate phone number format
      if (!ContactService.validatePhoneNumber(phone)) {
        return res.status(400).json({ 
          error: 'Invalid phone number format' 
        });
      }

      const contact = await ContactService.createContact(userId, {
        name,
        phone_number: phone,
        email,
        company,
        notes
      });

      res.status(201).json({
        success: true,
        data: { contact }
      });
    } catch (error) {
      logger.error('Error in createContact:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ 
          error: error.message 
        });
      }

      res.status(500).json({ 
        error: 'Failed to create contact',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update an existing contact
   */
  static async updateContact(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;
      const { name, phone_number, email, company, notes } = req.body;

      // Validate phone number format if provided
      if (phone_number && !ContactService.validatePhoneNumber(phone_number)) {
        return res.status(400).json({ 
          error: 'Invalid phone number format' 
        });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (phone_number !== undefined) updateData.phone_number = phone_number;
      if (email !== undefined) updateData.email = email;
      if (company !== undefined) updateData.company = company;
      if (notes !== undefined) updateData.notes = notes;

      const contact = await ContactService.updateContact(userId, id, updateData);

      res.json({
        success: true,
        data: { contact }
      });
    } catch (error) {
      logger.error('Error in updateContact:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ 
          error: error.message 
        });
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ 
          error: error.message 
        });
      }

      res.status(500).json({ 
        error: 'Failed to update contact',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a contact
   */
  static async deleteContact(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;

      await ContactService.deleteContact(userId, id);

      res.json({
        success: true,
        message: 'Contact deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteContact:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ 
          error: error.message 
        });
      }

      res.status(500).json({ 
        error: 'Failed to delete contact',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a single contact by ID
   */
  static async getContact(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { id } = req.params;

      const contact = await ContactService.getContact(userId, id);

      res.json({
        success: true,
        data: { contact }
      });
    } catch (error) {
      logger.error('Error in getContact:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ 
          error: error.message 
        });
      }

      res.status(500).json({ 
        error: 'Failed to retrieve contact',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get contact statistics for the authenticated user
   */
  static async getContactStats(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const stats = await ContactService.getContactStats(userId);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Error in getContactStats:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve contact statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Lookup contact by phone number (for ElevenLabs integration)
   * This endpoint is used by ElevenLabs to check if a phone number exists in our database
   */
  static async lookupContact(req: Request, res: Response): Promise<Response | void> {
    try {
      const { phone } = req.params;
      const startTime = Date.now();

      // Validate phone parameter
      if (!phone) {
        logger.warn('Contact lookup called without phone number:', {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        return res.status(400).json({ 
          error: 'Phone number is required',
          message: 'Please provide a phone number in the URL path'
        });
      }

      // Validate phone number format
      if (!ContactService.validatePhoneNumber(phone)) {
        logger.warn('Contact lookup called with invalid phone format:', {
          phone: phone.substring(0, 5) + '...',
          ip: req.ip
        });
        return res.status(400).json({ 
          error: 'Invalid phone number format',
          message: 'Please provide a valid phone number'
        });
      }

      // Perform lookup
      const contact = await ContactService.lookupContactByPhone(phone);
      const responseTime = Date.now() - startTime;

      if (contact) {
        // Log successful lookup (without sensitive data)
        logger.info('Contact lookup successful:', {
          phonePrefix: phone.substring(0, 5) + '...',
          contactFound: true,
          hasCompany: !!contact.company,
          responseTime,
          ip: req.ip
        });

        // Return only the information ElevenLabs needs
        res.json({
          success: true,
          data: {
            found: true,
            name: contact.name,
            company: contact.company || null,
            // Optional: Add additional context that might be useful for the agent
            hasEmail: !!contact.email,
            hasNotes: !!contact.notes
          }
        });
      } else {
        // Log unsuccessful lookup
        logger.info('Contact lookup - no match found:', {
          phonePrefix: phone.substring(0, 5) + '...',
          contactFound: false,
          responseTime,
          ip: req.ip
        });

        res.json({
          success: true,
          data: {
            found: false,
            message: 'No contact found for this phone number'
          }
        });
      }
    } catch (error) {
      logger.error('Error in contact lookup:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phone: req.params.phone?.substring(0, 5) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.status(500).json({ 
        error: 'Failed to lookup contact',
        message: 'An internal error occurred while looking up the contact'
      });
    }
  }

  /**
   * Batch lookup contacts by phone numbers (for ElevenLabs integration)
   * This endpoint allows looking up multiple contacts at once for efficiency
   */
  static async batchLookupContacts(req: Request, res: Response): Promise<Response | void> {
    try {
      const { phones } = req.body;
      const startTime = Date.now();

      // Validate input
      if (!phones || !Array.isArray(phones)) {
        return res.status(400).json({ 
          error: 'Phone numbers array is required',
          message: 'Please provide an array of phone numbers in the request body'
        });
      }

      if (phones.length === 0) {
        return res.status(400).json({ 
          error: 'At least one phone number is required',
          message: 'The phones array cannot be empty'
        });
      }

      if (phones.length > 100) {
        return res.status(400).json({ 
          error: 'Too many phone numbers',
          message: 'Maximum 100 phone numbers allowed per batch request'
        });
      }

      // Validate all phone numbers
      const invalidPhones = phones.filter((phone: string) => 
        !phone || typeof phone !== 'string' || !ContactService.validatePhoneNumber(phone)
      );

      if (invalidPhones.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid phone numbers found',
          message: `${invalidPhones.length} phone numbers have invalid format`
        });
      }

      // Perform batch lookup
      const results = await Promise.all(
        phones.map(async (phone: string) => {
          try {
            const contact = await ContactService.lookupContactByPhone(phone);
            return {
              phone,
              found: !!contact,
              name: contact?.name || null,
              company: contact?.company || null,
              hasEmail: !!contact?.email,
              hasNotes: !!contact?.notes
            };
          } catch (error) {
            logger.error(`Error looking up phone ${phone.substring(0, 5)}...`, error);
            return {
              phone,
              found: false,
              error: 'Lookup failed'
            };
          }
        })
      );

      const responseTime = Date.now() - startTime;
      const foundCount = results.filter(r => r.found).length;

      logger.info('Batch contact lookup completed:', {
        totalRequested: phones.length,
        foundCount,
        responseTime,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: phones.length,
            found: foundCount,
            notFound: phones.length - foundCount
          }
        }
      });

    } catch (error) {
      logger.error('Error in batch contact lookup:', error);
      res.status(500).json({ 
        error: 'Failed to perform batch lookup',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Upload contacts from Excel file
   */
  static async uploadContacts(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    console.log('🚀 UPLOAD CONTROLLER CALLED');
    
    try {
      const userId = req.user?.id;
      if (!userId) {
        console.log('❌ User not authenticated');
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      console.log('✅ User authenticated:', userId);

      // Debug logging
      console.log('=== UPLOAD CONTROLLER DEBUG ===');
      console.log('Request headers:', {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
        'authorization': req.headers['authorization'] ? 'Present' : 'Missing'
      });
      console.log('Request body keys:', Object.keys(req.body || {}));
      console.log('Request file:', req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer ? `Buffer(${req.file.buffer.length} bytes)` : 'No buffer'
      } : 'NO FILE OBJECT');
      console.log('Raw req.files:', (req as any).files);
      console.log('================================');

      logger.info('Upload request received', {
        userId,
        contentType: req.headers['content-type'],
        hasFile: !!req.file,
        bodyKeys: Object.keys(req.body || {}),
        fileInfo: req.file ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null
      });

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No file uploaded. Please select an Excel file.' 
        });
      }

      const file = req.file;
      
      // Validate file type
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ 
          error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls).' 
        });
      }

      // Process the upload
      const results = await ContactService.processContactUpload(
        userId, 
        file.buffer, 
        file.originalname
      );

      // Return results
      res.json({
        success: true,
        message: `Upload completed. ${results.success} contacts added successfully.`,
        data: {
          summary: {
            totalProcessed: results.totalProcessed,
            successful: results.success,
            failed: results.failed,
            duplicates: results.duplicates
          },
          errors: results.errors.length > 0 ? results.errors : undefined
        }
      });

    } catch (error) {
      logger.error('Error in uploadContacts:', error);
      
      if (error instanceof Error && error.message.includes('Maximum 1000 contacts')) {
        return res.status(400).json({ 
          error: error.message 
        });
      }

      if (error instanceof Error && error.message.includes('Failed to parse')) {
        return res.status(400).json({ 
          error: error.message 
        });
      }

      res.status(500).json({ 
        error: 'Failed to process contact upload',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Download Excel template for contact upload
   */
  static async downloadTemplate(req: Request, res: Response): Promise<Response | void> {
    try {
      const templateBuffer = ContactService.generateExcelTemplate();
      
      // Set comprehensive headers for Excel file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="contact_upload_template.xlsx"');
      res.setHeader('Content-Length', templateBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Send the buffer directly
      res.end(templateBuffer);

    } catch (error) {
      logger.error('Error in downloadTemplate:', error);
      res.status(500).json({ 
        error: 'Failed to generate template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}