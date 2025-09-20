// Test the buildQueryString function fix
const buildQueryString = (params) => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, v.toString()));
      } else if (value instanceof Date) {
        queryParams.append(key, value.toISOString());
      } else if (typeof value === 'object' && value !== null) {
        // Handle complex objects like DateRange
        if ('from' in value && 'to' in value) {
          // Handle DateRange with from/to properties
          const dateRange = value;
          queryParams.append(`${key}From`, dateRange.from.toISOString());
          queryParams.append(`${key}To`, dateRange.to.toISOString());
        } else if ('start' in value && 'end' in value) {
          // Handle DateRange with start/end properties
          const dateRange = value;
          queryParams.append(`${key}Start`, dateRange.start.toISOString());
          queryParams.append(`${key}End`, dateRange.end.toISOString());
        } else {
          // For other objects, serialize as JSON
          queryParams.append(key, JSON.stringify(value));
        }
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });
  
  return queryParams.toString();
};

// Test the old problematic case
const oldProblematicFilters = {
  dateRange: {
    from: new Date('2024-01-01'),
    to: new Date('2024-01-31')
  }
};

console.log('Old format (from/to):');
console.log(buildQueryString(oldProblematicFilters));

// Test the new format
const newFilters = {
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  }
};

console.log('\nNew format (start/end):');
console.log(buildQueryString(newFilters));

// Test other parameters
const mixedFilters = {
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31')
  },
  userTier: 'pro',
  agentType: 'sales',
  page: 1,
  limit: 50
};

console.log('\nMixed parameters:');
console.log(buildQueryString(mixedFilters));