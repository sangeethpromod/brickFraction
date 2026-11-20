# 13. KYC module (Go)

Build the investor KYC as a new module, in the same five-file shape as `identity`. Two endpoints:

| Method | Path | Does |
|---|---|---|
| POST | `/api/v1/kyc/start` | Takes Aadhaar + email, emails an OTP |
| POST | `/api/v1/kyc/verify` | Takes the OTP, grants the `investor` role |

Both need a valid token (they sit under the `Authenticate` group) but no role, because the caller has none yet.

Time: about 45 minutes. Type the files in this order.

```text
Backend/internal/modules/kyc/
  model.go        constants and errors
  repository.go   SQL
  mailer.go       how the OTP is delivered (demo: logs it)
  service.go      the rules
  controller.go   HTTP
  routes.go       Register
  service_test.go
```

Layering reminder from the README: `controller -> service -> repository`. KYC needs to grant a role, but it must not touch identity's repository. It receives something with a `GrantRole` method (an interface) and the router hands it `identity.Service`.

## 1. model.go

```go
// File: Backend/internal/modules/kyc/model.go
// Package kyc verifies investors: an Aadhaar number plus the email linked to it, confirmed by an emailed OTP.
// DEMO ONLY: nothing here calls UIDAI. It proves control of an inbox, not identity.
package kyc

import "errors"

// KYC states. "none" means no row exists yet.
const (
	StatusNone     = "none"
	StatusPending  = "pending"
	StatusVerified = "verified"
)

// StatusResponse is what both endpoints return on success.
type StatusResponse struct {
	Status string `json:"status"`
}

// Domain errors. The messages are safe to show to the user.
var (
	ErrInvalidAadhaar  = errors.New("aadhaar must be 12 digits")
	ErrInvalidEmail    = errors.New("enter a valid email address")
	ErrAlreadyVerified = errors.New("you are already verified")
	ErrAadhaarInUse    = errors.New("this aadhaar is already verified on another account")
	ErrNotFound        = errors.New("start verification first")
	ErrOTPInvalid      = errors.New("that code is not correct")
	ErrOTPExpired      = errors.New("that code has expired, request a new one")
	ErrTooManyAttempts = errors.New("too many wrong codes, request a new one")
)
```

## 2. repository.go

Four methods, each one SQL statement. Read the comments: three of them are written so the database makes the decision atomically, which avoids race conditions.

```go
// File: Backend/internal/modules/kyc/repository.go
package kyc

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// StartParams is everything stored when verification starts.
type StartParams struct {
	UserID       string
	Email        string
	AadhaarHash  string
	AadhaarLast4 string
	OTPHash      string
	ExpiresAt    time.Time
}

// Attempt is what the service needs to check one OTP guess. Count already includes this guess.
type Attempt struct {
	OTPHash   string
	ExpiresAt time.Time
	Count     int
}

// Repository is the storage the KYC service needs.
type Repository interface {
	// Status returns StatusNone, StatusPending or StatusVerified.
	Status(ctx context.Context, userID string) (string, error)
	// Start creates or restarts a pending verification. It returns ErrAlreadyVerified if the user is verified.
	Start(ctx context.Context, p StartParams) error
	// ConsumeAttempt counts one guess and returns the data to check it against. ErrNotFound if nothing is pending.
	ConsumeAttempt(ctx context.Context, userID string) (Attempt, error)
	// MarkVerified flips a pending verification to verified. ErrAadhaarInUse if another account verified it first.
	MarkVerified(ctx context.Context, userID string) error
}

type pgRepository struct{ pool *pgxpool.Pool }

// NewRepository returns a Postgres-backed Repository.
func NewRepository(pool *pgxpool.Pool) Repository { return &pgRepository{pool: pool} }

func (r *pgRepository) Status(ctx context.Context, userID string) (string, error) {
	var status string
	err := r.pool.QueryRow(ctx, `SELECT status FROM kyc_verifications WHERE user_id = $1`, userID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return StatusNone, nil
	}
	if err != nil {
		return "", fmt.Errorf("query kyc status: %w", err)
	}
	return status, nil
}

func (r *pgRepository) Start(ctx context.Context, p StartParams) error {
	// The WHERE on DO UPDATE means a verified row is never overwritten; then 0 rows are affected.
	tag, err := r.pool.Exec(ctx, `
		INSERT INTO kyc_verifications (user_id, email, aadhaar_hash, aadhaar_last4, otp_hash, otp_expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id) DO UPDATE SET
			email          = EXCLUDED.email,
			aadhaar_hash   = EXCLUDED.aadhaar_hash,
			aadhaar_last4  = EXCLUDED.aadhaar_last4,
			otp_hash       = EXCLUDED.otp_hash,
			otp_expires_at = EXCLUDED.otp_expires_at,
			otp_attempts   = 0
		WHERE kyc_verifications.status = 'pending'`,
		p.UserID, p.Email, p.AadhaarHash, p.AadhaarLast4, p.OTPHash, p.ExpiresAt)
	if err != nil {
		return fmt.Errorf("start kyc: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrAlreadyVerified
	}
	return nil
}

func (r *pgRepository) ConsumeAttempt(ctx context.Context, userID string) (Attempt, error) {
	// Increment first, check later: the guess is counted even if the server dies right after.
	var a Attempt
	err := r.pool.QueryRow(ctx, `
		UPDATE kyc_verifications SET otp_attempts = otp_attempts + 1
		WHERE user_id = $1 AND status = 'pending'
		RETURNING otp_hash, otp_expires_at, otp_attempts`, userID).Scan(&a.OTPHash, &a.ExpiresAt, &a.Count)
	if errors.Is(err, pgx.ErrNoRows) {
		return Attempt{}, ErrNotFound
	}
	if err != nil {
		return Attempt{}, fmt.Errorf("count kyc attempt: %w", err)
	}
	return a, nil
}

func (r *pgRepository) MarkVerified(ctx context.Context, userID string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE kyc_verifications SET status = 'verified', verified_at = now()
		WHERE user_id = $1 AND status = 'pending'`, userID)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique_violation: kyc_verified_aadhaar_idx
		return ErrAadhaarInUse
	}
	if err != nil {
		return fmt.Errorf("mark kyc verified: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
```

## 3. mailer.go

The service depends on a tiny `Mailer` interface. For the demo we have no SMTP, so the implementation writes the OTP to the server log. **Look for it in the terminal where `go run` is running.** Swapping in a real SMTP sender later changes only this file and one line in `router.go`.

```go
// File: Backend/internal/modules/kyc/mailer.go
package kyc

import (
	"context"
	"log/slog"
)

// Mailer delivers an OTP to an email address.
type Mailer interface {
	SendOTP(ctx context.Context, to, otp string) error
}

// LogMailer is the demo mailer: it prints the OTP to the server log instead of sending an email.
type LogMailer struct{ Log *slog.Logger }

// SendOTP implements Mailer.
func (m LogMailer) SendOTP(ctx context.Context, to, otp string) error {
	m.Log.InfoContext(ctx, "DEMO: OTP email not sent, read it here", "to", to, "otp", otp)
	return nil
}
```

## 4. service.go

The rules, in plain words:

- **Start:** Aadhaar must be 12 digits (spaces allowed). Email must parse. Make a random 6-digit OTP, store only its HMAC, email the plain OTP.
- **Verify:** count the guess first. More than 5 guesses: refuse. Past the expiry: refuse. Compare in constant time. If right, mark verified, then grant `investor`.

Two details worth understanding before you type:

1. `now` and `newOTP` are fields, not direct calls. Tests replace them, so a test can fix the OTP and move the clock.
2. If `MarkVerified` worked but `GrantRole` failed, the user would be stuck: verified, no role, and the pending row is gone. So when `ConsumeAttempt` finds nothing pending, `Verify` checks whether the user is already verified and, if so, runs the grant again (it is idempotent).

```go
// File: Backend/internal/modules/kyc/service.go
package kyc

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"brickfraction/backend/internal/modules/identity"
)

const (
	otpTTL      = 10 * time.Minute
	maxAttempts = 5
)

var aadhaarRE = regexp.MustCompile(`^\d{12}$`)

// RoleGranter is the part of identity.Service that KYC needs. We never touch identity's repository.
type RoleGranter interface {
	GrantRole(ctx context.Context, actorID, targetUserID, role string) ([]string, error)
}

// Service holds the KYC rules.
type Service struct {
	repo   Repository
	mailer Mailer
	roles  RoleGranter
	key    []byte
	now    func() time.Time
	newOTP func() (string, error)
}

// NewService builds a Service. hashKey is the secret used to HMAC Aadhaar numbers and OTPs.
func NewService(repo Repository, mailer Mailer, roles RoleGranter, hashKey string) *Service {
	return &Service{repo: repo, mailer: mailer, roles: roles, key: []byte(hashKey), now: time.Now, newOTP: randomOTP}
}

// Start validates the input, stores a pending verification and emails the OTP.
func (s *Service) Start(ctx context.Context, userID, aadhaar, email string) error {
	aadhaar = strings.ReplaceAll(aadhaar, " ", "")
	if !aadhaarRE.MatchString(aadhaar) {
		return ErrInvalidAadhaar
	}
	addr, err := mail.ParseAddress(strings.TrimSpace(email))
	if err != nil {
		return ErrInvalidEmail
	}
	otp, err := s.newOTP()
	if err != nil {
		return fmt.Errorf("generate otp: %w", err)
	}
	err = s.repo.Start(ctx, StartParams{
		UserID:       userID,
		Email:        addr.Address,
		AadhaarHash:  s.hash("aadhaar", aadhaar),
		AadhaarLast4: aadhaar[8:],
		OTPHash:      s.hash("otp", userID, otp),
		ExpiresAt:    s.now().Add(otpTTL),
	})
	if err != nil {
		return err
	}
	if err := s.mailer.SendOTP(ctx, addr.Address, otp); err != nil {
		return fmt.Errorf("send otp: %w", err)
	}
	return nil
}

// Verify checks the OTP. On success the user is verified and holds the investor role.
func (s *Service) Verify(ctx context.Context, userID, otp string) error {
	a, err := s.repo.ConsumeAttempt(ctx, userID)
	if errors.Is(err, ErrNotFound) {
		// Verified earlier but the role grant failed? Finish the job instead of leaving them stuck.
		if status, serr := s.repo.Status(ctx, userID); serr == nil && status == StatusVerified {
			return s.grantInvestor(ctx, userID)
		}
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if a.Count > maxAttempts {
		return ErrTooManyAttempts
	}
	if s.now().After(a.ExpiresAt) {
		return ErrOTPExpired
	}
	// Constant-time compare so response time leaks nothing about the code.
	if !hmac.Equal([]byte(s.hash("otp", userID, strings.TrimSpace(otp))), []byte(a.OTPHash)) {
		return ErrOTPInvalid
	}
	if err := s.repo.MarkVerified(ctx, userID); err != nil {
		return err
	}
	return s.grantInvestor(ctx, userID)
}

func (s *Service) grantInvestor(ctx context.Context, userID string) error {
	// actorID "" means the system granted it, not an admin.
	if _, err := s.roles.GrantRole(ctx, "", userID, identity.RoleInvestor); err != nil {
		return fmt.Errorf("grant investor role: %w", err)
	}
	return nil
}

// hash is HMAC-SHA256 over the parts. The first part separates uses ("aadhaar" vs "otp").
func (s *Service) hash(parts ...string) string {
	m := hmac.New(sha256.New, s.key)
	m.Write([]byte(strings.Join(parts, ":")))
	return hex.EncodeToString(m.Sum(nil))
}

// randomOTP returns a zero-padded 6-digit code from the OS random source.
func randomOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}
```

Note `crypto/rand`, not `math/rand`: OTPs must be unpredictable.

## 5. controller.go

Same shape as the identity controller. New idea: instead of a long `switch`, the error-to-HTTP mapping is a table. Adding a new error later is one line.

```go
// File: Backend/internal/modules/kyc/controller.go
package kyc

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"brickfraction/backend/internal/middleware"
	"brickfraction/backend/internal/platform/httpx"
)

// service is what the controller needs from the KYC service.
type service interface {
	Start(ctx context.Context, userID, aadhaar, email string) error
	Verify(ctx context.Context, userID, otp string) error
}

// Controller translates HTTP to service calls and back.
type Controller struct {
	svc service
	log *slog.Logger
}

func newController(svc service, log *slog.Logger) *Controller {
	return &Controller{svc: svc, log: log}
}

type startRequest struct {
	Aadhaar string `json:"aadhaar"`
	Email   string `json:"email"`
}

type verifyRequest struct {
	OTP string `json:"otp"`
}

// Start handles POST /api/v1/kyc/start.
func (c *Controller) Start(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "not signed in")
		return
	}
	var req startRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_json", `body must be JSON like {"aadhaar":"123456789012","email":"you@example.com"}`)
		return
	}
	if err := c.svc.Start(r.Context(), userID, req.Aadhaar, req.Email); err != nil {
		c.fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusAccepted, StatusResponse{Status: StatusPending})
}

// Verify handles POST /api/v1/kyc/verify.
func (c *Controller) Verify(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "not signed in")
		return
	}
	var req verifyRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_json", `body must be JSON like {"otp":"123456"}`)
		return
	}
	if err := c.svc.Verify(r.Context(), userID, req.OTP); err != nil {
		c.fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, StatusResponse{Status: StatusVerified})
}

// httpErrors maps each domain error to a status and a stable code. Their messages are user-safe.
var httpErrors = []struct {
	err    error
	status int
	code   string
}{
	{ErrInvalidAadhaar, http.StatusBadRequest, "invalid_aadhaar"},
	{ErrInvalidEmail, http.StatusBadRequest, "invalid_email"},
	{ErrOTPInvalid, http.StatusBadRequest, "otp_invalid"},
	{ErrOTPExpired, http.StatusBadRequest, "otp_expired"},
	{ErrNotFound, http.StatusNotFound, "no_pending_kyc"},
	{ErrAlreadyVerified, http.StatusConflict, "already_verified"},
	{ErrAadhaarInUse, http.StatusConflict, "aadhaar_in_use"},
	{ErrTooManyAttempts, http.StatusTooManyRequests, "too_many_attempts"},
}

// fail maps a service error to an HTTP response. Unknown errors become a generic 500.
func (c *Controller) fail(w http.ResponseWriter, r *http.Request, err error) {
	for _, e := range httpErrors {
		if errors.Is(err, e.err) {
			httpx.Error(w, e.status, e.code, e.err.Error())
			return
		}
	}
	c.log.ErrorContext(r.Context(), "kyc request failed",
		"err", err, "request_id", middleware.RequestIDFrom(r.Context()))
	httpx.Error(w, http.StatusInternalServerError, "internal", "something went wrong")
}
```

## 6. routes.go

```go
// File: Backend/internal/modules/kyc/routes.go
package kyc

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
)

// Deps is what the KYC module needs to be mounted.
type Deps struct {
	Service *Service
	Log     *slog.Logger
}

// Register adds the KYC routes. r is already authenticated and prefixed with /api/v1.
func Register(r chi.Router, d Deps) {
	c := newController(d.Service, d.Log)
	r.Post("/kyc/start", c.Start)
	r.Post("/kyc/verify", c.Verify)
}
```

## 7. Mount it in router.go

Open `Backend/internal/app/router.go`.

1. Add to the imports, under `identity`:

```go
	"brickfraction/backend/internal/modules/kyc"
```

2. Under `identitySvc := ...` add:

```go
	kycSvc := kyc.NewService(kyc.NewRepository(d.Pool), kyc.LogMailer{Log: d.Log}, identitySvc, d.Config.KYCHashKey)
```

3. Under `identity.Register(...)` inside the `/api/v1` route, add:

```go
		kyc.Register(api, kyc.Deps{Service: kycSvc, Log: d.Log})
```

`identitySvc` is passed as the `RoleGranter`: it has a `GrantRole` method with the right signature, so Go accepts it with no `implements` keyword. That is the interface lesson from the glossary in action.

## 8. Test it

Create `service_test.go`. It uses hand-written fakes (like `fakeRepo` in the identity tests) and a fixed OTP, then walks the cases in one table.

```go
// File: Backend/internal/modules/kyc/service_test.go
package kyc

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeRepo struct {
	rec      *StartParams
	attempts int
	verified bool
}

func (f *fakeRepo) Status(context.Context, string) (string, error) {
	switch {
	case f.verified:
		return StatusVerified, nil
	case f.rec != nil:
		return StatusPending, nil
	}
	return StatusNone, nil
}

func (f *fakeRepo) Start(_ context.Context, p StartParams) error {
	if f.verified {
		return ErrAlreadyVerified
	}
	f.rec, f.attempts = &p, 0
	return nil
}

func (f *fakeRepo) ConsumeAttempt(context.Context, string) (Attempt, error) {
	if f.rec == nil || f.verified {
		return Attempt{}, ErrNotFound
	}
	f.attempts++
	return Attempt{OTPHash: f.rec.OTPHash, ExpiresAt: f.rec.ExpiresAt, Count: f.attempts}, nil
}

func (f *fakeRepo) MarkVerified(context.Context, string) error { f.verified = true; return nil }

type fakeMailer struct{ sent int }

func (m *fakeMailer) SendOTP(context.Context, string, string) error { m.sent++; return nil }

type fakeRoles struct{ granted []string }

func (g *fakeRoles) GrantRole(_ context.Context, _, user, role string) ([]string, error) {
	g.granted = append(g.granted, user+":"+role)
	return nil, nil
}

func TestVerify(t *testing.T) {
	tests := []struct {
		name       string
		wrongTries int           // wrong guesses made before the final one
		guess      string        // the final guess
		wait       time.Duration // time that passes before the final guess
		wantErr    error
		wantGrant  bool
	}{
		{name: "right code grants investor", guess: "123456", wantGrant: true},
		{name: "wrong code is refused", guess: "654321", wantErr: ErrOTPInvalid},
		{name: "expired code is refused", guess: "123456", wait: 11 * time.Minute, wantErr: ErrOTPExpired},
		{name: "sixth guess is refused even if right", wrongTries: 5, guess: "123456", wantErr: ErrTooManyAttempts},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo, roles := &fakeRepo{}, &fakeRoles{}
			svc := NewService(repo, &fakeMailer{}, roles, "test-key")
			svc.newOTP = func() (string, error) { return "123456", nil }
			clock := time.Now()
			svc.now = func() time.Time { return clock }

			if err := svc.Start(context.Background(), "u1", "1234 5678 9012", "a@example.com"); err != nil {
				t.Fatalf("Start() unexpected error: %v", err)
			}
			for range tc.wrongTries {
				_ = svc.Verify(context.Background(), "u1", "000000")
			}
			clock = clock.Add(tc.wait)

			err := svc.Verify(context.Background(), "u1", tc.guess)

			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("Verify() error = %v, want %v", err, tc.wantErr)
			}
			if granted := len(roles.granted) == 1 && roles.granted[0] == "u1:investor"; granted != tc.wantGrant {
				t.Errorf("investor granted = %v, want %v (calls: %v)", granted, tc.wantGrant, roles.granted)
			}
		})
	}
}

func TestStartRejectsBadInput(t *testing.T) {
	tests := []struct {
		name, aadhaar, email string
		wantErr              error
	}{
		{"aadhaar too short", "12345", "a@example.com", ErrInvalidAadhaar},
		{"aadhaar with letters", "1234567890ab", "a@example.com", ErrInvalidAadhaar},
		{"email without domain", "123456789012", "nope", ErrInvalidEmail},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			mailer := &fakeMailer{}
			svc := NewService(&fakeRepo{}, mailer, &fakeRoles{}, "test-key")

			err := svc.Start(context.Background(), "u1", tc.aadhaar, tc.email)

			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("Start() error = %v, want %v", err, tc.wantErr)
			}
			if mailer.sent != 0 {
				t.Errorf("an email was sent despite invalid input")
			}
		})
	}
}
```

Run:

```bash
cd Backend
go vet ./... && go test ./internal/modules/kyc/...
```

### Try it with curl

You need a token. In the browser, signed in, open `http://localhost:3000/api/auth/token` and copy the `token` value. Then (Git Bash):

```bash
TOKEN=paste-it-here
curl -s -X POST localhost:8080/api/v1/kyc/start \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"aadhaar":"123456789012","email":"me@example.com"}'
```

Expect `{"status":"pending"}` and a log line `DEMO: OTP email not sent` with the code in the API terminal. Then:

```bash
curl -s -X POST localhost:8080/api/v1/kyc/verify \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"otp":"PASTE_CODE"}'
curl -s localhost:8080/api/v1/me -H "Authorization: Bearer $TOKEN"
```

Expect `{"status":"verified"}`, then `"roles":["investor"]`. Try a wrong code to see `otp_invalid`.

## Common errors

- `missing required environment variables: KYC_HASH_KEY`: add it to `.env.local`.
- `cannot use identitySvc (...) as kyc.RoleGranter`: your `GrantRole` signature in identity differs. Compare character by character with `identity/service.go`.
- `relation "kyc_verifications" does not exist`: lesson 12 migrations not applied.
- `for range tc.wrongTries` does not compile: your Go is older than 1.22. The README requires 1.23.

## Checkpoint

- [ ] `go vet ./...` and `go test ./...` pass.
- [ ] curl: start, read OTP from the API log, verify, then `/me` shows `investor`.
- [ ] A wrong OTP five times, then the right one, is refused with `too_many_attempts`.
- [ ] I can explain why the Aadhaar number never appears in the table.

**Not built (known limits):** no resend cooldown or per-IP rate limit (a determined attacker can call `start` repeatedly to reset the attempts counter), no Verhoeff checksum on the Aadhaar number, and the OTP goes to the log, not a real inbox. Fine for a demo; fix all three before anything real.

Next: [14-issuer-module-go.md](14-issuer-module-go.md)
