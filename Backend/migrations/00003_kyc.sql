-- File: Backend/migrations/00003_kyc.sql
-- +goose Up
CREATE TABLE kyc_verifications (
  user_id        TEXT        PRIMARY KEY,
  email          TEXT        NOT NULL, -- the email linked to the Aadhaar; the OTP goes here
  aadhaar_hash   TEXT        NOT NULL, -- HMAC of the 12 digits. The raw number is never stored.
  aadhaar_last4  TEXT        NOT NULL, -- for display only
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified')),
  otp_hash       TEXT        NOT NULL,
  otp_expires_at TIMESTAMPTZ NOT NULL,
  otp_attempts   SMALLINT    NOT NULL DEFAULT 0,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One real person, one account. Only VERIFIED rows count, so nobody can block
-- someone else's Aadhaar just by typing it in without finishing the OTP.
CREATE UNIQUE INDEX kyc_verified_aadhaar_idx ON kyc_verifications (aadhaar_hash) WHERE status = 'verified';

CREATE TRIGGER kyc_verifications_updated_at
  BEFORE UPDATE ON kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose Down
DROP TABLE kyc_verifications;
