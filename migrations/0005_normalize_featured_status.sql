-- Normalize legacy Featured columns so every feature surface reads real booleans.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE businesses
  ALTER COLUMN featured TYPE boolean USING COALESCE(featured::text::boolean, false),
  ALTER COLUMN featured SET DEFAULT false,
  ALTER COLUMN featured SET NOT NULL;

ALTER TABLE cars
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE cars
  ALTER COLUMN featured TYPE boolean USING COALESCE(featured::text::boolean, false),
  ALTER COLUMN featured SET DEFAULT false,
  ALTER COLUMN featured SET NOT NULL;

ALTER TABLE spare_parts
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE spare_parts
  ALTER COLUMN featured TYPE boolean USING COALESCE(featured::text::boolean, false),
  ALTER COLUMN featured SET DEFAULT false,
  ALTER COLUMN featured SET NOT NULL;

ALTER TABLE garage_services
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE garage_services
  ALTER COLUMN featured TYPE boolean USING COALESCE(featured::text::boolean, false),
  ALTER COLUMN featured SET DEFAULT false,
  ALTER COLUMN featured SET NOT NULL;

ALTER TABLE support_services
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE support_services
  ALTER COLUMN featured TYPE boolean USING COALESCE(featured::text::boolean, false),
  ALTER COLUMN featured SET DEFAULT false,
  ALTER COLUMN featured SET NOT NULL;
