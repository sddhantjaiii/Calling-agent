import crypto from 'crypto';

// Encryption utilities - for sensitive data handling
export class Encryption {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyLength = 32;

  static generateKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  static encrypt(text: string, key: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, Buffer.from(key, 'hex'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Note: For production use, implement proper GCM mode encryption
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: crypto.createHash('sha256').update(encrypted).digest('hex').substring(0, 32)
    };
  }

  static decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
    const decipher = crypto.createDecipher(this.algorithm, Buffer.from(key, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}