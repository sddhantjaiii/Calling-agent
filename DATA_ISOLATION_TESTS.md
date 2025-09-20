# Data Isolation Tests Documentation

This document describes the comprehensive data isolation test suite implemented to verify zero cross-agent data contamination and ensure proper security measures throughout the AI Calling Agent SaaS platform.

## Overview

The data isolation test suite addresses the critical security requirement from the Data Analytics Anomalies Analysis specification to prevent cross-agent data contamination and ensure that users can only access their own data.

## Test Categories

### 1. Backend Integration Tests (`backend/src/__tests__/integration/dataIsolation.test.ts`)

**Purpose**: Verify that API endpoints properly validate agent ownership and prevent cross-user data access.

**Test Coverage**:
- Agent ownership validation in all API endpoints
- Analytics data isolation by user
- Call data isolation by user
- Lead data isolation by user
- Database constraint validation
- Authentication and authorization
- Data leakage prevention
- Bulk operations data isolation
- Search and filter data isolation

**Key Test Cases**:
```typescript
// Example: Prevent user from accessing other user's agent data
test('should prevent user from accessing other users agent data', async () => {
  const response = await request(app)
    .get(`/api/agents/${user1Agent.id}`)
    .set('Authorization', `Bearer ${user2Token}`)
    .expect(403);

  expect(response.body.error.code).toBe('AGENT_ACCESS_DENIED');
});
```

### 2. Cross-Tenant Security Tests (`backend/src/__tests__/security/crossTenantDataAccess.test.ts`)

**Purpose**: Test database-level security measures and query-level isolation.

**Test Coverage**:
- Database query security
- Data aggregation security
- Subquery security
- Window function security
- CTE (Common Table Expression) security
- Transaction isolation
- Index usage and performance
- Data integrity constraints
- Audit and monitoring

**Key Test Cases**:
```typescript
// Example: Prevent cross-tenant data in complex joins
test('should prevent cross-tenant analytics access in complex joins', async () => {
  const result = await pool.query(`
    SELECT c.user_id, a.user_id, la.user_id
    FROM calls c
    JOIN agents a ON c.agent_id = a.id
    LEFT JOIN lead_analytics la ON c.id = la.call_id
    WHERE c.user_id = $1
  `, [user1Id]);

  result.rows.forEach(row => {
    expect(row.call_user_id).toBe(user1Id);
    expect(row.agent_user_id).toBe(user1Id);
    if (row.analytics_user_id) {
      expect(row.analytics_user_id).toBe(user1Id);
    }
  });
});
```

### 3. Agent Ownership Middleware Tests (`backend/src/__tests__/middleware/agentOwnership.test.ts`)

**Purpose**: Verify that the agent ownership middleware correctly validates access permissions.

**Test Coverage**:
- `validateAgentOwnership` middleware
- `optionalAgentOwnership` middleware
- `validateAgentOwnershipFromBody` middleware
- Security edge cases
- Performance and caching
- Error handling

**Key Test Cases**:
```typescript
// Example: Middleware rejects unauthorized access
test('should reject when user does not own the agent', async () => {
  mockRequest.params = { agentId: 'agent2-id' };
  vi.mocked(AgentModel.findOne).mockResolvedValue(null);

  await validateAgentOwnership(mockRequest, mockResponse, mockNext);

  expect(mockStatus).toHaveBeenCalledWith(403);
  expect(mockJson).toHaveBeenCalledWith({
    success: false,
    error: {
      code: 'AGENT_ACCESS_DENIED',
      message: 'Agent not found or access denied',
    },
  });
});
```

### 4. Frontend Data Isolation Tests (`Frontend/src/__tests__/integration/dataIsolation.test.tsx`)

**Purpose**: Verify that frontend hooks and components cannot access other users' data.

**Test Coverage**:
- `useCalls` hook data isolation
- `useAgents` hook data isolation
- `useDashboard` hook data isolation
- `useDataAccessSecurity` hook validation
- API service user context validation
- Error boundary data isolation
- Cache data isolation

**Key Test Cases**:
```typescript
// Example: Hook validates user context before API calls
test('should include user context in API calls', async () => {
  const { result } = renderHook(() => useCalls(), {
    wrapper: createWrapper(mockUser1),
  });

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  // Verify returned data belongs to user1
  result.current.calls.forEach(call => {
    expect(call.userId).toBe(mockUser1.id);
  });
});
```

## Test Execution

### Backend Tests

```bash
# Run all backend data isolation tests
npm run test:data-isolation

# Run specific test files
npm test -- --testPathPattern=dataIsolation.test.ts
npm test -- --testPathPattern=crossTenantDataAccess.test.ts
npm test -- --testPathPattern=agentOwnership.test.ts
```

### Frontend Tests

```bash
# Run all frontend data isolation tests
npm run test:frontend-data-isolation

# Run specific test files
npm test -- --run src/__tests__/integration/dataIsolation.test.tsx
```

### Comprehensive Test Suite

```bash
# Run both backend and frontend tests
npm run test:all-data-isolation
```

## Test Data Setup

### Backend Test Data
- Creates isolated test users with separate agents, calls, and analytics
- Uses proper cleanup to prevent test data contamination
- Validates database constraints and relationships

### Frontend Test Data
- Mocks API responses with user-specific data
- Tests authentication context and user validation
- Verifies cache isolation between different users

## Security Validations

### 1. Authentication Validation
- Ensures all API calls require valid authentication tokens
- Validates token user context matches requested data
- Prevents access with invalid or expired tokens

### 2. Authorization Validation
- Verifies agent ownership before data access
- Prevents cross-user data access attempts
- Validates user permissions for all operations

### 3. Data Integrity Validation
- Ensures database constraints prevent cross-tenant data
- Validates foreign key relationships maintain user_id consistency
- Checks for orphaned records and data contamination

### 4. Error Handling Validation
- Prevents sensitive data leakage in error messages
- Provides consistent error responses to prevent user enumeration
- Handles edge cases and malicious input gracefully

## Performance Considerations

### Database Query Optimization
- Tests verify proper index usage for user-scoped queries
- Validates efficient query execution plans
- Ensures scalable performance with large datasets

### Caching Strategy
- Validates user-scoped cache keys
- Tests cache isolation between different users
- Verifies cache invalidation on user context changes

## Monitoring and Alerting

### Data Contamination Detection
```sql
-- Query to detect cross-tenant contamination
SELECT 
  'calls_agents_mismatch' as issue_type,
  COUNT(*) as count
FROM calls c
JOIN agents a ON c.agent_id = a.id
WHERE c.user_id != a.user_id;
```

### Audit Logging
- Tracks all data access attempts
- Logs security violations and unauthorized access
- Monitors for suspicious activity patterns

## Compliance and Security Standards

### Data Privacy
- Ensures GDPR/CCPA compliance through proper data isolation
- Prevents accidental data exposure between tenants
- Maintains audit trails for data access

### Security Best Practices
- Implements defense in depth with multiple validation layers
- Uses principle of least privilege for data access
- Follows OWASP security guidelines

## Continuous Integration

### Automated Testing
- All data isolation tests run on every pull request
- Prevents deployment of code that breaks data isolation
- Provides immediate feedback on security regressions

### Test Coverage Requirements
- Minimum 95% coverage for security-critical code paths
- Mandatory tests for all new data access endpoints
- Regular security audit and penetration testing

## Troubleshooting

### Common Issues
1. **Test Database Connection**: Ensure test database is running and accessible
2. **Authentication Tokens**: Verify JWT secret configuration for test tokens
3. **Mock Data**: Check that mock data properly represents user ownership
4. **Async Operations**: Ensure proper waiting for async operations in tests

### Debug Commands
```bash
# Check database constraints
npm run db:check-constraints

# Validate data integrity
npm run db:validate-integrity

# Run security audit
npm run security:audit
```

## Future Enhancements

### Planned Improvements
1. **Real-time Monitoring**: Implement real-time data contamination alerts
2. **Advanced Analytics**: Add metrics for data access patterns
3. **Automated Remediation**: Develop automated fixes for detected issues
4. **Performance Benchmarks**: Establish performance baselines for security checks

### Test Expansion
1. **Load Testing**: Test data isolation under high concurrent load
2. **Chaos Engineering**: Test resilience of security measures
3. **Penetration Testing**: Regular security assessments by external teams
4. **Compliance Testing**: Automated compliance validation

## Conclusion

This comprehensive data isolation test suite ensures that the AI Calling Agent SaaS platform maintains strict data separation between users, preventing cross-agent data contamination and maintaining user privacy and security. The tests cover all layers of the application from database constraints to frontend user interfaces, providing confidence in the platform's security posture.