import { databaseService } from '../services/databaseService';

async function updateUsersTableForOAuth() {
  try {
    console.log('🔍 Checking users table structure...');
    
    // Check if google_id column exists
    const checkGoogleIdQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'google_id'
    `;
    
    const googleIdResult = await databaseService.query(checkGoogleIdQuery);
    
    if (googleIdResult.rows.length === 0) {
      console.log('➕ Adding google_id column...');
      await databaseService.query('ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE');
    } else {
      console.log('✅ google_id column already exists');
    }
    
    // Check if profile_picture column exists
    const checkProfilePictureQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'profile_picture'
    `;
    
    const profilePictureResult = await databaseService.query(checkProfilePictureQuery);
    
    if (profilePictureResult.rows.length === 0) {
      console.log('➕ Adding profile_picture column...');
      await databaseService.query('ALTER TABLE users ADD COLUMN profile_picture TEXT');
    } else {
      console.log('✅ profile_picture column already exists');
    }
    
    // Create index on google_id for faster lookups
    const indexQuery = `
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)
    `;
    
    console.log('🔗 Creating index on google_id...');
    await databaseService.query(indexQuery);
    
    console.log('✅ Users table updated successfully for OAuth support!');
    
  } catch (error) {
    console.error('❌ Error updating users table:', error);
    throw error;
  }
}

// Run the migration
updateUsersTableForOAuth()
  .then(() => {
    console.log('🎉 Database migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });