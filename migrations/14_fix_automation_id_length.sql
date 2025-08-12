-- Fix automation_runs id column length and related references

ALTER TABLE automation_logs DROP CONSTRAINT IF EXISTS automation_logs_run_id_fkey;
ALTER TABLE automation_runs ALTER COLUMN id TYPE VARCHAR(30);
ALTER TABLE automation_logs ALTER COLUMN run_id TYPE VARCHAR(30);
ALTER TABLE automation_logs ADD CONSTRAINT automation_logs_run_id_fkey FOREIGN KEY (run_id) REFERENCES automation_runs(id) ON DELETE CASCADE;
