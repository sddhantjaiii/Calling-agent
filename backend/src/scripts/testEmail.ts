#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * 
 * This script helps test the email configuration without starting the full server.
 * Run with: npm run test-email
 */

import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// THEN import the email service
import { emailService } from '../services/emailService';

async function testEmailConfiguration() {
  console.log('🧪 Testing Email Configuration...\n');

  // Check if email service is configured
  const isConfigured = emailService.isEmailConfigured();
  console.log(`📧 Email Service Configured: ${isConfigured ? '✅ Yes' : '❌ No'}`);

  if (!isConfigured) {
    console.log('\n❌ Email service is not configured. Please check your environment variables:');
    console.log('   - ZEPTOMAIL_HOST: ZeptoMail SMTP host (smtp.zeptomail.in)');
    console.log('   - ZEPTOMAIL_PORT: SMTP port (587 for TLS, 465 for SSL)');
    console.log('   - ZEPTOMAIL_USER: ZeptoMail username (emailapikey)');
    console.log('   - ZEPTOMAIL_PASSWORD: Your ZeptoMail API password');
    console.log('   - EMAIL_FROM: Email address to send from (e.g., noreply@sniperthink.com)');
    console.log('\nSee docs/EMAIL_SETUP.md for detailed setup instructions.');
    process.exit(1);
  }

  // Test email configuration
  console.log('\n🔍 Testing SMTP connection...');
  const testResult = await emailService.testEmailConfiguration();
  console.log(`📡 SMTP Connection: ${testResult ? '✅ Success' : '❌ Failed'}`);

  if (!testResult) {
    console.log('\n❌ SMTP connection failed. Please check:');
    console.log('   - ZeptoMail credentials are correct');
    console.log('   - API password is valid');
    console.log('   - Domain is properly configured with ZeptoMail');
    console.log('   - Network connectivity to smtp.zeptomail.in');
    process.exit(1);
  }

  // Send test email if requested
  const sendTestEmail = process.argv.includes('--send-test');
  if (sendTestEmail) {
    const testEmail = process.env.TEST_EMAIL || process.env.EMAIL_FROM;
    
    if (!testEmail) {
      console.log('\n⚠️  No test email address provided. Use --send-test with TEST_EMAIL env var.');
      process.exit(0);
    }

    console.log(`\n📤 Sending test email to: ${testEmail}`);
    
    const emailSent = await emailService.sendVerificationEmail({
      userEmail: testEmail,
      userName: 'Test User',
      verificationUrl: 'https://example.com/verify?token=test-token'
    });

    console.log(`📧 Test Email Sent: ${emailSent ? '✅ Success' : '❌ Failed'}`);
    
    if (emailSent) {
      console.log('\n✅ Email configuration is working correctly!');
      console.log('   Check your inbox for the test verification email.');
    } else {
      console.log('\n❌ Failed to send test email. Check the logs above for details.');
      process.exit(1);
    }
  }

  console.log('\n🎉 Email configuration test completed successfully!');
  console.log('\nTo send a test email, run: npm run test-email -- --send-test');
  console.log('Set TEST_EMAIL environment variable to specify recipient.');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

// Run the test
testEmailConfiguration().catch((error) => {
  console.error('\n❌ Email configuration test failed:', error);
  process.exit(1);
});