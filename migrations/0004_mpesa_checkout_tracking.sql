DO $$ BEGIN
  CREATE TYPE mpesa_payment_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS mpesa_payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id varchar NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  checkout_request_id text NOT NULL UNIQUE,
  amount integer NOT NULL,
  status mpesa_payment_status NOT NULL DEFAULT 'pending',
  receipt_number text,
  created_at timestamp NOT NULL DEFAULT NOW(),
  completed_at timestamp
);
