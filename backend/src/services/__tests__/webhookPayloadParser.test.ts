import { WebhookPayloadParser, AnalysisData, CallMetadata } from '../webhookPayloadParser';

describe('WebhookPayloadParser', () => {
  describe('parseAnalysisData', () => {
    it('should parse valid analysis data with default key', () => {
      const webhookData = {
        analysis: {
          data_collection_results: {
            default: {
              value: `{
                'intent_level': 'High',
                'intent_score': 3,
                'urgency_level': 'Medium',
                'urgency_score': 2,
                'budget_constraint': 'Low',
                'budget_score': 1,
                'fit_alignment': 'High',
                'fit_score': 3,
                'engagement_health': 'Good',
                'engagement_score': 2,
                'total_score': 85,
                'lead_status_tag': 'Hot Lead',
                'reasoning': 'Customer shows high interest',
                'cta_pricing_clicked': 'Yes',
                'cta_demo_clicked': 'No',
                'cta_followup_clicked': 'Yes',
                'cta_sample_clicked': 'No',
                'cta_escalated_to_human': 'No'
              }`
            }
          },
          call_successful: 'true',
          transcript_summary: 'Customer interested in product',
          call_summary_title: 'Successful sales call'
        }
      };

      const result = WebhookPayloadParser.parseAnalysisData(webhookData);

      expect(result.intent_level).toBe('High');
      expect(result.intent_score).toBe(3);
      expect(result.total_score).toBe(85);
      expect(result.lead_status_tag).toBe('Hot Lead');
      expect(result.cta_interactions.cta_pricing_clicked).toBe(true);
      expect(result.cta_interactions.cta_demo_clicked).toBe(false);
      expect(result.call_successful).toBe('true');
      expect(result.analysis_source).toBe('elevenlabs');
    });

    it('should parse analysis data with Basic CTA key', () => {
      const webhookData = {
        analysis: {
          data_collection_results: {
            'Basic CTA': {
              value: `{
                'intent_level': 'Low',
                'intent_score': 1,
                'urgency_level': 'High',
                'urgency_score': 3,
                'budget_constraint': 'Medium',
                'budget_score': 2,
                'fit_alignment': 'Low',
                'fit_score': 1,
                'engagement_health': 'Poor',
                'engagement_score': 1,
                'total_score': 45,
                'lead_status_tag': 'Cold Lead',
                'reasoning': 'Customer not interested',
                'cta_pricing_clicked': 'No',
                'cta_demo_clicked': 'No',
                'cta_followup_clicked': 'No',
                'cta_sample_clicked': 'No',
                'cta_escalated_to_human': 'Yes'
              }`
            }
          },
          call_successful: 'false',
          transcript_summary: 'Customer declined offer',
          call_summary_title: 'Unsuccessful call'
        }
      };

      const result = WebhookPayloadParser.parseAnalysisData(webhookData);

      expect(result.intent_level).toBe('Low');
      expect(result.total_score).toBe(45);
      expect(result.cta_interactions.cta_escalated_to_human).toBe(true);
    });

    it('should handle mixed quote styles in Python dict', () => {
      const webhookData = {
        analysis: {
          data_collection_results: {
            default: {
              value: `{
                "intent_level": 'High',
                'intent_score': 3,
                "urgency_level": "Medium",
                'urgency_score': 2,
                'budget_constraint': 'Low',
                'budget_score': 1,
                'fit_alignment': 'High',
                'fit_score': 3,
                'engagement_health': 'Good',
                'engagement_score': 2,
                'total_score': 85,
                'lead_status_tag': 'Hot Lead',
                'reasoning': "Customer shows high interest",
                'cta_pricing_clicked': 'Yes',
                'cta_demo_clicked': 'No',
                'cta_followup_clicked': 'Yes',
                'cta_sample_clicked': 'No',
                'cta_escalated_to_human': 'No'
              }`
            }
          },
          call_successful: 'true',
          transcript_summary: 'Test summary',
          call_summary_title: 'Test call'
        }
      };

      const result = WebhookPayloadParser.parseAnalysisData(webhookData);

      expect(result.intent_level).toBe('High');
      expect(result.reasoning).toBe('Customer shows high interest');
    });

    it('should handle Python boolean and null values', () => {
      const webhookData = {
        analysis: {
          data_collection_results: {
            default: {
              value: `{
                'intent_level': 'High',
                'intent_score': 3,
                'urgency_level': None,
                'urgency_score': 2,
                'budget_constraint': 'Low',
                'budget_score': 1,
                'fit_alignment': 'High',
                'fit_score': 3,
                'engagement_health': 'Good',
                'engagement_score': 2,
                'total_score': 85,
                'lead_status_tag': 'Hot Lead',
                'reasoning': 'Test reasoning',
                'cta_pricing_clicked': 'Yes',
                'cta_demo_clicked': 'No',
                'cta_followup_clicked': 'Yes',
                'cta_sample_clicked': 'No',
                'cta_escalated_to_human': 'No'
              }`
            }
          },
          call_successful: 'false',
          transcript_summary: 'Test summary',
          call_summary_title: 'Test call'
        }
      };

      const result = WebhookPayloadParser.parseAnalysisData(webhookData);

      expect(result.urgency_level).toBeNull();
      expect(result.call_successful).toBe('false'); // String representation
    });

    it('should throw error when no analysis data found', () => {
      const webhookData = {
        analysis: {
          data_collection_results: {}
        }
      };

      expect(() => {
        WebhookPayloadParser.parseAnalysisData(webhookData);
      }).toThrow('No analysis data found');
    });

    it('should throw error when missing data_collection_results', () => {
      const webhookData = {
        analysis: {}
      };

      expect(() => {
        WebhookPayloadParser.parseAnalysisData(webhookData);
      }).toThrow('Missing data_collection_results in analysis');
    });
  });

  describe('validateAnalysisData', () => {
    it('should validate correct analysis data structure', () => {
      const webhookData = {
        analysis: {
          data_collection_results: {
            default: {
              value: `{
                'intent_level': 'High',
                'intent_score': 3,
                'urgency_level': 'Medium',
                'urgency_score': 2,
                'budget_constraint': 'Low',
                'budget_score': 1,
                'fit_alignment': 'High',
                'fit_score': 3,
                'engagement_health': 'Good',
                'engagement_score': 2,
                'total_score': 85,
                'lead_status_tag': 'Hot Lead',
                'reasoning': 'Test reasoning'
              }`
            }
          }
        },
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: 'test-conv-123',
            system__agent_id: 'test-agent-456'
          }
        }
      };

      expect(WebhookPayloadParser.validateAnalysisData(webhookData)).toBe(true);
    });

    it('should throw error for invalid intent_score range', () => {
      const webhookData = {
        analysis: {
          data_collection_results: {
            default: {
              value: `{
                'intent_level': 'High',
                'intent_score': 5,
                'urgency_level': 'Medium',
                'urgency_score': 2,
                'budget_constraint': 'Low',
                'budget_score': 1,
                'fit_alignment': 'High',
                'fit_score': 3,
                'engagement_health': 'Good',
                'engagement_score': 2,
                'total_score': 85,
                'lead_status_tag': 'Hot Lead'
              }`
            }
          }
        },
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: 'test-conv-123',
            system__agent_id: 'test-agent-456'
          }
        }
      };

      expect(() => {
        WebhookPayloadParser.validateAnalysisData(webhookData);
      }).toThrow('Invalid intent_score: must be 1-3');
    });

    it('should throw error for invalid total_score range', () => {
      const webhookData = {
        analysis: {
          data_collection_results: {
            default: {
              value: `{
                'intent_level': 'High',
                'intent_score': 3,
                'urgency_level': 'Medium',
                'urgency_score': 2,
                'budget_constraint': 'Low',
                'budget_score': 1,
                'fit_alignment': 'High',
                'fit_score': 3,
                'engagement_health': 'Good',
                'engagement_score': 2,
                'total_score': 150,
                'lead_status_tag': 'Hot Lead'
              }`
            }
          }
        },
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: 'test-conv-123',
            system__agent_id: 'test-agent-456'
          }
        }
      };

      expect(() => {
        WebhookPayloadParser.validateAnalysisData(webhookData);
      }).toThrow('Invalid total_score: must be 0-100');
    });

    it('should throw error for missing required fields', () => {
      const webhookData = {
        analysis: {
          data_collection_results: {
            default: {
              value: `{
                'intent_level': 'High',
                'urgency_level': 'Medium',
                'urgency_score': 2
              }`
            }
          }
        },
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: 'test-conv-123',
            system__agent_id: 'test-agent-456'
          }
        }
      };

      expect(() => {
        WebhookPayloadParser.validateAnalysisData(webhookData);
      }).toThrow('Missing required analysis fields');
    });
  });

  describe('extractCallMetadata', () => {
    it('should extract call metadata correctly', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: '+1234567890',
            system__called_number: '+0987654321',
            system__call_duration_secs: 120,
            system__time_utc: '2024-01-01T12:00:00Z'
          }
        },
        analysis: {
          call_summary_title: 'Test call summary'
        }
      };

      const result = WebhookPayloadParser.extractCallMetadata(webhookData);

      expect(result.caller_id).toBe('+1234567890');
      expect(result.called_number).toBe('+0987654321');
      expect(result.call_duration_secs).toBe(120);
      expect(result.call_duration_minutes).toBe(2);
      expect(result.call_timestamp).toBe('2024-01-01T12:00:00Z');
      expect(result.call_type).toBe('phone');
      expect(result.call_analysis_summary).toBe('Test call summary');
    });

    it('should handle internal calls correctly', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__caller_id: 'internal',
            system__call_duration_secs: 60
          }
        }
      };

      const result = WebhookPayloadParser.extractCallMetadata(webhookData);

      expect(result.caller_id).toBe('internal');
      expect(result.call_type).toBe('internal');
      expect(result.call_duration_minutes).toBe(1);
    });

    it('should handle missing dynamic variables gracefully', () => {
      const webhookData = {
        conversation_initiation_client_data: {}
      };

      const result = WebhookPayloadParser.extractCallMetadata(webhookData);

      expect(result.caller_id).toBeNull();
      expect(result.called_number).toBeNull();
      expect(result.call_duration_secs).toBe(0);
      expect(result.call_duration_minutes).toBe(0);
      expect(result.call_type).toBe('internal');
    });
  });

  describe('validatePayloadStructure', () => {
    it('should validate correct payload structure', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: 'test-conv-123',
            system__agent_id: 'test-agent-456'
          }
        }
      };

      expect(WebhookPayloadParser.validatePayloadStructure(webhookData)).toBe(true);
    });

    it('should throw error for missing conversation_initiation_client_data', () => {
      const webhookData = {};

      expect(() => {
        WebhookPayloadParser.validatePayloadStructure(webhookData);
      }).toThrow('Missing conversation_initiation_client_data');
    });

    it('should throw error for missing dynamic_variables', () => {
      const webhookData = {
        conversation_initiation_client_data: {}
      };

      expect(() => {
        WebhookPayloadParser.validatePayloadStructure(webhookData);
      }).toThrow('Missing dynamic_variables in conversation_initiation_client_data');
    });

    it('should throw error for missing required dynamic variables', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: 'test-conv-123'
            // Missing system__agent_id
          }
        }
      };

      expect(() => {
        WebhookPayloadParser.validatePayloadStructure(webhookData);
      }).toThrow('Missing system__agent_id in dynamic_variables');
    });
  });

  describe('handleMalformedData', () => {
    it('should create minimal structure for null input', () => {
      const result = WebhookPayloadParser.handleMalformedData(null);

      expect(result.conversation_initiation_client_data).toBeDefined();
      expect(result.conversation_initiation_client_data.dynamic_variables).toBeDefined();
    });

    it('should add missing conversation_initiation_client_data', () => {
      const webhookData = {
        some_other_field: 'value'
      };

      const result = WebhookPayloadParser.handleMalformedData(webhookData);

      expect(result.conversation_initiation_client_data).toBeDefined();
      expect(result.conversation_initiation_client_data.dynamic_variables).toBeDefined();
      expect(result.some_other_field).toBe('value');
    });

    it('should add missing dynamic_variables', () => {
      const webhookData = {
        conversation_initiation_client_data: {}
      };

      const result = WebhookPayloadParser.handleMalformedData(webhookData);

      expect(result.conversation_initiation_client_data.dynamic_variables).toBeDefined();
    });

    it('should generate fallback conversation_id', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {}
        }
      };

      const result = WebhookPayloadParser.handleMalformedData(webhookData);

      expect(result.conversation_initiation_client_data.dynamic_variables.system__conversation_id).toMatch(/^fallback_/);
    });

    it('should set default values for missing fields', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: 'test-123',
            system__agent_id: 'agent-456'
          }
        }
      };

      const result = WebhookPayloadParser.handleMalformedData(webhookData);

      expect(result.conversation_initiation_client_data.dynamic_variables.system__caller_id).toBe('internal');
      expect(result.conversation_initiation_client_data.dynamic_variables.system__call_duration_secs).toBe(0);
      expect(result.conversation_initiation_client_data.dynamic_variables.system__time_utc).toBeDefined();
    });
  });

  describe('normalizeWebhookVariations', () => {
    it('should handle new ElevenLabs format with data wrapper', () => {
      const webhookData = {
        type: 'post_call_transcription',
        event_timestamp: 1640995200,
        data: {
          conversation_id: 'test-conv-123',
          agent_id: 'test-agent-456',
          conversation_initiation_client_data: {
            dynamic_variables: {
              system__conversation_id: 'test-conv-123',
              system__agent_id: 'test-agent-456'
            }
          }
        }
      };

      const result = WebhookPayloadParser.normalizeWebhookVariations(webhookData);

      expect(result.webhook_type).toBe('post_call_transcription');
      expect(result.event_timestamp).toBe(1640995200);
      expect(result.conversation_id).toBe('test-conv-123');
      expect(result.conversation_initiation_client_data).toBeDefined();
    });

    it('should handle legacy format', () => {
      const webhookData = {
        conversation_id: 'test-conv-123',
        agent_id: 'test-agent-456',
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: 'test-conv-123',
            system__agent_id: 'test-agent-456'
          }
        }
      };

      const result = WebhookPayloadParser.normalizeWebhookVariations(webhookData);

      expect(result).toEqual(webhookData);
    });

    it('should handle very old format with conversation_id at root', () => {
      const webhookData = {
        conversation_id: 'test-conv-123',
        agent_id: 'test-agent-456',
        phone_number: '+1234567890',
        duration_seconds: 120,
        timestamp: '2024-01-01T12:00:00Z'
      };

      const result = WebhookPayloadParser.normalizeWebhookVariations(webhookData);

      expect(result.conversation_initiation_client_data).toBeDefined();
      expect(result.conversation_initiation_client_data.dynamic_variables.system__conversation_id).toBe('test-conv-123');
      expect(result.conversation_initiation_client_data.dynamic_variables.system__agent_id).toBe('test-agent-456');
      expect(result.conversation_initiation_client_data.dynamic_variables.system__caller_id).toBe('+1234567890');
    });
  });

  describe('processWebhookPayload', () => {
    it('should process complete valid webhook payload', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: 'test-conv-123',
            system__agent_id: 'test-agent-456',
            system__caller_id: '+1234567890',
            system__call_duration_secs: 120
          }
        },
        analysis: {
          data_collection_results: {
            default: {
              value: `{
                'intent_level': 'High',
                'intent_score': 3,
                'urgency_level': 'Medium',
                'urgency_score': 2,
                'budget_constraint': 'Low',
                'budget_score': 1,
                'fit_alignment': 'High',
                'fit_score': 3,
                'engagement_health': 'Good',
                'engagement_score': 2,
                'total_score': 85,
                'lead_status_tag': 'Hot Lead',
                'reasoning': 'Test reasoning'
              }`
            }
          },
          call_successful: 'true',
          transcript_summary: 'Test summary',
          call_summary_title: 'Test call'
        }
      };

      const result = WebhookPayloadParser.processWebhookPayload(webhookData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.analysisData).toBeDefined();
      expect(result.analysisData!.total_score).toBe(85);
      expect(result.callMetadata).toBeDefined();
      expect(result.callMetadata.caller_id).toBe('+1234567890');
    });

    it('should handle payload without analysis data', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: 'test-conv-123',
            system__agent_id: 'test-agent-456',
            system__caller_id: '+1234567890'
          }
        }
      };

      const result = WebhookPayloadParser.processWebhookPayload(webhookData);

      expect(result.isValid).toBe(true);
      expect(result.analysisData).toBeUndefined();
      expect(result.callMetadata).toBeDefined();
    });

    it('should handle malformed payload gracefully', () => {
      const webhookData = {
        invalid: 'payload'
      };

      const result = WebhookPayloadParser.processWebhookPayload(webhookData);

      expect(result.isValid).toBe(true); // The malformed data handler creates valid structure
      expect(result.errors.length).toBe(0); // Malformed data handler creates valid structure
      expect(result.callMetadata).toBeDefined();
      expect(result.normalizedData).toBeDefined();
    });

    it('should continue processing even with analysis parsing errors', () => {
      const webhookData = {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: 'test-conv-123',
            system__agent_id: 'test-agent-456'
          }
        },
        analysis: {
          data_collection_results: {
            default: {
              value: 'invalid json'
            }
          }
        }
      };

      const result = WebhookPayloadParser.processWebhookPayload(webhookData);

      expect(result.isValid).toBe(false); // Invalid because analysis validation fails
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.analysisData).toBeUndefined();
      expect(result.callMetadata).toBeDefined();
    });
  });
});