import database from '../config/database';

// Database service - handles PostgreSQL connection and operations using the centralized database config
export class DatabaseService {
  static initialize() {
    // Use the centralized database configuration
    return database.initialize();
  }

  // Database operations using the centralized database
  static async query(text: string, params?: any[]): Promise<any> {
    return database.query(text, params);
  }

  static async getClient() {
    return database.getClient();
  }

  static async close(): Promise<void> {
    return database.close();
  }
}

// Create and export an instance for compatibility
export const databaseService = new class {
  async query(text: string, params?: any[]): Promise<any> {
    return DatabaseService.query(text, params);
  }

  async getClient() {
    return DatabaseService.getClient();
  }

  async close(): Promise<void> {
    return DatabaseService.close();
  }
}();