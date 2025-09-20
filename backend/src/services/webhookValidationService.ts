import { logger } from '../utils/logger';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validationContext: {
    payload_type: string;
    field_validation_errors: string[];
    structure_analysis: any;
    performance_metrics: {
      validation_time_ms: number;
      payload_size_bytes: number;
    };
  };
}

/**
 * Comprehensive webhook validation service for task 8.2
 * Provides detailed validation, error handling, and fallback mechanisms
 */
export class WebhookValidationService {

  /**
   * Comprehensive webhook payload validation with detailed reporting
   * 
   * @param payload - The webhook payload to validate
   * @param options - Validation options
   * @returns Detailed validation result
   */
  static validateWebhookPayload(
    payload: any, 
    options: {
      strict?: boolean;
      allowUnknownFields?: boolean;
      maxPayloadSize?: number;
    } = {}
  ): ValidationResult {
    const startTime = Date.now();
    const validationId = `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const validationContext = {
      payload_type: 'unknown',
      field_validation_errors: [] as string[],
      structure_analysis: {},
      performance_metrics: {
        validation_time_ms: 0,
        payload_size_bytes: 0
      }
    };

    try {
      logger.debug('🔍 Starting comprehensive webhook validation', {
        validation_id: validationId,
        options,
        processing_step: 'validation_start'
      });

      // Basic payload validation
      const basicValidation = this.validateBasicStructure(payload, errors, warnings, validationContext);
      if (!basicValidation) {
        return this.createValidationResult(false, errors, warnings, validationContext, startTime);
      }

      // Payload size validation
      const payloadSize = JSON.stringify(payload).length;
      validationContext.performance_metrics.payload_size_bytes = payloadSize;
      
      const maxSize = options.maxPayloadSize || 10 * 1024 * 1024; // 10MB default
      if (payloadSize > maxSize) {
        errors.push(`Payload size ${payloadSize} bytes exceeds maximum ${maxSize} bytes`);
        return this.createValidationResult(false, errors, warnings, validationContext, startTime);
      }

      // Format-specific validation
      let formatValidation = false;
      
      // Try new ElevenLabs format
      if (payload.type && payload.event_timestamp && payload.data) {
        validationContext.payload_type = 'new_elevenlabs_format';
        formatValidation = this.validateNewElevenLabsFormat(payload, errors, warnings, validationContext, options);
      }
      // Try legacy format
      else if (payload.conversation_id && payload.agent_id) {
        validationContext.payload_type = 'legacy_format';
        formatValidation = this.validateLegacyFormat(payload, errors, warnings, validationContext, options);
      }
      // Unknown format
      else {
        validationContext.payload_type = 'unknown_format';
        errors.push('Payload does not match any known webhook format');
        
        // Provide helpful analysis of what we received
        validationContext.structure_analysis = {
          available_fields: Object.keys(payload),
          field_types: Object.keys(payload).reduce((acc, key) => {
            acc[key] = typeof payload[key];
            return acc;
          }, {} as any),
          nested_objects: Object.keys(payload).filter(key => 
            payload[key] && typeof payload[key] === 'object' && !Array.isArray(payload[key])
          )
        };
      }

      // Additional validation checks
      this.performAdditionalValidation(payload, errors, warnings, validationContext, options);

      const isValid = formatValidation && errors.length === 0;
      
      logger.debug(isValid ? '✅ Webhook validation completed successfully' : '❌ Webhook validation failed', {
        validation_id: validationId,
        is_valid: isValid,
        error_count: errors.length,
        warning_count: warnings.length,
        payload_type: validationContext.payload_type,
        validation_time_ms: Date.now() - startTime,
        processing_step: 'validation_complete'
      });

      return this.createValidationResult(isValid, errors, warnings, validationContext, startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Validation exception: ${errorMessage}`);
      
      logger.error('❌ Webhook validation threw exception', {
        validation_id: validationId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        processing_step: 'validation_exception'
      });

      return this.createValidationResult(false, errors, warnings, validationContext, startTime);
    }
  }

  /**
   * Validate basic payload structure
   */
  private static validateBasicStructure(
    payload: any, 
    errors: string[], 
    warnings: string[], 
    validationContext: any
  ): boolean {
    // Null/undefined check
    if (payload === null || payload === undefined) {
      errors.push('Payload is null or undefined');
      return false;
    }

    // Type check
    if (typeof payload !== 'object') {
      errors.push(`Payload must be an object, got ${typeof payload}`);
      return false;
    }

    // Array check
    if (Array.isArray(payload)) {
      errors.push('Payload cannot be an array');
      return false;
    }

    // Empty object check
    const keys = Object.keys(payload);
    if (keys.length === 0) {
      errors.push('Payload is an empty object');
      return false;
    }

    // Circular reference check
    try {
      JSON.stringify(payload);
    } catch (circularError) {
      errors.push('Payload contains circular references');
      return false;
    }

    validationContext.structure_analysis = {
      field_count: keys.length,
      top_level_fields: keys.slice(0, 20), // First 20 fields
      has_nested_objects: keys.some(key => 
        payload[key] && typeof payload[key] === 'object' && !Array.isArray(payload[key])
      ),
      has_arrays: keys.some(key => Array.isArray(payload[key]))
    };

    return true;
  }

  /**
   * Validate new ElevenLabs webhook format
   */
  private static validateNewElevenLabsFormat(
    payload: any, 
    errors: string[], 
    warnings: string[], 
    validationContext: any,
    _options: any
  ): boolean {
    let isValid = true;

    // Validate webhook type
    const validTypes = ['post_call_transcription', 'post_call_audio'];
    if (!validTypes.includes(payload.type)) {
      errors.push(`Invalid webhook type: ${payload.type}. Expected: ${validTypes.join(', ')}`);
      validationContext.field_validation_errors.push(`type: invalid value '${payload.type}'`);
      isValid = false;
    }

    // Validate event timestamp
    if (typeof payload.event_timestamp !== 'number') {
      errors.push(`Invalid event_timestamp: expected number, got ${typeof payload.event_timestamp}`);
      validationContext.field_validation_errors.push(`event_timestamp: invalid type`);
      isValid = false;
    } else {
      // Check timestamp reasonableness
      const now = Math.floor(Date.now() / 1000);
      const maxAge = 24 * 60 * 60; // 24 hours
      const maxFuture = 5 * 60; // 5 minutes
      
      if (payload.event_timestamp < (now - maxAge)) {
        warnings.push(`Event timestamp is very old: ${payload.event_timestamp}`);
      } else if (payload.event_timestamp > (now + maxFuture)) {
        warnings.push(`Event timestamp is in the future: ${payload.event_timestamp}`);
      }
    }

    // Validate data object
    if (!payload.data || typeof payload.data !== 'object') {
      errors.push('Missing or invalid data object');
      validationContext.field_validation_errors.push('data: missing or invalid');
      isValid = false;
    } else {
      // Validate required data fields
      const requiredDataFields = ['agent_id', 'conversation_id'];
      requiredDataFields.forEach(field => {
        if (!payload.data[field]) {
          errors.push(`Missing required data field: ${field}`);
          validationContext.field_validation_errors.push(`data.${field}: missing`);
          isValid = false;
        } else if (typeof payload.data[field] !== 'string' || payload.data[field].trim().length === 0) {
          errors.push(`Invalid data field ${field}: must be non-empty string`);
          validationContext.field_validation_errors.push(`data.${field}: invalid`);
          isValid = false;
        }
      });

      // Validate optional fields
      if (payload.data.status && typeof payload.data.status !== 'string') {
        warnings.push(`Invalid status type: expected string, got ${typeof payload.data.status}`);
      }

      // Audio webhook specific validation
      if (payload.type === 'post_call_audio') {
        if (!payload.data.full_audio || typeof payload.data.full_audio !== 'string') {
          errors.push('Audio webhook missing or invalid full_audio field');
          validationContext.field_validation_errors.push('data.full_audio: missing or invalid');
          isValid = false;
        }
      }

      // Transcript validation
      if (payload.data.transcript && !Array.isArray(payload.data.transcript)) {
        warnings.push(`Invalid transcript format: expected array, got ${typeof payload.data.transcript}`);
      }
    }

    return isValid;
  }

  /**
   * Validate legacy webhook format
   */
  private static validateLegacyFormat(
    payload: any, 
    errors: string[], 
    warnings: string[], 
    validationContext: any,
    options: any
  ): boolean {
    let isValid = true;
    const requiredFields = ['conversation_id', 'agent_id', 'status', 'timestamp'];

    // Check required fields
    requiredFields.forEach(field => {
      if (!payload[field]) {
        errors.push(`Missing required field: ${field}`);
        validationContext.field_validation_errors.push(`${field}: missing`);
        isValid = false;
      }
    });

    // Validate field types and formats
    if (payload.conversation_id && (typeof payload.conversation_id !== 'string' || payload.conversation_id.trim().length === 0)) {
      errors.push('Invalid conversation_id: must be non-empty string');
      isValid = false;
    }

    if (payload.agent_id && (typeof payload.agent_id !== 'string' || payload.agent_id.trim().length === 0)) {
      errors.push('Invalid agent_id: must be non-empty string');
      isValid = false;
    }

    if (payload.status) {
      const validStatuses = ['completed', 'failed', 'in_progress', 'active', 'ended', 'error'];
      if (!validStatuses.includes(payload.status)) {
        errors.push(`Invalid status: ${payload.status}. Valid: ${validStatuses.join(', ')}`);
        isValid = false;
      }
    }

    if (payload.timestamp) {
      const parsedDate = new Date(payload.timestamp);
      if (isNaN(parsedDate.getTime())) {
        errors.push(`Invalid timestamp format: ${payload.timestamp}`);
        isValid = false;
      }
    }

    // Validate optional numeric fields
    if (payload.duration_seconds !== undefined && (typeof payload.duration_seconds !== 'number' || payload.duration_seconds < 0)) {
      warnings.push(`Invalid duration_seconds: expected non-negative number, got ${payload.duration_seconds}`);
    }

    return isValid;
  }

  /**
   * Perform additional validation checks
   */
  private static performAdditionalValidation(
    payload: any, 
    errors: string[], 
    warnings: string[], 
    validationContext: any,
    options: any
  ): void {
    // Check for potentially malicious content
    const maliciousPatterns = [
      { pattern: /<script/i, description: 'Script tag detected' },
      { pattern: /javascript:/i, description: 'JavaScript protocol detected' },
      { pattern: /on\w+\s*=/i, description: 'Event handler detected' }
    ];

    const payloadString = JSON.stringify(payload);
    maliciousPatterns.forEach(({ pattern, description }) => {
      if (pattern.test(payloadString)) {
        warnings.push(`Security warning: ${description}`);
      }
    });

    // Check for excessively deep nesting
    const maxDepth = 10;
    const depth = this.getObjectDepth(payload);
    if (depth > maxDepth) {
      warnings.push(`Object nesting depth ${depth} exceeds recommended maximum ${maxDepth}`);
    }

    // Check for large arrays
    const maxArraySize = 1000;
    this.checkArraySizes(payload, maxArraySize, warnings);

    // Check for suspicious field names
    const suspiciousFields = ['__proto__', 'constructor', 'prototype'];
    const foundSuspicious = Object.keys(payload).filter(key => suspiciousFields.includes(key));
    if (foundSuspicious.length > 0) {
      warnings.push(`Suspicious field names detected: ${foundSuspicious.join(', ')}`);
    }
  }

  /**
   * Get object nesting depth
   */
  private static getObjectDepth(obj: any, depth = 0): number {
    if (obj === null || typeof obj !== 'object') {
      return depth;
    }

    const depths = Object.values(obj).map(value => this.getObjectDepth(value, depth + 1));
    return Math.max(depth, ...depths);
  }

  /**
   * Check array sizes recursively
   */
  private static checkArraySizes(obj: any, maxSize: number, warnings: string[]): void {
    if (Array.isArray(obj)) {
      if (obj.length > maxSize) {
        warnings.push(`Large array detected: ${obj.length} elements (max recommended: ${maxSize})`);
      }
      obj.forEach(item => this.checkArraySizes(item, maxSize, warnings));
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(value => this.checkArraySizes(value, maxSize, warnings));
    }
  }

  /**
   * Create validation result object
   */
  private static createValidationResult(
    isValid: boolean,
    errors: string[],
    warnings: string[],
    validationContext: any,
    startTime: number
  ): ValidationResult {
    validationContext.performance_metrics.validation_time_ms = Date.now() - startTime;
    
    return {
      isValid,
      errors,
      warnings,
      validationContext
    };
  }

  /**
   * Create fallback payload for malformed data
   * Attempts to extract usable information and create a minimal valid structure
   */
  static createFallbackPayload(originalPayload: any): any {
    try {
      logger.debug('🔧 Creating fallback payload for malformed data', {
        original_type: typeof originalPayload,
        has_data: !!originalPayload
      });

      // If payload is completely unusable, create minimal structure
      if (!originalPayload || typeof originalPayload !== 'object') {
        return {
          conversation_initiation_client_data: {
            dynamic_variables: {
              system__conversation_id: `fallback_${Date.now()}`,
              system__agent_id: 'unknown_agent',
              system__caller_id: 'internal',
              system__call_duration_secs: 0,
              system__time_utc: new Date().toISOString()
            }
          },
          _fallback_created: true,
          _original_payload_type: typeof originalPayload
        };
      }

      // Try to extract useful information
      const fallback: any = {
        _fallback_created: true,
        _original_payload_preview: this.createSafePayloadPreview(originalPayload)
      };

      // Extract conversation ID
      fallback.conversation_id = originalPayload.conversation_id || 
                                originalPayload.data?.conversation_id || 
                                `fallback_${Date.now()}`;

      // Extract agent ID
      fallback.agent_id = originalPayload.agent_id || 
                         originalPayload.data?.agent_id || 
                         'unknown_agent';

      // Extract status
      fallback.status = originalPayload.status || 
                       originalPayload.data?.status || 
                       'unknown';

      // Extract timestamp
      fallback.timestamp = originalPayload.timestamp || 
                          (originalPayload.event_timestamp ? new Date(originalPayload.event_timestamp * 1000).toISOString() : null) ||
                          new Date().toISOString();

      // Create conversation_initiation_client_data structure
      fallback.conversation_initiation_client_data = {
        dynamic_variables: {
          system__conversation_id: fallback.conversation_id,
          system__agent_id: fallback.agent_id,
          system__caller_id: originalPayload.phone_number || 'internal',
          system__call_duration_secs: originalPayload.duration_seconds || 0,
          system__time_utc: fallback.timestamp
        }
      };

      logger.debug('✅ Fallback payload created', {
        conversation_id: fallback.conversation_id,
        agent_id: fallback.agent_id,
        status: fallback.status
      });

      return fallback;

    } catch (error) {
      logger.error('❌ Failed to create fallback payload', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Return absolute minimal structure
      return {
        conversation_id: `error_fallback_${Date.now()}`,
        agent_id: 'unknown_agent',
        status: 'error',
        timestamp: new Date().toISOString(),
        conversation_initiation_client_data: {
          dynamic_variables: {
            system__conversation_id: `error_fallback_${Date.now()}`,
            system__agent_id: 'unknown_agent',
            system__caller_id: 'internal',
            system__call_duration_secs: 0,
            system__time_utc: new Date().toISOString()
          }
        },
        _fallback_created: true,
        _fallback_error: true
      };
    }
  }

  /**
   * Create safe payload preview for logging
   */
  private static createSafePayloadPreview(payload: any): any {
    try {
      if (!payload || typeof payload !== 'object') {
        return { type: typeof payload, value: String(payload).substring(0, 100) };
      }

      const preview: any = {};
      const safeFields = [
        'type', 'event_timestamp', 'conversation_id', 'agent_id', 'status', 
        'timestamp', 'duration_seconds', 'phone_number'
      ];

      safeFields.forEach(field => {
        if (payload[field] !== undefined) {
          preview[field] = payload[field];
        }
      });

      preview._structure = {
        field_count: Object.keys(payload).length,
        has_data: !!payload.data,
        has_analysis: !!payload.analysis,
        has_transcript: !!payload.transcript
      };

      return preview;
    } catch (error) {
      return { preview_error: error instanceof Error ? error.message : String(error) };
    }
  }
}