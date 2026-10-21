-- Premium is admin-managed; new businesses must start inactive.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS premium boolean NOT NULL DEFAULT false;
ALTER TABLE businesses
  ALTER COLUMN premium TYPE boolean USING COALESCE(premium::text::boolean, false),
  ALTER COLUMN premium SET DEFAULT false,
  ALTER COLUMN premium SET NOT NULL;
