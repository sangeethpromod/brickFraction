# 12. Onboarding: design and tables

Until now every new user became an `investor` on their first `/me` call. That is too loose. From this lesson on:

- **Investor** = signs up, passes a (simulated) KYC, then gets the `investor` role and can log in to the dashboard.
- **Issuer** = signs up, submits company details, waits. A `platform_admin` approves, and only then does the user get the `issuer` role.

Time: about 30 minutes. This lesson changes one existing behaviour and adds two tables. No new endpoints yet.

> Demo disclaimer: the KYC here is a simulation. We never call UIDAI. An emailed OTP proves the user can read an inbox, not who they are.

## 1. The two flows

```text
INVESTOR
  sign up (Better Auth) -> /onboarding -> "I'm an investor"
    -> enter Aadhaar number + the email linked to it
    -> Go stores a HASH of the Aadhaar, emails a 6-digit OTP to that email
    -> user types the OTP -> Go marks KYC verified AND grants role "investor"
    -> redirect to /investor

ISSUER
  sign up (Better Auth) -> /onboarding -> "Apply as an issuer"
    -> submit company name, registration number, phone  (row: status = pending)
    -> user sees "under review" and can come back any time
    -> platform_admin opens "Issuer applications", clicks Approve
    -> Go grants role "issuer" and marks the row approved
    -> user's next login lands on /issuer-admin
```

The rule that ties both together: **a role is granted only by the event that earns it** (OTP verified, admin approved). The signed-in-but-no-role state means "still onboarding".

## 2. What changes in existing code

### 2.1 `Me` stops handing out `investor`

Open `Backend/internal/modules/identity/service.go`. Replace the whole `Me` method (and its comment) with:

```go
// Me returns the caller's roles. A user who has not finished onboarding has none, and that is fine.
func (s *Service) Me(ctx context.Context, userID string) (UserRoles, error) {
	roles, err := s.RolesFor(ctx, userID)
	if err != nil {
		return UserRoles{}, err
	}
	return UserRoles{UserID: userID, Roles: roles}, nil
}
```

`RolesFor` already returns `[]` and never `nil`, so JSON still shows `"roles": []`.

### 2.2 Fix the identity test

In `Backend/internal/modules/identity/service_test.go`, inside `TestServiceMe`:

1. Replace the first case with:

```go
		{
			name:      "new user has no roles and nothing is granted",
			repo:      newFakeRepo(nil),
			wantRoles: []string{},
		},
```

2. Delete the last case, `"provisioning error is returned"`. `Me` no longer provisions, so it cannot fail that way.

Run it:

```bash
cd Backend
go test ./internal/modules/identity/...
```

### 2.3 A new secret: `KYC_HASH_KEY`

We never store the Aadhaar number. We store an HMAC of it. A plain SHA-256 of a 12-digit number can be brute-forced in seconds; an HMAC with a secret key cannot, unless the key leaks.

Add one line to `Backend/.env.local`:

```text
KYC_HASH_KEY=put-a-long-random-string-here
```

Generate a good value with `openssl rand -hex 32`. Never commit it. Add the same name, with an empty value, to `Backend/.env.example` if you have one.

In `Backend/internal/config/config.go`:

1. Add a field to `Config`, under `AuthIssuer`:

```go
	KYCHashKey        string // secret key for hashing Aadhaar numbers and OTPs
```

2. Add a line inside the `cfg := Config{...}` literal, under `AuthIssuer`:

```go
		KYCHashKey:        require("KYC_HASH_KEY"),
```

In `config_test.go`, add `"KYC_HASH_KEY"` to the `allKeys` slice, and add `"KYC_HASH_KEY": "test-key",` to the `required` map. Run `go test ./internal/config/...`.

## 3. The tables

Two goose migrations. Same style as `00002_roles.sql`: no foreign key to `user_id`, because users live in Better Auth's `auth` schema.

### 3.1 `00003_kyc.sql`

```sql
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
```

`set_updated_at()` is the helper from `00001_helpers.sql`. That is why it exists.

### 3.2 `00004_issuer_applications.sql`

```sql
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
```

### 3.3 Run them

goose does not read `.env.local`, so load it into your shell first. Use the **unpooled** string (no `-pooler`) for migrations:

```bash
cd Backend
set -a; . ./.env.local; set +a        # exports every variable in the file
goose -dir migrations postgres "$DATABASE_URL_UNPOOLED" up
goose -dir migrations postgres "$DATABASE_URL_UNPOOLED" status
```

`status` must list `00003_kyc.sql` and `00004_issuer_applications.sql` as applied.

## 4. Why these choices

| Choice | Reason |
|---|---|
| Hash, not encrypt, the Aadhaar | We never need the number back. We only need "have I seen this one before". |
| `WHERE status = 'verified'` unique index | Uniqueness must punish only completed verifications. |
| Partial unique index on open applications | The database, not the code, guarantees "one open application per user", even under two simultaneous requests. |
| OTP attempts counter in the table | Lets Go cap guesses even if the server restarts. |
| `status` as `TEXT` + `CHECK` | Easier to change than a Postgres `ENUM`. |

## Common errors

- goose prints its whole usage text: it received an empty connection string, because the variable was not exported in your shell. Run the `set -a; . ./.env.local; set +a` line above in the same terminal, then retry.
- Comment lines in `.env.local` must start with `#`, not `//`.

- `function set_updated_at() does not exist`: migration `00001` was not applied. Run `status`.
- `function gen_random_uuid() does not exist`: your Postgres is older than 13. Neon is not; check the project's Postgres version.
- `go test` for identity fails with `assign calls = [...]`: you forgot to delete the "provisioning" case or change the first one.

## Checkpoint

- [ ] `go test ./internal/modules/identity/... ./internal/config/...` passes.
- [ ] `goose status` shows 00003 and 00004 applied.
- [ ] In the Neon console, `kyc_verifications` and `issuer_applications` exist in the `public` schema.
- [ ] I can explain why `Me` no longer grants `investor`.
- [ ] `KYC_HASH_KEY` is in `.env.local` and not in git.

**Existing dev accounts:** any user who already called `/me` still holds the `investor` role from the old behaviour and will skip KYC. For clean testing, delete their row: `DELETE FROM user_roles WHERE user_id = '<id>';`.

Next: [13-kyc-module-go.md](13-kyc-module-go.md)
