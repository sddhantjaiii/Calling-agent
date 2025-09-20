import { authService } from '../services/authService';

async function verifyPasswordReset() {
  try {
    const email = 'test3@gmail.com';
    const password = 'Siddhant@2';

    console.log(`🔍 Verifying login for user: ${email}`);

    // Attempt to login with the new password
    const loginResult = await authService.login(email, password);

    if (loginResult) {
      console.log('✅ Login successful!');
      console.log(`👤 User: ${loginResult.user.name}`);
      console.log(`📧 Email: ${loginResult.user.email}`);
      console.log(`💳 Credits: ${loginResult.user.credits}`);
      console.log(`🔑 Role: ${loginResult.user.role}`);
      console.log(`✅ Active: ${loginResult.user.isActive}`);
      console.log(`📧 Email Verified: ${loginResult.user.emailVerified}`);
      console.log('🎯 Password reset verification completed successfully!');
    } else {
      console.error('❌ Login failed - password reset may not have worked');
    }

  } catch (error) {
    console.error('❌ Error verifying password reset:', error);
  } finally {
    process.exit(0);
  }
}

// Run the verification
verifyPasswordReset();