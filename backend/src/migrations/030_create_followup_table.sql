-- Migration: Create follow_ups table for manual follow-up scheduling
-- This table stores user-scheduled follow-ups with dates and remarks

CREATE TABLE follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_phone VARCHAR(20) NOT NULL, -- Phone number to identify the lead
    lead_email VARCHAR(255), -- Optional email for additional identification
    lead_name VARCHAR(255), -- Lead name for display
    follow_up_date DATE NOT NULL, -- Date for follow-up (no time)
    remark TEXT, -- User's remark/note for the follow-up
    is_completed BOOLEAN DEFAULT FALSE, -- Track if follow-up is completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE, -- When follow-up was marked complete
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_follow_ups_user_id ON follow_ups(user_id);
CREATE INDEX idx_follow_ups_lead_phone ON follow_ups(lead_phone);
CREATE INDEX idx_follow_ups_lead_email ON follow_ups(lead_email);
CREATE INDEX idx_follow_ups_follow_up_date ON follow_ups(follow_up_date);
CREATE INDEX idx_follow_ups_is_completed ON follow_ups(is_completed);

-- Create composite index for lead identification
CREATE INDEX idx_follow_ups_lead_identification ON follow_ups(user_id, lead_phone, lead_email);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_follow_ups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_follow_ups_updated_at
    BEFORE UPDATE ON follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_follow_ups_updated_at();

-- Add comments to document the table
COMMENT ON TABLE follow_ups IS 'User-scheduled follow-ups for leads with dates and remarks';
COMMENT ON COLUMN follow_ups.lead_phone IS 'Phone number to identify and group leads';
COMMENT ON COLUMN follow_ups.lead_email IS 'Email address for additional lead identification';
COMMENT ON COLUMN follow_ups.follow_up_date IS 'Date for follow-up (date only, no time)';
COMMENT ON COLUMN follow_ups.remark IS 'User notes/remarks for the follow-up';
COMMENT ON COLUMN follow_ups.is_completed IS 'Whether the follow-up has been completed';