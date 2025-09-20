import { logger } from '../utils/logger';

export interface ContactInfo {
  phoneNumber?: string | null;
  email?: string | null;
  name?: string | null;
}

export interface CallSourceInfo {
  callSource: 'phone' | 'internet' | 'unknown';
  contactInfo: ContactInfo | null;
}

export interface EnhancedLeadData {
  companyName: string | null;
  extractedName: string | null;
  extractedEmail: string | null;
  ctaPricingClicked: boolean;
  ctaDemoClicked: boolean;
  ctaFollowupClicked: boolean;
  ctaSampleClicked: boolean;
  ctaEscalatedToHuman: boolean;
  smartNotification: string | null;
  demoBookDatetime: string | null;
}

/**
 * WebhookDataProcessor - Handles processing and analysis of webhook data from ElevenLabs
 * Based on the original webhook controller implementation for call source detection
 */
export class WebhookDataProcessor {
  /**
   * Determine call source based on webhook dynamic variables
   * Based on original implementation logic from webhook-processor.js
   * 
   * @param webhookData - The webhook payload from ElevenLabs
   * @returns The call source type: 'phone', 'internet', or 'unknown'
   */
  static determineCallSource(webhookData: any): string {
    try {
      // Handle both new ElevenLabs format (data.conversation_initiation_client_data) 
      // and legacy format (conversation_initiation_client_data)
      const conversationData = webhookData.data?.conversation_initiation_client_data || 
                              webhookData.conversation_initiation_client_data;
      const dynamicVars = conversationData?.dynamic_variables || {};
      
      logger.debug('Determining call source from webhook data', {
        caller_id: dynamicVars.system__caller_id,
        call_type: dynamicVars.system__call_type,
        called_number: dynamicVars.system__called_number,
        webhook_format: webhookData.data ? 'new' : 'legacy'
      });

      // First check for explicit call_type indicators (these take priority)
      if (dynamicVars.system__call_type === 'web' || 
          dynamicVars.system__call_type === 'browser') {
        logger.debug('Call source determined as internet (by call_type)', {
          caller_id: dynamicVars.system__caller_id,
          call_type: dynamicVars.system__call_type
        });
        return 'internet';
      }
      
      // Check for actual phone number (based on original logic)
      // If system__caller_id exists and is not 'internal', it's a phone call
      if (dynamicVars.system__caller_id && 
          dynamicVars.system__caller_id !== 'internal' &&
          dynamicVars.system__caller_id !== '' &&
          // Only treat as phone if it looks like a phone number
          /^[+]?[0-9\-()\s]+$/.test(dynamicVars.system__caller_id)) {
        logger.debug('Call source determined as phone', {
          caller_id: dynamicVars.system__caller_id
        });
        return 'phone';
      }
      
      // Check for internal calls
      if (dynamicVars.system__caller_id === 'internal') {
        logger.debug('Call source determined as internet (internal caller_id)', {
          caller_id: dynamicVars.system__caller_id,
          call_type: dynamicVars.system__call_type
        });
        return 'internet';
      }
      
      // If we can't determine the source, mark as unknown
      logger.debug('Call source determined as unknown', {
        caller_id: dynamicVars.system__caller_id,
        call_type: dynamicVars.system__call_type
      });
      return 'unknown';
      
    } catch (error) {
      logger.error('Error determining call source', {
        error: error instanceof Error ? error.message : String(error),
        webhookData: JSON.stringify(webhookData, null, 2)
      });
      return 'unknown';
    }
  }

  /**
   * Extract contact information from webhook data
   * Returns null instead of fake data when contact information is unavailable
   * 
   * @param webhookData - The webhook payload from ElevenLabs
   * @returns ContactInfo object or null if no real contact data is available
   */
  static extractContactInfo(webhookData: any): ContactInfo | null {
    try {
      // Handle both new ElevenLabs format (data.conversation_initiation_client_data) 
      // and legacy format (conversation_initiation_client_data)
      const conversationData = webhookData.data?.conversation_initiation_client_data || 
                              webhookData.conversation_initiation_client_data;
      const dynamicVars = conversationData?.dynamic_variables || {};
      
      // Extract phone number (only if it's not 'internal' and looks like a phone number)
      const phoneNumber = (dynamicVars.system__caller_id && 
                          dynamicVars.system__caller_id !== 'internal' &&
                          dynamicVars.system__caller_id !== '' &&
                          /^[+]?[0-9\-()\s]+$/.test(dynamicVars.system__caller_id)) ? 
        dynamicVars.system__caller_id : null;
      
      // Extract email and name from dynamic variables (if available)
      const email = dynamicVars.caller_email || null;
      const name = dynamicVars.caller_name || null;
      
      logger.debug('Extracting contact info from webhook', {
        phoneNumber,
        email,
        name,
        caller_id: dynamicVars.system__caller_id
      });
      
      // Only return contact info if we have real data
      if (phoneNumber || email || name) {
        return {
          phoneNumber,
          email,
          name
        };
      }
      
      // Return null instead of fake data
      logger.debug('No real contact information available, returning null');
      return null;
      
    } catch (error) {
      logger.error('Error extracting contact info', {
        error: error instanceof Error ? error.message : String(error),
        webhookData: JSON.stringify(webhookData, null, 2)
      });
      return null;
    }
  }

  /**
   * Get comprehensive call source information including contact details
   * 
   * @param webhookData - The webhook payload from ElevenLabs
   * @returns CallSourceInfo object with call source and contact information
   */
  static getCallSourceInfo(webhookData: any): CallSourceInfo {
    const callSource = this.determineCallSource(webhookData) as 'phone' | 'internet' | 'unknown';
    const contactInfo = this.extractContactInfo(webhookData);
    
    logger.debug('Generated call source info', {
      callSource,
      hasContactInfo: !!contactInfo,
      contactInfo
    });
    
    return {
      callSource,
      contactInfo
    };
  }

  /**
   * Extract call metadata from webhook data (based on original implementation)
   * 
   * @param webhookData - The webhook payload from ElevenLabs
   * @returns Metadata object with call information
   */
  static extractCallMetadata(webhookData: any): any {
    try {
      // Handle both new ElevenLabs format (data.conversation_initiation_client_data) 
      // and legacy format (conversation_initiation_client_data)
      const conversationData = webhookData.data?.conversation_initiation_client_data || 
                              webhookData.conversation_initiation_client_data;
      const dynamicVars = conversationData?.dynamic_variables || {};
      const callSource = this.determineCallSource(webhookData);
      
      const metadata = {
        conversation_initiation: conversationData,
        analysis_received_at: new Date().toISOString(),
        caller_id: dynamicVars.system__caller_id || null,
        called_number: dynamicVars.system__called_number || null,
        call_duration_secs: dynamicVars.system__call_duration_secs || 0,
        call_duration_minutes: dynamicVars.system__call_duration_secs ? 
          Math.ceil(dynamicVars.system__call_duration_secs / 60) : 0,
        call_analysis_summary: webhookData.analysis?.call_summary_title,
        call_timestamp: dynamicVars.system__time_utc,
        call_type: callSource, // Use the enhanced call source detection
        call_source: callSource // Add explicit call_source field
      };
      
      logger.debug('Extracted call metadata', metadata);
      return metadata;
      
    } catch (error) {
      logger.error('Error extracting call metadata', {
        error: error instanceof Error ? error.message : String(error),
        webhookData: JSON.stringify(webhookData, null, 2)
      });
      
      // Return minimal metadata on error
      return {
        analysis_received_at: new Date().toISOString(),
        call_type: 'unknown',
        call_source: 'unknown',
        caller_id: null,
        called_number: null,
        call_duration_secs: 0,
        call_duration_minutes: 0
      };
    }
  }

  /**
   * Validate webhook payload structure for call source detection
   * 
   * @param webhookData - The webhook payload to validate
   * @returns boolean indicating if the payload has the required structure
   */
  static validateWebhookForCallSource(webhookData: any): boolean {
    try {
      if (!webhookData || typeof webhookData !== 'object') {
        logger.error('Webhook data is not a valid object');
        return false;
      }

      // Handle both new ElevenLabs format (data.conversation_initiation_client_data) 
      // and legacy format (conversation_initiation_client_data)
      const conversationData = webhookData.data?.conversation_initiation_client_data || 
                              webhookData.conversation_initiation_client_data;

      // Check if conversation_initiation_client_data exists
      if (!conversationData) {
        logger.warn('Missing conversation_initiation_client_data in webhook payload');
        return false;
      }

      // Check if dynamic_variables exists
      if (!conversationData.dynamic_variables) {
        logger.warn('Missing dynamic_variables in conversation_initiation_client_data');
        return false;
      }

      return true;
      
    } catch (error) {
      logger.error('Error validating webhook for call source detection', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Handle edge cases for missing or malformed webhook data
   * 
   * @param webhookData - The webhook payload to process
   * @returns Processed webhook data with defaults for missing fields
   */
  static handleWebhookEdgeCases(webhookData: any): any {
    try {
      // Handle both new ElevenLabs format (data.conversation_initiation_client_data) 
      // and legacy format (conversation_initiation_client_data)
      let conversationData;
      
      if (webhookData.data) {
        // New format
        if (!webhookData.data.conversation_initiation_client_data) {
          webhookData.data.conversation_initiation_client_data = {};
        }
        if (!webhookData.data.conversation_initiation_client_data.dynamic_variables) {
          webhookData.data.conversation_initiation_client_data.dynamic_variables = {};
        }
        conversationData = webhookData.data.conversation_initiation_client_data;
      } else {
        // Legacy format
        if (!webhookData.conversation_initiation_client_data) {
          webhookData.conversation_initiation_client_data = {};
        }
        if (!webhookData.conversation_initiation_client_data.dynamic_variables) {
          webhookData.conversation_initiation_client_data.dynamic_variables = {};
        }
        conversationData = webhookData.conversation_initiation_client_data;
      }

      const dynamicVars = conversationData.dynamic_variables;

      // Handle missing or malformed caller_id
      if (dynamicVars.system__caller_id === undefined || dynamicVars.system__caller_id === null) {
        dynamicVars.system__caller_id = 'internal';
        logger.debug('Set missing caller_id to internal');
      }

      // Handle missing call_type
      if (!dynamicVars.system__call_type) {
        // Infer call_type from caller_id
        dynamicVars.system__call_type = dynamicVars.system__caller_id === 'internal' ? 'web' : 'phone';
        logger.debug('Inferred call_type from caller_id', {
          caller_id: dynamicVars.system__caller_id,
          inferred_call_type: dynamicVars.system__call_type
        });
      }

      // Handle missing duration
      if (!dynamicVars.system__call_duration_secs || dynamicVars.system__call_duration_secs < 0) {
        dynamicVars.system__call_duration_secs = 0;
        logger.debug('Set missing or invalid call duration to 0');
      }

      return webhookData;
      
    } catch (error) {
      logger.error('Error handling webhook edge cases', {
        error: error instanceof Error ? error.message : String(error)
      });
      return webhookData; // Return original data if processing fails
    }
  }

  /**
   * Extract enhanced lead data from webhook payload
   * Parses Python dictionary string from analysis.data_collection_results.default.value
   * 
   * @param webhookData - The webhook payload from ElevenLabs
   * @returns EnhancedLeadData object or null if no extraction data is available
   */
  static extractEnhancedLeadData(webhookData: any): EnhancedLeadData | null {
    try {
      // Navigate to the analysis data
      const analysisData = webhookData.analysis?.data_collection_results?.default;
      
      if (!analysisData?.value) {
        logger.debug('No analysis data collection results found in webhook');
        return null;
      }

      // Parse the Python dictionary string to JSON
      const parsedData = this.parsePythonDict(analysisData.value);
      
      if (!parsedData || typeof parsedData !== 'object') {
        logger.debug('Failed to parse analysis data or result is not an object');
        return null;
      }

      // Extract company and contact information
      const extraction = parsedData.extraction || {};
      const companyName = extraction.company_name || null;
      const extractedName = extraction.name || null;
      const extractedEmail = extraction.email_address || null;

      // Extract CTA interactions (convert "Yes"/"No" strings to boolean)
      const ctaPricingClicked = parsedData.cta_pricing_clicked === 'Yes';
      const ctaDemoClicked = parsedData.cta_demo_clicked === 'Yes';
      const ctaFollowupClicked = parsedData.cta_followup_clicked === 'Yes';
      const ctaSampleClicked = parsedData.cta_sample_clicked === 'Yes';
      const ctaEscalatedToHuman = parsedData.cta_escalated_to_human === 'Yes';

      // Extract new fields: smart notification and demo booking
      const smartNotification = extraction.smartnotification || null;
      const demoBookDatetime = parsedData.demo_book_datetime || null;

      const enhancedLeadData: EnhancedLeadData = {
        companyName,
        extractedName,
        extractedEmail,
        ctaPricingClicked,
        ctaDemoClicked,
        ctaFollowupClicked,
        ctaSampleClicked,
        ctaEscalatedToHuman,
        smartNotification,
        demoBookDatetime
      };

      logger.debug('Successfully extracted enhanced lead data', {
        companyName,
        extractedName,
        extractedEmail,
        ctaPricingClicked,
        ctaDemoClicked,
        ctaFollowupClicked,
        ctaSampleClicked,
        ctaEscalatedToHuman,
        smartNotification,
        demoBookDatetime
      });

      return enhancedLeadData;

    } catch (error) {
      logger.error('Error extracting enhanced lead data', {
        error: error instanceof Error ? error.message : String(error),
        webhookData: JSON.stringify(webhookData, null, 2)
      });
      return null;
    }
  }

  /**
   * Parse Python dictionary string to JavaScript object
   * ENHANCED METHOD - Handles both quoted and unquoted formats
   * 
   * @param pythonDictString - String representation of Python dictionary
   * @returns Parsed JavaScript object or null if parsing fails
   */
  static parsePythonDict(pythonDictString: string): any {
    try {
      if (!pythonDictString || typeof pythonDictString !== 'string') {
        logger.debug('Invalid Python dict string provided');
        return null;
      }

      logger.debug('Parsing Python dict string (enhanced method)', {
        originalLength: pythonDictString.length,
        preview: pythonDictString.substring(0, 100),
        has_single_quotes: pythonDictString.includes("'"),
        has_double_quotes: pythonDictString.includes('"')
      });

      // Method 1: Try direct JSON parse first
      try {
        const directResult = JSON.parse(pythonDictString);
        logger.debug('Direct JSON parse successful');
        return directResult;
      } catch (directError) {
        logger.debug('Direct JSON parse failed, trying quote replacement');
      }

      // Method 2: Run-parser.js method - Replace single quotes with double quotes
      try {
        const valueStr = pythonDictString.replace(/'/g, '"');
        const quotedResult = JSON.parse(valueStr);
        logger.debug('Quoted format parsing successful (run-parser.js method)');
        return quotedResult;
      } catch (quotedError) {
        logger.debug('Quoted format parsing failed, trying unquoted format');
      }

      // Method 3: Handle unquoted format {key: value} - FALLBACK ONLY (Return raw data)
      try {
        logger.debug('Attempting unquoted format parsing - returning raw data as fallback');
        
        // For unquoted format, if all else fails, return the raw string wrapped
        // This ensures the webhook doesn't crash and data is preserved
        const fallbackResult = {
          raw_analysis_data: pythonDictString,
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

        logger.debug('Unquoted format handled with fallback data structure');
        return fallbackResult;
      } catch (unquotedError) {
        logger.debug('Unquoted format fallback failed', {
          error: unquotedError instanceof Error ? unquotedError.message : String(unquotedError)
        });
      }

      logger.error('All Python dict parsing methods failed', {
        error: 'Unable to parse in any format',
        pythonDictString: pythonDictString?.substring(0, 200)
      });
      return null;

    } catch (error) {
      logger.error('Python dict parsing error', {
        error: error instanceof Error ? error.message : String(error),
        pythonDictString: pythonDictString?.substring(0, 200)
      });
      return null;
    }
  }


  /**
   * Validate webhook payload for enhanced lead data extraction
   * 
   * @param webhookData - The webhook payload to validate
   * @returns boolean indicating if the payload has the required structure for lead extraction
   */
  static validateWebhookForLeadExtraction(webhookData: any): boolean {
    try {
      if (!webhookData || typeof webhookData !== 'object') {
        logger.debug('Webhook data is not a valid object for lead extraction');
        return false;
      }

      // Check if analysis data exists
      const analysisData = webhookData.analysis?.data_collection_results?.default;
      if (!analysisData?.value) {
        logger.debug('Missing analysis.data_collection_results.default.value in webhook payload');
        return false;
      }

      // Check if the value is a string (Python dict format)
      if (typeof analysisData.value !== 'string') {
        logger.debug('Analysis data value is not a string');
        return false;
      }

      return true;

    } catch (error) {
      logger.error('Error validating webhook for lead extraction', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}