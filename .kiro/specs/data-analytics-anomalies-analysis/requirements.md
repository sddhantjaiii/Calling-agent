# Data Analytics Anomalies Analysis - Requirements

## Overview
This specification addresses critical data integrity and analytics anomalies in the AI Calling Agent SaaS platform where analytics data is incorrectly attributed between agents, lead sources are misidentified, and database triggers are causing data inconsistencies.

## Problem Statement

Based on analysis of the original webhook controller implementation and comparison with the current system, several critical data anomalies have been identified:

### 🚨 **Critical Issue 1: Cross-Agent Analytics Contamination**
**Symptom**: Users seeing analytics data from other agents in their dashboard
**Impact**: Data privacy breach, incorrect business insights, user confusion
**Root Cause**: Missing user_id filtering and improper agent identification in data queries

### 🚨 **Critical Issue 2: Incorrect Lead Source Detection** 
**Symptom**: All calls showing as "phone" source when some should be "internet"
**Impact**: Inaccurate channel attribution, wrong marketing insights
**Root Cause**: Missing call source detection logic from original implementation

### 🚨 **Critical Issue 3: Database Trigger Inconsistencies**
**Symptom**: Data updates in one table not properly propagating to related tables
**Impact**: Stale analytics, inconsistent KPIs, cache invalidation issues
**Root Cause**: Trigger logic not handling all edge cases and data relationships

### 🚨 **Critical Issue 4: Contact Information Anomalies**
**Symptom**: Fake or placeholder contact information appearing in UI
**Impact**: Unprofessional appearance, user confusion
**Root Cause**: Frontend not handling null/missing contact data gracefully

## Detailed Problem Analysis

### Cross-Agent Data Contamination Scenarios

#### Scenario 1: Analytics Query Missing User Context
```sql
-- ❌ CURRENT (PROBLEMATIC): Missing user_id filtering
SELECT * FROM lead_analytics la 
JOIN calls c ON la.call_id = c.id 
WHERE c.agent_id = $1;

-- ✅ CORRECT: Should include user_id filtering
SELECT * FROM lead_analytics la 
JOIN calls c ON la.call_id = c.id 
WHERE c.agent_id = $1 AND c.user_id = $2;
```

#### Scenario 2: Agent Ownership Validation Missing
```typescript
// ❌ CURRENT: No validation that agent belongs to user
const agent = await Agent.findById(agentId);
const analytics = await getAnalytics(agent.id);

// ✅ CORRECT: Validate agent ownership
const agent = await Agent.findOne({ id: agentId, user_id: userId });
if (!agent) throw new Error('Agent not found or access denied');
```

#### Scenario 3: Frontend Hook Missing User Context
```typescript
// ❌ CURRENT: Hook doesn't include user context
const { data } = useQuery(['analytics', agentId], () => 
  apiService.get(`/analytics/${agentId}`)
);

// ✅ CORRECT: Include user context in API calls
const { user } = useAuth();
const { data } = useQuery(['analytics', user.id, agentId], () => 
  apiService.get(`/analytics/${agentId}`, { 
    headers: { 'X-User-ID': user.id } 
  })
);
```

### Lead Source Detection Issues

#### Scenario 1: Missing Call Source Logic
Based on original implementation, call source should be determined by:
```javascript
// From original webhook-processor.js
const callType = dynamicVars.system__caller_id ? 'phone' : 'internal';

// Enhanced logic needed:
function determineCallSource(webhookData) {
  const dynamicVars = webhookData.conversation_initiation_client_data?.dynamic_variables || {};
  
  if (dynamicVars.system__caller_id && dynamicVars.system__caller_id !== 'internal') {
    return 'phone';
  }
  
  if (dynamicVars.system__call_type === 'web' || dynamicVars.system__call_type === 'browser') {
    return 'internet';
  }
  
  return 'unknown';
}
```

#### Scenario 2: Database Schema Missing Call Source Column
```sql
-- Missing column in calls table
ALTER TABLE calls ADD COLUMN call_source VARCHAR(20) DEFAULT 'phone';
```

#### Scenario 3: Frontend Not Displaying Call Source
```typescript
// Missing call source indicators in UI components
<CallSourceIndicator 
  source={call.call_source} 
  phoneNumber={call.phone_number} 
/>
```

### Database Trigger Issues

#### Scenario 1: KPI Update Triggers Not Handling Edge Cases
```sql
-- Current trigger may not handle all update scenarios
CREATE OR REPLACE FUNCTION update_user_kpis()
RETURNS TRIGGER AS $$
BEGIN
  -- Missing validation for user_id consistency
  -- Missing handling of agent ownership changes
  -- Missing proper error handling
END;
$$ LANGUAGE plpgsql;
```

#### Scenario 2: Cache Invalidation Triggers Missing Dependencies
```sql
-- Triggers not invalidating all related cache entries
-- Missing cascade invalidation for related data
```

## User Stories

### Epic 1: Data Isolation and Security

**US-1.1: Agent Data Isolation**
```
As a user with multiple agents,
I want to see only analytics data for my own agents,
So that I don't see other users' confidential call data.

Acceptance Criteria:
- All analytics queries include user_id filtering
- Agent ownership validated before data access
- Cross-user data access impossible at database level
- Frontend hooks include user context in all API calls
```

**US-1.2: Tenant Data Security**
```
As a SaaS platform user,
I want my call data completely isolated from other tenants,
So that my business information remains private and secure.

Acceptance Criteria:
- Database constraints prevent cross-tenant data access
- All queries scoped to user_id
- Audit logging for data access attempts
- Error handling prevents data leakage
```

### Epic 2: Accurate Lead Source Attribution

**US-2.1: Call Source Detection**
```
As a user making calls through different channels,
I want to see whether a call was made via phone or internet,
So that I can understand my communication patterns better.

Acceptance Criteria:
- Phone calls labeled with actual phone numbers
- Internet calls labeled as "Internet Call"
- Unknown sources handled gracefully
- Call source stored in database for historical analysis
```

**US-2.2: Channel Analytics**
```
As a user analyzing call performance,
I want to see analytics broken down by call source,
So that I can optimize my outreach strategy per channel.

Acceptance Criteria:
- Analytics dashboard shows source breakdown
- Conversion rates per channel calculated
- Historical trends by call source available
- Export functionality includes source data
```

### Epic 3: Enhanced Lead Data Extraction

**US-3.1: Company Name Extraction**
```
As a user analyzing lead data,
I want to see company names extracted from webhook data and stored in lead analytics,
So that I can better understand the business context of my leads.

Acceptance Criteria:
- Company names extracted from webhook payload and stored in lead_analytics table
- Company name displayed in lead analytics dashboard and reports
- Company name included in lead export functionality
- Proper handling when company name is not available in webhook data
```

**US-3.2: Enhanced CTA Analytics**
```
As a user tracking conversion metrics,
I want to see CTA interaction data properly stored as individual columns for better analytics,
So that I can create more detailed reports and KPIs around user engagement.

Acceptance Criteria:
- CTA interactions stored as individual boolean columns in lead_analytics table
- CTA metrics properly aggregated in analytics queries and dashboards
- Historical CTA data preserved during migration
- CTA columns indexed for efficient querying
```

**US-3.3: Contact Data Handling**
```
As a user reviewing call logs,
I want to see appropriate placeholders when contact information is unavailable,
So that I don't see fake or placeholder email addresses.

Acceptance Criteria:
- Missing emails show "No email available"
- Missing phone numbers show "Unknown caller" for internet calls
- No fake placeholder data (like "lead1@gmail.com")
- Consistent null handling across all components
```

### Epic 4: Database Consistency

**US-4.1: Trigger Reliability**
```
As a system administrator,
I want database triggers to handle all data update scenarios correctly,
So that analytics remain consistent and up-to-date.

Acceptance Criteria:
- Triggers handle edge cases (null values, missing relationships)
- Error handling prevents trigger failures from breaking transactions
- Cascade updates work correctly across all related tables
- Performance impact minimized through efficient trigger design
```

## Technical Requirements

### Data Isolation Requirements

1. **Database Level Isolation**
   - All analytics queries MUST include user_id filtering
   - Foreign key constraints ensure data integrity
   - Row-level security policies where applicable
   - Audit triggers for data access logging

2. **API Level Validation**
   - Agent ownership validation before data access
   - User context included in all requests
   - Error responses don't leak other users' data
   - Rate limiting per user to prevent data mining

3. **Frontend Security**
   - User context included in all data hooks
   - API calls automatically scoped to current user
   - Error boundaries prevent data leakage
   - Client-side validation as additional security layer

### Call Source Detection Requirements

1. **Webhook Processing**
   - Implement `determineCallSource()` function from original
   - Parse `system__caller_id` and `system__call_type` correctly
   - Handle edge cases (missing data, malformed payloads)
   - Store call source in database for historical analysis

2. **Database Schema**
   - Add `call_source` column to calls table
   - Create indexes for efficient source-based queries
   - Add constraints to ensure valid source values
   - Migration script to categorize existing calls

3. **Frontend Display**
   - Call source indicators in all call-related components
   - Icons and labels for different source types
   - Filtering and sorting by call source
   - Analytics breakdown by source channel

### Database Trigger Requirements

1. **KPI Update Triggers**
   - Handle all CRUD operations on calls and lead_analytics
   - Validate user_id consistency across related tables
   - Efficient bulk update handling
   - Error handling that doesn't break transactions

2. **Cache Invalidation Triggers**
   - Invalidate all related cache entries on data changes
   - Handle cascade invalidation for dependent data
   - Minimize performance impact through batching
   - Logging for debugging cache issues

3. **Data Consistency Triggers**
   - Ensure referential integrity across all tables
   - Handle orphaned records cleanup
   - Validate business rules at database level
   - Audit trail for all data modifications

## Acceptance Criteria

### Data Isolation Acceptance Criteria
- [ ] Zero cross-agent data contamination incidents
- [ ] All analytics queries include proper user_id filtering
- [ ] Agent ownership validated in all data access paths
- [ ] Frontend hooks cannot access other users' data
- [ ] Database constraints prevent cross-tenant access
- [ ] Audit logging captures all data access attempts

### Call Source Detection Acceptance Criteria
- [ ] Phone calls correctly identified and labeled
- [ ] Internet calls correctly identified and labeled
- [ ] Unknown sources handled gracefully
- [ ] Call source stored in database for all new calls
- [ ] Historical calls categorized through migration
- [ ] Frontend displays appropriate source indicators
- [ ] Analytics include source-based breakdowns

### Contact Information Acceptance Criteria
- [ ] No fake or placeholder contact information displayed
- [ ] Missing data handled with appropriate messages
- [ ] Consistent null handling across all components
- [ ] Professional appearance maintained in all scenarios
- [ ] Contact lookup works correctly for available data

### Database Trigger Acceptance Criteria
- [ ] All triggers handle edge cases without errors
- [ ] KPI updates work correctly for all data changes
- [ ] Cache invalidation triggers work reliably
- [ ] Performance impact within acceptable limits
- [ ] Error handling prevents transaction failures
- [ ] Audit logging works for all trigger executions

## Performance Requirements

- Analytics queries must complete within 2 seconds
- Trigger execution must not add more than 100ms to transactions
- Cache invalidation must complete within 500ms
- Frontend data loading must complete within 1 second
- Database constraints must not significantly impact write performance

## Security Requirements

- All data access must be scoped to authenticated user
- Cross-tenant data access must be impossible
- Audit logging for all sensitive data operations
- Error messages must not leak other users' information
- Rate limiting to prevent data mining attempts

## Monitoring and Alerting Requirements

- Real-time monitoring for cross-agent data contamination
- Alerts for trigger failures or performance degradation
- Dashboard for data integrity metrics
- Automated testing for data isolation scenarios
- Performance monitoring for all analytics queries

## Success Metrics

### Technical Metrics
- Zero cross-agent data contamination incidents
- 100% accurate call source identification
- 99.9% trigger execution success rate
- Sub-2-second analytics query response times
- Zero fake contact information displays

### Business Metrics
- Improved user trust and satisfaction scores
- Reduced support tickets about data issues
- Increased accuracy of business insights
- Better channel attribution for marketing decisions
- Enhanced data-driven decision making capabilities

## Risk Assessment

### High Risks
- **Data Privacy Breach**: Cross-agent contamination could expose sensitive business data
- **Regulatory Compliance**: Incorrect data isolation could violate privacy regulations
- **Business Impact**: Wrong analytics could lead to poor business decisions
- **User Trust**: Data integrity issues could damage platform credibility

### Mitigation Strategies
- Comprehensive testing with real data scenarios
- Gradual rollout with monitoring at each stage
- Rollback procedures for each component
- User communication about improvements
- Enhanced monitoring and alerting systems

## Dependencies

- Access to original webhook controller implementation for reference
- Database migration capabilities for schema changes
- Frontend component update capabilities
- Testing environment with realistic data
- Monitoring and alerting infrastructure

## Constraints

- Must maintain backward compatibility with existing data
- Cannot cause downtime during implementation
- Must not impact system performance significantly
- Should not require user training or workflow changes
- Must comply with existing security and privacy policies