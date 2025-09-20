import dotenv from 'dotenv';
import { DatabaseService } from '../services/databaseService';

// Load environment variables
dotenv.config();

async function checkUsers() {
  try {
    console.log('Connecting to database...');
    DatabaseService.initialize();
    
    const result = await DatabaseService.query('SELECT email, name, created_at FROM users LIMIT 10');
    
    console.log('Existing users:');
    if (result.rows.length === 0) {
      console.log('No users found in database');
    } else {
      console.table(result.rows);
    }
    
    await DatabaseService.close();
  } catch (error) {
    console.error('Error checking users:', error);
  }
}

checkUsers();