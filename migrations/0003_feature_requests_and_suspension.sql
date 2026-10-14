ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

ALTER TABLE spare_parts
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

ALTER TABLE garage_services
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

ALTER TABLE support_services
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  CREATE TYPE feature_request_item_type AS ENUM ('business', 'car', 'part', 'garage_service', 'support_service');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feature_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS feature_requests (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id varchar NOT NULL REFERENCES users(id),
  item_type feature_request_item_type NOT NULL,
  item_id varchar NOT NULL,
  status feature_request_status NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT NOW(),
  reviewed_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS feature_requests_pending_item_idx
  ON feature_requests (item_type, item_id)
  WHERE status = 'pending';
