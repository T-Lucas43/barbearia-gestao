ALTER TABLE memberships ADD COLUMN read_only boolean NOT NULL DEFAULT false;
ALTER TABLE appointments ADD COLUMN demo_reference text;
CREATE UNIQUE INDEX demo_appointments_unique ON appointments(demo_reference) WHERE demo_reference IS NOT NULL;
ALTER TABLE expenses ADD COLUMN demo_reference text;
CREATE UNIQUE INDEX demo_expenses_unique ON expenses(demo_reference) WHERE demo_reference IS NOT NULL;
