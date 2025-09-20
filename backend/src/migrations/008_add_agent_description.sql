-- Add description column to agents table
-- This migration adds support for agent descriptions

ALTER TABLE agents 
ADD COLUMN description TEXT;

-- Add index for description searches (optional, for future search functionality)
CREATE INDEX idx_agents_description ON agents USING gin(to_tsvector('english', description)) 
WHERE description IS NOT NULL;

-- Update existing agents to have empty description
UPDATE agents SET description = '' WHERE description IS NULL;