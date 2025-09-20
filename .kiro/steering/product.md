---
inclusion: always
---

# AI Calling Agent SaaS Platform

This is a comprehensive SaaS platform for AI-powered calling agents that enables businesses to automate phone interactions using advanced AI technology.

## Core Business Logic

### Agent-Centric Architecture
- All data operations are scoped to specific agents (agent_id filtering required)
- Users can only access data for agents they own or have permissions for
- Agent ownership validation is critical for security and data isolation

### Call Processing Workflow
1. **Webhook Reception**: ElevenLabs sends call data via webhooks
2. **Data Parsing**: Extract lead information, call metrics, and CTA analytics
3. **Lead Extraction**: Parse caller information and interaction outcomes
4. **Analytics Storage**: Store call metrics, lead data, and performance indicators
5. **Real-time Updates**: Trigger cache invalidation and dashboard updates

### Credit System Rules
- Credits are consumed per call/interaction
- Insufficient credits should prevent new calls
- Credit usage tracking must be accurate and real-time
- Stripe integration handles credit purchases and billing

## Data Models & Relationships

### Core Entities
- **Users**: Platform account holders with authentication
- **Agents**: AI calling agents owned by users
- **Calls**: Individual call records with transcripts and metrics
- **Leads**: Contact information and interaction history
- **Analytics**: Aggregated metrics and performance data

### Key Relationships
- Users → Agents (one-to-many, ownership)
- Agents → Calls (one-to-many, scoped data)
- Calls → Leads (extracted from call interactions)
- Agents → Analytics (aggregated performance metrics)

## Security & Data Isolation

### User Context Validation
- Always validate user permissions before data access
- Implement agent ownership checks in all endpoints
- Use user_id filtering in database queries where applicable
- Prevent cross-user data leakage through proper scoping

### Webhook Security
- Validate webhook signatures from ElevenLabs
- Sanitize all incoming webhook data
- Implement rate limiting on webhook endpoints
- Log webhook processing for audit trails

## Performance Patterns

### Caching Strategy
- Cache dashboard analytics with TTL-based invalidation
- Use Redis for session management and temporary data
- Implement cache warming for frequently accessed data
- Trigger cache invalidation on data updates

### Database Optimization
- Use connection pooling for PostgreSQL
- Implement proper indexing on frequently queried fields
- Use database triggers for real-time analytics updates
- Optimize queries with agent_id filtering

## API Design Conventions

### Response Patterns
- Consistent error handling with structured error responses
- Include pagination for list endpoints
- Return relevant metadata (total counts, timestamps)
- Use HTTP status codes appropriately

### Webhook Processing
- Idempotent webhook handling to prevent duplicate processing
- Comprehensive error logging for debugging
- Graceful degradation when external services are unavailable
- Retry logic with exponential backoff

## Key Integrations

### ElevenLabs
- **Purpose**: AI voice synthesis and calling infrastructure
- **Data Flow**: Webhooks → Call Processing → Analytics Storage
- **Error Handling**: Retry failed calls, log API errors

### Stripe
- **Purpose**: Payment processing and subscription management
- **Integration Points**: Credit purchases, billing cycles, usage tracking
- **Security**: Webhook signature validation, secure API key handling

### Stack Auth
- **Purpose**: Authentication and user management
- **Implementation**: JWT tokens, session management, role-based access

## Business Rules

### Lead Management
- Leads are extracted from call transcripts and webhook data
- Lead scoring based on interaction quality and outcomes
- Duplicate lead detection and merging capabilities
- Lead assignment to specific agents for tracking

### Analytics & Reporting
- Real-time dashboard updates via WebSocket or polling
- Historical data retention for trend analysis
- Export capabilities for external reporting tools
- Anomaly detection for unusual patterns or performance drops

### Admin Features
- System-wide analytics and KPI monitoring
- User management and agent oversight
- Billing and usage monitoring
- Security audit logs and compliance reporting