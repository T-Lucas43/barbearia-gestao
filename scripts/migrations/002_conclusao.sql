ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_at timestamptz;
UPDATE appointments SET completed_at=starts_at WHERE status='completed' AND completed_at IS NULL;
