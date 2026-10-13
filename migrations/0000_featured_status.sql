-- Admin-managed featured status, kept separate from paid business Premium.
-- Apply this file through the project's normal database migration workflow;
-- this change was intentionally not applied to any database.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

ALTER TABLE spare_parts
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

ALTER TABLE garage_services
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

ALTER TABLE support_services
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
