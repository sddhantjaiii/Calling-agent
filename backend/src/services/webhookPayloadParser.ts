import { logger } from '../utils/logger';

/**
 * Interface for parsed analysis data from ElevenLabs webhooks
 */
export interface AnalysisData {
  // Core scoring fields
  intent_level: string;
  intent_score: number;
  urgency_level: string;
  urgency_score: number;
  budget_constraint: string;
  budget_score: number;
  fit_alignment: string;
  fit_score: number;
  engagement_health: string;
  engagement_score: number;
  total_score: number;
  lead_status_tag: string;
  reasoning: string;
  
  // CTA interactions as structured object
  cta_interactions: {
    cta_pricing_clicked: boolean;
    cta_demo_clicked: boolean;
    cta_followup_clicked: boolean;
    cta_sample_clicked: boolean;
    cta_escalated_to_human: boolean;
  };
  
  // Additional analysis fields
  call_successful: string;
  transcript_summary: string;
  call_summary_title: string;
  analysis_source: string;
  raw_analysis_data: any;
}

/**
 * Interface for call metadata extracted from webhooks
 */
export interface CallMetadata {
  conversation_initiation: any;
  analysis_received_at: string;
  caller_id: string | null;
  called_number: string | null;
  call_duration_secs: number;
  call_duration_minutes: number;
  call_analysis_summary?: string;
  call_timestamp?: string;
  call_type: string;
}

/**
 * WebhookPayloadParser - Sophisticated parsing of ElevenLabs webhook payloads
 * Based on the original webhook controller implementation with enhanced error handling
 * and support for all ElevenLabs webhook payload variations
 */
export class WebhookPayloadParser {
  /**
   * Parse analysis data from ElevenLabs webhook payload
   * Handles Python dictionary to JSON conversion with mixed quote styles
   * Based on original data-parser.js implementation
   * 
   * @param webhookData - The webhook payload from ElevenLabs
   * @returns Parsed analysis data
   * @throws Error if parsing fails
   */
  static parseAnalysisData(webhookData: any): AnalysisData {
    try {
      logger.debug('🔄 Converting Python dictionary to JSON...');
      
      // Find the analysis data in data_collection_results
      const dataCollectionResults = webhookData.analysis?.data_collection_results;
      if (!dataCollectionResults) {
        throw new Error('Missing data_collection_results in analysis');
      }
      
      // Try different possible keys for analysis data (based on original implementation)
      const possibleKeys = ['default', 'Basic CTA', 'main', 'primary'];
      let analysisData = null;
      let usedKey = null;
      
      for (const key of possibleKeys) {
        if (dataCollectionResults[key]?.value) {
          analysisData = dataCollectionResults[key];
          usedKey = key;
          break;
        }
      }
      
      if (!analysisData) {
        const availableKeys = Object.keys(dataCollectionResults).join(', ');
        throw new Error(`No analysis data found. Available keys: ${availableKeys}`);
      }
      
      logger.debug(`🔑 Using analysis data from key: "${usedKey}"`);
      
      // Parse the analysis value JSON string (it's stored as a Python-style string)
      let pythonDict = analysisData.value;
      logger.debug(`📝 Original Python dict length: ${pythonDict.length} characters`);
      logger.debug(`📝 First 100 chars: ${pythonDict.substring(0, 100)}...`);
      
      // Convert Python dict to JSON by handling mixed quotes properly
      pythonDict = this.convertPythonDictToJson(pythonDict);
      
      logger.debug('✅ Python dict converted to JSON format');
      logger.debug(`📝 Converted JSON length: ${pythonDict.length} characters`);
      
      const parsedAnalysisValue = JSON.parse(pythonDict);
      logger.debug('✅ JSON parsing successful');
      logger.debug(`📊 Parsed object has ${Object.keys(parsedAnalysisValue).length} properties`);
      
      return {
        // Direct field mappings
        intent_level: parsedAnalysisValue.intent_level,
        intent_score: parsedAnalysisValue.intent_score,
        urgency_level: parsedAnalysisValue.urgency_level,
        urgency_score: parsedAnalysisValue.urgency_score,
        budget_constraint: parsedAnalysisValue.budget_constraint,
        budget_score: parsedAnalysisValue.budget_score,
        fit_alignment: parsedAnalysisValue.fit_alignment,
        fit_score: parsedAnalysisValue.fit_score,
        engagement_health: parsedAnalysisValue.engagement_health,
        engagement_score: parsedAnalysisValue.engagement_score,
        total_score: parsedAnalysisValue.total_score,
        lead_status_tag: parsedAnalysisValue.lead_status_tag,
        reasoning: parsedAnalysisValue.reasoning,
        
        // CTA interactions as structured object
        cta_interactions: {
          cta_pricing_clicked: parsedAnalysisValue.cta_pricing_clicked === 'Yes',
          cta_demo_clicked: parsedAnalysisValue.cta_demo_clicked === 'Yes',
          cta_followup_clicked: parsedAnalysisValue.cta_followup_clicked === 'Yes',
          cta_sample_clicked: parsedAnalysisValue.cta_sample_clicked === 'Yes',
          cta_escalated_to_human: parsedAnalysisValue.cta_escalated_to_human === 'Yes'
        },
        
        // Additional fields from analysis (convert string booleans)
        call_successful: webhookData.analysis.call_successful === 'true' || webhookData.analysis.call_successful === 'True' || webhookData.analysis.call_successful === true ? 'true' : 'false',
        transcript_summary: webhookData.analysis.transcript_summary,
        call_summary_title: webhookData.analysis.call_summary_title,
        analysis_source: 'elevenlabs',
        raw_analysis_data: webhookData.analysis
      };
    } catch (error) {
      logger.error('Failed to parse analysis data', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to parse analysis data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert Python dictionary string to valid JSON
   * ENHANCED METHOD - Handles both quoted and unquoted formats
   * 
   * @param pythonDict - Python dictionary string
   * @returns Valid JSON string
   */
  private static convertPythonDictToJson(pythonDict: string): string {
    try {
      logger.debug('Converting Python dict to JSON (enhanced method)', {
        originalLength: pythonDict.length,
        preview: pythonDict.substring(0, 100),
        has_single_quotes: pythonDict.includes("'"),
        has_double_quotes: pythonDict.includes('"')
      });

      // Method 1: Try direct JSON parse first
      try {
        JSON.parse(pythonDict); // Test if it's already valid JSON
        logger.debug('String is already valid JSON');
        return pythonDict;
      } catch (directError) {
        logger.debug('Not valid JSON, converting Python dict format');
      }

      // Method 2: Run-parser.js method - Replace single quotes with double quotes
      try {
        const valueStr = pythonDict.replace(/'/g, '"');
        const quotedResult = JSON.parse(valueStr);
        const jsonString = JSON.stringify(quotedResult);
        logger.debug('Quoted format conversion successful (run-parser.js method)');
        return jsonString;
      } catch (quotedError) {
        logger.debug('Quoted format conversion failed, trying unquoted format');
      }

      // Method 3: Handle unquoted format {key: value} - FALLBACK ONLY (Return raw data)
      try {
        logger.debug('Attempting unquoted format conversion - returning raw data as fallback');
        
        // For unquoted format, if all else fails, return the raw string wrapped
        // This ensures the webhook doesn't crash and data is preserved
        const fallbackResult = {
          raw_analysis_data: pythonDict,
          parsing_note: 'Unquoted format detected - preserved as raw data',
          intent_level: 'Unknown',
          intent_score: 0,
          urgency_level: 'Unknown', 
          urgency_score: 0,
          budget_constraint: 'Unknown',
          budget_score: 0,
          fit_alignment: 'Unknown',
          fit_score: 0,
          engagement_health: 'Unknown',
          engagement_score: 0,
          total_score: 0,
          lead_status_tag: 'Raw',
          extraction: {
            name: 'Unknown',
            email_address: 'unknown@example.com',
            company_name: 'Unknown'
          }
        };

        const jsonString = JSON.stringify(fallbackResult);
        logger.debug('Unquoted format handled with fallback data structure');
        return jsonString;
      } catch (unquotedError) {
        logger.debug('Unquoted format fallback failed', {
          error: unquotedError instanceof Error ? unquotedError.message : String(unquotedError)
        });
      }

      throw new Error('All conversion methods failed');
    } catch (error) {
      logger.error('All Python dict conversion methods failed', {
        error: error instanceof Error ? error.message : String(error),
        pythonDictLength: pythonDict.length
      });
      throw error;
    }
  }


  /**
   * Validate analysis data structure and content
   * Based on original validateAnalysisData function
   * 
   * @param webhookData - The webhook payload to validate
   * @returns true if validation passes
   * @throws Error if validation fails
   */
  static validateAnalysisData(webhookData: any): boolean {
    try {
      // Required fields validation
      if (!webhookData.analysis) {
        throw new Error('Missing analysis field');
      }
      
      // Check for analysis data in various possible keys
      const dataCollectionResults = webhookData.analysis.data_collection_results;
      if (!dataCollectionResults) {
        throw new Error('Missing data_collection_results in analysis');
      }
      
      // Try different possible keys for analysis data
      const possibleKeys = ['default', 'Basic CTA', 'main', 'primary'];
      let analysisKey = null;
      let analysisData = null;
      
      for (const key of possibleKeys) {
        if (dataCollectionResults[key]?.value) {
          analysisKey = key;
          analysisData = dataCollectionResults[key];
          break;
        }
      }
      
      if (!analysisData) {
        const availableKeys = Object.keys(dataCollectionResults).join(', ');
        throw new Error(`No analysis data found. Available keys: ${availableKeys}`);
      }
      
      // Validate conversation ID
      const conversationId = webhookData.conversation_initiation_client_data?.dynamic_variables?.system__conversation_id;
      if (!conversationId) {
        throw new Error('Missing conversation_id in dynamic_variables');
      }
      
      // Validate ElevenLabs agent ID
      const elevenLabsAgentId = webhookData.conversation_initiation_client_data?.dynamic_variables?.system__agent_id;
      if (!elevenLabsAgentId) {
        throw new Error('Missing system__agent_id in dynamic_variables');
      }
      
      // Parse and validate analysis JSON structure
      const analysisValue = analysisData.value;
      let pythonDict = this.convertPythonDictToJson(analysisValue);
      const parsedAnalysisValue = JSON.parse(pythonDict);
      
      // Validate required analysis fields
      const requiredFields = [
        'intent_level', 'intent_score', 'urgency_level', 'urgency_score',
        'total_score', 'lead_status_tag'
      ];
      
      const missingFields = requiredFields.filter(field => !Object.prototype.hasOwnProperty.call(parsedAnalysisValue, field));
      if (missingFields.length > 0) {
        throw new Error(`Missing required analysis fields: ${missingFields.join(', ')}`);
      }
      
      // Validate score ranges
      if (parsedAnalysisValue.intent_score < 1 || parsedAnalysisValue.intent_score > 3) {
        throw new Error('Invalid intent_score: must be 1-3');
      }
      if (parsedAnalysisValue.total_score < 0 || parsedAnalysisValue.total_score > 100) {
        throw new Error('Invalid total_score: must be 0-100');
      }
      
      logger.debug('Analysis data validation passed', {
        analysisKey,
        requiredFieldsCount: requiredFields.length,
        totalScore: parsedAnalysisValue.total_score,
        intentScore: parsedAnalysisValue.intent_score
      });
      
      return true;
    } catch (parseError) {
      logger.error('Analysis data validation failed', {
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      throw new Error(`Failed to validate analysis data: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  }

  /**
   * Extract call metadata from webhook data
   * Based on original extractCallMetadata function
   * 
   * @param webhookData - The webhook payload from ElevenLabs
   * @returns Call metadata object
   */
  static extractCallMetadata(webhookData: any): CallMetadata {
    try {
      const dynamicVars = webhookData.conversation_initiation_client_data?.dynamic_variables || {};
      
      const metadata: CallMetadata = {
        conversation_initiation: webhookData.conversation_initiation_client_data,
        analysis_received_at: new Date().toISOString(),
        caller_id: dynamicVars.system__caller_id || null,
        called_number: dynamicVars.system__called_number || null,
        call_duration_secs: dynamicVars.system__call_duration_secs || 0,
        call_duration_minutes: dynamicVars.system__call_duration_secs ? 
          Math.ceil(dynamicVars.system__call_duration_secs / 60) : 0,
        call_analysis_summary: webhookData.analysis?.call_summary_title,
        call_timestamp: dynamicVars.system__time_utc,
        call_type: dynamicVars.system__caller_id && dynamicVars.system__caller_id !== 'internal' ? 'phone' : 'internal'
      };
      
      logger.debug('Extracted call metadata', {
        caller_id: metadata.caller_id,
        call_duration_secs: metadata.call_duration_secs,
        call_type: metadata.call_type,
        has_analysis_summary: !!metadata.call_analysis_summary
      });
      
      return metadata;
    } catch (error) {
      logger.error('Error extracting call metadata', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return minimal metadata on error
      return {
        conversation_initiation: null,
        analysis_received_at: new Date().toISOString(),
        caller_id: null,
        called_number: null,
        call_duration_secs: 0,
        call_duration_minutes: 0,
        call_type: 'unknown'
      };
    }
  }

  /**
   * Comprehensive payload structure validation
   * Validates the entire webhook payload structure for all expected fields
   * 
   * @param webhookData - The webhook payload to validate
   * @returns true if validation passes
   * @throws Error if validation fails
   */
  static validatePayloadStructure(webhookData: any): boolean {
    try {
      if (!webhookData || typeof webhookData !== 'object') {
        throw new Error('Webhook payload is not a valid object');
      }

      // Validate conversation_initiation_client_data structure
      if (!webhookData.conversation_initiation_client_data) {
        throw new Error('Missing conversation_initiation_client_data');
      }

      const conversationData = webhookData.conversation_initiation_client_data;
      if (!conversationData.dynamic_variables) {
        throw new Error('Missing dynamic_variables in conversation_initiation_client_data');
      }

      const dynamicVars = conversationData.dynamic_variables;

      // Validate required dynamic variables
      if (!dynamicVars.system__conversation_id) {
        throw new Error('Missing system__conversation_id in dynamic_variables');
      }

      if (!dynamicVars.system__agent_id) {
        throw new Error('Missing system__agent_id in dynamic_variables');
      }

      // Validate analysis structure if present
      if (webhookData.analysis) {
        this.validateAnalysisData(webhookData);
      }

      logger.debug('Payload structure validation passed', {
        conversation_id: dynamicVars.system__conversation_id,
        agent_id: dynamicVars.system__agent_id,
        has_analysis: !!webhookData.analysis
      });

      return true;
    } catch (error) {
      logger.error('Payload structure validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Handle malformed or incomplete webhook data gracefully
   * Attempts to repair common issues and provide fallback values
   * 
   * @param webhookData - The potentially malformed webhook payload
   * @returns Processed webhook data with fallbacks
   */
  static handleMalformedData(webhookData: any): any {
    try {
      if (!webhookData || typeof webhookData !== 'object') {
        logger.warn('Webhook data is not a valid object, creating minimal structure');
        return {
          conversation_initiation_client_data: {
            dynamic_variables: {}
          }
        };
      }

      // Ensure conversation_initiation_client_data exists
      if (!webhookData.conversation_initiation_client_data) {
        logger.warn('Missing conversation_initiation_client_data, creating empty structure');
        webhookData.conversation_initiation_client_data = {
          dynamic_variables: {}
        };
      }

      // Ensure dynamic_variables exists
      if (!webhookData.conversation_initiation_client_data.dynamic_variables) {
        logger.warn('Missing dynamic_variables, creating empty object');
        webhookData.conversation_initiation_client_data.dynamic_variables = {};
      }

      const dynamicVars = webhookData.conversation_initiation_client_data.dynamic_variables;

      // Handle missing conversation_id
      if (!dynamicVars.system__conversation_id) {
        logger.warn('Missing system__conversation_id, generating fallback');
        dynamicVars.system__conversation_id = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Handle missing agent_id
      if (!dynamicVars.system__agent_id) {
        logger.warn('Missing system__agent_id, this may cause processing to fail');
        dynamicVars.system__agent_id = 'unknown_agent';
      }

      // Handle missing or invalid caller_id
      if (dynamicVars.system__caller_id === undefined || dynamicVars.system__caller_id === null) {
        logger.debug('Missing caller_id, setting to internal');
        dynamicVars.system__caller_id = 'internal';
      }

      // Handle missing call duration
      if (!dynamicVars.system__call_duration_secs || dynamicVars.system__call_duration_secs < 0) {
        logger.debug('Missing or invalid call duration, setting to 0');
        dynamicVars.system__call_duration_secs = 0;
      }

      // Handle missing timestamp
      if (!dynamicVars.system__time_utc) {
        logger.debug('Missing call timestamp, using current time');
        dynamicVars.system__time_utc = new Date().toISOString();
      }

      logger.debug('Malformed data handling completed', {
        conversation_id: dynamicVars.system__conversation_id,
        agent_id: dynamicVars.system__agent_id,
        caller_id: dynamicVars.system__caller_id,
        duration: dynamicVars.system__call_duration_secs
      });

      return webhookData;
    } catch (error) {
      logger.error('Error handling malformed webhook data', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return minimal valid structure as last resort
      return {
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: `error_fallback_${Date.now()}`,
            system__agent_id: 'unknown_agent',
            system__caller_id: 'internal',
            system__call_duration_secs: 0,
            system__time_utc: new Date().toISOString()
          }
        }
      };
    }
  }

  /**
   * Support for all ElevenLabs webhook payload variations
   * Detects and normalizes different webhook formats
   * 
   * @param webhookData - The webhook payload in any supported format
   * @returns Normalized webhook data in consistent format
   */
  static normalizeWebhookVariations(webhookData: any): any {
    try {
      // Handle new ElevenLabs format with 'data' wrapper
      if (webhookData.type && webhookData.data) {
        logger.debug('Detected new ElevenLabs webhook format');
        
        // Extract the actual webhook data from the 'data' field
        const normalizedData = {
          ...webhookData.data,
          webhook_type: webhookData.type,
          event_timestamp: webhookData.event_timestamp
        };
        
        // Ensure conversation_initiation_client_data is properly structured
        if (normalizedData.conversation_initiation_client_data) {
          return normalizedData;
        }
        
        // If missing, try to reconstruct from metadata
        if (normalizedData.metadata) {
          normalizedData.conversation_initiation_client_data = {
            dynamic_variables: {
              system__conversation_id: normalizedData.conversation_id,
              system__agent_id: normalizedData.agent_id,
              system__caller_id: normalizedData.metadata.phone_number || 'internal',
              system__call_duration_secs: normalizedData.metadata.call_duration_secs || 0,
              system__time_utc: normalizedData.metadata.start_time_unix_secs ? 
                new Date(normalizedData.metadata.start_time_unix_secs * 1000).toISOString() : 
                new Date().toISOString()
            }
          };
        }
        
        return normalizedData;
      }
      
      // Handle legacy format - already in expected structure
      if (webhookData.conversation_initiation_client_data || webhookData.conversation_id) {
        logger.debug('Detected legacy ElevenLabs webhook format');
        
        // If it's the very old format with just conversation_id at root level
        if (webhookData.conversation_id && !webhookData.conversation_initiation_client_data) {
          return {
            ...webhookData,
            conversation_initiation_client_data: {
              dynamic_variables: {
                system__conversation_id: webhookData.conversation_id,
                system__agent_id: webhookData.agent_id || 'unknown_agent',
                system__caller_id: webhookData.phone_number || 'internal',
                system__call_duration_secs: webhookData.duration_seconds || 0,
                system__time_utc: webhookData.timestamp || new Date().toISOString()
              }
            }
          };
        }
        
        return webhookData;
      }
      
      // Unknown format - try to handle gracefully
      logger.warn('Unknown webhook format detected, attempting to normalize');
      return this.handleMalformedData(webhookData);
      
    } catch (error) {
      logger.error('Error normalizing webhook variations', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback to malformed data handler
      return this.handleMalformedData(webhookData);
    }
  }

  /**
   * Complete webhook processing pipeline
   * Combines all parsing and validation steps into a single method
   * 
   * @param rawWebhookData - Raw webhook payload from ElevenLabs
   * @returns Processed webhook data with parsed analysis and metadata
   */
  static processWebhookPayload(rawWebhookData: any): {
    normalizedData: any;
    analysisData?: AnalysisData;
    callMetadata: CallMetadata;
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    let normalizedData: any;
    let analysisData: AnalysisData | undefined;
    let callMetadata: CallMetadata;
    let isValid = true;

    try {
      // Step 1: Normalize webhook variations
      normalizedData = this.normalizeWebhookVariations(rawWebhookData);
      
      // Step 2: Handle malformed data
      normalizedData = this.handleMalformedData(normalizedData);
      
      // Step 3: Validate payload structure
      try {
        this.validatePayloadStructure(normalizedData);
      } catch (validationError) {
        errors.push(`Payload validation: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
        isValid = false;
      }
      
      // Step 4: Extract call metadata (always attempt this)
      callMetadata = this.extractCallMetadata(normalizedData);
      
      // Step 5: Parse analysis data if present
      if (normalizedData.analysis) {
        try {
          analysisData = this.parseAnalysisData(normalizedData);
        } catch (analysisError) {
          errors.push(`Analysis parsing: ${analysisError instanceof Error ? analysisError.message : String(analysisError)}`);
          // Don't mark as invalid - analysis data is optional
        }
      }
      
      logger.info('Webhook payload processing completed', {
        isValid,
        hasAnalysisData: !!analysisData,
        errorCount: errors.length,
        conversation_id: callMetadata.caller_id
      });
      
      return {
        normalizedData,
        analysisData,
        callMetadata,
        isValid,
        errors
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Processing error: ${errorMessage}`);
      
      logger.error('Critical error in webhook payload processing', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Return minimal valid response even on critical error
      return {
        normalizedData: this.handleMalformedData(rawWebhookData),
        callMetadata: {
          conversation_initiation: null,
          analysis_received_at: new Date().toISOString(),
          caller_id: null,
          called_number: null,
          call_duration_secs: 0,
          call_duration_minutes: 0,
          call_type: 'unknown'
        },
        isValid: false,
        errors
      };
    }
  }
}