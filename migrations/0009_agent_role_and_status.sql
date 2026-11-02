ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'agent';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS agent_id text,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS passport_photo_url text,
  ADD COLUMN IF NOT EXISTS referee_name text,
  ADD COLUMN IF NOT EXISTS referee_phone text,
  ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'approved';

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS registered_by text NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS registered_by_agent_id text;

UPDATE users
SET status = 'approved'
WHERE status IS NULL OR status = '';
