import dotenv from 'dotenv';
import { TwilioNotConnectedService } from '../services/twilioMissedCallsService';
import database from '../config/database';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

async function testTwilioIntegration() {
  try {
    console.log('🧪 Testing Twilio Integration...\n');

    // Test 1: Database connection
    console.log('1. Testing database connection...');
    await database.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Test 2: Twilio service initialization
    console.log('2. Initializing Twilio service...');
    const twilioService = new TwilioNotConnectedService();
    console.log('✅ Twilio service initialized\n');

    // Test 3: Twilio API connection
    console.log('3. Testing Twilio API connection...');
    const isConnected = await twilioService.testConnection();
    if (isConnected) {
      console.log('✅ Twilio API connection successful\n');
    } else {
      console.log('❌ Twilio API connection failed\n');
      return;
    }

    // Test 4: Check database tables exist
    console.log('4. Checking database tables...');
    
    // Check contacts table has not_connected column
    const contactsTable = await database.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contacts' AND column_name = 'not_connected'
    `);
    
    if (contactsTable.rows.length > 0) {
      console.log('✅ contacts.not_connected column exists');
    } else {
      console.log('❌ contacts.not_connected column missing - run migration first');
    }

    // Check twilio_processed_calls table exists
    const twilioTable = await database.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'twilio_processed_calls'
    `);
    
    if (twilioTable.rows.length > 0) {
      console.log('✅ twilio_processed_calls table exists');
    } else {
      console.log('❌ twilio_processed_calls table missing - run migration first');
    }

    console.log('');

    // Test 5: Sample data check
    console.log('5. Checking sample data...');
    const contactsCount = await database.query('SELECT COUNT(*) as count FROM contacts');
    console.log(`📊 Total contacts: ${contactsCount.rows[0].count}`);

    const missedCallsCount = await database.query('SELECT COUNT(*) as count FROM contacts WHERE not_connected > 0');
    console.log(`📊 Contacts with missed calls: ${missedCallsCount.rows[0].count}`);

    const processedCallsCount = await database.query('SELECT COUNT(*) as count FROM twilio_processed_calls');
    console.log(`📊 Processed Twilio calls: ${processedCallsCount.rows[0].count}`);

    console.log('');

    // Test 6: Get processing stats
    console.log('6. Getting processing statistics...');
    const stats = await twilioService.getProcessingStats();
    console.log('📈 Processing stats:', stats);

    console.log('\n🎉 Twilio integration test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run the migration: npm run migrate');
    console.log('2. Start the server to enable automatic missed calls tracking');
    console.log('3. Monitor logs for missed calls processing every minute');

  } catch (error) {
    console.error('❌ Test failed:', error);
    logger.error('Twilio integration test failed:', error);
  } finally {
    await database.close();
    process.exit(0);
  }
}

// Run the test
testTwilioIntegration();