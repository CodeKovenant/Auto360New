-- Keep car listings' admin-managed Featured status aligned with the schema.
ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
