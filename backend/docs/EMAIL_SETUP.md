# Email Verification System Setup

## Overview

The AI Calling Agent platform includes a comprehensive email verification system that handles:
- Email verification for new user registrations
- Password reset functionality
- Welcome emails after verification
- Low credits notifications
- Verification reminders for unverified users

## Gmail SMTP Configuration

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Factor Authentication if not already enabled

### Step 2: Generate App Password
1. In Google Account Security settings
2. Go to "App passwords" section
3. Select "Mail" as the app
4. Select "Other" as the device and name it "AI Calling Agent Platform"
5. Copy the generated 16-character app password

### Step 3: Configure Environment Variables
Add the following to your `.env` file:

```env
# Email Configuration (Google App Password)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
EMAIL_FROM=your-email@gmail.com
```

### Step 4: Test Configuration
You can test the email configuration using the admin endpoint:
```bash
GET /api/email/test
```

## Email Verification Workflow

### New User Registration
1. User registers through Stack Auth
2. System creates local user record with 15 free credits
3. Email verification is automatically sent to the user
4. User clicks verification link in email
5. System marks email as verified
6. Welcome email is sent with credit information

### Manual Verification Resend
Users can request a new verification email:
```bash
POST /api/email/send-verification
Authorization: Bearer <token>
```

### Email Verification Process
```bash
POST /api/email/verify
{
  "token": "verification-token-from-email"
}
```

## Password Reset Integration

### Request Password Reset
```bash
POST /api/email/send-password-reset
{
  "email": "user@example.com"
}
```

### Reset Password
Since we use Stack Auth, password reset is handled by Stack Auth. The email contains a link that redirects to the Stack Auth password reset flow.

## Scheduled Tasks

The system includes automated tasks for email management:

### Verification Reminders
- Runs every 6 hours
- Sends reminders to users who haven't verified their email after 24 hours
- Can be manually triggered by admins

### Low Credits Notifications
- Runs every 24 hours
- Notifies users when their credit balance is below 5 credits
- Can be manually triggered by admins

## Admin Functions

### Send Verification Reminders
```bash
POST /api/email/admin/send-verification-reminders
Authorization: Bearer <admin-token>
{
  "hoursThreshold": 24
}
```

### Test Email Configuration
```bash
GET /api/email/test
Authorization: Bearer <admin-token>
```

## Email Templates

The system includes professionally designed HTML email templates for:
- Email verification
- Password reset
- Welcome messages
- Low credits notifications

All templates are responsive and include both HTML and plain text versions for maximum compatibility.

## Security Features

- JWT tokens for email verification with 24-hour expiry
- Password reset tokens with 1-hour expiry
- Rate limiting on email endpoints
- Secure token generation and validation
- Email address validation and sanitization

## Troubleshooting

### Common Issues

1. **Email not sending**: Check Gmail credentials and app password
2. **Verification links not working**: Ensure FRONTEND_URL is correctly set
3. **Emails going to spam**: Consider using a custom domain with proper SPF/DKIM records

### Logs
Email service logs all operations for debugging:
- Successful email sends
- Failed email attempts
- Configuration issues
- Token verification attempts

### Testing
Run the email verification tests:
```bash
npm test -- --testPathPattern=emailVerification.test.ts
npm test -- --testPathPattern=emailService.test.ts
```