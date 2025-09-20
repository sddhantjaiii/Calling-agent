/**
 * Call Source Detection Tests
 * 
 * This test suite verifies call source detection functionality including:
 * - Phone call identification and labeling
 * - Internet call identification and labeling
 * - Unknown source handling and graceful fallbacks
 * - Call source storage and historical data categorization
 * 
 * Requirements: Call Source Detection Acceptance Criteria
 */

import { WebhookDataProcessor } from '../webhookDataProcessor';

describe('Call Source Detection Tests', () => {
  describe('Phone Call Identification', () => {
    test('should correctly identify phone calls with valid phone numbers', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+1234567890',
            system__call_type: 'phone'
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('phone');
    });

    test('should identify phone calls with international numbers', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+44 20 7946 0958',
            system__call_type: 'phone'
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('phone');
    });

    test('should identify phone calls with formatted numbers', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '(555) 123-4567',
            system__call_type: 'phone'
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('phone');
    });

    test('should identify phone calls with unformatted numbers', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '5551234567',
            system__call_type: 'phone'
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('phone');
    });

    test('should identify phone calls even without explicit call_type', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+1-555-123-4567'
            // No system__call_type provided
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('phone');
    });

    test('should handle phone calls with new ElevenLabs format', () => {
      const webhookData = {
        data: {
          conversation_initiation_client_data: {
            dynamic_variables: {
              system__caller_id: '+1234567890',
              system__call_type: 'phone'
            }
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('phone');
    });
  });

  describe('Internet Call Identification', () => {
    test('should correctly identify internet calls with internal caller_id', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'internal',
            system__call_type: 'web'
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('internet');
    });

    test('should identify internet calls with web call_type', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'internal',
            system__call_type: 'web'
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('internet');
    });

    test('should identify internet calls with browser call_type', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'internal',
            system__call_type: 'browser'
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('internet');
    });

    test('should identify internet calls with only internal caller_id', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'internal'
            // No system__call_type provided
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('internet');
    });

    test('should handle internet calls with new ElevenLabs format', () => {
      const webhookData = {
        data: {
          conversation_initiation_client_data: {
            dynamic_variables: {
              system__caller_id: 'internal',
              system__call_type: 'web'
            }
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('internet');
    });

    test('should identify internet calls with web call_type regardless of caller_id', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'some-session-id',
            system__call_type: 'web'
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('internet');
    });
  });

  describe('Unknown Source Handling', () => {
    test('should handle missing dynamic_variables gracefully', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          // No dynamic_variables
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('unknown');
    });

    test('should handle missing conversation_initiation_client_data gracefully', () => {
      const webhookData = {
        // No conversation_initiation_client_data
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('unknown');
    });

    test('should handle empty webhook data gracefully', () => {
      const webhookData = {};

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('unknown');
    });

    test('should handle null webhook data gracefully', () => {
      const webhookData = null;

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('unknown');
    });

    test('should handle undefined webhook data gracefully', () => {
      const webhookData = undefined;

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('unknown');
    });

    test('should handle malformed webhook data gracefully', () => {
      const webhookData = 'invalid-data';

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('unknown');
    });

    test('should handle empty caller_id and call_type', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '',
            system__call_type: ''
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('unknown');
    });

    test('should handle null caller_id and call_type', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: null,
            system__call_type: null
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('unknown');
    });

    test('should handle unrecognized call_type', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'some-id',
            system__call_type: 'unknown-type'
          }
        }
      };

      const callSource = WebhookDataProcessor.determineCallSource(webhookData);
      expect(callSource).toBe('unknown');
    });
  });

  describe('Contact Information Extraction', () => {
    test('should extract phone contact info for phone calls', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+1234567890',
            caller_name: 'John Doe',
            caller_email: 'john@example.com'
          }
        }
      };

      const contactInfo = WebhookDataProcessor.extractContactInfo(webhookData);
      expect(contactInfo).toEqual({
        phoneNumber: '+1234567890',
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    test('should extract partial contact info when available', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+1234567890',
            caller_name: 'John Doe'
            // No email provided
          }
        }
      };

      const contactInfo = WebhookDataProcessor.extractContactInfo(webhookData);
      expect(contactInfo).toEqual({
        phoneNumber: '+1234567890',
        name: 'John Doe',
        email: null
      });
    });

    test('should return null for internet calls without contact info', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'internal',
            system__call_type: 'web'
          }
        }
      };

      const contactInfo = WebhookDataProcessor.extractContactInfo(webhookData);
      expect(contactInfo).toBeNull();
    });

    test('should extract email for internet calls when provided', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'internal',
            system__call_type: 'web',
            caller_email: 'visitor@example.com',
            caller_name: 'Web Visitor'
          }
        }
      };

      const contactInfo = WebhookDataProcessor.extractContactInfo(webhookData);
      expect(contactInfo).toEqual({
        phoneNumber: null,
        name: 'Web Visitor',
        email: 'visitor@example.com'
      });
    });

    test('should not create fake contact information', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'internal',
            system__call_type: 'web'
            // No contact information provided
          }
        }
      };

      const contactInfo = WebhookDataProcessor.extractContactInfo(webhookData);
      expect(contactInfo).toBeNull();
    });

    test('should handle new ElevenLabs format for contact extraction', () => {
      const webhookData = {
        data: {
          conversation_initiation_client_data: {
            dynamic_variables: {
              system__caller_id: '+1234567890',
              caller_name: 'Jane Smith',
              caller_email: 'jane@example.com'
            }
          }
        }
      };

      const contactInfo = WebhookDataProcessor.extractContactInfo(webhookData);
      expect(contactInfo).toEqual({
        phoneNumber: '+1234567890',
        name: 'Jane Smith',
        email: 'jane@example.com'
      });
    });
  });

  describe('Comprehensive Call Source Info', () => {
    test('should return complete call source info for phone calls', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+1234567890',
            caller_name: 'John Doe',
            caller_email: 'john@example.com'
          }
        }
      };

      const callSourceInfo = WebhookDataProcessor.getCallSourceInfo(webhookData);
      expect(callSourceInfo).toEqual({
        callSource: 'phone',
        contactInfo: {
          phoneNumber: '+1234567890',
          name: 'John Doe',
          email: 'john@example.com'
        }
      });
    });

    test('should return complete call source info for internet calls', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'internal',
            system__call_type: 'web',
            caller_email: 'visitor@example.com'
          }
        }
      };

      const callSourceInfo = WebhookDataProcessor.getCallSourceInfo(webhookData);
      expect(callSourceInfo).toEqual({
        callSource: 'internet',
        contactInfo: {
          phoneNumber: null,
          name: null,
          email: 'visitor@example.com'
        }
      });
    });

    test('should return call source info with null contact for unknown calls', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'unknown-format'
          }
        }
      };

      const callSourceInfo = WebhookDataProcessor.getCallSourceInfo(webhookData);
      expect(callSourceInfo).toEqual({
        callSource: 'unknown',
        contactInfo: null
      });
    });
  });

  describe('Call Metadata Extraction', () => {
    test('should extract call metadata with correct call source', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+1234567890',
            system__called_number: '+0987654321',
            system__call_duration_secs: 120,
            system__time_utc: '2024-01-15T10:30:00Z'
          }
        },
        analysis: {
          call_summary_title: 'Customer inquiry about pricing'
        }
      };

      const metadata = WebhookDataProcessor.extractCallMetadata(webhookData);
      
      expect(metadata.call_type).toBe('phone');
      expect(metadata.call_source).toBe('phone');
      expect(metadata.caller_id).toBe('+1234567890');
      expect(metadata.called_number).toBe('+0987654321');
      expect(metadata.call_duration_secs).toBe(120);
      expect(metadata.call_duration_minutes).toBe(2);
      expect(metadata.call_analysis_summary).toBe('Customer inquiry about pricing');
      expect(metadata.call_timestamp).toBe('2024-01-15T10:30:00Z');
    });

    test('should handle metadata extraction errors gracefully', () => {
      const webhookData = null;

      const metadata = WebhookDataProcessor.extractCallMetadata(webhookData);
      
      expect(metadata.call_type).toBe('unknown');
      expect(metadata.call_source).toBe('unknown');
      expect(metadata.caller_id).toBeNull();
      expect(metadata.call_duration_secs).toBe(0);
      expect(metadata.call_duration_minutes).toBe(0);
      expect(metadata.analysis_received_at).toBeDefined();
    });
  });

  describe('Webhook Validation', () => {
    test('should validate proper webhook structure', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+1234567890'
          }
        }
      };

      const isValid = WebhookDataProcessor.validateWebhookForCallSource(webhookData);
      expect(isValid).toBe(true);
    });

    test('should validate new ElevenLabs format', () => {
      const webhookData = {
        data: {
          conversation_initiation_client_data: {
            dynamic_variables: {
              system__caller_id: '+1234567890'
            }
          }
        }
      };

      const isValid = WebhookDataProcessor.validateWebhookForCallSource(webhookData);
      expect(isValid).toBe(true);
    });

    test('should reject invalid webhook structure', () => {
      const webhookData = {
        // Missing conversation_initiation_client_data
      };

      const isValid = WebhookDataProcessor.validateWebhookForCallSource(webhookData);
      expect(isValid).toBe(false);
    });

    test('should reject webhook without dynamic_variables', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          // Missing dynamic_variables
        }
      };

      const isValid = WebhookDataProcessor.validateWebhookForCallSource(webhookData);
      expect(isValid).toBe(false);
    });
  });

  describe('Edge Case Handling', () => {
    test('should handle missing fields by adding defaults', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          // Missing dynamic_variables
        }
      };

      const processedData = WebhookDataProcessor.handleWebhookEdgeCases(webhookData);
      
      expect(processedData.conversation_initiation_client_data.dynamic_variables).toBeDefined();
      expect(processedData.conversation_initiation_client_data.dynamic_variables.system__caller_id).toBe('internal');
      expect(processedData.conversation_initiation_client_data.dynamic_variables.system__call_type).toBe('web');
    });

    test('should handle new format missing fields', () => {
      const webhookData = {
        data: {
          conversation_initiation_client_data: {
            // Missing dynamic_variables
          }
        }
      };

      const processedData = WebhookDataProcessor.handleWebhookEdgeCases(webhookData);
      
      expect(processedData.data.conversation_initiation_client_data.dynamic_variables).toBeDefined();
      expect(processedData.data.conversation_initiation_client_data.dynamic_variables.system__caller_id).toBe('internal');
    });

    test('should infer call_type from caller_id when missing', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+1234567890'
            // Missing system__call_type
          }
        }
      };

      const processedData = WebhookDataProcessor.handleWebhookEdgeCases(webhookData);
      
      expect(processedData.conversation_initiation_client_data.dynamic_variables.system__call_type).toBe('phone');
    });

    test('should handle negative call duration', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+1234567890',
            system__call_duration_secs: -10
          }
        }
      };

      const processedData = WebhookDataProcessor.handleWebhookEdgeCases(webhookData);
      
      expect(processedData.conversation_initiation_client_data.dynamic_variables.system__call_duration_secs).toBe(0);
    });

    test('should handle edge case processing errors gracefully', () => {
      const webhookData = null;

      const processedData = WebhookDataProcessor.handleWebhookEdgeCases(webhookData);
      
      expect(processedData).toBeNull();
    });
  });

  describe('Historical Data Categorization', () => {
    test('should categorize phone calls correctly', () => {
      const testCases = [
        { phone_number: '+1234567890', expected: 'phone' },
        { phone_number: '(555) 123-4567', expected: 'phone' },
        { phone_number: '555-123-4567', expected: 'phone' },
        { phone_number: '5551234567', expected: 'phone' },
        { phone_number: '+44 20 7946 0958', expected: 'phone' }
      ];

      testCases.forEach(({ phone_number, expected }) => {
        const webhookData = {
          conversation_initiation_client_data: {
            dynamic_variables: {
              system__caller_id: phone_number
            }
          }
        };

        const callSource = WebhookDataProcessor.determineCallSource(webhookData);
        expect(callSource).toBe(expected);
      });
    });

    test('should categorize internet calls correctly', () => {
      const testCases = [
        { caller_id: 'internal', call_type: 'web', expected: 'internet' },
        { caller_id: 'internal', call_type: 'browser', expected: 'internet' },
        { caller_id: 'internal', call_type: undefined, expected: 'internet' },
        { caller_id: null, call_type: 'web', expected: 'internet' },
        { caller_id: '', call_type: 'web', expected: 'internet' }
      ];

      testCases.forEach(({ caller_id, call_type, expected }) => {
        const webhookData = {
          conversation_initiation_client_data: {
            dynamic_variables: {
              system__caller_id: caller_id,
              system__call_type: call_type
            }
          }
        };

        const callSource = WebhookDataProcessor.determineCallSource(webhookData);
        expect(callSource).toBe(expected);
      });
    });

    test('should categorize unknown calls correctly', () => {
      const testCases = [
        { caller_id: 'unknown-format', call_type: 'unknown-type' },
        { caller_id: 'session-123', call_type: 'api' },
        { caller_id: undefined, call_type: undefined },
        { caller_id: '', call_type: '' }
      ];

      testCases.forEach(({ caller_id, call_type }) => {
        const webhookData = {
          conversation_initiation_client_data: {
            dynamic_variables: {
              system__caller_id: caller_id,
              system__call_type: call_type
            }
          }
        };

        const callSource = WebhookDataProcessor.determineCallSource(webhookData);
        expect(callSource).toBe('unknown');
      });
    });
  });
});