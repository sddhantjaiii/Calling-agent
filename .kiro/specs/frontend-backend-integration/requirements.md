# Requirements Document

## Introduction

The frontend application currently displays fallback/mock data in dashboard components instead of properly integrating with the backend API endpoints. While the backend provides comprehensive real data from the database, the frontend components are showing default values or using Math.random() for data generation in some cases. This feature will ensure all dashboard components properly fetch and display real data from the backend APIs.

## Requirements

### Requirement 1

**User Story:** As a user, I want to see real dashboard KPIs based on my actual call and lead data, so that I can make informed business decisions.

#### Acceptance Criteria

1. WHEN I view the dashboard overview THEN the KPIs SHALL display real data from my calls and leads
2. WHEN I have no data THEN the KPIs SHALL show zero values with appropriate empty state messages
3. WHEN the API call fails THEN the system SHALL show an error state with retry option
4. WHEN data is loading THEN the system SHALL show loading skeletons instead of default values

### Requirement 2

**User Story:** As a user, I want to see real analytics charts based on my actual interaction data, so that I can track trends and performance over time.

#### Acceptance Criteria

1. WHEN I view analytics charts THEN they SHALL display data from the backend analytics API
2. WHEN I apply filters THEN the charts SHALL update with filtered real data
3. WHEN there is no data for a chart THEN it SHALL show an appropriate empty state
4. WHEN chart data is loading THEN it SHALL show loading indicators instead of mock data

### Requirement 3

**User Story:** As a user, I want to see real lead data in the call/chat data tables, so that I can review actual lead interactions and their quality scores.

#### Acceptance Criteria

1. WHEN I view the leads table THEN it SHALL display real leads from the backend API
2. WHEN I filter leads THEN the filtering SHALL be applied on the backend with real data
3. WHEN I sort leads THEN the sorting SHALL work with real data from the API
4. WHEN I paginate through leads THEN it SHALL fetch real paginated data from the backend

### Requirement 4

**User Story:** As a user, I want lead profile details to show real analytics data, so that I can understand the quality and potential of each lead.

#### Acceptance Criteria

1. WHEN I view a lead profile THEN it SHALL display real analytics scores from the backend
2. WHEN I view lead timeline THEN it SHALL show actual interaction history
3. WHEN I view lead reasoning THEN it SHALL display real AI analysis from the backend
4. WHEN lead data is unavailable THEN it SHALL show appropriate fallback messages

### Requirement 5

**User Story:** As a user, I want all Math.random() usage to be reviewed and replaced where it's used for data generation, so that I see consistent real data.

#### Acceptance Criteria

1. WHEN the system generates IDs THEN it SHALL use proper UUID generation instead of Math.random()
2. WHEN the system needs jitter for retry mechanisms THEN Math.random() usage SHALL be preserved as it's legitimate
3. WHEN components need loading animations THEN Math.random() for animation timing SHALL be preserved
4. WHEN components display data THEN no Math.random() SHALL be used for generating fake data values

### Requirement 6

**User Story:** As a user, I want proper error handling and loading states throughout the application, so that I understand when data is being fetched or when errors occur.

#### Acceptance Criteria

1. WHEN API calls are in progress THEN the UI SHALL show appropriate loading states
2. WHEN API calls fail THEN the UI SHALL show error messages with retry options
3. WHEN data is empty THEN the UI SHALL show helpful empty state messages
4. WHEN network issues occur THEN the system SHALL handle them gracefully with user feedback