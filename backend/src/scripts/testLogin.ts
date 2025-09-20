import dotenv from 'dotenv';
import { authService } from '../services/authService';

// Load environment variables
dotenv.config();

async function testLogin() {
  try {
    console.log('Testing login functionality...');
    
    // Try to login with admin user (we need to know the password)
    const email = 'admin@example.com';
    const password = 'admin123'; // This is likely the password, but we need to check
    
    console.log(`Attempting login with: ${email}`);
    
    const result = await authService.login(email, password);
    
    if (result) {
      console.log('Login successful!');
      console.log('User:', {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        credits: result.user.credits
      });
      console.log('Token generated:', result.token.substring(0, 20) + '...');
    } else {
      console.log('Login failed - invalid credentials');
    }
    
  } catch (error) {
    console.error('Login test error:', error);
  }
}

testLogin();