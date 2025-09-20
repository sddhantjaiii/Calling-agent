import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { DatabaseService } from '../services/databaseService';

// Load environment variables
dotenv.config();

async function addPasswordToExistingUsers() {
  try {
    console.log('Adding passwords to existing users...');
    DatabaseService.initialize();
    
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 12);
    const userPassword = await bcrypt.hash('password123', 12);
    
    // Update admin user
    await DatabaseService.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [adminPassword, 'admin@example.com']
    );
    
    // Update regular user
    await DatabaseService.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [userPassword, 'siddhant.jaiswal@sniperthink.com']
    );
    
    console.log('Passwords added successfully!');
    console.log('Admin login: admin@example.com / admin123');
    console.log('User login: siddhant.jaiswal@sniperthink.com / password123');
    
    await DatabaseService.close();
  } catch (error) {
    console.error('Error adding passwords:', error);
  }
}

addPasswordToExistingUsers();