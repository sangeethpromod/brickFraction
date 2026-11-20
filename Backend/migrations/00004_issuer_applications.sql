-- File: Backend/migrations/00004_issuer_applications.sql
-- +goose Up
CREATE TABLE issuer_applications (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT        NOT NULL,
  company_name        TEXT        NOT NULL,
  registration_number TEXT        NOT NULL,
  contact_phone       TEXT        NOT NULL,
  description         TEXT        NOT NULL DEFAULT '',
  status              TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason    TEXT,
  reviewed_by         TEXT,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A user may have at most one open (pending or approved) application.
-- A rejected one does not count, so they can apply again.
CREATE UNIQUE INDEX issuer_applications_one_open_idx
  ON issuer_applications (user_id) WHERE status IN ('pending', 'approved');

-- The admin queue: "all pending, oldest first".
CREATE INDEX issuer_applications_queue_idx ON issuer_applications (status, created_at);

CREATE TRIGGER issuer_applications_updated_at
  BEFORE UPDATE ON issuer_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TABLE issuer_applications;
