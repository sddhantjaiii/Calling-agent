# Webhook Lead Extraction Enhancement - Requirements

## Overview
This specification enhances the webhook processing system to extract and store lead data more effectively, including company names, dedicated CTA columns, and automatic contact creation from webhook data.

## Problem Statement

Based on the current webhook processing system and the sample webhook data provided, we need to enhance lead data extraction to:

### **Issue 1: Company Name Not Stored in Lead Analytics**
**Current State**: Company names are extracted in webhook payload (`extraction.company_name`) but not stored in the lead_analytics table
**Impact**: Missing business context for leads, inability to segment by company
**Sample Data**: `"company_name": "SniperThink"` from webhook extraction

### **Issue 2: CTA Data Stored as JSONB Instead of Dedicated Columns**
**Current State**: CTA interactions stored in `cta_interactions` JSONB field
**Impact**: Difficult to query, index, and aggregate CTA metrics for analytics
**Sample Data**: 
```json
{
  "cta_pricing_clicked": "No",
  "cta_demo_clicked": "No", 
  "cta_followup_clicked": "No",
  "cta_sample_clicked": "No",
  "cta_escalated_to_human": "No"
}
```

### **Issue 3: No Automatic Contact Creation**
**Current State**: Contact information extracted but not automatically stored as contact records
**Impact**: Manual contact management, missed lead tracking opportunities
**Sample Data**: 
```json
{
  "name": "Siddhant Jeswar",
  "email_address": "siddhant.jeswar@sniperthink.com",
  "company_name": "SniperThink"
}
```

## User Stories

### Epic 1: Enhanced Lead Data Storage

**US-1.1: Company Name in Lead Analytics**
```
As a user analyzing leads,
I want company names stored directly in lead analytics,
So that I can segment and filter leads by company.

Acceptance Criteria:
- Company name extracted from webhook `extraction.company_name` field
- Stored in `lead_analytics.company_name` column (VARCHAR 255)
- Displayed in lead analytics dashboard and reports
- Included in lead export functionality
```

**US-1.2: Dedicated CTA Columns**
```
As a user tracking conversion metrics,
I want CTA interactions stored as individual boolean columns,
So that I can efficiently query and aggregate CTA metrics.

Acceptance Criteria:
- Individual boolean columns for each CTA type in lead_analytics table
- CTA data extracted from webhook and stored in dedicated columns
- Analytics queries updated to use new columns instead of JSONB
- Historical JSONB data migrated to new columns
```

**US-1.3: Automatic Contact Creation**
```
As a user managing leads,
I want contacts automatically created from webhook extraction data,
So that I don't have to manually create contact records.

Acceptance Criteria:
- Contact record created automatically when webhook contains extraction data
- Name, email, phone, and company populated from webhook data
- Duplicate contacts prevented (same email or phone for same user)
- Contact linked to the call record
```

### Epic 2: Analytics Integration

**US-2.1: CTA Analytics Enhancement**
```
As a user viewing analytics,
I want CTA metrics properly aggregated in agent and user analytics,
So that I can track conversion performance accurately.

Acceptance Criteria:
- Agent analytics include CTA click counts and rates
- User analytics aggregate CTA metrics across all agents
- Dashboard displays CTA performance metrics
- Triggers updated to calculate CTA metrics from new columns
```

## Technical Requirements

### Database Schema Changes

1. **Lead Analytics Table Enhancement**
   ```sql
   ALTER TABLE lead_analytics ADD COLUMN:
   - company_name VARCHAR(255)
   - extracted_name VARCHAR(255) 
   - extracted_email VARCHAR(255)
   - cta_pricing_clicked BOOLEAN DEFAULT FALSE
   - cta_demo_clicked BOOLEAN DEFAULT FALSE
   - cta_followup_clicked BOOLEAN DEFAULT FALSE
   - cta_sample_clicked BOOLEAN DEFAULT FALSE
   - cta_escalated_to_human BOOLEAN DEFAULT FALSE
   ```

2. **Indexing for Performance**
   ```sql
   - CREATE INDEX idx_lead_analytics_company_name ON lead_analytics(company_name)
   - CREATE INDEX idx_lead_analytics_cta_pricing ON lead_analytics(cta_pricing_clicked) WHERE cta_pricing_clicked = TRUE
   - CREATE INDEX idx_lead_analytics_cta_demo ON lead_analytics(cta_demo_clicked) WHERE cta_demo_clicked = TRUE
   ```

### Webhook Processing Enhancement

1. **Data Extraction Logic**
   - Extract company name from `analysis.data_collection_results.default.value.extraction.company_name`
   - Extract contact info from `analysis.data_collection_results.default.value.extraction`
   - Parse CTA interactions from webhook payload
   - Handle missing or null values gracefully

2. **Contact Creation Logic**
   - Check for existing contact by email or phone number
   - Create new contact if not exists
   - Link contact to call record
   - Update contact info if better data available

### Analytics Updates

1. **Trigger Updates**
   - Update agent analytics triggers to include CTA metrics from new columns
   - Update user analytics aggregation to include CTA data
   - Ensure cache invalidation works with new columns

2. **Query Updates**
   - Update analytics queries to use dedicated CTA columns
   - Add company name to analytics results
   - Update dashboard queries for CTA metrics

## Acceptance Criteria

### Data Extraction Acceptance Criteria
- [ ] Company names extracted and stored in lead_analytics.company_name
- [ ] CTA interactions stored in dedicated boolean columns
- [ ] Contact records automatically created from webhook extraction data
- [ ] No duplicate contacts created for same user
- [ ] Historical CTA data migrated from JSONB to new columns

### Analytics Integration Acceptance Criteria
- [ ] Agent analytics include CTA click counts and conversion rates
- [ ] User analytics aggregate CTA metrics across all agents
- [ ] Dashboard displays company names in lead listings
- [ ] CTA performance metrics visible in analytics dashboard
- [ ] Triggers properly update analytics with new CTA data

### Performance Acceptance Criteria
- [ ] Webhook processing completes within existing time limits
- [ ] New indexes improve CTA query performance
- [ ] Analytics queries maintain sub-2-second response times
- [ ] Contact creation doesn't significantly impact webhook processing time

## Sample Webhook Data Structure

Based on the provided sample, the webhook contains:

```json
{
  "analysis": {
    "data_collection_results": {
      "default": {
        "value": "{'extraction': {'name': 'Siddhant Jeswar', 'email_address': 'siddhant.jeswar@sniperthink.com', 'company_name': 'SniperThink'}, 'cta_pricing_clicked': 'No', 'cta_demo_clicked': 'No', 'cta_followup_clicked': 'No', 'cta_sample_clicked': 'No', 'cta_escalated_to_human': 'No'}"
      }
    }
  }
}
```

## Success Metrics

### Technical Metrics
- 100% company name extraction when available in webhook
- Zero data loss during CTA migration from JSONB to columns
- Automatic contact creation for 100% of webhooks with extraction data
- No duplicate contacts created

### Business Metrics
- Improved lead segmentation by company
- Better CTA conversion tracking and reporting
- Reduced manual contact management overhead
- Enhanced lead analytics accuracy

## Constraints

- Must maintain backward compatibility with existing webhook processing
- Cannot cause webhook processing failures or timeouts
- Must preserve all existing CTA data during migration
- Should not significantly impact database performance
- Must handle missing or malformed webhook data gracefully

## Dependencies

- Existing webhook processing system
- Current lead_analytics table structure
- Analytics trigger system
- Contact management system