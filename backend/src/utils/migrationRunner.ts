import fs from 'fs';
import path from 'path';
import database from '../config/database';

interface Migration {
  id: string;
  filename: string;
  sql: string;
}

class MigrationRunner {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, '../migrations');
  }

  /**
   * Create migrations table if it doesn't exist
   */
  private async createMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    
    await database.query(createTableSQL);
  }

  /**
   * Get list of executed migrations
   */
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await database.query('SELECT filename FROM migrations ORDER BY id');
      return result.rows.map((row: any) => row.filename);
    } catch (error) {
      // If migrations table doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Get list of available migration files
   */
  private getMigrationFiles(): Migration[] {
    if (!fs.existsSync(this.migrationsPath)) {
      console.log('Migrations directory does not exist');
      return [];
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const filePath = path.join(this.migrationsPath, filename);
      const sql = fs.readFileSync(filePath, 'utf8');
      const id = filename.replace('.sql', '');
      
      return { id, filename, sql };
    });
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<void> {
    console.log(`Executing migration: ${migration.filename}`);
    
    await database.transaction(async (client) => {
      // Execute the migration SQL
      await client.query(migration.sql);
      
      // Record the migration as executed
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [migration.filename]
      );
    });
    
    console.log(`✅ Migration ${migration.filename} executed successfully`);
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Starting database migrations...');
      
      // Ensure database is connected
      if (!database.connected) {
        await database.initialize();
      }

      // Create migrations table
      await this.createMigrationsTable();

      // Get executed and available migrations
      const executedMigrations = await this.getExecutedMigrations();
      const availableMigrations = this.getMigrationFiles();

      // Filter out already executed migrations
      const pendingMigrations = availableMigrations.filter(
        migration => !executedMigrations.includes(migration.filename)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations to run');
        return;
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migration(s)`);

      // Execute each pending migration
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('🎉 All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    executed: string[];
    pending: string[];
    total: number;
  }> {
    try {
      // Ensure database is connected
      if (!database.connected) {
        await database.initialize();
      }

      await this.createMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const availableMigrations = this.getMigrationFiles();
      
      const pendingMigrations = availableMigrations
        .filter(migration => !executedMigrations.includes(migration.filename))
        .map(migration => migration.filename);

      return {
        executed: executedMigrations,
        pending: pendingMigrations,
        total: availableMigrations.length
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      throw error;
    }
  }

  /**
   * Reset database (WARNING: This will drop all tables)
   */
  async resetDatabase(): Promise<void> {
    console.log('⚠️  WARNING: Resetting database - this will drop all tables!');
    
    try {
      // Get all table names
      const result = await database.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename != 'migrations'
      `);
      
      const tables = result.rows.map((row: any) => row.tablename);
      
      if (tables.length > 0) {
        // Drop all tables
        const dropTablesSQL = `DROP TABLE IF EXISTS ${tables.join(', ')} CASCADE`;
        await database.query(dropTablesSQL);
        console.log(`🗑️  Dropped ${tables.length} table(s)`);
      }
      
      // Clear migrations table
      await database.query('DELETE FROM migrations');
      console.log('🧹 Cleared migrations history');
      
      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }
}

export default MigrationRunner;