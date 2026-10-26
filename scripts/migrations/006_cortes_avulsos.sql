ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'booking' CHECK(source IN ('booking','walk_in'));
ALTER TABLE appointments ADD CONSTRAINT walk_in_completed CHECK(source <> 'walk_in' OR (status='completed' AND consent=false));
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_overlap;
ALTER TABLE appointments ADD CONSTRAINT no_overlap EXCLUDE USING gist(professional_id WITH =,tstzrange(starts_at,ends_at,'[)') WITH &&) WHERE (source='booking' AND status IN ('scheduled','confirmed','in_progress','completed'));
CREATE OR REPLACE FUNCTION sync_appointment_slot() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.source='booking' AND NEW.status IN ('scheduled','confirmed','in_progress','completed') THEN
 INSERT INTO resource_slots(tenant_id,professional_id,starts_at,ends_at,appointment_id) VALUES(NEW.tenant_id,NEW.professional_id,NEW.starts_at,NEW.ends_at,NEW.id) ON CONFLICT(appointment_id) DO UPDATE SET professional_id=excluded.professional_id,starts_at=excluded.starts_at,ends_at=excluded.ends_at;
 ELSE DELETE FROM resource_slots WHERE appointment_id=NEW.id; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS appointment_resource ON appointments;
CREATE TRIGGER appointment_resource AFTER INSERT OR UPDATE OF professional_id,starts_at,ends_at,status,source ON appointments FOR EACH ROW EXECUTE FUNCTION sync_appointment_slot();
