const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixPhoneNumbersTable() {
  try {
    // Drop table if it exists
    await pool.query('DROP TABLE IF EXISTS phone_numbers CASCADE');
    console.log('Dropped phone_numbers table if it existed');
    
    // Create the table with correct column name
    await pool.query(`
      CREATE TABLE phone_numbers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(50) NOT NULL,
        elevenlabs_phone_number_id VARCHAR(255) NOT NULL UNIQUE,
        assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created phone_numbers table');
    
    // Create indexes
    await pool.query('CREATE INDEX idx_phone_numbers_assigned_to_user_id ON phone_numbers(assigned_to_user_id)');
    await pool.query('CREATE INDEX idx_phone_numbers_created_by_admin_id ON phone_numbers(created_by_admin_id)');
    await pool.query('CREATE INDEX idx_phone_numbers_elevenlabs_id ON phone_numbers(elevenlabs_phone_number_id)');
    await pool.query('CREATE INDEX idx_phone_numbers_active ON phone_numbers(is_active)');
    console.log('Created indexes');
    
    // Create unique constraint
    await pool.query(`
      CREATE UNIQUE INDEX idx_phone_numbers_unique_active 
      ON phone_numbers(phone_number) 
      WHERE is_active = true;
    `);
    console.log('Created unique constraint');
    
    // Create trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_phone_numbers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    console.log('Created trigger function');
    
    // Create trigger
    await pool.query(`
      CREATE TRIGGER trigger_phone_numbers_updated_at
          BEFORE UPDATE ON phone_numbers
          FOR EACH ROW
          EXECUTE FUNCTION update_phone_numbers_updated_at();
    `);
    console.log('Created trigger');
    
    // Add comment
    await pool.query("COMMENT ON TABLE phone_numbers IS 'Manages phone numbers for batch calling functionality with ElevenLabs integration'");
    console.log('Added table comment');
    
    console.log('Phone numbers table setup completed successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixPhoneNumbersTable();
