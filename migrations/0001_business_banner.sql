-- The business listing endpoints select the full businesses row, including banner.
-- Some existing databases predate this column, causing those endpoints (and
-- the featured category sliders that consume them) to fail with a 500.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS banner text;
