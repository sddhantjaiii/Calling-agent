# Webhook Lead Extraction Enhancement - Implementation Tasks

## Phase 1: Database Schema Enhancement (High Priority)

- [x] 1.1Create enhanced lead analytics migration




  - Create `backend/src/migrations/020_enhance_lead_analytics_extraction.sql`
  - Add `company_name`, `extracted_name`, `extracted_email` columns to lead_analytics table
  - Add individual CTA boolean columns (cta_pricing_clicked, cta_demo_clicked, etc.)
  - Create indexes for efficient querying on company name and CTA columns
  - Migrate existing CTA data from JSONB `cta_interactions` to new boolean columns
  - _Requirements: US-1.1, US-1.2_



- [x] 1.2Update agent analytics table for CTA metrics



  - Add CTA metric columns to agent_analytics table (cta_pricing_clicks, cta_demo_clicks, etc.)
  - Create indexes for efficient CTA analytics queries
  - Ensure backward compatibility with existing analytics
  - _Requirements: US-2.1_

## Phase 2: Enhanced Webhook Processing (High Priority)



- [x] 2.1Create enhanced webhook data processor





  - Create `WebhookDataProcessor.extractEnhancedLeadData()` method in `backend/src/services/webhookDataProcessor.ts`
  - Parse Python dictionary string from webhook `analysis.data_collection_results.default.value`
  - Extract company name from `extraction.company_name` field
  - Extract contact info from `extraction.name`, `extraction.email_address`
  - Parse CTA interactions from webhook payload (convert "Yes"/"No" to boolean)
  - Handle missing or malformed webhook data gracefully
  - _Requirements: US-1.1, US-1.2_



- [x] 2.2Implement contact auto-creation service






  - Create `ContactAutoCreationService` in `backend/src/services/contactAutoCreationService.ts`
  - Implement logic to check for existing contacts by email or phone
  - Create new contact records from webhook extraction data
  - Update existing contacts with better data when available
  - Prevent duplicate contact creation for same user
  - Link created contacts to call records


  - _Requirements: US-1.3_
-

- [ ] 2.3Update webhook service integration






  - Modify `backend/src/services/webhookService.ts` to use enhanced data extraction
  - Store enhanced lead data in new lead_analytics columns
  - Integrate contact auto-creation into webhook processing flow
  - Ensure webhook processing doesn't fail if contact creation fails
  - Add logging for enhanced data extraction and contact creation


  - _Requirements: US-1.1, US-1.2, US-1.3_


## Phase 3: Analytics Integration (Medium Priority)



- [x] 3.1Update analytics queries for CTA columns









  - Update `backend/src/services/analyticsService.ts` CTA queries to use new boolean columns

  - Create `getEnhancedCTAMetrics()` method for improved CTA analytics
  - Create `getCompanyLeadBreakdown()` method for company-based lead analysis
  - Update existing analytics methods to include company name data
  - Ensure backward compatibility during transition period
  - _Requirements: US-2.1_


- [ ] 3.2Update database triggers for CTA metrics





  - Create/update `update_agent_analytics_from_lead_analytics()` trigger function
  - Include CTA metrics in agent analytics calculations
  - Update user analytics aggregation to include CTA data
  - Ensure triggers handle new boolean columns correctly
  - Test trigger performance with new columns
  - _Requirements: US-2.1_




- [x] 3.3Update dashboard cache for enhanced metrics




  - Update cache calculation functions to include CTA metrics from new columns
  - Add company name data to cached analytics
  - Update cache invalidation triggers for new columns
  - Ensure cache performance remains optimal


  - _Requirements: US-2.1_


## Phase 4: Frontend Integration (Low Priority)





- [ ] 4.1Create enhanced lead display components


  - Create `Frontend/src/components/leads/EnhancedLeadCard.tsx` component
  - Display company names in lead listings and details
  - Show CTA interaction badges/indicators
  - Handle missing company name gracefully
  - Ensure responsive design and accessibility
  - _Requirements: US-1.1, US-1.2_

- [ ] 4.2Update lead analytics dashboard
  - Add company name filtering to lead analytics views
  - Display CTA performance metrics using new columns
  - Add company-based lead breakdown charts/tables
  - Update lead export functionality to include company names
  - Ensure dashboard performance with new data
  - _Requirements: US-1.1, US-2.1_

- [ ] 4.3Update contact management interface




  - Display auto-created contacts in contact management
  - Show which contacts were auto-created from calls
  - Allow manual editing of auto-created contact data
  - Add indicators for contacts linked to calls
  - _Requirements: US-1.3_

## Phase 5: Testing and Validation


- [ ] 5.1Create webhook processing tests

  - Test enhanced data extraction with sample webhook payloads
  - Test company name extraction from various webhook formats
  - Test CTA data parsing and boolean conversion
  - Test contact auto-creation with different data scenarios
  - Test duplicate contact prevention logic
  - _Requirements: US-1.1, US-1.2, US-1.3_

- [ ] 5.2Create analytics integration tests
  - Test CTA metrics calculation with new boolean columns
  - Test company-based analytics queries
  - Test trigger functionality with enhanced lead data
  - Verify analytics accuracy after CTA migration
  - Test dashboard cache updates with new data
  - _Requirements: US-2.1_

- [ ] 5.3Performance validation
  - Verify webhook processing time doesn't increase significantly
  - Test database query performance with new indexes
  - Validate analytics query performance with new columns
  - Test contact creation performance impact
  - Monitor memory usage during webhook processing
  - _Requirements: Performance Acceptance Criteria_

## Success Metrics

### Technical Validation
- [ ] 100% company name extraction when available in webhook data
- [ ] Zero data loss during CTA migration from JSONB to boolean columns
- [ ] Automatic contact creation for 100% of webhooks with valid extraction data
- [ ] No duplicate contacts created for same user
- [ ] Webhook processing time increase less than 10%

### Business Impact Validation
- [ ] Company names visible in lead analytics dashboard
- [ ] CTA metrics properly aggregated in agent and user analytics
- [ ] Contact records automatically created and linked to calls
- [ ] Improved lead segmentation by company available
- [ ] Enhanced CTA conversion tracking functional

## Implementation Notes

### Priority Guidelines
1. **Phase 1 (Database Schema)**: Must be completed first to support new data storage
2. **Phase 2 (Webhook Processing)**: Core functionality for data extraction and storage
3. **Phase 3 (Analytics Integration)**: Important for reporting and insights
4. **Phase 4 (Frontend Integration)**: User-facing improvements
5. **Phase 5 (Testing)**: Continuous throughout implementation

### Risk Mitigation
- Test migration scripts thoroughly with production-like data
- Implement rollback procedures for database changes
- Use feature flags for gradual rollout of enhanced processing
- Monitor webhook processing performance closely
- Maintain backward compatibility during transition

### Dependencies
- Existing webhook processing system must remain functional
- Database migration capabilities for schema changes
- Access to sample webhook payloads for testing
- Analytics system must continue working during transition

### Data Migration Strategy
- Migrate existing CTA data from JSONB to new columns in batches
- Verify data integrity after migration
- Keep JSONB columns temporarily for rollback capability
- Remove JSONB columns only after successful validation

This implementation plan provides a focused approach to enhancing webhook processing with minimal complexity while delivering the requested functionality for company name extraction, dedicated CTA columns, and automatic contact creation.