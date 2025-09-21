# AI Calling Agent Backend

Backend API for the AI Calling Agent SaaS platform. This Node.js/Express.js application provides REST APIs for managing AI calling agents, processing webhooks from ElevenLabs, handling user authentication, and managing billing through Stripe.

## Features

- **User Authentication**: Stack Auth integration with social login support
- **Email Verification**: ZeptoMail SMTP integration with automated verification workflows
- **Agent Management**: Proxy to ElevenLabs API for agent configuration
- **Call Processing**: Webhook handling for call data, transcripts, and analytics
- **Contact Management**: Bulk upload and lookup functionality
- **Credit System**: Usage-based billing with Stripe integration
- **Admin Panel**: Backend-only admin management interface

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **Authentication**: Stack Auth (Neon Auth)
- **Payments**: Stripe
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate limiting

## Project Structure

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic and external API integrations
├── models/          # Data models and interfaces
├── middleware/      # Authentication, validation, error handling
├── routes/          # API route definitions
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── server.ts        # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon)
- ElevenLabs API key
- Stripe account (for payments)
- ZeptoMail account with API credentials (for emails)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

4. Build the application:
```bash
npm run build
```

5. Start development server:
```bash
npm run dev
```

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test-email` - Test email configuration
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Email Verification
- `POST /api/email/send-verification` - Send verification email
- `POST /api/email/verify` - Verify email with token
- `POST /api/email/send-password-reset` - Send password reset email
- `GET /api/email/test` - Test email configuration (admin)

### Agents
- `GET /api/agents` - List user's agents
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Calls
- `GET /api/calls` - List user's calls
- `GET /api/calls/:id/transcript` - Get call transcript
- `GET /api/calls/:id/recording` - Get call recording

### Contacts
- `GET /api/contacts` - List user's contacts
- `POST /api/contacts/upload` - Bulk upload contacts
- `GET /api/contacts/lookup/:phone` - Contact lookup (for ElevenLabs)

### Billing
- `GET /api/billing/credits` - Get credit balance
- `POST /api/billing/purchase` - Purchase credits
- `GET /api/billing/history` - Billing history

### Webhooks
- `POST /api/webhooks/elevenlabs/call-completed` - ElevenLabs webhook
- `POST /api/webhooks/stripe` - Stripe webhook

### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/credits` - Update user credits
- `GET /api/admin/config` - System configuration

## Environment Variables

See `.env.example` for all required environment variables including:
- Database connection
- Stack Auth credentials
- ElevenLabs API key
- Stripe keys
- Email configuration
- Social login credentials

## Frontend Integration

The backend is designed to work with the existing React frontend running on port 8080. CORS is configured to allow requests from the frontend URL specified in `FRONTEND_URL` environment variable.

## Deployment

The application is containerized and ready for deployment to AWS or other cloud platforms. Ensure all environment variables are properly configured in the production environment.