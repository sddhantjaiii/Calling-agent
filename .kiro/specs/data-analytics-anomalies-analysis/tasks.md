# Data Analytics Anomalies Analysis - Implementation Tasks

## Phase 1: Critical Security Fixes (Immediate Priority)

- [x] 1.1Create agent ownership validation middleware




  - Create `backend/src/middleware/agentOwnership.ts` with `validateAgentOwnership` function
  - Implement agent ownership check using database query
  - Add proper error handling for unauthorized access attempts
  - Include agent attachment to request object for downstream use
  - _Requirements: US-1.1, US-1.2_

- [x] 1.2Apply agent ownership validation to analytics routes







  - Update `backend/src/routes/callAnalytics.ts` to use `validateAgentOwnership` middleware
  - Update `backend/src/routes/agentAnalytics.ts` to use `validateAgentOwnership` middleware







  - Ensure all agent-specific endpoints validate ownership before data access
  - _Requirements: US-1.1, US-1.2_




- [x] 1.3 Fix frontend API service user context validation



  - Update `Frontend/src/services/apiService.ts` to include user context in agent-related API calls




  - Add client-side agent ownership validation before API requests
  - Implement proper error handling for access denied scenarios
  - Update all hooks that access agent data to include user validation
  - _Requirements: US-1.1, US-1.2_

- [x] 2.1Audit and fix analytics queries for user_id filtering



  - Review all queries in `backend/src/controllers/callAnalyticsController.ts` for proper user_id filtering
  - Review all queries in `backend/src/controllers/agentAnalyticsController.ts` for proper user_id filtering
  - Ensure all JOIN operations maintain user_id consistency across tables
  - Add database constraints to prevent cross-user data access at schema level
  - _Requirements: US-1.1, US-1.2_





- [ ] 2.2Fix frontend hooks to include user context

  - Update `Frontend/src/hooks/useCalls.ts` to validate agent ownership in queries
  - Update `Frontend/src/hooks/useAgents.ts` to include user context validation


  - Update `Frontend/src/hooks/useDashboard.ts` to ensure user-scoped data access

  - Add error boundaries for unauthorized data access attempts
  - _Requirements: US-1.1, US-1.2_

## Phase 2: Call Source Detection Implementation (High Priority)





- [ ] 3.1Create enhanced lead analytics migration

  - Create `backend/src/migrations/019_enhance_lead_analytics_extraction.sql`
  - Add `company_name`, `extracted_name`, `extracted_email` columns to lead_analytics table
  - Add individual CTA columns (cta_pricing_clicked, cta_demo_clicked, etc.) as boolean fields
  - Create indexes for efficient company name and CTA querying
  - Migrate existing CTA data from JSONB to individual columns
  - Add call source detection to calls table if not already present
  - _Requirements: US-2.1, US-2.2, US-3.1, US-3.2_

- [ ] 4.1Implement call source detection logic in webhook service

  - Create `WebhookDataProcessor.determineCallSource()` function in `backend/src/services/webhookDataProcessor.ts`
  - Parse `system__caller_id` and `system__call_type` from webhook dynamic variables
  - Implement logic to distinguish between phone calls and internet calls
  - Handle edge cases for missing or malformed webhook data
  - _Requirements: US-2.1_

- [ ] 4.2Update webhook service to store call source

  - Modify `backend/src/services/webhookService.ts` to use call source detection
  - Update call creation logic to include call_source, caller_name, and caller_email
  - Ensure backward compatibility with existing webhook processing
  - Add logging for call source detection results
  - _Requirements: US-2.1_

- [ ] 4.3Enhance lead data extraction in webhook processing

  - Update `WebhookDataProcessor.extractLeadData()` to extract company names from webhook payload
  - Add company name extraction from multiple possible sources (dynamic variables, analysis data)
  - Update webhook service to store company_name, extracted_name, and extracted_email in lead_analytics
  - Remove fake email generation from `backend/src/controllers/leadsController.ts`
  - Update contact extraction logic to handle null values gracefully
  - _Requirements: US-3.1, US-3.2_


- [x] 5.1Create call source indicator components


  - Create `Frontend/src/components/call/CallSourceIndicator.tsx` component
  - Implement icons and labels for different call source types (phone, internet, unknown)
  - Add call source display to call logs and analytics components
  - Ensure consistent styling and accessibility compliance
  - _Requirements: US-2.1, US-2.2_
-

- [ ] 5.2Update lead analytics display components

  - Update `Frontend/src/components/contacts/ContactDisplay.tsx` to show company names
  - Add company name display to lead analytics dashboard and reports
  - Update lead export functionality to include company name and individual CTA columns
  - Implement proper null handling for missing contact and company information
  - Show "No company information available" when company name is not available
  - Update all components that display lead analytics to use individual CTA columns
  - _Requirements: US-3.1, US-3.2, US-3.3_

- [x] 5.3Add call source analytics and filtering





  - Update analytics dashboards to include call source breakdowns
  - Add filtering options by call source in call logs
  - Implement source-based conversion rate calculations
  - Add call source data to export functionality
  - _Requirements: US-2.2_




## Phase 3: Database Trigger Improvements (Medium Priority)

- [ ] 6.1Fix KPI update triggers with error handling

  - Create `backend/src/migrations/018_fix_trigger_error_handling.sql`


  - Update `update_user_kpis_from_agent_analytics()` function with proper error handling
  - Add NULL value validation and graceful handling
  - Implement transaction safety to prevent trigger failures from breaking operations
  - Add comprehensive logging for trigger execution and errors
  - _Requirements: US-4.1_

- [x] 6.2Optimize trigger performance





  - Review trigger execution performance impact on database operations
  - Implement efficient bulk update handling for large data changes
  - Add conditional logic to skip unnecessary trigger executions
  - Create monitoring for trigger execution times and failure rates
  - _Requirements: US-4.1_



- [x] 7.1Fix cache invalidation trigger logic




  - Review and fix issues in `backend/src/migrations/016_fix_cache_invalidation_trigger.sql`
  - Ensure cascade invalidation works correctly for related data
  - Add proper error handling to prevent cache invalidation failures
  - Implement batching for efficient cache invalidation operations
  - _Requirements: US-4.1_

## Phase 4: Enhanced Data Processing (Low Priority)




- [ ] 8.1Implement sophisticated webhook parsing


  - Create `backend/src/services/webhookPayloadParser.ts` based on original implementation
  - Implement Python dictionary to JSON conversion logic
  - Add comprehensive payload structure validation



  - Handle mixed quote styles and malformed data gracefully
  - Add support for all ElevenLabs webhook payload variations
  - _Requirements: Technical Requirements - Webhook Processing_

- [ ] 8.2Enhanced data validation and error handling


  - Add comprehensive webhook payload validation before processing
  - Implement graceful handling of malformed or incomplete webhook data
  - Add detailed logging for webhook processing steps and failures
  - Create fallback mechanisms for missing or invalid data fields
  - _Requirements: Technical Requirements - Webhook Processing_

## Phase 5: Testing and Validation

- [x] 9.1Create comprehensive data isolation tests






  - Create test suite to verify zero cross-agent data contamination
  - Test agent ownership validation in all API endpoints
  - Verify database constraints prevent cross-tenant data access
  - Test frontend hooks cannot access other users' data
  - _Requirements: Data Isolation Acceptance Criteria_
-

- [x] 9.2Call source detection testing





  - Create tests for phone call identification and labeling
  - Create tests for internet call identification and labeling
  - Test unknown source handling and graceful fallbacks
  - Verify call source storage and historical data categorization
  - _Requirements: Call Source Detection Acceptance Criteria_
-

- [-] 10.1Implement data integrity monitoring










  - Create monitoring queries to detect cross-agent data contamination
  - Add alerts for trigger failures or performance degradation
  - Implement dashboard for data integrity metrics
  - Create automated testing for data isolation scenarios
  - _Requirements: Monitoring and Alerting Requirements_
-




- [-] 10.2Performance optimization validation









  - Verify analytics queries complete within 2-second requirement
  - Ensure trigger execution adds less than 100ms to transactions
  - Validate cache invalidation completes within 500ms
  - Test frontend data loading meets 1-second requirement
  - _Requirements: Performance Requirements_ 2-second requirement
  - Ensure trigger execution adds less than 100ms to transactions
  - Validate cache invalidation completes within 500ms
  - Test frontend data loading meets 1-second requirement
  - _Requirements: Performance Requirements_

## Success Metrics

### Technical Validation
- [ ] Zero cross-agent data contamination incidents detected
- [ ] 100% accurate call source identification for new calls
- [ ] Zero fake contact information displays in UI
- [ ] 99.9% trigger execution success rate maintained
- [ ] All analytics queries respond within 2 seconds

### Business Impact Validation
- [ ] User trust and satisfaction scores improved
- [ ] Support tickets about data issues reduced
- [ ] Channel attribution accuracy increased
- [ ] Data-driven decision making capabilities enhanced

## Implementation Notes

### Priority Guidelines
1. **Phase 1 (Critical Security)**: Must be completed first to prevent data privacy breaches
2. **Phase 2 (Call Source Detection)**: High business impact for marketing attribution
3. **Phase 3 (Database Triggers)**: Important for data consistency but lower risk
4. **Phase 4 (Enhanced Processing)**: Nice-to-have improvements for robustness
5. **Phase 5 (Testing)**: Continuous throughout implementation

### Risk Mitigation
- Implement comprehensive testing with real data scenarios
- Use gradual rollout with monitoring at each stage
- Maintain rollback procedures for each component
- Communicate improvements to users appropriately
- Monitor system performance throughout implementation

### Dependencies
- Database migration capabilities for schema changes
- Access to original webhook controller for reference implementation
- Testing environment with realistic data for validation
- Monitoring and alerting infrastructure for ongoing validation