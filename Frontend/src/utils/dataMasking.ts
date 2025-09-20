/**
 * Utility functions for masking sensitive data in admin interfaces
 */

export interface MaskingOptions {
  showFirst?: number;
  showLast?: number;
  maskChar?: string;
  minLength?: number;
}

/**
 * Mask API keys and tokens
 */
export function maskApiKey(
  apiKey: string, 
  options: MaskingOptions = {}
): string {
  if (!apiKey || typeof apiKey !== 'string') {
    return '';
  }

  const {
    showFirst = 4,
    showLast = 4,
    maskChar = '*',
    minLength = 8
  } = options;

  if (apiKey.length < minLength) {
    return maskChar.repeat(8);
  }

  if (apiKey.length <= showFirst + showLast) {
    return maskChar.repeat(apiKey.length);
  }

  const firstPart = apiKey.substring(0, showFirst);
  const lastPart = apiKey.substring(apiKey.length - showLast);
  const maskLength = apiKey.length - showFirst - showLast;
  
  return `${firstPart}${maskChar.repeat(maskLength)}${lastPart}`;
}

/**
 * Mask email addresses
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '';
  }

  const [localPart, domain] = email.split('@');
  
  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }

  const maskedLocal = `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone numbers
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) {
    return '';
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 4) {
    return '*'.repeat(digits.length);
  }

  if (digits.length <= 10) {
    // Format: ***-***-1234
    const lastFour = digits.slice(-4);
    const masked = '*'.repeat(digits.length - 4);
    return `${masked}-${lastFour}`;
  }

  // International format: +1-***-***-1234
  const countryCode = digits.slice(0, digits.length - 10);
  const lastFour = digits.slice(-4);
  const masked = '*'.repeat(6);
  return `+${countryCode}-${masked}-${lastFour}`;
}

/**
 * Mask IP addresses
 */
export function maskIpAddress(ip: string): string {
  if (!ip) {
    return '';
  }

  if (ip.includes(':')) {
    // IPv6 - show first and last segment
    const segments = ip.split(':');
    if (segments.length < 3) {
      return ip;
    }
    return `${segments[0]}:***:***:${segments[segments.length - 1]}`;
  } else {
    // IPv4 - show first and last octet
    const octets = ip.split('.');
    if (octets.length !== 4) {
      return ip;
    }
    return `${octets[0]}.***.***.${octets[3]}`;
  }
}

/**
 * Mask credit card numbers
 */
export function maskCreditCard(cardNumber: string): string {
  if (!cardNumber) {
    return '';
  }

  const digits = cardNumber.replace(/\D/g, '');
  
  if (digits.length < 4) {
    return '*'.repeat(digits.length);
  }

  const lastFour = digits.slice(-4);
  const masked = '*'.repeat(digits.length - 4);
  
  // Format with spaces every 4 digits
  const maskedWithSpaces = masked.match(/.{1,4}/g)?.join(' ') || masked;
  return `${maskedWithSpaces} ${lastFour}`;
}

/**
 * Mask generic sensitive strings
 */
export function maskSensitiveString(
  value: string,
  options: MaskingOptions = {}
): string {
  if (!value) {
    return '';
  }

  const {
    showFirst = 2,
    showLast = 2,
    maskChar = '*',
    minLength = 4
  } = options;

  if (value.length < minLength) {
    return maskChar.repeat(value.length);
  }

  if (value.length <= showFirst + showLast) {
    return maskChar.repeat(value.length);
  }

  const firstPart = value.substring(0, showFirst);
  const lastPart = value.substring(value.length - showLast);
  const maskLength = value.length - showFirst - showLast;
  
  return `${firstPart}${maskChar.repeat(maskLength)}${lastPart}`;
}

/**
 * Determine if a field should be masked based on field name
 */
export function shouldMaskField(fieldName: string): boolean {
  const sensitiveFields = [
    'password',
    'token',
    'key',
    'secret',
    'api_key',
    'apikey',
    'access_token',
    'refresh_token',
    'private_key',
    'credit_card',
    'card_number',
    'ssn',
    'social_security',
    'bank_account',
    'routing_number'
  ];

  const lowerFieldName = fieldName.toLowerCase();
  return sensitiveFields.some(sensitive => 
    lowerFieldName.includes(sensitive)
  );
}

/**
 * Auto-mask object properties based on field names
 */
export function autoMaskObject<T extends Record<string, any>>(
  obj: T,
  customMaskingRules?: Record<string, (value: any) => string>
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const masked = { ...obj };

  Object.keys(masked).forEach(key => {
    const value = masked[key];
    
    if (typeof value === 'string' && value) {
      // Apply custom masking rule if exists
      if (customMaskingRules && customMaskingRules[key]) {
        masked[key] = customMaskingRules[key](value);
        return;
      }

      // Auto-detect and mask sensitive fields
      if (shouldMaskField(key)) {
        if (key.toLowerCase().includes('email')) {
          masked[key] = maskEmail(value);
        } else if (key.toLowerCase().includes('phone')) {
          masked[key] = maskPhoneNumber(value);
        } else if (key.toLowerCase().includes('ip')) {
          masked[key] = maskIpAddress(value);
        } else if (key.toLowerCase().includes('card')) {
          masked[key] = maskCreditCard(value);
        } else if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
          masked[key] = maskApiKey(value);
        } else {
          masked[key] = maskSensitiveString(value);
        }
      }
    }
  });

  return masked;
}

/**
 * Mask data for display in admin tables
 */
export function maskForAdminDisplay(
  data: any[],
  maskingConfig?: Record<string, MaskingOptions | ((value: any) => string)>
): any[] {
  if (!Array.isArray(data)) {
    return data;
  }

  return data.map(item => {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const masked = { ...item };

    Object.keys(masked).forEach(key => {
      const value = masked[key];
      
      if (typeof value === 'string' && value) {
        const config = maskingConfig?.[key];
        
        if (typeof config === 'function') {
          masked[key] = config(value);
        } else if (config && typeof config === 'object') {
          if (shouldMaskField(key)) {
            masked[key] = maskSensitiveString(value, config);
          }
        } else if (shouldMaskField(key)) {
          // Auto-mask based on field name
          masked[key] = autoMaskObject({ [key]: value })[key];
        }
      }
    });

    return masked;
  });
}

/**
 * Create a reveal/hide toggle for sensitive data
 */
export function createMaskedValue(originalValue: string, maskingFn?: (value: string) => string) {
  const maskedValue = maskingFn ? maskingFn(originalValue) : maskSensitiveString(originalValue);
  
  return {
    original: originalValue,
    masked: maskedValue,
    isRevealed: false,
    toggle: function() {
      this.isRevealed = !this.isRevealed;
      return this.isRevealed ? this.original : this.masked;
    },
    getValue: function() {
      return this.isRevealed ? this.original : this.masked;
    }
  };
}