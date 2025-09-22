# Vercel Timezone Configuration Guide

## Issue
Your Vercel deployment at https://calling-agent-947f.vercel.app/api/dashboard/analytics is showing data for September 21st instead of September 22nd because Vercel defaults to UTC timezone.

## Solution

### 1. Set Vercel Environment Variable
Go to your Vercel project dashboard:
1. Navigate to your project → **Settings** → **Environment Variables**
2. Add the following environment variable:
   ```
   Key: APP_TIMEZONE
   Value: Asia/Kolkata
   ```
   **Note**: `TZ` is a reserved environment variable in Vercel, so we use `APP_TIMEZONE` instead.
3. Apply to **Production**, **Preview**, and **Development** environments
4. **Redeploy** your application after adding the environment variable

### 2. Code Changes Made

#### Backend Timezone Initialization (`backend/src/server.ts`)
```typescript
// Set timezone for the Node.js process - critical for Vercel deployment
// This ensures all Date operations use IST instead of UTC
// Use APP_TIMEZONE for Vercel (TZ is reserved), fallback to TZ for local development
const timezone = process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Kolkata';
process.env.TZ = timezone;
logger.info(`Application timezone set to: ${timezone}`);
console.log(`🌍 Application timezone set to: ${timezone}`);
```

#### Vercel Configuration (`backend/vercel.json`)
```json
{
  "env": {
    "APP_TIMEZONE": "Asia/Kolkata"
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

1. **Process-level timezone**: `process.env.TZ = timezone` ensures all JavaScript Date operations use IST
2. **Custom environment variable**: `APP_TIMEZONE` bypasses Vercel's TZ restriction
3. **Fallback logic**: Works with both Vercel (`APP_TIMEZONE`) and local development (`TZ`)
4. **Database queries**: `AT TIME ZONE 'Asia/Kolkata'` converts UTC timestamps to IST for date filtering
5. **Vercel environment**: The APP_TIMEZONE environment variable is automatically applied to all serverless functions

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

If the APP_TIMEZONE environment variable doesn't work in Vercel, you can also set it programmatically:
```typescript
// In server.ts, before any other imports
process.env.TZ = 'Asia/Kolkata';
```

This ensures the timezone is set before any Date operations occur.

## Important Notes

1. **Use APP_TIMEZONE, not TZ**: Vercel reserves the TZ environment variable, so use APP_TIMEZONE instead
2. **Redeploy Required**: You must redeploy your Vercel application after adding the APP_TIMEZONE environment variable
3. **Database Timezone**: The database session timezone is already set to Asia/Kolkata in your connection pool
4. **Caching**: If you have any cached analytics data, it may take time to refresh with the new timezone-aware queries

## Testing

You can test the timezone locally by setting the environment variable:
```bash
# Windows PowerShell
$env:APP_TIMEZONE = "Asia/Kolkata"
npm run dev

# Windows CMD
set APP_TIMEZONE=Asia/Kolkata && npm run dev

# Linux/Mac
APP_TIMEZONE=Asia/Kolkata npm run dev

# Or use the traditional TZ variable for local development
TZ=Asia/Kolkata npm run dev
```