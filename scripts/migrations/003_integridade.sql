ALTER TABLE working_schedules ADD CONSTRAINT complete_break CHECK((break_start IS NULL)=(break_end IS NULL));
CREATE UNIQUE INDEX appointments_tenant_key ON appointments(id,tenant_id);
ALTER TABLE payments ADD CONSTRAINT payments_same_tenant FOREIGN KEY(appointment_id,tenant_id) REFERENCES appointments(id,tenant_id);
CREATE UNIQUE INDEX cash_tenant_key ON cash_sessions(id,tenant_id);
ALTER TABLE cash_movements ADD CONSTRAINT movements_same_tenant FOREIGN KEY(session_id,tenant_id) REFERENCES cash_sessions(id,tenant_id);
ALTER TABLE audit_log ADD COLUMN actor_user_id text DEFAULT nullif(current_setting('app.user_id',true),'');
