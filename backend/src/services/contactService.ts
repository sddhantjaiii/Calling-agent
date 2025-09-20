import ContactModel, { ContactInterface, CreateContactData, UpdateContactData } from '../models/Contact';
import { logger } from '../utils/logger';
import * as XLSX from 'xlsx';

// Contact service - business logic for contact management
export class ContactService {
  /**
   * Get all contacts for a user with optional search and filtering
   */
  static async getUserContacts(
    userId: string, 
    options: {
      search?: string;
      limit?: number;
      offset?: number;
      sortBy?: 'name' | 'created_at' | 'phone_number';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ contacts: ContactInterface[]; total: number }> {
    try {
      const { search, limit = 50, offset = 0, sortBy = 'name', sortOrder = 'asc' } = options;

      let contacts: ContactInterface[];
      let total: number;

      if (search) {
        // Enhanced search with auto-creation info
        const query = `
          SELECT c.*, 
            calls.elevenlabs_conversation_id as linked_call_id,
            CASE 
              WHEN c.auto_created_from_call_id IS NOT NULL THEN 'auto_created'
              WHEN EXISTS(SELECT 1 FROM calls WHERE contact_id = c.id) THEN 'manually_linked'
              ELSE 'not_linked'
            END as call_link_type
          FROM contacts c
          LEFT JOIN calls ON c.auto_created_from_call_id = calls.id
          WHERE c.user_id = $1 
          AND (c.name ILIKE $2 OR c.phone_number LIKE $3 OR c.email ILIKE $2 OR c.company ILIKE $2)
          ORDER BY c.name
        `;
        const result = await ContactModel.query(query, [userId, `%${search}%`, `%${search}%`]);
        contacts = result.rows;
        total = contacts.length;
        
        // Apply pagination to search results
        contacts = contacts.slice(offset, offset + limit);
      } else {
        // Get all contacts with pagination, sorting, and auto-creation info
        const query = `
          SELECT c.*, 
            calls.elevenlabs_conversation_id as linked_call_id,
            CASE 
              WHEN c.auto_created_from_call_id IS NOT NULL THEN 'auto_created'
              WHEN EXISTS(SELECT 1 FROM calls WHERE contact_id = c.id) THEN 'manually_linked'
              ELSE 'not_linked'
            END as call_link_type
          FROM contacts c
          LEFT JOIN calls ON c.auto_created_from_call_id = calls.id
          WHERE c.user_id = $1 
          ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}
          LIMIT $2 OFFSET $3
        `;
        const result = await ContactModel.query(query, [userId, limit, offset]);
        contacts = result.rows;

        // Get total count
        const countResult = await ContactModel.query(
          'SELECT COUNT(*) as count FROM contacts WHERE user_id = $1',
          [userId]
        );
        total = parseInt(countResult.rows[0].count);
      }

      return { contacts, total };
    } catch (error) {
      logger.error('Error getting user contacts:', error);
      throw new Error('Failed to retrieve contacts');
    }
  }

  /**
   * Create a new contact
   */
  static async createContact(userId: string, contactData: Omit<CreateContactData, 'user_id'>): Promise<ContactInterface> {
    try {
      // Validate phone number format
      const phoneNumber = this.normalizePhoneNumber(contactData.phone_number);
      
      // Check for duplicate phone number for this user
      const existingContact = await ContactModel.query(
        'SELECT id FROM contacts WHERE user_id = $1 AND phone_number = $2',
        [userId, phoneNumber]
      );

      if (existingContact.rows.length > 0) {
        throw new Error('Contact with this phone number already exists');
      }

      const newContact = await ContactModel.createContact({
        ...contactData,
        user_id: userId,
        phone_number: phoneNumber
      });

      logger.info(`Contact created for user ${userId}:`, { contactId: newContact.id });
      return newContact;
    } catch (error) {
      logger.error('Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Update an existing contact
   */
  static async updateContact(
    userId: string, 
    contactId: string, 
    updateData: UpdateContactData
  ): Promise<ContactInterface> {
    try {
      // Verify contact belongs to user
      const existingContact = await ContactModel.query(
        'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );

      if (existingContact.rows.length === 0) {
        throw new Error('Contact not found or access denied');
      }

      // Normalize phone number if provided
      if (updateData.phone_number) {
        updateData.phone_number = this.normalizePhoneNumber(updateData.phone_number);
        
        // Check for duplicate phone number (excluding current contact)
        const duplicateCheck = await ContactModel.query(
          'SELECT id FROM contacts WHERE user_id = $1 AND phone_number = $2 AND id != $3',
          [userId, updateData.phone_number, contactId]
        );

        if (duplicateCheck.rows.length > 0) {
          throw new Error('Another contact with this phone number already exists');
        }
      }

      const updatedContact = await ContactModel.updateContact(contactId, updateData);
      
      if (!updatedContact) {
        throw new Error('Failed to update contact');
      }

      logger.info(`Contact updated for user ${userId}:`, { contactId });
      return updatedContact;
    } catch (error) {
      logger.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete a contact
   */
  static async deleteContact(userId: string, contactId: string): Promise<void> {
    try {
      // Verify contact belongs to user
      const existingContact = await ContactModel.query(
        'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
        [contactId, userId]
      );

      if (existingContact.rows.length === 0) {
        throw new Error('Contact not found or access denied');
      }

      await ContactModel.delete(contactId);
      logger.info(`Contact deleted for user ${userId}:`, { contactId });
    } catch (error) {
      logger.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Get a single contact by ID
   */
  static async getContact(userId: string, contactId: string): Promise<ContactInterface> {
    try {
      const query = `
        SELECT c.*, 
          calls.elevenlabs_conversation_id as linked_call_id,
          calls.created_at as call_created_at,
          CASE 
            WHEN c.auto_created_from_call_id IS NOT NULL THEN 'auto_created'
            WHEN EXISTS(SELECT 1 FROM calls WHERE contact_id = c.id) THEN 'manually_linked'
            ELSE 'not_linked'
          END as call_link_type
        FROM contacts c
        LEFT JOIN calls ON c.auto_created_from_call_id = calls.id
        WHERE c.id = $1 AND c.user_id = $2
      `;
      
      const result = await ContactModel.query(query, [contactId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Contact not found or access denied');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting contact:', error);
      throw error;
    }
  }

  /**
   * Lookup contact by phone number (for ElevenLabs integration)
   */
  static async lookupContactByPhone(phoneNumber: string): Promise<ContactInterface | null> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const contact = await ContactModel.findByPhoneNumber(normalizedPhone);
      
      if (contact) {
        logger.info('Contact found for phone lookup:', { phoneNumber: normalizedPhone });
      }
      
      return contact;
    } catch (error) {
      logger.error('Error looking up contact by phone:', error);
      return null; // Return null instead of throwing for external API
    }
  }

  /**
   * Get contact statistics for a user
   */
  static async getContactStats(userId: string): Promise<{
    totalContacts: number;
    recentContacts: number;
    contactsWithCalls: number;
    autoCreatedContacts: number;
    manuallyCreatedContacts: number;
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_contacts,
          COUNT(CASE WHEN c.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_contacts,
          COUNT(CASE WHEN calls.contact_id IS NOT NULL OR c.auto_created_from_call_id IS NOT NULL THEN 1 END) as contacts_with_calls,
          COUNT(CASE WHEN c.is_auto_created = TRUE THEN 1 END) as auto_created_contacts,
          COUNT(CASE WHEN c.is_auto_created = FALSE THEN 1 END) as manually_created_contacts
        FROM contacts c
        LEFT JOIN calls ON c.id = calls.contact_id
        WHERE c.user_id = $1
      `;
      
      const result = await ContactModel.query(statsQuery, [userId]);
      const stats = result.rows[0];
      
      return {
        totalContacts: parseInt(stats.total_contacts),
        recentContacts: parseInt(stats.recent_contacts),
        contactsWithCalls: parseInt(stats.contacts_with_calls),
        autoCreatedContacts: parseInt(stats.auto_created_contacts),
        manuallyCreatedContacts: parseInt(stats.manually_created_contacts)
      };
    } catch (error) {
      logger.error('Error getting contact stats:', error);
      throw new Error('Failed to retrieve contact statistics');
    }
  }

  /**
   * Normalize phone number format
   */
  private static normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Basic validation - should have at least 10 digits
    if (digitsOnly.length < 10) {
      throw new Error('Invalid phone number format');
    }
    
    // For US numbers, ensure they start with country code
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    } else {
      // For international numbers, add + if not present
      return digitsOnly.startsWith('+') ? digitsOnly : `+${digitsOnly}`;
    }
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    try {
      this.normalizePhoneNumber(phoneNumber);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Process Excel bulk upload
   */
  static async processContactUpload(
    userId: string, 
    fileBuffer: Buffer, 
    filename: string
  ): Promise<{
    success: number;
    failed: number;
    duplicates: number;
    errors: Array<{ row: number; error: string; data?: any }>;
    totalProcessed: number;
  }> {
    try {
      logger.info(`Processing contact upload for user ${userId}:`, { filename });

      // Parse Excel file
      const contacts = this.parseExcelFile(fileBuffer, filename);
      
      // Validate contact limit
      if (contacts.length > 1000) {
        throw new Error('Maximum 1000 contacts allowed per upload');
      }

      // Process contacts in batches
      const results = {
        success: 0,
        failed: 0,
        duplicates: 0,
        errors: [] as Array<{ row: number; error: string; data?: any }>,
        totalProcessed: contacts.length
      };

      // Get existing phone numbers for this user to check duplicates
      const existingPhones = await this.getExistingPhoneNumbers(userId);
      const processedPhones = new Set<string>();

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const rowNumber = i + 2; // Excel row number (accounting for header)

        try {
          // Validate required fields
          if (!contact.name || !contact.phone_number) {
            results.errors.push({
              row: rowNumber,
              error: 'Name and phone number are required',
              data: contact
            });
            results.failed++;
            continue;
          }

          // Normalize and validate phone number
          let normalizedPhone: string;
          try {
            normalizedPhone = this.normalizePhoneNumber(contact.phone_number);
          } catch (error) {
            results.errors.push({
              row: rowNumber,
              error: 'Invalid phone number format',
              data: contact
            });
            results.failed++;
            continue;
          }

          // Check for duplicates in existing data
          if (existingPhones.has(normalizedPhone)) {
            results.errors.push({
              row: rowNumber,
              error: 'Phone number already exists in your contacts',
              data: contact
            });
            results.duplicates++;
            continue;
          }

          // Check for duplicates within the upload file
          if (processedPhones.has(normalizedPhone)) {
            results.errors.push({
              row: rowNumber,
              error: 'Duplicate phone number in upload file',
              data: contact
            });
            results.duplicates++;
            continue;
          }

          // Create contact
          await ContactModel.createContact({
            user_id: userId,
            name: contact.name.trim(),
            phone_number: normalizedPhone,
            email: contact.email?.trim() || undefined,
            company: contact.company?.trim() || undefined,
            notes: contact.notes?.trim() || undefined
          });

          processedPhones.add(normalizedPhone);
          results.success++;

        } catch (error) {
          logger.error(`Error processing contact at row ${rowNumber}:`, error);
          results.errors.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: contact
          });
          results.failed++;
        }
      }

      logger.info(`Contact upload completed for user ${userId}:`, results);
      return results;

    } catch (error) {
      logger.error('Error processing contact upload:', error);
      throw error;
    }
  }

  /**
   * Parse Excel file and extract contact data
   */
  private static parseExcelFile(fileBuffer: Buffer, filename: string): Array<{
    name: string;
    phone_number: string;
    email?: string;
    company?: string;
    notes?: string;
  }> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      
      if (!sheetName) {
        throw new Error('No sheets found in the Excel file');
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        throw new Error('Excel file must contain at least a header row and one data row');
      }

      // Get header row and normalize column names
      const headers = jsonData[0].map((header: string) => 
        header?.toString().toLowerCase().trim().replace(/\s+/g, '_')
      );

      // Find required column indices
      const nameIndex = this.findColumnIndex(headers, ['name', 'full_name', 'contact_name']);
      const phoneIndex = this.findColumnIndex(headers, ['phone', 'phone_number', 'mobile', 'cell']);

      if (nameIndex === -1) {
        throw new Error('Name column not found. Expected columns: name, full_name, or contact_name');
      }

      if (phoneIndex === -1) {
        throw new Error('Phone column not found. Expected columns: phone, phone_number, mobile, or cell');
      }

      // Find optional column indices
      const emailIndex = this.findColumnIndex(headers, ['email', 'email_address']);
      const companyIndex = this.findColumnIndex(headers, ['company', 'organization', 'business']);
      const notesIndex = this.findColumnIndex(headers, ['notes', 'comments', 'description']);

      // Process data rows
      const contacts = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Skip empty rows
        if (!row || row.every(cell => !cell)) {
          continue;
        }

        const contact = {
          name: row[nameIndex]?.toString().trim() || '',
          phone_number: row[phoneIndex]?.toString().trim() || '',
          email: emailIndex !== -1 ? row[emailIndex]?.toString().trim() : undefined,
          company: companyIndex !== -1 ? row[companyIndex]?.toString().trim() : undefined,
          notes: notesIndex !== -1 ? row[notesIndex]?.toString().trim() : undefined
        };

        // Remove empty optional fields
        if (!contact.email) delete contact.email;
        if (!contact.company) delete contact.company;
        if (!contact.notes) delete contact.notes;

        contacts.push(contact);
      }

      return contacts;

    } catch (error) {
      logger.error('Error parsing Excel file:', error);
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find column index by possible column names
   */
  private static findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const index = headers.findIndex(header => header === name);
      if (index !== -1) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Get existing phone numbers for a user
   */
  private static async getExistingPhoneNumbers(userId: string): Promise<Set<string>> {
    try {
      const result = await ContactModel.query(
        'SELECT phone_number FROM contacts WHERE user_id = $1',
        [userId]
      );
      
      return new Set(result.rows.map((row: any) => row.phone_number));
    } catch (error) {
      logger.error('Error getting existing phone numbers:', error);
      throw new Error('Failed to check existing contacts');
    }
  }

  /**
   * Generate Excel template for contact upload
   */
  static generateExcelTemplate(): Buffer {
    try {
      const templateData = [
        ['name', 'phone_number', 'email', 'company', 'notes'],
        ['John Doe', '+91 9876543210', 'john@example.com', 'Example Corp', 'Sample contact'],
        ['Jane Smith', '+91 8765432109', 'jane@company.com', 'Tech Solutions', 'Important client']
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

      // Set column widths
      worksheet['!cols'] = [
        { width: 20 }, // name
        { width: 15 }, // phone_number
        { width: 25 }, // email
        { width: 20 }, // company
        { width: 30 }  // notes
      ];

      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    } catch (error) {
      logger.error('Error generating Excel template:', error);
      throw new Error('Failed to generate Excel template');
    }
  }
}