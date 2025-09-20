# TypeScript Interface Definitions

This directory contains comprehensive TypeScript interface definitions that match the backend data models and API responses. These interfaces ensure complete type safety across the entire frontend application.

## Overview

The type definitions are organized into several categories:

- **Base Types**: Common types and utilities used throughout the application
- **API Response Types**: Wrapper types for all API responses
- **User Management**: User, authentication, and profile types
- **Agent Management**: AI agent configuration and management types
- **Contact Management**: Contact data and bulk operations types
- **Call Management**: Call records, transcripts, and analytics types
- **Lead Management**: Lead data and analytics types
- **Dashboard**: Dashboard overview and analytics chart data types
- **Billing**: Credit management, transactions, and payment types
- **Analytics**: Advanced analytics and reporting types
- **Admin**: Administrative functions and audit logging types
- **Utility Types**: Helper types for pagination, sorting, filtering, etc.

## File Structure

```
src/types/
├── api.ts          # Main type definitions file
├── index.ts        # Central export file
└── README.md       # This documentation file
```

## Usage

### Basic Import

```typescript
import { User, Agent, Contact, Call } from '../types';
```

### API Response Types

```typescript
import { ApiResponse, PaginatedResponse } from '../types';

// Example usage
const handleApiResponse = (response: ApiResponse<User[]>) => {
  if (response.success && response.data) {
    // response.data is typed as User[]
    console.log(response.data);
  }
};
```

### Request/Response Types

```typescript
import { CreateAgentRequest, UpdateAgentRequest, AuthResponse } from '../types';

// Example usage
const createAgent = async (data: CreateAgentRequest): Promise<AuthResponse> => {
  // Implementation
};
```

### Filter and Option Types

```typescript
import { ContactsListOptions, CallFilters, PaginationOptions } from '../types';

// Example usage
const getContacts = (options: ContactsListOptions) => {
  // Implementation with type-safe options
};
```

## Key Features

### 1. Complete Backend Compatibility

All interfaces match the exact structure of backend data models and API responses, ensuring seamless integration.

### 2. Comprehensive Error Handling

```typescript
interface ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  isRetryable?: boolean;
  timestamp?: string;
}
```

### 3. Flexible Pagination

```typescript
interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    page?: number;
    totalPages?: number;
  };
}
```

### 4. Advanced Filtering

```typescript
interface FilterOptions extends PaginationOptions, SortOptions, SearchOptions, DateRangeOptions {
  [key: string]: unknown;
}
```

### 5. Type-Safe Enums

```typescript
export type AuthProvider = 'email' | 'google' | 'linkedin' | 'github';
export type UserRole = 'user' | 'admin' | 'super_admin';
export type AgentType = 'call' | 'chat';
export type CallStatus = 'completed' | 'failed' | 'in_progress' | 'cancelled';
```

## API Integration Examples

### Authentication

```typescript
import { LoginRequest, AuthResponse } from '../types';

const login = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = await apiService.login(credentials.email, credentials.password);
  return response;
};
```

### Agent Management

```typescript
import { Agent, CreateAgentRequest, UpdateAgentRequest } from '../types';

const createAgent = async (data: CreateAgentRequest): Promise<Agent> => {
  const response = await apiService.createAgent(data);
  return response.data!;
};

const updateAgent = async (id: string, data: UpdateAgentRequest): Promise<Agent> => {
  const response = await apiService.updateAgent(id, data);
  return response.data!;
};
```

### Contact Management

```typescript
import { Contact, ContactsListOptions, ContactUploadResult } from '../types';

const getContacts = async (options: ContactsListOptions): Promise<Contact[]> => {
  const response = await apiService.getContacts();
  return response.data!;
};

const uploadContacts = async (file: File): Promise<ContactUploadResult> => {
  const response = await apiService.uploadContacts(file);
  return response.data!;
};
```

### Dashboard Analytics

```typescript
import { DashboardOverview, DashboardAnalytics } from '../types';

const getDashboardData = async (): Promise<{
  overview: DashboardOverview;
  analytics: DashboardAnalytics;
}> => {
  const [overviewResponse, analyticsResponse] = await Promise.all([
    apiService.getDashboardOverview(),
    apiService.getDashboardAnalytics(),
  ]);

  return {
    overview: overviewResponse.data!,
    analytics: analyticsResponse.data!,
  };
};
```

### Billing and Credits

```typescript
import { CreditBalance, PurchaseCreditsRequest, BillingHistory } from '../types';

const purchaseCredits = async (amount: number): Promise<void> => {
  const request: PurchaseCreditsRequest = { amount };
  const response = await apiService.purchaseCredits(request);
  
  if (response.success && response.data) {
    // Handle successful purchase
    console.log('Payment intent:', response.data.paymentIntentId);
  }
};
```

## Error Handling

The type system includes comprehensive error handling:

```typescript
import { ApiError, ErrorResponse } from '../types';

const handleApiCall = async () => {
  try {
    const response = await apiService.getAgents();
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error [${error.code}]:`, error.message);
      if (error.isRetryable) {
        // Implement retry logic
      }
    }
    throw error;
  }
};
```

## Validation and Type Guards

You can create type guards for runtime validation:

```typescript
import { User, Agent } from '../types';

const isUser = (obj: unknown): obj is User => {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'email' in obj;
};

const isAgent = (obj: unknown): obj is Agent => {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj;
};
```

## Best Practices

### 1. Always Use Types

```typescript
// Good
const user: User = await apiService.getProfile();

// Avoid
const user = await apiService.getProfile();
```

### 2. Handle Optional Fields

```typescript
// Good
const contact: Contact = {
  id: '1',
  userId: 'user1',
  name: 'John Doe',
  phoneNumber: '+1234567890',
  email: contact.email || undefined, // Handle optional fields properly
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

### 3. Use Utility Types

```typescript
// Good - Use utility types for partial updates
const updateData: Partial<UpdateAgentRequest> = {
  name: 'New Agent Name',
};

// Good - Use Pick for specific fields
type UserSummary = Pick<User, 'id' | 'name' | 'email'>;
```

### 4. Type-Safe API Calls

```typescript
// Good - Type-safe with proper error handling
const fetchUserData = async (userId: string): Promise<User | null> => {
  try {
    const response = await apiService.getUserProfile();
    return response.success ? response.data! : null;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
};
```

## Contributing

When adding new types:

1. Follow the existing naming conventions
2. Add comprehensive JSDoc comments
3. Include examples in this README
4. Ensure backend compatibility
5. Add proper error handling types
6. Update the index.ts export file

## Migration Guide

If you're migrating from the old type definitions:

1. Update imports to use the new centralized types
2. Replace any `any` types with proper interfaces
3. Add error handling for API responses
4. Use the new pagination and filtering types
5. Update component props to use the new types

```typescript
// Old
import { Agent } from '../config/api';

// New
import { Agent } from '../types';
```