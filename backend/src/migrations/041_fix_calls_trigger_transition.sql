BEGIN;

-- Replace function to guard against duplicate increments on non-status updates
CREATE OR REPLACE FUNCTION trg_calls_daily_analytics()
RETURNS TRIGGER AS $$
DECLARE
    call_date DATE;
    status_changed BOOLEAN := (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status));
BEGIN
    -- Only act when:
    -- 1) INSERT of a completed/failed call, or
    -- 2) UPDATE where status changed to completed/failed
    IF (
         (TG_OP = 'INSERT' AND NEW.status IN ('completed','failed'))
         OR (status_changed AND NEW.status IN ('completed','failed'))
       ) THEN
        call_date := CAST(NEW.created_at AS DATE);

        IF NEW.status = 'completed' THEN
          INSERT INTO agent_analytics (agent_id, user_id, date, total_calls, successful_calls, failed_calls, total_duration_minutes, credits_used)
          VALUES (NEW.agent_id, NEW.user_id, call_date, 1, 1, 0, NEW.duration_minutes, NEW.credits_used)
          ON CONFLICT (agent_id, user_id, date)
          DO UPDATE SET
            total_calls = agent_analytics.total_calls + 1,
            successful_calls = agent_analytics.successful_calls + 1,
            total_duration_minutes = agent_analytics.total_duration_minutes + NEW.duration_minutes,
            credits_used = agent_analytics.credits_used + NEW.credits_used,
            updated_at = NOW();
        ELSIF NEW.status = 'failed' THEN
          INSERT INTO agent_analytics (agent_id, user_id, date, total_calls, successful_calls, failed_calls, total_duration_minutes, credits_used)
          VALUES (NEW.agent_id, NEW.user_id, call_date, 1, 0, 1, 0, 0)
          ON CONFLICT (agent_id, user_id, date)
          DO UPDATE SET
            total_calls = agent_analytics.total_calls + 1,
            failed_calls = agent_analytics.failed_calls + 1,
            updated_at = NOW();
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to be sensitive only to status updates (and still fire on insert)
DROP TRIGGER IF EXISTS trg_calls_daily_analytics ON calls;
CREATE TRIGGER trg_calls_daily_analytics
AFTER INSERT OR UPDATE OF status ON calls
FOR EACH ROW
EXECUTE FUNCTION trg_calls_daily_analytics();

COMMIT;


