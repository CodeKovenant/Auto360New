-- Optional business website URL, matching shared/schema.ts.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS website text;
