BEGIN;
CREATE TABLE admin_accounts(username text PRIMARY KEY, password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('owner','catalog','shipping','manufacturing','wholesale','finance','auditor')), enabled boolean NOT NULL DEFAULT true);
CREATE TABLE admin_audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor text NOT NULL, route text NOT NULL, method text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE auth_attempts(scope text NOT NULL, bucket text NOT NULL, window_start timestamptz NOT NULL, attempts integer NOT NULL, PRIMARY KEY(scope,bucket));
CREATE INDEX admin_audit_date ON admin_audit(created_at DESC);
COMMIT;
