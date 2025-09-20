/**
 * Contact Auto-Creation Service Tests
 * 
 * This test suite verifies contact auto-creation functionality including:
 * - Contact creation from webhook extraction data
 * - Duplicate contact prevention by email and phone
 * - Contact updating with better data when available
 * - Contact linking to call records
 * - Data validation and error handling
 * 
 * Requirements: US-1.3 Automatic Contact Creation
 */

import { ContactAutoCreationService } from '../contactAutoCreationService';
import { EnhancedLeadData } from '../webhookDataProcessor';
import database from '../../config/database';

// Mock the database module
jest.mock('../../config/database');
const mockDatabase = database as jest.Mocked<typeof database>;

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ContactAutoCreationService', () => {
  const mockUserId = 'user-123';
  const mockCallId = 'call-456';
  const mockContactId = 'contact-789';
  const mockPhoneNumber = '+1234567890';

  const mockLeadData: EnhancedLeadData = {
    companyName: 'Test Company',
    extractedName: 'John Doe',
    extractedEmail: 'john.doe@testcompany.com',
    ctaPricingClicked: false,
    ctaDemoClicked: true,
    ctaFollowupClicked: false,
    ctaSampleClicked: false,
    ctaEscalatedToHuman: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdateContact', () => {
    test('should skip contact creation when no meaningful data is provided', async () => {
      const emptyLeadData: EnhancedLeadData = {
        companyName: null,
        extractedName: null,
        extractedEmail: null,
        ctaPricingClicked: false,
        ctaDemoClicked: false,
        ctaFollowupClicked: false,
        ctaSampleClicked: false,
        ctaEscalatedToHuman: false
      };

      const result = await ContactAutoCreationService.createOrUpdateContact(
        mockUserId,
        emptyLeadData,
        mockCallId
      );

      expect(result).toEqual({
        contactId: null,
        created: false,
        updated: false,
        error: 'No meaningful contact data available'
      });
    });

    test('should create new contact when no existing contact is found', async () => {
      // Mock no existing contact found
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] }) // findContactByEmail
        .mockResolvedValueOnce({ rows: [] }) // findContactByPhone
        .mockResolvedValueOnce({ rows: [{ id: mockContactId }] }); // createNewContact

      const result = await ContactAutoCreationService.createOrUpdateContact(
        mockUserId,
        mockLeadData,
        mockCallId,
        mockPhoneNumber
      );

      expect(result).toEqual({
        contactId: mockContactId,
        created: true,
        updated: false
      });

      // Verify contact creation query
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO contacts'),
        [
          mockUserId,
          mockLeadData.extractedName,
          mockLeadData.extractedEmail,
          mockPhoneNumber,
          mockLeadData.companyName,
          `Auto-created from call ${mockCallId}`
        ]
      );
    });

    test('should update existing contact found by email', async () => {
      const existingContact = {
        id: mockContactId,
        name: null,
        email: mockLeadData.extractedEmail,
        phone_number: null,
        company: null
      };

      // Mock existing contact found by email
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [existingContact] }) // findContactByEmail
        .mockResolvedValueOnce({ rowCount: 1 }); // updateContactIfBetter

      const result = await ContactAutoCreationService.createOrUpdateContact(
        mockUserId,
        mockLeadData,
        mockCallId,
        mockPhoneNumber
      );

      expect(result).toEqual({
        contactId: mockContactId,
        created: false,
        updated: true
      });

      // Verify update query was called
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE contacts'),
        expect.arrayContaining([mockLeadData.extractedName, mockPhoneNumber, mockLeadData.companyName, mockContactId])
      );
    });

    test('should update existing contact found by phone', async () => {
      const existingContact = {
        id: mockContactId,
        name: null,
        email: null,
        phone_number: mockPhoneNumber,
        company: null
      };

      // Mock no contact found by email, but found by phone
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] }) // findContactByEmail
        .mockResolvedValueOnce({ rows: [existingContact] }) // findContactByPhone
        .mockResolvedValueOnce({ rowCount: 1 }); // updateContactIfBetter

      const result = await ContactAutoCreationService.createOrUpdateContact(
        mockUserId,
        mockLeadData,
        mockCallId,
        mockPhoneNumber
      );

      expect(result).toEqual({
        contactId: mockContactId,
        created: false,
        updated: true
      });
    });

    test('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockDatabase.query.mockRejectedValueOnce(dbError);

      const result = await ContactAutoCreationService.createOrUpdateContact(
        mockUserId,
        mockLeadData,
        mockCallId,
        mockPhoneNumber
      );

      expect(result).toEqual({
        contactId: null,
        created: false,
        updated: false,
        error: 'Database connection failed'
      });
    });
  });

  describe('linkContactToCall', () => {
    test('should successfully link contact to call', async () => {
      mockDatabase.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await ContactAutoCreationService.linkContactToCall(mockCallId, mockContactId);

      expect(result).toBe(true);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE calls'),
        [mockCallId, mockContactId]
      );
    });

    test('should return false when no rows are affected', async () => {
      mockDatabase.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await ContactAutoCreationService.linkContactToCall(mockCallId, mockContactId);

      expect(result).toBe(false);
    });

    test('should handle database errors when linking', async () => {
      const dbError = new Error('Database error');
      mockDatabase.query.mockRejectedValueOnce(dbError);

      await expect(
        ContactAutoCreationService.linkContactToCall(mockCallId, mockContactId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('validateContactData', () => {
    test('should validate correct contact data', () => {
      const result = ContactAutoCreationService.validateContactData(mockLeadData, mockPhoneNumber);

      expect(result).toEqual({
        valid: true,
        errors: []
      });
    });

    test('should reject data with no meaningful contact information', () => {
      const emptyLeadData: EnhancedLeadData = {
        companyName: null,
        extractedName: null,
        extractedEmail: null,
        ctaPricingClicked: false,
        ctaDemoClicked: false,
        ctaFollowupClicked: false,
        ctaSampleClicked: false,
        ctaEscalatedToHuman: false
      };

      const result = ContactAutoCreationService.validateContactData(emptyLeadData);

      expect(result).toEqual({
        valid: false,
        errors: ['At least one of name, email, or phone number is required']
      });
    });

    test('should reject invalid email format', () => {
      const invalidEmailLeadData: EnhancedLeadData = {
        ...mockLeadData,
        extractedEmail: 'invalid-email'
      };

      const result = ContactAutoCreationService.validateContactData(invalidEmailLeadData, mockPhoneNumber);

      expect(result).toEqual({
        valid: false,
        errors: ['Invalid email format']
      });
    });

    test('should reject invalid phone number format', () => {
      const result = ContactAutoCreationService.validateContactData(mockLeadData, 'invalid-phone');

      expect(result).toEqual({
        valid: false,
        errors: ['Invalid phone number format']
      });
    });

    test('should reject data that is too long', () => {
      const longDataLeadData: EnhancedLeadData = {
        ...mockLeadData,
        extractedName: 'a'.repeat(256),
        extractedEmail: 'a'.repeat(250) + '@test.com',
        companyName: 'b'.repeat(256)
      };

      const result = ContactAutoCreationService.validateContactData(longDataLeadData, mockPhoneNumber);

      expect(result).toEqual({
        valid: false,
        errors: [
          'Name is too long (maximum 255 characters)',
          'Company name is too long (maximum 255 characters)',
          'Email is too long (maximum 255 characters)'
        ]
      });
    });

    test('should validate multiple errors at once', () => {
      const invalidLeadData: EnhancedLeadData = {
        companyName: null,
        extractedName: null,
        extractedEmail: 'invalid-email',
        ctaPricingClicked: false,
        ctaDemoClicked: false,
        ctaFollowupClicked: false,
        ctaSampleClicked: false,
        ctaEscalatedToHuman: false
      };

      const result = ContactAutoCreationService.validateContactData(invalidLeadData, 'invalid-phone');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
      expect(result.errors).toContain('Invalid phone number format');
      // Note: The "at least one required" error is not triggered because we have an email (even if invalid)
    });
  });

  describe('getContactCreationStats', () => {
    test('should return contact creation statistics', async () => {
      const mockStats = {
        total_auto_created: '10',
        created_today: '2',
        updated_today: '1',
        average_per_day: '1.5'
      };

      mockDatabase.query.mockResolvedValueOnce({ rows: [mockStats] });

      const result = await ContactAutoCreationService.getContactCreationStats(mockUserId);

      expect(result).toEqual({
        totalAutoCreated: 10,
        totalUpdated: 0,
        createdToday: 2,
        updatedToday: 1,
        averagePerDay: 1.5
      });

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE notes LIKE 'Auto-created from call%'"),
        [mockUserId]
      );
    });

    test('should return zero stats on database error', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await ContactAutoCreationService.getContactCreationStats(mockUserId);

      expect(result).toEqual({
        totalAutoCreated: 0,
        totalUpdated: 0,
        createdToday: 0,
        updatedToday: 0,
        averagePerDay: 0
      });
    });

    test('should handle date range filtering', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const mockStats = {
        total_auto_created: '5',
        created_today: '0',
        updated_today: '0',
        average_per_day: '0.16'
      };

      mockDatabase.query.mockResolvedValueOnce({ rows: [mockStats] });

      const result = await ContactAutoCreationService.getContactCreationStats(mockUserId, dateRange);

      expect(result.totalAutoCreated).toBe(5);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('AND created_at >= $2 AND created_at <= $3'),
        [mockUserId, dateRange.start, dateRange.end]
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null lead data gracefully', async () => {
      const nullLeadData = null as any;

      const result = await ContactAutoCreationService.createOrUpdateContact(
        mockUserId,
        nullLeadData,
        mockCallId,
        mockPhoneNumber
      );

      expect(result.created).toBe(false);
      expect(result.contactId).toBe(null);
      expect(result.error).toBeDefined();
    });

    test('should handle empty strings as null values', async () => {
      const emptyStringLeadData: EnhancedLeadData = {
        companyName: '',
        extractedName: '',
        extractedEmail: '',
        ctaPricingClicked: false,
        ctaDemoClicked: false,
        ctaFollowupClicked: false,
        ctaSampleClicked: false,
        ctaEscalatedToHuman: false
      };

      const result = await ContactAutoCreationService.createOrUpdateContact(
        mockUserId,
        emptyStringLeadData,
        mockCallId,
        ''
      );

      expect(result.created).toBe(false);
      expect(result.error).toBe('No meaningful contact data available');
    });

    test('should handle special characters in contact data', async () => {
      const specialCharLeadData: EnhancedLeadData = {
        companyName: "O'Reilly & Associates",
        extractedName: "José María García-López",
        extractedEmail: "jose.maria@o-reilly.com",
        ctaPricingClicked: false,
        ctaDemoClicked: false,
        ctaFollowupClicked: false,
        ctaSampleClicked: false,
        ctaEscalatedToHuman: false
      };

      const result = ContactAutoCreationService.validateContactData(
        specialCharLeadData,
        '+34 91 123 45 67'
      );

      expect(result.valid).toBe(true);
    });

    test('should handle database connection timeout', async () => {
      const timeoutError = new Error('Connection timeout');
      mockDatabase.query.mockRejectedValueOnce(timeoutError);

      const result = await ContactAutoCreationService.createOrUpdateContact(
        mockUserId,
        mockLeadData,
        mockCallId,
        mockPhoneNumber
      );

      expect(result).toEqual({
        contactId: null,
        created: false,
        updated: false,
        error: 'Connection timeout'
      });
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete workflow: create contact and link to call', async () => {
      // Mock successful contact creation
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] }) // findContactByEmail
        .mockResolvedValueOnce({ rows: [] }) // findContactByPhone
        .mockResolvedValueOnce({ rows: [{ id: mockContactId }] }) // createNewContact
        .mockResolvedValueOnce({ rowCount: 1 }); // linkContactToCall

      const createResult = await ContactAutoCreationService.createOrUpdateContact(
        mockUserId,
        mockLeadData,
        mockCallId,
        mockPhoneNumber
      );

      expect(createResult.created).toBe(true);
      expect(createResult.contactId).toBe(mockContactId);

      const linkResult = await ContactAutoCreationService.linkContactToCall(mockCallId, mockContactId);
      expect(linkResult).toBe(true);
    });

    test('should handle partial data scenarios', async () => {
      const partialLeadData: EnhancedLeadData = {
        companyName: 'Test Company',
        extractedName: null,
        extractedEmail: null,
        ctaPricingClicked: false,
        ctaDemoClicked: false,
        ctaFollowupClicked: false,
        ctaSampleClicked: false,
        ctaEscalatedToHuman: false
      };

      // Should still create contact with just company name and phone
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] }) // findContactByPhone
        .mockResolvedValueOnce({ rows: [{ id: mockContactId }] }); // createNewContact

      const result = await ContactAutoCreationService.createOrUpdateContact(
        mockUserId,
        partialLeadData,
        mockCallId,
        mockPhoneNumber
      );

      expect(result.created).toBe(true);
      expect(result.contactId).toBe(mockContactId);
    });
  });
});