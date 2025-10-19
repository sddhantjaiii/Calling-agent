# AI Calling Agent SaaS Platform - Database Documentation

## Overview

This document provides comprehensive documentation for the PostgreSQL database sc### 6. transcripts
**Purpose**: Stores call transcriptions and conversation analysis

**Key Columns**:
- `id` (UUID): Primary key
- `call_id` (UUID): Foreign key to calls table
- `user_id` (UUID): Foreign key to users table (for data isolation)
- `content` (TEXT): Full transcript text
- `speaker_segments` (JSONB): Structured conversation data

**Business Logic**:
- Generated from ElevenLabs conversation analysis
- Supports conversation search and analysis
- Used for lead qualification and insights

**Data Isolation**:
- Enforced through foreign key constraint on `(call_id, user_id)`

### 7. lead_analyticsing Agent SaaS platform. The database is designed to support a multi-tenant AI calling system with robust analytics, caching, and data isolation features.

## Database Architecture

The database follows a layered architecture with:
- **Core Tables**: User management, agents, calls, contacts, phone_numbers
- **Analytics Tables**: Performance metrics, KPIs, and reporting data
- **Cache Tables**: Pre-calculated data for dashboard performance
- **Security Tables**: Authentication, sessions, and audit logs
- **System Tables**: Configuration and monitoring

## Core Tables

### 1. users
**Purpose**: Central user account management and authentication

**Key Columns**:
- `id` (UUID): Primary key, auto-generated
- `email` (VARCHAR): Unique user email address
- `name` (VARCHAR): User's display name
- `credits` (INTEGER): Available calling credits (default: 15)
- `role` (VARCHAR): User role (user, admin, super_admin)
- `password_hash` (VARCHAR): Encrypted password for authentication
- `email_verified` (BOOLEAN): Email verification status
- `is_active` (BOOLEAN): Account status
- `auth_provider` (VARCHAR): Authentication method (email, google, linkedin, github)

**Business Logic**:
- Serves as the central tenant identifier for multi-tenant data isolation
- Credits system controls usage and billing
- Role-based access control for admin features
- Supports multiple authentication providers

**Relationships**:
- One-to-many with agents, calls, contacts, phone_numbers, credit_transactions
- Referenced by all user-scoped data for data isolation
- Phone numbers can be assigned to users (assigned_to_user_id) and created by admin users (created_by_admin_id)

### 2. agents
**Purpose**: Manages AI calling agents associated with ElevenLabs

**Key Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users table
- `elevenlabs_agent_id` (VARCHAR): External ElevenLabs agent identifier
- `name` (VARCHAR): Agent display name
- `agent_type` (VARCHAR): Type of agent (call, chat)
- `description` (TEXT): Agent description and configuration
- `is_active` (BOOLEAN): Agent status

**Business Logic**:
- Each agent belongs to exactly one user (data isolation)
- Integrates with ElevenLabs API for voice calling
- Supports different agent types for various use cases
- Active/inactive status controls agent availability

**Unique Constraints**:
- `(user_id, elevenlabs_agent_id)`: Prevents duplicate ElevenLabs agents per user
- `(id, user_id)`: Supports data isolation foreign keys

### 3. calls
**Purpose**: Records all call interactions and their outcomes

**Key Columns**:
- `id` (UUID): Primary key
- `agent_id` (UUID): Foreign key to agents table
- `user_id` (UUID): Foreign key to users table (for data isolation)
- `contact_id` (UUID): Optional foreign key to contacts table
- `elevenlabs_conversation_id` (VARCHAR): External conversation identifier
- `phone_number` (VARCHAR): Called phone number
- `call_source` (VARCHAR): Source type (phone, internet, unknown)
- `caller_name` (VARCHAR): Caller's name if available
- `caller_email` (VARCHAR): Caller's email if available
- `lead_type` (VARCHAR): Type of lead (inbound, outbound) - added in migration 029
- `duration_minutes` (INTEGER): Call duration rounded up to next minute for billing (61 seconds = 2 minutes)
- `duration_seconds` (INTEGER): Exact call duration in seconds for precise display (61 seconds = 61 seconds)
- `credits_used` (INTEGER): Credits consumed for this call
- `status` (VARCHAR): Call status (completed, failed, in_progress, cancelled)
- `recording_url` (TEXT): URL to call recording
- `metadata` (JSONB): Additional call data
- `updated_at` (TIMESTAMPTZ): Record last update timestamp

**Business Logic**:
- Central record of all calling activity
- Supports both inbound and outbound calls
- Call source detection for channel attribution
- Credit consumption tracking for billing
- Webhook integration with ElevenLabs

**Data Isolation**:
- Enforced through foreign key constraint on `(agent_id, user_id)`
- Ensures calls can only reference agents owned by the same user

**Unique Constraints**:
- `UNIQUE(elevenlabs_conversation_id)` – one call per ElevenLabs conversation
- `UNIQUE(id, user_id)` – composite key used by dependent foreign keys for isolation

### 4. contacts
**Purpose**: User's contact lists for calling campaigns

**Key Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users table
- `name` (VARCHAR): Contact name
- `phone_number` (VARCHAR): Contact phone number
- `email` (VARCHAR): Contact email address
- `company` (VARCHAR): Contact's company
- `notes` (TEXT): Additional contact information
- `is_customer` (BOOLEAN): Flag indicating if contact has been converted to customer
- `auto_created_from_call_id` (UUID): Reference to call that auto-created this contact
- `is_auto_created` (BOOLEAN): Flag for auto-created contacts
- `auto_creation_source` (VARCHAR): Source of contact creation (webhook, manual)

**Business Logic**:
- Supports bulk contact uploads
- Phone number validation and formatting
- Prevents duplicate contacts per user
- Integrates with calling campaigns
- Tracks customer conversion status
- Supports auto-creation from calls

**Unique Constraints**:
- `(user_id, phone_number)`: Prevents duplicate phone numbers per user

### 5. phone_numbers
**Purpose**: Manages phone numbers for batch calling functionality with ElevenLabs integration (added in migration 030)

**Key Columns**:
- `id` (UUID): Primary key, auto-generated
- `name` (VARCHAR): Friendly name for the phone number to help admins remember its purpose
- `phone_number` (VARCHAR): The actual phone number in standard format
- `elevenlabs_phone_number_id` (VARCHAR): ElevenLabs phone number identifier (e.g., phnum_7201k7xjteyhfpb9w6f600kbyryj)
- `assigned_to_user_id` (UUID): Foreign key to users table - user this phone number is assigned to (NULL means unassigned)
- `created_by_admin_id` (UUID): Foreign key to users table - admin who created this phone number entry
- `is_active` (BOOLEAN): Whether this phone number is active and available for use (default: true)
- `created_at` (TIMESTAMP): Record creation timestamp
- `updated_at` (TIMESTAMP): Record last update timestamp

**Business Logic**:
- Supports batch calling functionality where users can initiate calls from assigned phone numbers
- Admin-managed resource with role-based assignment capabilities
- Integrates with ElevenLabs telephony services
- Multiple phone numbers can be assigned to a single user
- Phone numbers can be reassigned between users or deactivated
- Maintains audit trail of who created each phone number

**Unique Constraints**:
- `elevenlabs_phone_number_id`: Ensures unique ElevenLabs phone IDs
- `(phone_number)` WHERE `is_active = true`: Ensures active phone numbers are unique

**Data Isolation**:
- Admin-created resources that can be assigned to users
- Only assigned users can use phone numbers for batch calls
- Proper foreign key constraints ensure data integrity

**Relationships**:
- Many-to-one with users (assigned_to_user_id) - a user can have multiple phone numbers
- Many-to-one with users (created_by_admin_id) - tracks which admin created the entry
- Will integrate with batch call functionality in phase 2

### 6. transcripts
**Purpose**: Stores call transcriptions and conversation analysis

**Key Columns**:
- `id` (UUID): Primary key
- `call_id` (UUID): Foreign key to calls table
- `user_id` (UUID): Foreign key to users table (for data isolation)
- `content` (TEXT): Full transcript text
- `speaker_segments` (JSONB): Structured conversation data

**Business Logic**:
- Generated from ElevenLabs conversation analysis
- Supports conversation search and analysis
- Used for lead qualification and insights

**Data Isolation**:
- Enforced through foreign key constraint on `(call_id, user_id)`

### 6. lead_analytics
**Purpose**: AI-generated lead scoring and qualification data

**Key Columns**:
- `id` (UUID): Primary key
- `call_id` (UUID): Foreign key to calls table
- `user_id` (UUID): Foreign key to users table (for data isolation)
- `intent_level` (VARCHAR): Intent classification
- `intent_score` (INTEGER): Intent score (0-100)
- `urgency_level` (VARCHAR): Urgency classification
- `urgency_score` (INTEGER): Urgency score (0-100)
- `budget_constraint` (VARCHAR): Budget classification
- `budget_score` (INTEGER): Budget score (0-100)
- `fit_alignment` (VARCHAR): Product fit classification
- `fit_score` (INTEGER): Fit score (0-100)
- `engagement_health` (VARCHAR): Engagement classification
- `engagement_score` (INTEGER): Engagement score (0-100)
- `total_score` (INTEGER): Overall lead score (0-100)
- `lead_status_tag` (VARCHAR): Lead qualification tag
- `reasoning` (JSONB): AI reasoning for scores
- `cta_interactions` (JSONB): Call-to-action interaction data
- `company_name` (VARCHAR): Company name extracted from webhook data
- `extracted_name` (VARCHAR): Contact name extracted from webhook data
- `extracted_email` (VARCHAR): Contact email extracted from webhook data
- `cta_pricing_clicked` (BOOLEAN): Boolean flag for pricing CTA interaction
- `cta_demo_clicked` (BOOLEAN): Boolean flag for demo CTA interaction
- `cta_followup_clicked` (BOOLEAN): Boolean flag for follow-up CTA interaction
- `cta_sample_clicked` (BOOLEAN): Boolean flag for sample CTA interaction
- `cta_escalated_to_human` (BOOLEAN): Boolean flag for human escalation CTA
- `demo_scheduled_at` (TIMESTAMP): Actual scheduled date and time for demo
- `is_read` (BOOLEAN): Tracks whether the smart notification has been read by the user

**Business Logic**:
- Generated by ElevenLabs AI analysis
- Provides comprehensive lead qualification
- Supports lead prioritization and follow-up
- Tracks CTA interactions for conversion analysis
- Enhanced with extracted contact information for better lead grouping
- Demo scheduling now supports specific date/time instead of boolean

**Data Isolation**:
- Enforced through foreign key constraint on `(call_id, user_id)`

### 8. credit_transactions
**Purpose**: Tracks all credit movements and billing history

**Key Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users table
- `type` (VARCHAR): Transaction type (purchase, usage, bonus, admin_adjustment, refund)
- `amount` (INTEGER): Credit amount (positive or negative)
- `balance_after` (INTEGER): User's credit balance after transaction
- `description` (TEXT): Transaction description
- `stripe_payment_id` (VARCHAR): Stripe payment reference
- `call_id` (UUID): Optional reference to call for usage transactions
- `created_by` (UUID): Admin user for manual adjustments

**Business Logic**:
- Complete audit trail of credit usage
- Integrates with Stripe for payments
- Supports admin credit adjustments
- Maintains running balance for reconciliation

### 8. follow_ups
**Purpose**: User-scheduled follow-ups for leads with dates and remarks

**Key Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users table
- `lead_phone` (VARCHAR): Phone number to identify the lead
- `lead_email` (VARCHAR): Optional email for additional identification
- `lead_name` (VARCHAR): Lead name for display
- `follow_up_date` (DATE): Date for follow-up (no time)
- `remark` (TEXT): User's remark/note for the follow-up
- `is_completed` (BOOLEAN): Track if follow-up is completed
- `follow_up_status` (VARCHAR): Status of follow-up (pending, completed, cancelled)
- `created_by` (UUID): User who created the follow-up
- `completed_at` (TIMESTAMP): When follow-up was marked complete
- `completed_by` (UUID): User who completed the follow-up

**Business Logic**:
- Enables manual follow-up scheduling by users
- Supports lead nurturing and relationship management
- Tracks completion status and history with enhanced status tracking
- Integrates with lead intelligence for follow-up display

**Data Isolation**:
- Enforced through foreign key constraint on user_id

### 9. customers
**Purpose**: Converted customers with their details and management status

**Key Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users table
- `contact_id` (UUID): Foreign key to contacts table
- `customer_reference_number` (VARCHAR): Unique customer reference (CUST-YYYY-NNNN)
- `name` (VARCHAR): Customer name
- `email` (VARCHAR): Customer email address
- `phone` (VARCHAR): Customer phone number
- `company` (VARCHAR): Customer's company
- `status` (VARCHAR): Customer status (Active, Inactive, Churned, On Hold)
- `conversion_date` (TIMESTAMP): Date when lead was converted to customer
- `original_lead_source` (VARCHAR): Original source where the lead came from
- `assigned_sales_rep` (VARCHAR): Sales representative assigned to this customer
- `last_interaction_date` (TIMESTAMP): Date of last interaction
- `notes` (TEXT): Customer management notes

**Business Logic**:
- Manages converted customers separately from leads
- Auto-generated customer reference numbers (CUST-YYYY-NNNN format)
- Tracks conversion date and original lead source
- Sales rep assignment for account management
- Customer status lifecycle management
- Maintains relationship to original contact record

**Unique Constraints**:
- `customer_reference_number`: Globally unique customer reference

**Relationships**:
- One-to-one with contacts (contact_id)
- Many-to-one with users (user_id)

**Data Isolation**:
- Scoped by user_id for multi-tenant separation

## Analytics and Performance Tables

### 10. agent_analytics
**Purpose**: Detailed performance metrics for individual agents

**Key Columns**:
- `agent_id` (UUID): Foreign key to agents table
- `user_id` (UUID): Foreign key to users table
- `date` (DATE): Analytics date
- `hour` (INTEGER): Legacy field, no longer used for new analytics aggregation. New records will have this as NULL.
- `total_calls` (INTEGER): Number of calls made
- `successful_calls` (INTEGER): Number of completed calls
- `failed_calls` (INTEGER): Number of failed calls
- `total_duration_minutes` (INTEGER): Total call time
- `avg_duration_minutes` (DECIMAL): Average call duration
- `leads_generated` (INTEGER): Number of leads generated
- `qualified_leads` (INTEGER): Number of qualified leads
- `cta_pricing_clicks` (INTEGER): Number of pricing CTA interactions
- `cta_demo_clicks` (INTEGER): Number of demo request CTA interactions
- `cta_followup_clicks` (INTEGER): Number of follow-up CTA interactions
- `cta_sample_clicks` (INTEGER): Number of sample request CTA interactions
- `cta_human_escalations` (INTEGER): Number of human escalation CTA interactions
- `total_cta_interactions` (INTEGER): Total number of CTA interactions (calculated)
- `cta_conversion_rate` (DECIMAL): Percentage of calls with any CTA interaction (calculated)
- `conversion_rate` (DECIMAL): Lead conversion percentage
- `credits_used` (INTEGER): Credits consumed
- Various scoring metrics (engagement, intent, urgency, budget, fit)

**Business Logic**:
- Supports daily aggregations.
- Automatically updated by triggers when calls complete using an UPSERT (update or insert) operation.
- Enables agent performance comparison and optimization
- Feeds into dashboard KPIs and reporting

**Unique Constraints**:
- `(agent_id, user_id, date)`: Ensures one record per agent per user per day.

### 11. user_analytics
**Purpose**: User-level analytics aggregated from all agents owned by the user

**Key Columns**:
- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users table
- `date` (DATE): Analytics date
- `hour` (INTEGER): Hour of day (NULL for daily aggregates)
- `total_calls` (INTEGER): Number of calls made across all user's agents
- `successful_calls` (INTEGER): Number of completed calls
- `failed_calls` (INTEGER): Number of failed calls
- `total_duration_minutes` (INTEGER): Total call time
- `avg_duration_minutes` (DECIMAL): Average call duration
- `leads_generated` (INTEGER): Number of leads generated
- `qualified_leads` (INTEGER): Number of qualified leads
- `conversion_rate` (DECIMAL): Lead conversion percentage
- `cta_pricing_clicks` (INTEGER): Total pricing CTA interactions
- `cta_demo_clicks` (INTEGER): Total demo request CTA interactions
- `cta_followup_clicks` (INTEGER): Total follow-up CTA interactions
- `cta_sample_clicks` (INTEGER): Total sample request CTA interactions
- `cta_human_escalations` (INTEGER): Total human escalation CTA interactions
- `total_cta_interactions` (INTEGER): Total CTA interactions (calculated)
- `cta_conversion_rate` (DECIMAL): Percentage of calls with CTA interaction (calculated)
- Various scoring metrics (engagement, intent, urgency, budget, fit)
- `credits_used` (INTEGER): Credits consumed
- `success_rate` (DECIMAL): Call success percentage
- `answer_rate` (DECIMAL): Call answer percentage

**Business Logic**:
- Aggregates metrics from all user's agents
- Supports both hourly and daily aggregations
- Automatically updated by triggers when agent analytics change
- Enables user-level performance comparison and reporting

**Unique Constraints**:
- `(user_id, date, hour)`: Ensures one record per user per time period

### 11. call_analytics_cache
**Purpose**: Pre-calculated analytics for improved dashboard performance

**Key Columns**:
- `user_id` (UUID): Foreign key to users table
- `date_period` (DATE): Analytics date
- `period_type` (VARCHAR): Aggregation period (daily, weekly, monthly)
- Call volume metrics (total_calls, successful_calls, failed_calls, connection_rate)
- Duration metrics (total_call_duration, average_call_duration)
- Lead quality metrics (hot_leads, warm_leads, cold_leads, conversion_rate)
- CTA interaction metrics (pricing_clicks, demo_requests, etc.)
- Source breakdown (inbound_calls, outbound_calls)

**Business Logic**:
- Reduces dashboard query complexity and response time
- Automatically updated by triggers when underlying data changes
- Supports multiple aggregation periods for different views
- Includes calculated metrics like conversion rates and averages

**Unique Constraints**:
- `(user_id, date_period, period_type)`: One record per user per period

### 12. user_daily_analytics
**Purpose**: User-level daily analytics aggregated from all agents

**Key Columns**:
- `user_id` (UUID): Foreign key to users table
- `date` (DATE): Analytics date
- Aggregated metrics from all user's agents
- Average scores across all agents

**Business Logic**:
- Provides user-level view of performance
- Automatically updated when agent analytics change
- Supports trend analysis and reporting

### 13. user_kpi_summary (Materialized View)
**Purpose**: Pre-calculated KPI summary for all users with 30-day rolling metrics

**Key Metrics**:
- 30-day rolling metrics (calls, leads, conversion rates)
- Agent performance summaries
- Recent activity (7-day metrics)
- Lifetime statistics
- Best performing agent identification

**Business Logic**:
- Materialized view for maximum query performance
- Refreshed automatically via triggers and scheduled jobs
- Supports admin dashboard and user overview screens
- Includes complex calculations like best performing agent

**Refresh Strategy**:
- Automatic refresh triggered by data changes
- Scheduled refresh every 15 minutes
- Concurrent refresh to avoid blocking operations

## Cache and Performance Tables

### 14. dashboard_cache
**Purpose**: Generic key-value cache for dashboard data

**Key Columns**:
- `user_id` (UUID): Foreign key to users table
- `cache_key` (VARCHAR): Cache identifier
- `cache_data` (JSONB): Cached data in JSON format
- `expires_at` (TIMESTAMP): Cache expiration time

**Business Logic**:
- Flexible caching system for any dashboard data
- Automatic expiration and cleanup
- Supports complex nested data structures via JSONB
- Invalidated by triggers when underlying data changes

**Unique Constraints**:
- `(user_id, cache_key)`: One cache entry per user per key

## Authentication and Security Tables

### 15. user_sessions
**Purpose**: Manages user authentication sessions

**Key Columns**:
- `user_id` (UUID): Foreign key to users table
- `token_hash` (VARCHAR): Hashed session token
- `refresh_token_hash` (VARCHAR): Hashed refresh token
- `expires_at` (TIMESTAMP): Session expiration
- `refresh_expires_at` (TIMESTAMP): Refresh token expiration
- `ip_address` (INET): Client IP address
- `user_agent` (TEXT): Client user agent
- `is_active` (BOOLEAN): Session status

**Business Logic**:
- Supports JWT-like session management
- Refresh token capability for seamless user experience
- Security tracking with IP and user agent
- Automatic cleanup of expired sessions

### 16. login_attempts
**Purpose**: Security monitoring for login attempts

**Key Columns**:
- `email` (VARCHAR): Attempted login email
- `ip_address` (INET): Source IP address
- `attempted_at` (TIMESTAMP): Attempt timestamp
- `success` (BOOLEAN): Whether attempt succeeded
- `failure_reason` (VARCHAR): Reason for failure

**Business Logic**:
- Enables brute force attack detection
- Supports account lockout policies
- Security audit trail
- Automatic cleanup of old records

### 17. password_reset_attempts
**Purpose**: Tracks password reset requests for security

**Key Columns**:
- `email` (VARCHAR): Email requesting reset
- `ip_address` (INET): Source IP address
- `attempted_at` (TIMESTAMP): Request timestamp
- `success` (BOOLEAN): Whether reset was successful

**Business Logic**:
- Prevents password reset abuse
- Security monitoring for suspicious activity
- Rate limiting support

### 18. admin_audit_log
**Purpose**: Comprehensive audit trail for admin actions

**Key Columns**:
- `admin_user_id` (UUID): Admin performing action
- `action` (VARCHAR): Action performed
- `resource_type` (VARCHAR): Type of resource affected
- `resource_id` (VARCHAR): ID of affected resource
- `target_user_id` (UUID): User affected by action
- `details` (JSONB): Additional action details
- `ip_address` (INET): Admin's IP address
- `user_agent` (TEXT): Admin's user agent

**Business Logic**:
- Complete audit trail for compliance
- Tracks all admin operations
- Supports forensic analysis
- Required for security compliance

## System and Configuration Tables

### 19. system_config
**Purpose**: Application configuration and settings

**Key Columns**:
- `config_key` (VARCHAR): Configuration key
- `config_value` (TEXT): Configuration value
- `is_encrypted` (BOOLEAN): Whether value is encrypted
- `description` (TEXT): Configuration description
- `updated_by` (UUID): User who last updated

**Business Logic**:
- Centralized configuration management
- Supports encrypted sensitive values
- Audit trail for configuration changes
- Runtime configuration updates

**Default Configurations**:
- Credit pricing and limits
- Session durations
- Security policies
- Feature flags

## Agent Performance and Tracking Tables

### 20. agent_call_outcomes
**Purpose**: Detailed call outcome tracking for agent performance

**Key Columns**:
- `agent_id` (UUID): Foreign key to agents table
- `call_id` (UUID): Foreign key to calls table
- `user_id` (UUID): Foreign key to users table
- `outcome` (VARCHAR): Call outcome (completed, no_answer, busy, failed, voicemail, disconnected)
- `call_quality_score` (DECIMAL): Call quality rating (1-10)
- `customer_satisfaction` (DECIMAL): Customer satisfaction rating
- `is_qualified_lead` (BOOLEAN): Lead qualification result
- `lead_temperature` (VARCHAR): Lead temperature (hot, warm, cold, not_interested)
- `sentiment_score` (DECIMAL): Conversation sentiment (-1 to 1)
- `key_topics` (TEXT[]): Topics discussed
- `objections_raised` (TEXT[]): Customer objections
- `next_steps` (TEXT): Follow-up actions

**Business Logic**:
- Detailed call outcome analysis
- Supports agent coaching and improvement
- Lead qualification tracking
- Conversation analysis and insights

### 21. agent_performance_trends
**Purpose**: Tracks agent performance changes over time

**Key Columns**:
- `agent_id` (UUID): Foreign key to agents table
- `period_start` (DATE): Trend period start
- `period_end` (DATE): Trend period end
- `period_type` (VARCHAR): Period type (daily, weekly, monthly, quarterly)
- Performance change percentages for various metrics
- `performance_rank` (INTEGER): Ranking among user's agents

**Business Logic**:
- Identifies performance trends and improvements
- Supports agent ranking and comparison
- Enables performance-based insights
- Tracks progress over time

### 22. agent_targets
**Purpose**: Goal setting and achievement tracking for agents

**Key Columns**:
- `agent_id` (UUID): Foreign key to agents table
- `target_date` (DATE): Target period
- `target_type` (VARCHAR): Target period type
- Target metrics (calls, success rate, leads, conversion rate)
- Achievement metrics (actual vs target)
- `achievement_percentage` (DECIMAL): Overall achievement score

**Business Logic**:
- Goal setting for agent performance
- Achievement tracking and reporting
- Performance incentive support
- Progress monitoring

## Database Trigger Functions Documentation

### Overview
This document provides a comprehensive overview of all trigger functions in the AI Calling Agent SaaS platform database. The triggers are organized by category and functionality.

### Table of Contents
1. [Core Utility Triggers](#core-utility-triggers)
2. [Analytics & KPI Triggers](#analytics--kpi-triggers)
3. [Cache Invalidation Triggers](#cache-invalidation-triggers)
4. [Lead Analytics Triggers](#lead-analytics-triggers)
5. [User Analytics Triggers](#user-analytics-triggers)
6. [Contact & Reference Generation Triggers](#contact--reference-generation-triggers)
7. [Error Handling & Monitoring](#error-handling--monitoring)
8. [Active Triggers Summary](#active-triggers-summary)

---

### Core Utility Triggers

#### `update_updated_at_column()`
**Purpose**: Automatically updates the `updated_at` timestamp when records are modified.
**Applied to**: `users`, `agents`, `calls`, `contacts`, `system_config`, `agent_analytics`, `agent_targets`, `dashboard_cache`, `user_daily_analytics`, `user_sessions`, `customers`, `follow_ups`, `phone_numbers`, `user_analytics`, `call_analytics_cache`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

---

### Analytics & KPI Triggers

#### `trg_calls_daily_analytics()`
**Purpose**: Updates the daily analytics for an agent in `agent_analytics` when a call reaches a terminal state.
**Triggered by**: `AFTER INSERT OR UPDATE OF status` on `calls`
**Logic**:
- Runs only when status is `completed` or `failed`.
- On INSERT: processes immediately for terminal status.
- On UPDATE: processes only if the status changed to a terminal status (prevents double-counting on non-status updates).
- Uses UPSERT targeting the unique key `(agent_id, user_id, date)` to ensure exactly one daily row per agent/user/day.

#### `trg_leads_daily_analytics()`
**Purpose**: Applies lead/CTA metrics for the call-day into `agent_analytics`.
**Triggered by**: `AFTER INSERT` on `lead_analytics`
**Logic**:
- Looks up the associated call to resolve `(agent_id, user_id, date)` and increments lead/CTA counters on the daily row.

#### `trg_user_daily_rollup()`
**Purpose**: Rolls up daily agent analytics into `user_analytics`.
**Triggered by**: `AFTER INSERT OR UPDATE` on `agent_analytics` (only where `hour IS NULL`).

**Indexes supporting UPSERTs**:
- `agent_analytics`: `UNIQUE(agent_id, user_id, date)` – supports daily UPSERT.
- `user_analytics`: `UNIQUE(user_id, date, hour)` – daily/hourly rollups (hour is NULL for daily).

---

### Cache and KPI refresh (updated)
- In-memory caching in the app replaces DB cache/NOTIFY triggers.
- `user_kpi_summary` refresh interval set to 5 minutes via backend service.

---

### Lead Analytics Triggers

**Note**: The specific lead analytics triggers have been consolidated into `trg_leads_daily_analytics` as described above.

---

### User Analytics Triggers

**Note**: The user analytics triggers have been consolidated into `trg_user_daily_rollup` as described above.

---

### Contact & Reference Generation Triggers

#### `trigger_generate_customer_reference`
**Purpose**: Automatically generates customer reference numbers.
**Triggered by**: INSERT on `customers`

#### `trigger_calls_update_analytics_cache`
**Purpose**: Updates analytics cache when calls are modified.
**Triggered by**: INSERT/UPDATE on `calls`

---

### Error Handling & Monitoring

#### Trigger Error Logging
**Table**: `trigger_error_log`
**Purpose**: Monitors trigger failures and provides debugging information.

**Columns**:
- `table_name`: Which table triggered the error
- `operation`: INSERT/UPDATE/DELETE
- `error_message`: PostgreSQL error message
- `error_context`: Additional context for debugging
- `occurred_at`: When the error occurred

#### Monitoring Functions

##### `get_cache_trigger_health()`
Returns health status of cache invalidation triggers:
- Active triggers per table
- Recent error counts
- Enable/disable status

##### `cleanup_trigger_error_log(days_to_keep)`
Cleans up old trigger error logs (default: 7 days)

##### `test_cache_invalidation(table_name, user_id)`
Manually tests cache invalidation notifications for debugging

##### `cleanup_expired_dashboard_cache()`
Removes expired dashboard cache entries

---

### Active Triggers Summary

#### By Table

##### `agent_analytics` (14 triggers)
- `cache_invalidation_agent_analytics` (INSERT/UPDATE/DELETE)
- `trigger_refresh_kpi_on_agent_analytics_change` (INSERT/UPDATE)
- `trigger_update_agent_analytics_cta_totals` (INSERT/UPDATE)
- `trigger_update_dashboard_cache_on_agent_*` (INSERT/UPDATE)
- `trigger_update_user_analytics_from_agent_analytics` (INSERT/UPDATE)
- `trigger_update_user_kpis_on_agent_*` (INSERT/UPDATE)
- `update_agent_analytics_updated_at` (UPDATE)

##### `lead_analytics` (8 triggers)
- `cache_invalidation_lead_analytics` (INSERT/UPDATE/DELETE)
- `trigger_handle_lead_analytics_cta_update` (UPDATE)
- `trigger_refresh_kpi_on_lead_analytics_change` (INSERT/UPDATE)
- `trigger_update_agent_analytics_from_lead_cta` (INSERT)
- `trigger_update_agent_scores_from_lead_analytics` (INSERT)

##### `calls` (6 triggers)
- `cache_invalidation_calls` (INSERT/UPDATE/DELETE)
- `trigger_calls_update_analytics_cache` (INSERT/UPDATE)
- `trigger_refresh_kpi_on_calls_change` (INSERT/UPDATE)
- `trigger_update_agent_analytics_from_call` (INSERT/UPDATE)

##### `agents` (4 triggers)
- `cache_invalidation_agents` (INSERT/UPDATE/DELETE)
- `trigger_refresh_kpi_on_agents_change` (INSERT/UPDATE)
- `update_agents_updated_at` (UPDATE)

##### `users` (2 triggers)
- `cache_invalidation_users` (UPDATE)
- `update_users_updated_at` (UPDATE)

##### Other Tables (1-2 triggers each)
- `user_analytics`: CTA totals calculation, updated_at
- `credit_transactions`: Cache invalidation
- `customers`: Reference generation, updated_at
- `contacts`: Updated_at
- `dashboard_cache`: Updated_at
- `follow_ups`: Updated_at
- `phone_numbers`: Updated_at
- `system_config`: Updated_at
- `user_daily_analytics`: Updated_at
- `user_sessions`: Last used timestamp
- `agent_targets`: Updated_at
- `call_analytics_cache`: Updated_at

---

### Performance Considerations

#### Trigger Optimization
- Conditional triggers to minimize overhead (e.g., users table only on significant changes)
- Batch processing using transaction IDs
- Error handling that doesn't fail transactions
- Efficient indexing for trigger operations

#### Monitoring & Maintenance
- Regular cleanup of error logs (7-day retention)
- Health monitoring functions
- Test functions for debugging
- Cache expiration management

---

### Migration History

Key migrations that established the trigger system:
- `001_initial_schema.sql`: Basic updated_at triggers
- `010_add_kpi_update_triggers.sql`: Core analytics triggers
- `013_add_dashboard_cache_triggers.sql`: Cache invalidation system
- `021_fix_cache_invalidation_trigger_logic.sql`: Improved error handling
- `025_add_lead_to_agent_analytics_cta_trigger.sql`: CTA tracking
- `026_add_user_analytics_cta_aggregation.sql`: User-level CTA analytics

---

### Total Active Triggers: 54

The database currently has **54 active triggers** across **15 tables**, ensuring real-time data consistency, automatic analytics aggregation, intelligent cache invalidation, and comprehensive monitoring capabilities.

## Performance Optimization Features

### Indexing Strategy

#### Primary Indexes
- All primary keys (UUID) with B-tree indexes
- Foreign key relationships for join performance
- Unique constraints for data integrity

#### Composite Indexes
- `(user_id, created_at)` for time-series queries
- `(user_id, status, created_at)` for filtered analytics
- `(agent_id, date, hour)` for agent performance queries
- `(call_source, user_id)` for source-based analytics

#### Partial Indexes
- Non-null email addresses: `WHERE caller_email IS NOT NULL`
- Active sessions: `WHERE is_active = true AND expires_at > CURRENT_TIMESTAMP`
- Completed calls: `WHERE status = 'completed'`

### Materialized Views
- `user_kpi_summary`: Pre-calculated user KPIs with 30-day rolling metrics
- Concurrent refresh capability to avoid blocking
- Automatic refresh triggers for data consistency

### Cache Tables
- `call_analytics_cache`: Pre-calculated call analytics by period
- `dashboard_cache`: Generic JSONB cache for complex dashboard data
- Automatic expiration and cleanup functions

## Data Isolation and Security

### Multi-Tenant Architecture
- User-scoped data isolation through foreign key constraints
- Composite unique constraints: `(id, user_id)` on core tables
- Cross-reference validation through foreign keys

### Security Constraints
- Database-level prevention of cross-user data access
- Audit functions for data consistency validation
- Comprehensive audit logging for admin actions

### Authentication Security
- Hashed password storage with bcrypt
- Session management with refresh tokens
- Login attempt tracking and rate limiting
- IP address and user agent logging

## Maintenance and Monitoring

### Cleanup Functions

#### 1. cleanup_expired_sessions()
**Purpose**: Removes expired user sessions
**Schedule**: Should be run daily
**Logic**: Deletes sessions where `expires_at < CURRENT_TIMESTAMP`

#### 2. cleanup_old_login_attempts()
**Purpose**: Removes old login attempt records
**Schedule**: Should be run weekly
**Logic**: Keeps last 30 days of login attempts

#### 3. cleanup_old_password_reset_attempts()
**Purpose**: Removes old password reset records
**Schedule**: Should be run weekly
**Logic**: Keeps last 7 days of reset attempts

#### 4. cleanup_expired_dashboard_cache()
**Purpose**: Removes expired cache entries
**Schedule**: Should be run hourly
**Logic**: Deletes cache entries where `expires_at < CURRENT_TIMESTAMP`

### Monitoring Functions

#### 1. validate_user_data_consistency()
**Purpose**: Validates data integrity across related tables
**Returns**: Table of inconsistencies found
**Usage**: Regular data integrity checks

#### 2. audit_data_isolation(user_id)
**Purpose**: Audits data isolation for specific user
**Returns**: Potential data leaks or access issues
**Usage**: Security compliance checks

### Scheduled Maintenance

#### 1. scheduled_refresh_user_kpi_summary()
**Purpose**: Refreshes materialized view and logs operation
**Schedule**: Every 15 minutes
**Logic**: Concurrent refresh with logging to system_config

#### 2. batch_calculate_call_analytics(date)
**Purpose**: Batch calculation of analytics for all users
**Schedule**: Daily for previous day's data
**Logic**: Processes all active users for specified date

## Views and Reporting

### Core Views

#### 1. user_stats
**Purpose**: Comprehensive user statistics with call source breakdown
**Includes**: Agent count, call metrics, credit usage, source analysis
**Usage**: Admin dashboard, user overview

#### 2. agent_performance_summary
**Purpose**: Agent performance across different time periods
**Includes**: Today, month, and lifetime metrics
**Usage**: Agent management, performance comparison

#### 3. call_source_analytics
**Purpose**: Analytics broken down by call source (phone, internet, unknown)
**Includes**: Volume, success rates, duration, credits by source
**Usage**: Channel attribution, source optimization

#### 4. recent_call_analytics
**Purpose**: Last 30 days of call analytics cache
**Includes**: User information with recent performance data
**Usage**: Dashboard queries, recent activity reports

#### 5. active_user_sessions
**Purpose**: Currently active user sessions
**Includes**: Session details, user information, activity timestamps
**Usage**: Security monitoring, concurrent user tracking

#### 6. user_login_stats
**Purpose**: Login statistics and security metrics per user
**Includes**: Attempt counts, success rates, last login times
**Usage**: Security analysis, user activity monitoring

## Configuration Management

### System Configuration Keys

#### Credit and Billing
- `credits_per_minute`: Credits charged per call minute
- `new_user_bonus_credits`: Free credits for new users
- `minimum_credit_purchase`: Minimum purchase amount

#### Security Settings
- `session_duration_hours`: Session validity period
- `max_login_attempts`: Failed login threshold
- `lockout_duration_minutes`: Account lockout duration
- `password_min_length`: Minimum password length
- `require_email_verification`: Email verification requirement
- `password_reset_token_expiry_hours`: Reset token validity

#### Performance Settings
- `kpi_refresh_interval_minutes`: KPI materialized view refresh interval
- `max_contacts_per_upload`: Bulk upload limit

#### Feature Flags
- Various feature toggles stored as configuration keys
- Runtime feature control without code deployment

## Best Practices and Recommendations

### Query Optimization
1. Always include `user_id` in WHERE clauses for user-scoped queries
2. Use appropriate indexes for time-range queries
3. Leverage materialized views for complex aggregations
4. Use cache tables for frequently accessed dashboard data

### Data Integrity
1. Rely on database constraints for data isolation
2. Use transactions for multi-table operations
3. Validate data consistency with provided audit functions
4. Monitor trigger performance and optimize as needed

### Security
1. Never bypass user_id filtering in application queries
2. Use audit functions to verify data isolation
3. Monitor admin_audit_log for suspicious activity
4. Regularly clean up expired sessions and attempts

### Performance Monitoring
1. Monitor materialized view refresh performance
2. Track cache hit rates and effectiveness
3. Analyze slow queries and optimize indexes
4. Monitor trigger execution times

### Maintenance
1. Schedule regular cleanup functions
2. Monitor database size and growth patterns
3. Analyze query performance regularly
4. Keep statistics updated with ANALYZE

This database schema provides a robust foundation for the AI Calling Agent SaaS platform with comprehensive analytics, security, and performance optimization features. The trigger system ensures data consistency and real-time updates while maintaining excellent query performance through strategic caching and indexing.