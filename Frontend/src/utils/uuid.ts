/**
 * UUID generation utilities
 * Provides proper UUID generation to replace inappropriate Math.random() usage
 */

/**
 * Generate a UUID v4 using crypto.randomUUID() if available, 
 * otherwise fallback to a secure random implementation
 */
export function generateUUID(): string {
  // Use native crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation using crypto.getRandomValues()
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const array = new Uint8Array(1);
      crypto.getRandomValues(array);
      const r = array[0] % 16;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Final fallback for environments without crypto (should be rare)
  console.warn('crypto API not available, using less secure UUID generation');
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a short unique ID (8 characters)
 * Suitable for component IDs, form field IDs, etc.
 */
export function generateShortId(): string {
  // Use crypto.getRandomValues() for better randomness
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(36)).join('').substring(0, 8);
  }
  
  // Fallback using timestamp + random
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 6);
  return (timestamp + randomPart).substring(0, 8);
}

/**
 * Generate a unique ID with a prefix
 * Useful for component IDs, form field IDs, etc.
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${generateShortId()}`;
}

/**
 * Generate a unique error ID for error tracking
 */
export function generateErrorId(): string {
  const timestamp = Date.now();
  const shortId = generateShortId();
  return `error_${timestamp}_${shortId}`;
}