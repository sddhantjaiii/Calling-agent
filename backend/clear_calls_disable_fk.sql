-- Option 3: Temporarily disable foreign key constraints (advanced)
-- Use this if you want more control

-- Disable foreign key checks
SET session_replication_role = 'replica';

-- Truncate the calls table
TRUNCATE TABLE calls RESTART IDENTITY;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- Note: This only clears calls table, related data remains orphaned
