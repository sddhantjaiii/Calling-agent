# Design Document

## Overview

The AI Calling Agent SaaS platform is designed as a **multi-tenant** Node.js backend application that serves as an orchestration layer between multiple users and ElevenLabs Conversational AI services. The platform integrates with an existing **React/TypeScript frontend** built with Vite, Tailwind CSS, and Radix UI components.

The frontend already supports:
- **Dual Agent Types**: ChatAgent and CallAgent with dedicated management interfaces
- **Comprehensive Dashboard**: Overview, agent management, lead intelligence, and analytics
- **Lead Management**: Detailed profiles with interaction timelines and chat history
- **Credit System UI**: Payment flows and minute/credit purchasing
- **Real-time Analytics**: Charts, KPIs, and reporting dashboards
- **Theme Support**: Dark/light mode switching

The backend follows a webhook-driven architecture where ElevenLabs handles all call execution and sends comprehensive data back to our platform for processing, storage, and API delivery to the frontend. Each user operates in complete isolation with their own agents, contacts, call data, and billing.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer (Existing React App)"
        DASH[Dashboard UI]
        AGENTS[Agent Management]
        CHAT[Chat Agent Interface]
        CALL[Call Agent Interface]
        LEADS[Lead Management]
        ANALYTICS[Analytics Dashboard]
    end
    
    subgraph "Backend Services (To Build)"
        API[REST API Server]
        WH[Webhook Handler]
        AUTH[Stack Auth Integration]
        BILLING[Credit/Billing Service]
        CONTACT[Contact Service]
        ADMIN[Admin Panel API]
    end
    
    subgraph "External Services"
        EL[ElevenLabs API]
        NEON[Neon PostgreSQL]
        STRIPE[Stripe Payment]
        EMAIL[Email Service]
        STACK[Stack Auth]
    end
    
    DASH --> API
    AGENTS --> API
    CHAT --> API
    CALL --> API
    LEADS --> API
    ANALYTICS --> API
    
    API --> AUTH
    API --> BILLING
    API --> CONTACT
    API <--> EL
    EL --> WH
    WH --> NEON
    API --> NEON
    BILLING --> STRIPE
    AUTH --> STACK
    AUTH --> EMAIL
```

### Multi-Tenant Service Architecture

The backend follows a microservices-inspired modular architecture with **tenant isolation** at every layer:

1. **API Gateway**: Express.js server with tenant-aware request routing
2. **Webhook Service**: Processes ElevenLabs webhooks and routes to correct tenant
3. **Authentication Service**: Neon Auth integration with tenant-scoped sessions
4. **Billing Service**: Per-tenant credit management and Stripe integration
5. **Contact Service**: Tenant-isolated contact management and bulk upload
6. **Agent Service**: Tenant-scoped ElevenLabs agent configuration proxy
7. **Analytics Service**: Tenant-specific lead scoring and reporting

**Tenant Isolation Strategy**:
- All database queries include `user_id` filtering
- API endpoints validate user ownership of resources
- Webhook processing identifies tenant from agent/call associations
- Admin panel provides cross-tenant management capabilities

## Frontend Integration

### ⚠️ CRITICAL CONSTRAINT: Frontend UI/UX is Final

**The existing React frontend design is FINAL and must NOT be modified in any way. All backend development must adapt to the existing frontend structure, data expectations, and API contracts.**

### Existing Frontend Structure

The React frontend is already built with the following key components:

**Dashboard Components:**
- `Dashboard.tsx` - Main dashboard with tab navigation
- `Overview.tsx` - KPI dashboard with charts and metrics
- `Agents.tsx` - Agent management page
- `ChatAgent.tsx` - Chat agent interface with logs/analytics/data tabs
- `CallAgent.tsx` - Call agent interface with logs/analytics/data tabs

**Agent Management:**
- `AgentManager.tsx` - CRUD operations for agents
- `AgentModal.tsx` - Agent creation/editing modal
- Support for both ChatAgent and CallAgent types

**Lead Management:**
- `LeadProfileTab.tsx` - Detailed lead profiles with interaction timelines
- `ChatData.tsx` - Lead data tables with filtering
- `CallData.tsx` - Call data tables with recordings

**Analytics:**
- `OverviewCharts.tsx` - Recharts-based analytics
- `OverviewKPIs.tsx` - Key performance indicators
- Real-time data visualization

### API Integration Points

**The backend MUST provide REST APIs that exactly match the frontend's existing data expectations and component interfaces. No frontend modifications are allowed.**

Required API endpoints based on frontend analysis:

**Agent APIs:**
- `GET /api/agents` - List user's agents
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

**Call/Chat Data APIs:**
- `GET /api/calls` - List calls with filtering
- `GET /api/calls/:id/transcript` - Get call transcript
- `GET /api/calls/:id/recording` - Get call recording URL
- `GET /api/leads` - List leads with analytics data

**Dashboard APIs:**
- `GET /api/dashboard/overview` - KPI data for overview
- `GET /api/dashboard/analytics` - Chart data
- `GET /api/user/credits` - User credit balance

## Components and Interfaces

### 1. Authentication Component

**Purpose**: Handle user registration, login, and session management using Neon Auth

**Key Interfaces**:
- `POST /auth/register` - User registration with email verification
- `POST /auth/login` - User authentication
- `POST /auth/social` - Social login (Google, LinkedIn)
- `GET /auth/profile` - User profile management
- `POST /auth/reset-password` - Password reset functionality

**Integration Points**:
- Neon Auth SDK for primary authentication and session management
- Neon Auth social providers (Google, LinkedIn) 
- Google App Password for email verification
- JWT token validation for API requests

### 2. Agent Management Component

**Purpose**: Proxy agent configuration requests to ElevenLabs API without local storage

**Key Interfaces**:
- `GET /agents` - List user's agents (fetched from ElevenLabs)
- `POST /agents` - Create new agent via ElevenLabs API
- `PUT /agents/:id` - Update agent configuration via ElevenLabs API
- `DELETE /agents/:id` - Delete agent via ElevenLabs API
- `GET /agents/:id/config` - Get agent configuration from ElevenLabs

**Multi-Tenant Data Flow**:
```mermaid
sequenceDiagram
    participant U as User A
    participant API as Backend API
    participant AUTH as Auth Service
    participant EL as ElevenLabs API
    participant DB as Database
    
    U->>API: Create Agent Request + JWT Token
    API->>AUTH: Validate Token & Extract User ID
    AUTH->>API: User ID Validated
    API->>EL: Create Agent via API (with user context)
    EL->>API: Agent Created (ID returned)
    API->>DB: Store Agent ID + User Association
    Note over DB: All queries filtered by user_id
    API->>U: Agent Created Response
```

### 3. Webhook Processing Component

**Purpose**: Receive and process all call data from ElevenLabs webhooks

**Key Interfaces**:
- `POST /webhooks/elevenlabs/call-completed` - Process completed call data
- `POST /webhooks/elevenlabs/call-analytics` - Process call analytics and lead scoring
- `GET /api/contact-lookup/:phone` - Contact lookup for ElevenLabs

**Webhook Data Processing**:
```mermaid
sequenceDiagram
    participant EL as ElevenLabs
    participant WH as Webhook Handler
    participant DB as Database
    participant BILLING as Billing Service
    
    EL->>WH: Call Completed Webhook
    WH->>WH: Validate & Parse Payload
    WH->>DB: Store Call Data
    WH->>DB: Store Transcript
    WH->>DB: Store Lead Analytics
    WH->>BILLING: Deduct Credits
    WH->>EL: Acknowledge Receipt
```

### 4. Credit and Billing Component

**Purpose**: Manage user credits, billing, and Stripe payment integration

**Key Interfaces**:
- `GET /billing/credits` - Get user credit balance
- `POST /billing/purchase` - Purchase credits via Stripe
- `GET /billing/history` - Credit usage history
- `POST /billing/webhook/stripe` - Stripe webhook handler

**Credit Management Flow**:
```mermaid
stateDiagram-v2
    [*] --> NewUser
    NewUser --> FreeCredits : Registration
    FreeCredits --> ActiveUser : 15 Credits Added
    ActiveUser --> LowCredits : Usage < 5 Credits
    ActiveUser --> PurchaseFlow : User Buys Credits
    LowCredits --> PurchaseFlow : User Buys Credits
    PurchaseFlow --> StripePayment : Payment Processing
    StripePayment --> ActiveUser : Payment Success
    StripePayment --> LowCredits : Payment Failed
```

### 5. Contact Management Component

**Purpose**: Handle contact uploads, storage, and lookup for ElevenLabs integration

**Key Interfaces**:
- `POST /contacts/upload` - Bulk upload via Excel
- `GET /contacts` - List user contacts
- `POST /contacts` - Add individual contact
- `PUT /contacts/:id` - Update contact
- `DELETE /contacts/:id` - Delete contact
- `GET /api/lookup/:phone` - External lookup for ElevenLabs

**Contact Upload Process**:
```mermaid
flowchart TD
    A[Excel Upload] --> B[Validate Format]
    B --> C[Parse Contacts]
    C --> D[Validate Phone Numbers]
    D --> E[Check Duplicates]
    E --> F[Store in Database]
    F --> G[Return Upload Results]
```

### 6. Analytics and Reporting Component

**Purpose**: Process lead scoring data and generate analytics reports

**Key Interfaces**:
- `GET /analytics/dashboard` - Dashboard metrics
- `GET /analytics/leads` - Lead scoring data
- `GET /analytics/calls` - Call analytics
- `GET /analytics/reports` - Generate reports

## Data Models

### User Model
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  auth_provider: 'email' | 'google' | 'linkedin';
}
```

### Agent Model
```typescript
interface Agent {
  id: string;
  user_id: string;
  elevenlabs_agent_id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}
```

### Call Model
```typescript
interface Call {
  id: string;
  agent_id: string;
  user_id: string;
  elevenlabs_conversation_id: string;
  phone_number: string;
  duration_minutes: number;
  status: 'completed' | 'failed' | 'in_progress';
  recording_url: string;
  created_at: Date;
  completed_at: Date;
}
```

### Transcript Model
```typescript
interface Transcript {
  id: string;
  call_id: string;
  content: string;
  speaker_segments: Array<{
    speaker: 'agent' | 'user';
    text: string;
    timestamp: number;
  }>;
  created_at: Date;
}
```

### Lead Analytics Model
```typescript
interface LeadAnalytics {
  id: string;
  call_id: string;
  intent_level: string;
  intent_score: number;
  urgency_level: string;
  urgency_score: number;
  budget_constraint: string;
  budget_score: number;
  fit_alignment: string;
  fit_score: number;
  engagement_health: string;
  engagement_score: number;
  total_score: number;
  lead_status_tag: string;
  reasoning: {
    intent: string;
    urgency: string;
    budget: string;
    fit: string;
    engagement: string;
    cta_behavior: string;
  };
  cta_interactions: {
    pricing_clicked: boolean;
    demo_clicked: boolean;
    followup_clicked: boolean;
    sample_clicked: boolean;
    escalated_to_human: boolean;
  };
  created_at: Date;
}
```

### Contact Model
```typescript
interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  email?: string;
  company?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}
```

### Credit Transaction Model
```typescript
interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'purchase' | 'usage' | 'bonus' | 'admin_adjustment';
  amount: number;
  balance_after: number;
  description: string;
  stripe_payment_id?: string;
  created_at: Date;
}
```

## Error Handling

### API Error Response Format
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
  };
}
```

### Error Categories
1. **Authentication Errors** (401): Invalid credentials, expired tokens
2. **Authorization Errors** (403): Insufficient permissions, account suspended
3. **Validation Errors** (400): Invalid input data, missing required fields
4. **Resource Errors** (404): Agent not found, call not found
5. **External Service Errors** (502): ElevenLabs API unavailable, Stripe errors
6. **Rate Limiting Errors** (429): Too many requests
7. **Server Errors** (500): Database connection issues, unexpected errors

### Retry Logic
- **ElevenLabs API**: Exponential backoff with max 3 retries
- **Webhook Processing**: Dead letter queue for failed webhooks
- **Database Operations**: Connection retry with circuit breaker pattern
- **Payment Processing**: Immediate retry once, then manual review

## Required Credentials and Configuration

### Environment Variables Needed

**Database Configuration:**
- `DATABASE_URL` - postgresql://neondb_owner:npg_d6qDxYFghA0J@ep-wandering-sun-a1it7q5i-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

**Stack Auth Configuration (Neon Auth):**
- `STACK_PROJECT_ID` - e0135016-a873-43e2-b39a-5f2a4e208cbc
- `STACK_PUBLISHABLE_CLIENT_KEY` - pck_z64s5yqch7jcmd054zfajy6ntj3kpqy5a2n3k9m3bvw7g
- `STACK_SECRET_SERVER_KEY` - ssk_myry63fcx46zbfeh41sz4mzj2c72gr3wsjkp2rwv5m5c0
- `JWKS_URL` - https://api.stack-auth.com/api/v1/projects/e0135016-a873-43e2-b39a-5f2a4e208cbc/.well-known/jwks.json

**ElevenLabs API Configuration:**
- `ELEVENLABS_API_KEY` - sk_32e7eeeb22a53fa590d2bd53aa0dd8d690f2fb33012f3984 (admin configurable)
- `ELEVENLABS_WEBHOOK_SECRET` - To be configured after initial testing
- `ELEVENLABS_BASE_URL` - https://api.elevenlabs.io

**Stripe Payment Configuration:**
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook endpoint secret

**Email Configuration (Google App Password):**
- `GMAIL_USER` - Your Gmail address
- `GMAIL_APP_PASSWORD` - Google App Password for email sending
- `EMAIL_FROM` - From email address for system emails

**Social Login Configuration:**
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `LINKEDIN_CLIENT_ID` - LinkedIn OAuth client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn OAuth client secret

**Application Configuration:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `FRONTEND_URL` - Frontend application URL for CORS
- `WEBHOOK_BASE_URL` - Your backend URL for ElevenLabs webhooks

### Setup Requirements from Your End

**1. Neon Database Setup:**
- [ ] Create Neon PostgreSQL database
- [ ] Enable Neon Auth in your project
- [ ] Configure social login providers in Neon Auth dashboard
- [ ] Provide database connection string

**2. ElevenLabs Configuration:**
- [ ] Provide ElevenLabs API key
- [ ] Configure webhook endpoints in ElevenLabs dashboard
- [ ] Provide webhook secret for signature verification
- [ ] Test API access and permissions

**3. Stripe Payment Setup:**
- [ ] Create Stripe account (or provide existing credentials)
- [ ] Configure webhook endpoints in Stripe dashboard
- [ ] Set up product/pricing for credit purchases
- [ ] Provide API keys (test and live)

**4. Email Service Setup:**
- [ ] Enable 2FA on Gmail account
- [ ] Generate Google App Password
- [ ] Test email sending capabilities

**5. Social Login Setup:**
- [ ] Create Google OAuth application
- [ ] Create LinkedIn OAuth application
- [ ] Configure redirect URIs
- [ ] Provide client credentials

**6. Domain and Hosting:**
- [ ] Domain name for the application
- [ ] SSL certificate setup
- [ ] AWS hosting environment setup

### Admin Configuration Management

**Admin Panel Features:**
- **API Key Management**: Admin can update ElevenLabs API key, Stripe keys, email credentials
- **System Settings**: Configure webhook URLs, credit pricing, file upload limits
- **User Management**: View all users, adjust credit balances, suspend accounts
- **Agent Management**: Access and modify any user's agent configurations
- **Analytics**: System-wide usage statistics and revenue reporting

**Configuration Storage:**
- Sensitive keys stored in encrypted database table `system_config`
- Admin-only access with proper role-based permissions
- Configuration changes logged for audit trail

**Credit Billing Logic:**
- 1 credit per minute, rounded up (e.g., 2:13 = 3 credits)
- Maximum contact upload: 1000 contacts per file

## Testing Strategy

### Unit Testing
- **Service Layer**: Test all business logic components
- **API Endpoints**: Test request/response handling
- **Data Models**: Test validation and serialization
- **Webhook Processing**: Test payload parsing and error handling

### Integration Testing
- **ElevenLabs API**: Mock API responses for agent operations
- **Database Operations**: Test with test database instance
- **Stripe Integration**: Use Stripe test environment
- **Email Service**: Mock email sending

### End-to-End Testing
- **User Registration Flow**: Complete signup to first agent creation
- **Call Processing Flow**: Webhook receipt to data storage
- **Credit Purchase Flow**: Payment to credit addition
- **Contact Upload Flow**: Excel upload to contact availability

### Performance Testing
- **Webhook Processing**: Handle concurrent webhook requests
- **Database Queries**: Optimize for large datasets
- **API Response Times**: Target <200ms for most endpoints
- **File Upload**: Handle large Excel files efficiently

### Security Testing
- **Authentication**: Test token validation and expiration
- **Authorization**: Test role-based access controls
- **Input Validation**: Test SQL injection and XSS prevention
- **Webhook Security**: Test signature validation
- **Payment Security**: Test PCI compliance measures