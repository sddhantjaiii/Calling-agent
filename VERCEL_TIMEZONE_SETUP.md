# Vercel Timezone Configuration Guide

## Issue
Your Vercel deployment at https://calling-agent-947f.vercel.app/api/dashboard/analytics is showing data for September 21st instead of September 22nd because Vercel defaults to UTC timezone.

## Solution

### 1. Set Vercel Environment Variable
Go to your Vercel project dashboard:
1. Navigate to your project → **Settings** → **Environment Variables**
2. Add the following environment variable:
   ```
   Key: TZ
   Value: Asia/Kolkata
   ```
3. Apply to **Production**, **Preview**, and **Development** environments
4. **Redeploy** your application after adding the environment variable

### 2. Code Changes Made

#### Backend Timezone Initialization (`backend/src/server.ts`)
```typescript
// Set timezone for the Node.js process - critical for Vercel deployment
// This ensures all Date operations use IST instead of UTC
process.env.TZ = process.env.TZ || 'Asia/Kolkata';
logger.info(`Application timezone set to: ${process.env.TZ}`);
console.log(`🌍 Application timezone set to: ${process.env.TZ}`);
```

#### Vercel Configuration (`backend/vercel.json`)
```json
{
  "env": {
    "TZ": "Asia/Kolkata"
  },
  "functions": {
    "src/server.ts": {
      "maxDuration": 30
    }
  }
}
```

#### Database Query Updates
Updated all analytics queries to use timezone-aware date calculations:
- Changed `CURRENT_DATE` to `(NOW() AT TIME ZONE 'Asia/Kolkata')::date`
- Changed `DATE(c.created_at)` to `DATE(c.created_at AT TIME ZONE 'Asia/Kolkata')`
- Updated all date range filters in:
  - `getOptimizedLeadsOverTime()`
  - `getOptimizedInteractionsOverTime()`
  - `getAggregatedStats()`
  - `getOptimizedAgentPerformance()`
  - `getWeeklySuccessRates()`
  - `getEnhancedCTAMetrics()`
  - `getCompanyLeadBreakdown()`

### 3. How This Fixes the Issue

1. **Process-level timezone**: `process.env.TZ = 'Asia/Kolkata'` ensures all JavaScript Date operations use IST
2. **Database queries**: `AT TIME ZONE 'Asia/Kolkata'` converts UTC timestamps to IST for date filtering
3. **Vercel environment**: The TZ environment variable is automatically applied to all serverless functions

### 4. Verification Steps

After redeployment:
1. Check the API: https://calling-agent-947f.vercel.app/api/dashboard/analytics
2. Verify the data shows September 22nd instead of September 21st
3. Check server logs for the timezone confirmation message

### 5. Additional Benefits

- All new database records will be created with IST timestamps (due to session timezone setting)
- Dashboard analytics will show "today" based on IST instead of UTC
- Consistent timezone handling across all backend operations

### 6. Alternative Approach (If Environment Variable Doesn't Work)

If the TZ environment variable doesn't work in Vercel, you can also set it programmatically:
```typescript
// In server.ts, before any other imports
process.env.TZ = 'Asia/Kolkata';
```

This ensures the timezone is set before any Date operations occur.

## Important Notes

1. **Redeploy Required**: You must redeploy your Vercel application after adding the TZ environment variable
2. **Database Timezone**: The database session timezone is already set to Asia/Kolkata in your connection pool
3. **Caching**: If you have any cached analytics data, it may take time to refresh with the new timezone-aware queries

## Testing

You can test the timezone locally by setting the environment variable:
```bash
# Windows PowerShell
$env:TZ = "Asia/Kolkata"
npm run dev

# Windows CMD
set TZ=Asia/Kolkata && npm run dev

# Linux/Mac
TZ=Asia/Kolkata npm run dev
```