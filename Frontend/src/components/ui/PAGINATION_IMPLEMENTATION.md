# Pagination and Lazy Loading Implementation

This document describes the pagination and lazy loading functionality implemented for the frontend application.

## Overview

The implementation provides two main approaches for handling large datasets:

1. **Traditional Pagination**: Page-based navigation with numbered pages
2. **Lazy Loading**: Infinite scroll with automatic data loading

## Components

### Pagination Component

A reusable pagination component that provides:

- Page number navigation
- Previous/Next buttons
- Item count display
- Ellipsis for large page counts
- Loading state support
- Customizable appearance

**Usage:**
```tsx
<Pagination
  currentPage={1}
  totalPages={10}
  totalItems={100}
  itemsPerPage={10}
  onPageChange={(page) => setCurrentPage(page)}
  loading={false}
  showInfo={true}
  maxVisiblePages={5}
/>
```

### LazyLoader Component

An intersection observer-based component for infinite scrolling:

- Automatic loading when scrolling near the end
- Customizable threshold distance
- Loading and end-of-data states
- Performance optimized with IntersectionObserver

**Usage:**
```tsx
<LazyLoader
  hasMore={hasMoreData}
  loading={isLoading}
  onLoadMore={loadMoreData}
  threshold={100}
>
  {/* Your list items */}
</LazyLoader>
```

### VirtualizedList Component

A performance-optimized list for very large datasets:

- Only renders visible items
- Supports both fixed and dynamic item heights
- Built-in lazy loading support
- Memory efficient for thousands of items

**Usage:**
```tsx
<VirtualizedList
  items={largeDataset}
  itemHeight={60}
  height={400}
  renderItem={(item, index, style) => (
    <div style={style}>{item.name}</div>
  )}
  hasMore={hasMore}
  onLoadMore={loadMore}
/>
```

## API Integration

### Backend Support

The API service has been enhanced to support pagination parameters:

```typescript
// Contacts API with pagination
async getContacts(options?: ContactsListOptions): Promise<ApiResponse<Contact[] | { contacts: Contact[]; pagination: any }>>

// Calls API with pagination  
async getCalls(options?: CallListOptions): Promise<ApiResponse<Call[] | { calls: Call[]; pagination: any }>>
```

### Query Parameters

Both APIs support these pagination parameters:

- `limit`: Number of items per page (default: 20)
- `offset`: Number of items to skip
- `sortBy`: Field to sort by
- `sortOrder`: Sort direction (ASC/DESC)
- `search`: Search query (for filtering)

### Response Format

Paginated responses include both data and pagination metadata:

```typescript
{
  success: true,
  data: {
    contacts: Contact[], // or calls: Call[]
    pagination: {
      total: number,
      limit: number,
      offset: number,
      hasMore: boolean
    }
  }
}
```

## Hooks Integration

### useContacts Hook

Enhanced with pagination support:

```typescript
const {
  contacts,
  pagination,
  loading,
  error,
  refreshContacts,
  // ... other methods
} = useContacts({
  limit: 10,
  offset: 0,
  sortBy: 'name',
  sortOrder: 'asc',
  search: 'john'
});
```

### useCalls Hook

Similar pagination support for calls:

```typescript
const {
  calls,
  pagination,
  loading,
  loadNextPage,
  loadPreviousPage,
  // ... other methods
} = useCalls({
  limit: 20,
  offset: 0,
  sortBy: 'created_at',
  sortOrder: 'DESC'
});
```

## Performance Optimizations

### 1. Data Caching

- React Query caches paginated results
- Intelligent cache invalidation
- Optimistic updates for mutations

### 2. Virtual Scrolling

- Only renders visible items
- Reduces DOM nodes for large lists
- Maintains smooth scrolling performance

### 3. Debounced Search

- Search inputs are debounced (300ms)
- Reduces API calls during typing
- Resets pagination on search

### 4. Memory Management

- Automatic cleanup of unused data
- Configurable cache sizes
- Performance monitoring utilities

## Usage Examples

### ContactList with Pagination

```tsx
// Traditional pagination
<ContactList
  useLazyLoading={false}
  initialPageSize={10}
  onContactSelect={handleSelect}
/>

// Lazy loading
<ContactList
  useLazyLoading={true}
  initialPageSize={20}
  onContactSelect={handleSelect}
/>
```

### CallLogs with Pagination

```tsx
// Traditional pagination
<CallLogs
  useLazyLoading={false}
  initialPageSize={15}
/>

// Infinite scroll
<CallLogs
  useLazyLoading={true}
  initialPageSize={25}
/>
```

## Performance Considerations

### When to Use Traditional Pagination

- Users need to navigate to specific pages
- Data has natural page boundaries
- Precise navigation is important
- Smaller datasets (< 1000 items)

### When to Use Lazy Loading

- Continuous browsing experience desired
- Large datasets (> 1000 items)
- Mobile-first applications
- Real-time data feeds

### When to Use Virtualization

- Very large datasets (> 10,000 items)
- Memory constraints
- Consistent item heights
- Performance is critical

## Testing

Comprehensive test suites cover:

- Pagination component behavior
- Lazy loading functionality
- API integration
- Performance scenarios
- Edge cases and error handling

## Accessibility

The implementation includes:

- Keyboard navigation support
- Screen reader compatibility
- Focus management
- ARIA labels and roles
- Reduced motion preferences

## Browser Support

- Modern browsers with IntersectionObserver support
- Polyfill available for older browsers
- Graceful degradation for unsupported features

## Future Enhancements

Planned improvements include:

- Server-side search integration
- Advanced filtering options
- Bulk operations support
- Export functionality
- Real-time updates via WebSocket