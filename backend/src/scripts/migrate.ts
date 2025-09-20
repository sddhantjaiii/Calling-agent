#!/usr/bin/env node

import dotenv from 'dotenv';
import MigrationRunner from '../utils/migrationRunner';
import database from '../config/database';

// Load environment variables
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  const migrationRunner = new MigrationRunner();

  try {
    switch (command) {
      case 'run':
        console.log('🚀 Running database migrations...');
        await migrationRunner.runMigrations();
        break;

      case 'status':
        console.log('📊 Checking migration status...');
        const status = await migrationRunner.getMigrationStatus();
        console.log(`\n📈 Migration Status:`);
        console.log(`   Total migrations: ${status.total}`);
        console.log(`   Executed: ${status.executed.length}`);
        console.log(`   Pending: ${status.pending.length}`);
        
        if (status.executed.length > 0) {
          console.log(`\n✅ Executed migrations:`);
          status.executed.forEach(migration => console.log(`   - ${migration}`));
        }
        
        if (status.pending.length > 0) {
          console.log(`\n⏳ Pending migrations:`);
          status.pending.forEach(migration => console.log(`   - ${migration}`));
        }
        break;

      case 'reset':
        console.log('⚠️  WARNING: This will reset the entire database!');
        console.log('⚠️  All data will be lost!');
        
        // In production, we might want to add a confirmation prompt
        if (process.env.NODE_ENV === 'production') {
          console.log('❌ Database reset is not allowed in production environment');
          process.exit(1);
        }
        
        await migrationRunner.resetDatabase();
        console.log('🔄 Running migrations after reset...');
        await migrationRunner.runMigrations();
        break;

      case 'help':
      default:
        console.log(`
📚 Database Migration CLI

Usage: npm run migrate [command]

Commands:
  run     - Run all pending migrations (default)
  status  - Show migration status
  reset   - Reset database and run all migrations (development only)
  help    - Show this help message

Examples:
  npm run migrate
  npm run migrate status
  npm run migrate reset
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Migration command failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await database.close();
  }
}

// Run the main function
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});