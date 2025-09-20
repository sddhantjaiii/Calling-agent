# useCalls Hook Documentation

## Overview

The `useCalls` hook provides comprehensive call data management functionality for the frontend application. It handles fetching call records from the backend API with full support for pagination, search, filtering, and transcript management.

## Features

- ✅ **Pagination Support**: Backend-driven pagination with proper state management
- ✅ **Call Search**: Search across call records with query parameters
- ✅ **Transcript Search**: Search within call transcripts
- ✅ **Advanced Filtering**: Filter calls by multiple criteria
- ✅ **Call Details**: Load individual call details and transcripts
- ✅ **Statistics**: Load call statistics with time period support
- ✅ **Error Handling**: Comprehensive error handling with user-friendly messages
- ✅ **Loading States**: Granular loading states for different operations

## Usage

### Basic Usage

```typescript
import { useCalls } from '../hooks/useCalls';

function CallsComponent() {
  const {
    calls,
    loading,
    error,
    pagination,
    refreshCalls,
    loadCall,
    searchCalls,
    filterCalls
  } = useCalls();

  // Load calls on component mount
  useEffect(() => {
    refreshCalls();
  }, [refreshCalls]);

  if (loading) return <div>Loading calls...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {calls.map(call => (
        <div key={call.id}>{call.phoneNumber}</div>
      ))}
    </div>
  );
}
```

### Pagination

```typescript
function CallsWithPagination() {
  const {
    calls,
    pagination,
    loadCallsWithPagination,
    loadNextPage,
    loadPreviousPage
  } = useCalls();

  const handleNextPage = () => {
    if (pagination?.hasMore) {
      loadNextPage(pagination.currentPage);
    }
  };

  const handlePreviousPage = () => {
    if (pagination && pagination.currentPage > 1) {
      loadPreviousPage(pagination.currentPage);
    }
  };

  return (
    <div>
      {/* Render calls */}
      {calls.map(call => <CallItem key={call.id} call={call} />)}
      
      {/* Pagination controls */}
      <div>
        <button 
          onClick={handlePreviousPage}
          disabled={!pagination || pagination.currentPage === 1}
        >
          Previous
        </button>
        <span>
          Page {pagination?.currentPage} of {pagination?.totalPages}
        </span>
        <button 
          onClick={handleNextPage}
          disabled={!pagination?.hasMore}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Search Functionality

```typescript
function CallSearch() {
  const { searchCalls, searchResults, searching } = useCalls();
  const [query, setQuery] = useState('');

  const handleSearch = async () => {
    if (query.trim()) {
      await searchCalls(query, { limit: 20, offset: 0 });
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search calls..."
      />
      <button onClick={handleSearch} disabled={searching}>
        {searching ? 'Searching...' : 'Search'}
      </button>
      
      {searchResults && (
        <div>
          <p>Found {searchResults.pagination.total} results</p>
          {searchResults.results.map(call => (
            <CallItem key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Advanced Filtering

```typescript
function CallFilters() {
  const { filterCalls, calls, loading } = useCalls();

  const handleFilter = async () => {
    await filterCalls({
      status: 'completed',
      hasTranscript: true,
      minDuration: 2,
      startDate: new Date('2024-01-01'),
      endDate: new Date(),
      leadTag: 'Hot'
    }, {
      sortBy: 'created_at',
      sortOrder: 'DESC',
      limit: 50
    });
  };

  return (
    <div>
      <button onClick={handleFilter} disabled={loading}>
        Apply Filters
      </button>
      {/* Render filtered calls */}
    </div>
  );
}
```

## API Reference

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `calls` | `Call[]` | Array of call records |
| `currentCall` | `Call \| null` | Currently selected call details |
| `transcript` | `Transcript \| null` | Transcript for current call |
| `statistics` | `CallStatistics \| null` | Call statistics data |
| `searchResults` | `CallSearchResult \| null` | Search results |
| `transcriptSearchResults` | `TranscriptSearchResult \| null` | Transcript search results |
| `loading` | `boolean` | General loading state |
| `loadingCall` | `boolean` | Loading state for individual call |
| `loadingTranscript` | `boolean` | Loading state for transcript |
| `loadingStats` | `boolean` | Loading state for statistics |
| `searching` | `boolean` | Loading state for search operations |
| `error` | `string \| null` | Error message if any |
| `pagination` | `PaginationInfo \| null` | Pagination information |

### Action Functions

#### `refreshCalls(options?: CallListOptions)`
Loads calls from the API with optional sorting and pagination.

**Parameters:**
- `options.limit` - Number of calls to fetch (default: 20)
- `options.offset` - Number of calls to skip (default: 0)
- `options.sortBy` - Field to sort by ('created_at', 'duration_minutes', etc.)
- `options.sortOrder` - Sort direction ('ASC' or 'DESC')

#### `loadCall(id: string): Promise<Call | null>`
Loads detailed information for a specific call.

#### `loadTranscript(callId: string): Promise<Transcript | null>`
Loads the transcript for a specific call.

#### `loadStatistics(period?: 'day' | 'week' | 'month')`
Loads call statistics for the specified time period.

#### `searchCalls(query: string, options?: CallSearchOptions): Promise<CallSearchResult | null>`
Searches calls by query string with pagination support.

#### `searchTranscripts(query: string, options?: CallSearchOptions): Promise<TranscriptSearchResult | null>`
Searches within call transcripts.

#### `filterCalls(filters: CallFilters, options?: CallListOptions)`
Filters calls by multiple criteria using backend filtering.

**Filter Options:**
- `search` - General search term
- `status` - Call status ('completed', 'failed', etc.)
- `agentId` - Filter by specific agent
- `phoneNumber` - Filter by phone number
- `startDate` / `endDate` - Date range filter
- `minDuration` / `maxDuration` - Duration range filter
- `hasTranscript` - Filter calls with/without transcripts
- `hasAnalytics` - Filter calls with/without analytics
- `minScore` / `maxScore` - Lead score range filter
- `leadStatus` - Filter by lead status
- `leadTag` - Filter by lead tag ('Hot', 'Warm', 'Cold')

#### `getRecentCalls(limit?: number)`
Loads the most recent calls (default: 10).

#### `loadCallsWithPagination(page?: number, limit?: number, sortBy?: string, sortOrder?: 'ASC' | 'DESC')`
Loads calls for a specific page with explicit pagination parameters.

#### `loadNextPage(currentPage: number, limit?: number)`
Loads the next page of calls.

#### `loadPreviousPage(currentPage: number, limit?: number)`
Loads the previous page of calls.

#### Utility Functions

- `clearCurrentCall()` - Clears current call and transcript
- `clearSearchResults()` - Clears search results
- `clearError()` - Clears error state

## Backend Integration

The hook integrates with the following backend endpoints:

- `GET /api/calls` - List calls with filtering and pagination
- `GET /api/calls/:id` - Get specific call details
- `GET /api/calls/:id/transcript` - Get call transcript
- `GET /api/calls/stats` - Get call statistics
- `GET /api/calls/recent` - Get recent calls
- `GET /api/calls/search` - Search calls
- `GET /api/calls/search/transcripts` - Search transcripts

All requests include proper authentication headers and error handling.

## Error Handling

The hook provides comprehensive error handling:

- **Network Errors**: Connection failures, timeouts
- **Authentication Errors**: Invalid/expired tokens (redirects to login)
- **Not Found Errors**: Requested data not found
- **Server Errors**: 5xx status codes
- **Validation Errors**: Invalid request parameters

Errors are mapped to user-friendly messages and stored in the `error` state.

## Requirements Fulfilled

This implementation fulfills the following requirements from the spec:

- **4.1**: Fetch call records from `/api/calls` with pagination support ✅
- **4.2**: Implement call details and transcript fetching ✅
- **4.3**: Handle call search functionality ✅
- **4.6**: Support for call filtering and search operations ✅

## Performance Considerations

- Uses backend pagination to avoid loading large datasets
- Implements proper loading states to improve UX
- Caches pagination information to reduce API calls
- Provides granular loading states for different operations
- Handles errors gracefully without breaking the UI