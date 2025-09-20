import { authService } from '../services/authService';
import { databaseService } from '../services/databaseService';

async function resetUserPassword() {
  try {
    const email = 'test3@gmail.com';
    const newPassword = 'Siddhant@2';

    console.log(`🔄 Resetting password for user: ${email}`);

    // First, check if user exists
    const user = await authService.getUserByEmail(email);
    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      return;
    }

    console.log(`✅ User found: ${user.name} (ID: ${user.id})`);

    // Hash the new password
    const hashedPassword = await authService.hashPassword(newPassword);
    console.log('🔐 Password hashed successfully');

    // Update the password in the database
    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE email = $2
      RETURNING id, email, name, updated_at
    `;

    const result = await databaseService.query(updateQuery, [hashedPassword, email]);

    if (result.rows.length === 0) {
      console.error('❌ Failed to update password');
      return;
    }

    const updatedUser = result.rows[0];
    console.log('✅ Password updated successfully');
    console.log(`📧 Email: ${updatedUser.email}`);
    console.log(`👤 Name: ${updatedUser.name}`);
    console.log(`🕒 Updated at: ${updatedUser.updated_at}`);

    // Verify the new password works
    console.log('\n🔍 Verifying new password...');
    const isValid = await authService.verifyPassword(newPassword, hashedPassword);
    
    if (isValid) {
      console.log('✅ Password verification successful');
    } else {
      console.error('❌ Password verification failed');
    }

    // Invalidate all existing sessions for this user (force re-login)
    const invalidateSessionsQuery = `
      UPDATE user_sessions 
      SET is_active = false 
      WHERE user_id = $1
    `;

    const sessionResult = await databaseService.query(invalidateSessionsQuery, [user.id]);
    console.log(`🔒 Invalidated ${sessionResult.rowCount || 0} existing sessions`);

    console.log('\n🎉 Password reset completed successfully!');
    console.log(`📝 New password: ${newPassword}`);

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the script
resetUserPassword();