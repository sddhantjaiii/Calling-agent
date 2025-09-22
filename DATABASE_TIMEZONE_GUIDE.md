# Database Timezone Configuration Guide

## Overview
This guide covers different levels of timezone configuration for PostgreSQL databases, specifically for ensuring Indian Standard Time (IST) handling.

## Timezone Configuration Levels

### 1. Session-Level Timezone (✅ IMPLEMENTED)
**What it does**: Sets timezone for the current database connection session.
**Scope**: Affects only the specific connection.
**Implementation**: Already configured in `connectionPoolService.ts`

```sql
SET TIME ZONE 'Asia/Kolkata';
```

**Pros**:
- Immediate effect
- No database-wide changes
- Works with connection pooling
- Granular control per application

**Cons**:
- Must be set for each connection
- Application-dependent

### 2. Role-Level Timezone
**What it does**: Sets default timezone for a specific database user/role.
**Scope**: Affects all connections made by that user.

```sql
-- Set for your database user
ALTER ROLE your_username SET timezone = 'Asia/Kolkata';

-- Or for your specific database user
ALTER USER neondb_owner SET timezone = 'Asia/Kolkata';
```

**Pros**:
- Automatic for all connections by that user
- Persists across reconnections
- No application code changes needed

**Cons**:
- Affects all applications using that user
- Requires database admin privileges

### 3. Database-Level Timezone
**What it does**: Sets default timezone for the entire database.
**Scope**: Affects all users and connections to that database.

```sql
-- Correct syntax (your previous attempt had a typo)
ALTER DATABASE neondb SET timezone = 'Asia/Kolkata';

-- Verify the setting
SHOW timezone;
SELECT current_setting('timezone');
```

**Important**: After setting database-level timezone, you need to **reconnect** for the change to take effect in existing sessions.

**Pros**:
- Database-wide consistency
- No application changes needed
- Default for all new connections

**Cons**:
- Affects all applications using the database
- Requires database admin privileges
- May impact other services

### 4. Server-Level Timezone
**What it does**: Sets timezone for the entire PostgreSQL server.
**Scope**: Affects all databases on the server.
**Note**: Usually not available in managed services like Neon.

## Current Implementation Status

### ✅ What's Already Working
1. **Session-level timezone**: All database connections set to `Asia/Kolkata`
2. **Application-level timezone**: Node.js process timezone set to IST
3. **Query-level timezone**: Analytics queries use `AT TIME ZONE 'Asia/Kolkata'`

### 🔄 What You Can Optionally Add

#### Option A: Role-Level Setting (Recommended)
```sql
-- Connect to your database and run:
ALTER ROLE neondb_owner SET timezone = 'Asia/Kolkata';

-- Verify:
SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'neondb_owner';
```

#### Option B: Database-Level Setting
```sql
-- Connect to your database and run:
ALTER DATABASE neondb SET timezone = 'Asia/Kolkata';

-- Then reconnect and verify:
SHOW timezone;
```

## Understanding TIMESTAMP vs TIMESTAMPTZ

### TIMESTAMP WITH TIME ZONE (TIMESTAMPTZ)
- **Storage**: Always stored in UTC
- **Display**: Shown in session's timezone
- **Behavior**: `created_at AT TIME ZONE 'Asia/Kolkata'` converts to IST for display/comparison

### TIMESTAMP WITHOUT TIME ZONE
- **Storage**: Stored as-is (no timezone info)
- **Display**: Shown as-is
- **Behavior**: Assumes session timezone for interpretation

## Your Current Schema
Based on the code review, your `calls` table uses:
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
completed_at TIMESTAMP WITH TIME ZONE
```

This is **correct** because:
1. Data is stored in UTC (consistent)
2. Session timezone converts CURRENT_TIMESTAMP to proper IST
3. Queries can convert to IST for filtering/display

## Verification Commands

```sql
-- Check current timezone
SHOW timezone;

-- Check what NOW() returns
SELECT NOW(), NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'Asia/Kolkata';

-- Check database/role settings
SELECT name, setting FROM pg_settings WHERE name = 'timezone';
SELECT rolname, rolconfig FROM pg_roles WHERE rolname = current_user;

-- Test timestamp insertion
INSERT INTO calls (user_id, status) VALUES ('test', 'pending') RETURNING created_at;
```

## Recommendation

**Stick with your current implementation** because:
1. ✅ Session-level timezone is already working
2. ✅ Application-level timezone is set
3. ✅ Query-level timezone conversion is implemented
4. ✅ This approach is most portable and explicit

**Optional enhancement**: Add role-level timezone for additional consistency:
```sql
ALTER ROLE neondb_owner SET timezone = 'Asia/Kolkata';
```

This provides a safety net if session-level setting ever fails, but your current implementation is already robust and working correctly.