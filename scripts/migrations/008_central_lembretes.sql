CREATE UNIQUE INDEX IF NOT EXISTS appointments_id_tenant ON appointments(id,tenant_id);
CREATE TABLE IF NOT EXISTS manual_reminder_tasks(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id text NOT NULL REFERENCES tenants,
 appointment_id uuid NOT NULL,
 schedule_version integer NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','opened','done')),
 requested_by text,
 requested_at timestamptz,
 opened_by text,
 opened_at timestamptz,
 done_by text,
 done_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(appointment_id,tenant_id) REFERENCES appointments(id,tenant_id) ON DELETE CASCADE,
 UNIQUE(appointment_id,schedule_version)
);
CREATE INDEX IF NOT EXISTS manual_reminder_tenant_state ON manual_reminder_tasks(tenant_id,state);
