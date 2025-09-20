BEGIN;

-- Normalize duplicate uniques on elevenlabs_conversation_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'calls'
      AND n.nspname = 'public'
      AND c.contype = 'u'
      AND c.conname = 'calls_elevenlabs_conversation_id_key'
  ) AND EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'calls'
      AND n.nspname = 'public'
      AND c.contype = 'u'
      AND c.conname = 'calls_elevenlabs_conversation_id_unique'
  ) THEN
    -- Drop the default-generated unique key to avoid duplication; keep *_unique
    ALTER TABLE public.calls DROP CONSTRAINT calls_elevenlabs_conversation_id_key;
  END IF;
END$$;

-- Ensure there is at least one UNIQUE on elevenlabs_conversation_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE t.relname = 'calls'
      AND n.nspname = 'public'
      AND c.contype = 'u'
      AND c.conname IN ('calls_elevenlabs_conversation_id_unique','calls_elevenlabs_conversation_id_key')
  ) THEN
    ALTER TABLE public.calls
      ADD CONSTRAINT calls_elevenlabs_conversation_id_unique UNIQUE (elevenlabs_conversation_id);
  END IF;
END$$;

COMMIT;
