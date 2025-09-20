# Design Document

## Overview

This design outlines the integration of the frontend settings page with the actual backend API, replacing mock data with real user data. The implementation will disable chat agent token purchasing features and simplify authentication requirements by commenting out 2FA components while maintaining the existing UI structure.

## Architecture

### Current State Analysis

The settings page (`Frontend/src/components/dashboard/SettingsCard.tsx`) currently:
- Fetches user profile data from `/api/user/profile` endpoint
- Has basic form validation and error handling
- Includes 2FA toggle functionality
- Contains team member management features
- Uses mock data for some fields (company, website, location, bio, phone)

### Backend API Integration Points

**Existing API Endpoints:**
- `GET /api/user/profile` - Returns user profile data
- `PUT /api/user/profile` - Updates user profile (name, email only currently)

**Backend User Model Fields:**
- `id`, `email`, `name`, `credits`, `isActive`, `authProvider`, `emailVerified`, `createdAt`, `updatedAt`

## Components and Interfaces

### 1. Settings Page Component Updates

**File:** `Frontend/src/components/dashboard/SettingsCard.tsx`

**Changes Required:**
- Comment out 2FA section to disable functionality
- Comment out chat agent token purchase options (if any exist)
- Update backend integration to handle additional profile fields
- Maintain existing UI layout and validation

### 2. Backend API Extensions

**File:** `backend/src/services/userService.ts`

**Extensions Needed:**
- Add support for additional profile fields (company, website, location, bio, phone)
- Update `updateUserProfile` method to handle new fields

**File:** `backend/src/models/User.ts`

**Schema Extensions:**
- Add optional fields: `company`, `website`, `location`, `bio`, `phone`
- Maintain backward compatibility

### 3. API Service Updates

**File:** `Frontend/src/services/apiService.ts`

**Current Implementation:**
- `getUserProfile()` method exists and works
- `updateUserProfile()` method needs to support additional fields

## Data Models

### Extended User Profile Interface

```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  profileImageUrl?: string;
  credits: number;
  isActive: boolean;
  authProvider: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  // New optional fields
  company?: string;
  website?: string;
  location?: string;
  bio?: string;
  phone?: string;
}
```

### Settings Update Request

```typescript
interface SettingsUpdateRequest {
  name?: string;
  email?: string;
  company?: string;
  website?: string;
  location?: string;
  bio?: string;
  phone?: string;
  notifications?: boolean;
  // password update fields
  oldPassword?: string;
  newPassword?: string;
}
```

## Error Handling

### Frontend Error Handling
- Maintain existing validation patterns
- Use existing server validation handler
- Preserve toast notifications for user feedback
- Handle network errors gracefully

### Backend Error Handling
- Return structured error responses
- Validate input data
- Handle database constraints
- Provide meaningful error messages

## Testing Strategy

### Frontend Testing
- Test form validation with new fields
- Verify API integration works correctly
- Test error handling scenarios
- Ensure UI remains functional after commenting out features

### Backend Testing
- Test extended user profile endpoints
- Verify data persistence
- Test validation rules
- Ensure backward compatibility

### Integration Testing
- Test complete settings update flow
- Verify data consistency between frontend and backend
- Test authentication flow without 2FA
- Validate error handling across the stack

## Implementation Approach

### Phase 1: Backend Extensions
1. Extend User model with additional fields
2. Update userService methods
3. Update userController endpoints
4. Add database migration if needed

### Phase 2: Frontend Integration
1. Comment out 2FA section in SettingsCard
2. Comment out any chat agent token purchase features
3. Update form handling for additional fields
4. Test integration with backend

### Phase 3: Validation and Testing
1. Test all form fields save correctly
2. Verify error handling works
3. Ensure UI remains consistent
4. Test authentication flow

## Security Considerations

### Authentication Simplification
- Remove 2FA requirement by commenting out components
- Maintain existing token-based authentication
- Preserve session validation
- Keep existing logout functionality

### Data Validation
- Validate all input fields on both frontend and backend
- Sanitize user input to prevent XSS
- Implement proper field length limits
- Validate email format and phone number format

### Privacy
- Ensure user data is properly protected
- Implement proper access controls
- Log security-relevant events
- Handle sensitive data appropriately

## Performance Considerations

### Frontend Performance
- Maintain existing loading states
- Use existing error handling patterns
- Preserve form validation performance
- Keep UI responsive during API calls

### Backend Performance
- Use existing database connection pooling
- Implement proper indexing for new fields
- Maintain query performance
- Use existing caching mechanisms

## Deployment Strategy

### Database Changes
- Create migration for new user profile fields
- Ensure backward compatibility
- Test migration on staging environment

### Code Deployment
- Deploy backend changes first
- Test API endpoints
- Deploy frontend changes
- Verify integration works correctly

### Rollback Plan
- Keep existing API endpoints functional
- Maintain database schema compatibility
- Prepare rollback scripts if needed