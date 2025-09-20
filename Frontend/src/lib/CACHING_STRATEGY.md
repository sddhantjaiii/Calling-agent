# Data Caching Strategy Implementation

## Overview

This document outlines the comprehensive data caching strategy implemented using React Query (@tanstack/react-query) for the frontend application. The caching system is designed to improve performance, reduce API calls, and provide a better user experience.

## Caching Configuration

### Global Settings

```typescript
// Default cache settings in queryClient.ts
staleTime: 5 * 60 * 1000,     // 5 minutes - when data becomes stale
gcTime: 10 * 60 * 1000,       // 10 minutes - when data is garbage collected
retry: 3,                      // Number of retry attempts
refetchOnWindowFocus: false,   // Don't refetch on window focus by default
refetchOnReconnect: true,      // Refetch when network reconnects
```

### Per-Data-Type Cache Settings

#### Agents Data
- **staleTime**: 2 minutes (agents change frequently)
- **gcTime**: 5 minutes
- **Optimistic Updates**: Enabled for create, update, delete operations
- **Cache Invalidation**: Automatic on mutations

#### Contacts Data
- **staleTime**: 1 minute (contacts change frequently)
- **gcTime**: 3 minutes
- **Optimistic Updates**: Enabled for all CRUD operations
- **Cache Invalidation**: Automatic on mutations and bulk uploads

#### Calls Data
- **staleTime**: 30 seconds (calls change very frequently)
- **gcTime**: 2 minutes
- **Background Refetch**: Enabled for real-time updates
- **Cache Invalidation**: Manual refresh available

#### Dashboard Data
- **Overview**: 2 minutes stale, 5 minutes gc
- **Analytics**: 3 minutes stale, 10 minutes gc
- **Auto-refresh**: Configurable intervals
- **Cache Invalidation**: Bulk invalidation for dashboard refresh

#### Billing Data
- **Credits**: 1 minute stale, 3 minutes gc (changes frequently)
- **Stats**: 5 minutes stale, 10 minutes gc (changes less frequently)
- **History**: 2 minutes stale, 5 minutes gc
- **Pricing**: 30 minutes stale, 1 hour gc (rarely changes)

#### Voice Data (ElevenLabs)
- **staleTime**: 30 minutes (voices rarely change)
- **gcTime**: 1 hour
- **Retry**: Limited to 1 attempt (not critical)

## Cache Invalidation Strategy

### Automatic Invalidation

1. **Mutation Success**: All mutations automatically invalidate related cache entries
2. **Optimistic Updates**: Failed mutations revert to previous cached state
3. **Bulk Operations**: Contact uploads invalidate both contacts and stats

### Manual Invalidation

```typescript
// Available cache utilities
cacheUtils.invalidateAgents()     // Invalidate all agent data
cacheUtils.invalidateContacts()   // Invalidate all contact data
cacheUtils.invalidateCalls()      // Invalidate all call data
cacheUtils.invalidateDashboard()  // Invalidate dashboard data
cacheUtils.invalidateBilling()    // Invalidate billing data
cacheUtils.clearAll()             // Clear entire cache
```

### Smart Invalidation

- **Related Data**: Updating contacts also invalidates contact stats
- **Cross-Entity**: Agent operations may invalidate dashboard data
- **Hierarchical**: Parent queries invalidate child queries

## Optimistic Updates

### Implementation Pattern

```typescript
onMutate: async (newData) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey });
  
  // Snapshot previous value
  const previousData = queryClient.getQueryData(queryKey);
  
  // Optimistically update
  queryClient.setQueryData(queryKey, optimisticData);
  
  return { previousData };
},
onError: (err, variables, context) => {
  // Revert on error
  if (context?.previousData) {
    queryClient.setQueryData(queryKey, context.previousData);
  }
},
onSuccess: () => {
  // Invalidate to get fresh data
  queryClient.invalidateQueries({ queryKey });
}
```

### Enabled For
- ✅ Agent CRUD operations
- ✅ Contact CRUD operations
- ✅ Contact bulk uploads
- ❌ Call data (read-only)
- ❌ Dashboard data (computed)
- ✅ Credit purchases

## Performance Optimizations

### Background Refetching
- Dashboard data refetches in background when stale
- Critical data (credits, agents) refetch on mount
- Non-critical data (pricing, voices) lazy loads

### Memory Management
- Automatic garbage collection after gcTime
- Query deduplication for simultaneous requests
- Selective cache clearing for memory optimization

### Network Optimization
- Request deduplication
- Automatic retry with exponential backoff
- Offline-first approach with network fallback

## Cache Keys Structure

### Hierarchical Organization
```typescript
queryKeys = {
  agents: ['agents'],
  agent: (id) => ['agents', id],
  agentVoices: ['agents', 'voices'],
  
  contacts: ['contacts'],
  contact: (id) => ['contacts', id],
  contactStats: ['contacts', 'stats'],
  
  calls: ['calls'],
  call: (id) => ['calls', id],
  callTranscript: (id) => ['calls', id, 'transcript'],
  
  // ... etc
}
```

### Benefits
- Easy bulk invalidation
- Hierarchical cache management
- Type-safe key generation
- Consistent naming convention

## Error Handling

### Cache Error Recovery
- Failed queries don't clear existing cache
- Stale data served during network errors
- Graceful degradation with cached data

### Retry Strategy
- Exponential backoff for transient failures
- Different retry counts for different data types
- Network-aware retry logic

## Monitoring and Debugging

### Development Tools
- React Query DevTools integration
- Cache inspection utilities
- Performance monitoring hooks

### Production Monitoring
- Cache hit/miss ratios
- Query performance metrics
- Error rate tracking

## Best Practices Implemented

1. **Stale-While-Revalidate**: Serve stale data while fetching fresh data
2. **Optimistic Updates**: Update UI immediately, sync with server
3. **Smart Invalidation**: Only invalidate related data
4. **Background Sync**: Keep data fresh without blocking UI
5. **Error Boundaries**: Graceful handling of cache errors
6. **Memory Efficiency**: Automatic cleanup of unused data

## Cache Warming Strategies

### Initial Load
- Essential data (user profile, credits) loads immediately
- Secondary data (agents, contacts) loads on demand
- Optional data (pricing, voices) lazy loads

### Prefetching
- Dashboard data prefetches on navigation
- Related data prefetches on hover/focus
- Predictive prefetching based on user patterns

## Future Enhancements

### Planned Improvements
1. **Persistent Cache**: Local storage integration
2. **Selective Sync**: Partial data updates
3. **Real-time Updates**: WebSocket integration
4. **Advanced Prefetching**: ML-based prediction
5. **Cache Compression**: Reduce memory usage

### Metrics to Track
- Cache hit ratio
- Average response time
- Memory usage
- Network request reduction
- User experience improvements

## Implementation Status

- ✅ Basic caching setup
- ✅ Query key structure
- ✅ Cache invalidation utilities
- ✅ Optimistic updates for CRUD operations
- ✅ Error handling and recovery
- ✅ Performance optimizations
- ✅ Development tools integration

This caching strategy provides a robust foundation for efficient data management while maintaining data consistency and providing excellent user experience.