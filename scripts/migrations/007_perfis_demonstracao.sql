ALTER TABLE memberships ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
