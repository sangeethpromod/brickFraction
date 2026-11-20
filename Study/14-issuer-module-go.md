# 14. Issuer applications and admin approval (Go)

An issuer submits company details and waits. A `platform_admin` approves or rejects. Approval grants the `issuer` role.

| Method | Path | Who | Does |
|---|---|---|---|
| POST | `/api/v1/issuer/applications` | any signed-in user | Submit an application (status `pending`) |
| GET | `/api/v1/issuer/applications/me` | the applicant | Their latest application, or `null` |
| GET | `/api/v1/admin/issuer-applications?status=pending` | `platform_admin` | The review queue |
| POST | `/api/v1/admin/issuer-applications/{id}/approve` | `platform_admin` | Grant `issuer`, mark approved |
| POST | `/api/v1/admin/issuer-applications/{id}/reject` | `platform_admin` | Body `{"reason":"..."}` |

Time: about 45 minutes. Same five-file shape.

```text
Backend/internal/modules/issuer/
  model.go  repository.go  service.go  controller.go  routes.go  service_test.go
```

## 1. model.go

`ReviewedBy` has `json:"-"`: the applicant sees their own application through `/me`, and must not learn which admin reviewed it.

`InputError` is a string type that implements `error`. The service uses it for "your field is wrong" messages, and the controller turns it into a 400 with that exact message.

```go
// File: Backend/internal/modules/issuer/model.go
// Package issuer handles applications to become an issuer. An admin's approval grants the issuer role.
package issuer

import (
	"errors"
	"time"
)

// Application statuses. They must match the CHECK in migrations/00004_issuer_applications.sql.
const (
	StatusPending  = "pending"
	StatusApproved = "approved"
	StatusRejected = "rejected"
)

// Application is one row of issuer_applications. The db tags match the column names.
type Application struct {
	ID                 string     `json:"id" db:"id"`
	UserID             string     `json:"user_id" db:"user_id"`
	CompanyName        string     `json:"company_name" db:"company_name"`
	RegistrationNumber string     `json:"registration_number" db:"registration_number"`
	ContactPhone       string     `json:"contact_phone" db:"contact_phone"`
	Description        string     `json:"description" db:"description"`
	Status             string     `json:"status" db:"status"`
	RejectionReason    *string    `json:"rejection_reason" db:"rejection_reason"`
	ReviewedBy         *string    `json:"-" db:"reviewed_by"`
	ReviewedAt         *time.Time `json:"reviewed_at" db:"reviewed_at"`
	CreatedAt          time.Time  `json:"created_at" db:"created_at"`
}

// ApplyInput is what the applicant submits.
type ApplyInput struct {
	CompanyName        string `json:"company_name"`
	RegistrationNumber string `json:"registration_number"`
	ContactPhone       string `json:"contact_phone"`
	Description        string `json:"description"`
}

// MineResponse wraps the applicant's latest application. Application is null when they never applied.
type MineResponse struct {
	Application *Application `json:"application"`
}

// InputError is a validation message that is safe to show to the user.
type InputError string

func (e InputError) Error() string { return string(e) }

// Domain errors. The controller maps them to HTTP statuses.
var (
	ErrNotFound       = errors.New("application not found")
	ErrNotPending     = errors.New("this application has already been decided")
	ErrAlreadyApplied = errors.New("you already have an open application")
)
```

Pointers (`*string`, `*time.Time`) are how Go represents a column that can be `NULL`. A nil pointer becomes JSON `null`.

## 2. repository.go

```go
// File: Backend/internal/modules/issuer/repository.go
package issuer

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// cols is the column list every query returns, in the shape of Application.
const cols = `id::text AS id, user_id, company_name, registration_number, contact_phone, description,
	status, rejection_reason, reviewed_by, reviewed_at, created_at`

// Repository is the storage the issuer service needs.
type Repository interface {
	// Create inserts a pending application. ErrAlreadyApplied if the user has a pending or approved one.
	Create(ctx context.Context, userID string, in ApplyInput) (Application, error)
	// Latest returns the user's newest application, or nil if there is none.
	Latest(ctx context.Context, userID string) (*Application, error)
	// ListByStatus returns applications with that status, oldest first. It never returns nil.
	ListByStatus(ctx context.Context, status string) ([]Application, error)
	// Get returns one application, or ErrNotFound.
	Get(ctx context.Context, id string) (Application, error)
	// Decide moves a PENDING application to approved or rejected. ErrNotPending if it is not pending.
	Decide(ctx context.Context, id, status, reason, reviewerID string) error
}

type pgRepository struct{ pool *pgxpool.Pool }

// NewRepository returns a Postgres-backed Repository.
func NewRepository(pool *pgxpool.Pool) Repository { return &pgRepository{pool: pool} }

func (r *pgRepository) Create(ctx context.Context, userID string, in ApplyInput) (Application, error) {
	rows, err := r.pool.Query(ctx, `
		INSERT INTO issuer_applications (user_id, company_name, registration_number, contact_phone, description)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+cols,
		userID, in.CompanyName, in.RegistrationNumber, in.ContactPhone, in.Description)
	if err != nil {
		return Application{}, fmt.Errorf("insert application: %w", err)
	}
	// A unique violation only shows up while reading the rows, so check the error from here.
	app, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Application])
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" { // issuer_applications_one_open_idx
		return Application{}, ErrAlreadyApplied
	}
	if err != nil {
		return Application{}, fmt.Errorf("read inserted application: %w", err)
	}
	return app, nil
}

func (r *pgRepository) Latest(ctx context.Context, userID string) (*Application, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+cols+` FROM issuer_applications
		WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, userID)
	if err != nil {
		return nil, fmt.Errorf("query latest application: %w", err)
	}
	app, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Application])
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read latest application: %w", err)
	}
	return &app, nil
}

func (r *pgRepository) ListByStatus(ctx context.Context, status string) ([]Application, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+cols+` FROM issuer_applications
		WHERE status = $1 ORDER BY created_at`, status)
	if err != nil {
		return nil, fmt.Errorf("query applications: %w", err)
	}
	apps, err := pgx.CollectRows(rows, pgx.RowToStructByName[Application])
	if err != nil {
		return nil, fmt.Errorf("read applications: %w", err)
	}
	if apps == nil {
		apps = []Application{} // so JSON shows [] and not null
	}
	return apps, nil
}

func (r *pgRepository) Get(ctx context.Context, id string) (Application, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+cols+` FROM issuer_applications WHERE id = $1::uuid`, id)
	if err != nil {
		return Application{}, fmt.Errorf("query application: %w", err)
	}
	app, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Application])
	if errors.Is(err, pgx.ErrNoRows) {
		return Application{}, ErrNotFound
	}
	if err != nil {
		return Application{}, fmt.Errorf("read application: %w", err)
	}
	return app, nil
}

func (r *pgRepository) Decide(ctx context.Context, id, status, reason, reviewerID string) error {
	// "AND status = 'pending'" makes the decision atomic: two admins clicking at once, only one wins.
	tag, err := r.pool.Exec(ctx, `
		UPDATE issuer_applications
		SET status = $2, rejection_reason = NULLIF($3::text, ''), reviewed_by = $4, reviewed_at = now()
		WHERE id = $1::uuid AND status = 'pending'`, id, status, reason, reviewerID)
	if err != nil {
		return fmt.Errorf("decide application: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotPending
	}
	return nil
}
```

`RowToStructByName` fills a struct by matching column names to the `db` tags, so you never write a long `Scan(&a, &b, &c, ...)`. It errors if a column has no field, which is why `cols` and `Application` must stay in step.

## 3. service.go

Look closely at `decide`. The order is deliberate:

1. Grant the `issuer` role **first**.
2. Then mark the application approved.

If step 2 fails, the application is still `pending`, so the admin just clicks Approve again: granting an already-held role is harmless. The other order could leave an "approved" application with no role, and no way to retry. This is the poor person's transaction when two modules own the two writes.

```go
// File: Backend/internal/modules/issuer/service.go
package issuer

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"brickfraction/backend/internal/modules/identity"
)

var (
	phoneRE = regexp.MustCompile(`^\+?[0-9]{7,15}$`)
	uuidRE  = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
)

// RoleGranter is the part of identity.Service that this module needs.
type RoleGranter interface {
	GrantRole(ctx context.Context, actorID, targetUserID, role string) ([]string, error)
}

// Service holds the issuer-application rules.
type Service struct {
	repo  Repository
	roles RoleGranter
}

// NewService builds a Service.
func NewService(repo Repository, roles RoleGranter) *Service {
	return &Service{repo: repo, roles: roles}
}

// Apply validates and stores a new pending application.
func (s *Service) Apply(ctx context.Context, userID string, in ApplyInput) (Application, error) {
	in.CompanyName = strings.TrimSpace(in.CompanyName)
	in.RegistrationNumber = strings.TrimSpace(in.RegistrationNumber)
	in.ContactPhone = strings.ReplaceAll(strings.TrimSpace(in.ContactPhone), " ", "")
	in.Description = strings.TrimSpace(in.Description)
	switch {
	case len(in.CompanyName) < 2 || len(in.CompanyName) > 200:
		return Application{}, InputError("company name must be 2 to 200 characters")
	case in.RegistrationNumber == "" || len(in.RegistrationNumber) > 50:
		return Application{}, InputError("registration number is required (50 characters at most)")
	case !phoneRE.MatchString(in.ContactPhone):
		return Application{}, InputError("contact phone must be 7 to 15 digits, optionally starting with +")
	case len(in.Description) > 1000:
		return Application{}, InputError("description must be 1000 characters at most")
	}
	return s.repo.Create(ctx, userID, in)
}

// Mine returns the caller's latest application, or nil.
func (s *Service) Mine(ctx context.Context, userID string) (*Application, error) {
	return s.repo.Latest(ctx, userID)
}

// List returns the applications with the given status.
func (s *Service) List(ctx context.Context, status string) ([]Application, error) {
	switch status {
	case StatusPending, StatusApproved, StatusRejected:
		return s.repo.ListByStatus(ctx, status)
	}
	return nil, InputError("status must be pending, approved or rejected")
}

// Approve grants the applicant the issuer role, then marks the application approved.
func (s *Service) Approve(ctx context.Context, adminID, id string) (Application, error) {
	app, err := s.pending(ctx, id)
	if err != nil {
		return Application{}, err
	}
	// Role first: if the status update fails, the admin can retry and the grant is idempotent.
	if _, err := s.roles.GrantRole(ctx, adminID, app.UserID, identity.RoleIssuer); err != nil {
		return Application{}, fmt.Errorf("grant issuer role: %w", err)
	}
	return s.decide(ctx, adminID, id, StatusApproved, "")
}

// Reject marks the application rejected. A reason is required so the applicant knows what to fix.
func (s *Service) Reject(ctx context.Context, adminID, id, reason string) (Application, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" || len(reason) > 500 {
		return Application{}, InputError("a reason is required (500 characters at most)")
	}
	if _, err := s.pending(ctx, id); err != nil {
		return Application{}, err
	}
	return s.decide(ctx, adminID, id, StatusRejected, reason)
}

// pending loads the application and checks that it can still be decided.
func (s *Service) pending(ctx context.Context, id string) (Application, error) {
	if !uuidRE.MatchString(id) { // otherwise Postgres fails on the cast and we would answer 500
		return Application{}, ErrNotFound
	}
	app, err := s.repo.Get(ctx, id)
	if err != nil {
		return Application{}, err
	}
	if app.Status != StatusPending {
		return Application{}, ErrNotPending
	}
	return app, nil
}

func (s *Service) decide(ctx context.Context, adminID, id, status, reason string) (Application, error) {
	if err := s.repo.Decide(ctx, id, status, reason, adminID); err != nil {
		return Application{}, err
	}
	return s.repo.Get(ctx, id)
}
```

## 4. controller.go

```go
// File: Backend/internal/modules/issuer/controller.go
package issuer

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"brickfraction/backend/internal/middleware"
	"brickfraction/backend/internal/platform/httpx"
)

// service is what the controller needs from the issuer service.
type service interface {
	Apply(ctx context.Context, userID string, in ApplyInput) (Application, error)
	Mine(ctx context.Context, userID string) (*Application, error)
	List(ctx context.Context, status string) ([]Application, error)
	Approve(ctx context.Context, adminID, id string) (Application, error)
	Reject(ctx context.Context, adminID, id, reason string) (Application, error)
}

// Controller translates HTTP to service calls and back.
type Controller struct {
	svc service
	log *slog.Logger
}

func newController(svc service, log *slog.Logger) *Controller {
	return &Controller{svc: svc, log: log}
}

// Apply handles POST /api/v1/issuer/applications.
func (c *Controller) Apply(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "not signed in")
		return
	}
	var in ApplyInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_json", "request body must be valid JSON")
		return
	}
	app, err := c.svc.Apply(r.Context(), userID, in)
	if err != nil {
		c.fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, app)
}

// Mine handles GET /api/v1/issuer/applications/me.
func (c *Controller) Mine(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "not signed in")
		return
	}
	app, err := c.svc.Mine(r.Context(), userID)
	if err != nil {
		c.fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, MineResponse{Application: app})
}

// List handles GET /api/v1/admin/issuer-applications. The route restricts it to platform admins.
func (c *Controller) List(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status == "" {
		status = StatusPending
	}
	apps, err := c.svc.List(r.Context(), status)
	if err != nil {
		c.fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, apps)
}

// Approve handles POST /api/v1/admin/issuer-applications/{id}/approve.
func (c *Controller) Approve(w http.ResponseWriter, r *http.Request) {
	adminID, ok := middleware.UserID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "not signed in")
		return
	}
	app, err := c.svc.Approve(r.Context(), adminID, chi.URLParam(r, "id"))
	if err != nil {
		c.fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, app)
}

type rejectRequest struct {
	Reason string `json:"reason"`
}

// Reject handles POST /api/v1/admin/issuer-applications/{id}/reject.
func (c *Controller) Reject(w http.ResponseWriter, r *http.Request) {
	adminID, ok := middleware.UserID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "not signed in")
		return
	}
	var req rejectRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_json", `body must be JSON like {"reason":"..."}`)
		return
	}
	app, err := c.svc.Reject(r.Context(), adminID, chi.URLParam(r, "id"), req.Reason)
	if err != nil {
		c.fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, app)
}

// fail maps a service error to an HTTP response. Unknown errors become a generic 500.
func (c *Controller) fail(w http.ResponseWriter, r *http.Request, err error) {
	var input InputError
	switch {
	case errors.As(err, &input):
		httpx.Error(w, http.StatusBadRequest, "invalid_input", input.Error())
	case errors.Is(err, ErrNotFound):
		httpx.Error(w, http.StatusNotFound, "not_found", err.Error())
	case errors.Is(err, ErrNotPending):
		httpx.Error(w, http.StatusConflict, "not_pending", err.Error())
	case errors.Is(err, ErrAlreadyApplied):
		httpx.Error(w, http.StatusConflict, "already_applied", err.Error())
	default:
		c.log.ErrorContext(r.Context(), "issuer request failed",
			"err", err, "request_id", middleware.RequestIDFrom(r.Context()))
		httpx.Error(w, http.StatusInternalServerError, "internal", "something went wrong")
	}
}
```

## 5. routes.go

The admin routes share one `RequireRole(platform_admin)` guard through `r.Route` + `r.Use`, instead of repeating `r.With(...)` per route as identity does for its single route.

```go
// File: Backend/internal/modules/issuer/routes.go
package issuer

import (
	"log/slog"

	"github.com/go-chi/chi/v5"

	"brickfraction/backend/internal/middleware"
	"brickfraction/backend/internal/modules/identity"
)

// Deps is what the issuer module needs to be mounted. Roles is identity.Service.
type Deps struct {
	Service *Service
	Roles   middleware.RoleChecker
	Log     *slog.Logger
}

// Register adds the issuer routes. r is already authenticated and prefixed with /api/v1.
func Register(r chi.Router, d Deps) {
	c := newController(d.Service, d.Log)

	r.Post("/issuer/applications", c.Apply)
	r.Get("/issuer/applications/me", c.Mine)

	// Everything below is for platform admins only.
	r.Route("/admin/issuer-applications", func(admin chi.Router) {
		admin.Use(middleware.RequireRole(d.Roles, identity.RolePlatformAdmin))
		admin.Get("/", c.List)
		admin.Post("/{id}/approve", c.Approve)
		admin.Post("/{id}/reject", c.Reject)
	})
}
```

## 6. Mount it in router.go

In `Backend/internal/app/router.go`:

1. Import, under `kyc`:

```go
	"brickfraction/backend/internal/modules/issuer"
```

2. Under `kycSvc := ...`:

```go
	issuerSvc := issuer.NewService(issuer.NewRepository(d.Pool), identitySvc)
```

3. Under `kyc.Register(...)`:

```go
		issuer.Register(api, issuer.Deps{Service: issuerSvc, Roles: identitySvc, Log: d.Log})
```

`identitySvc` is passed twice for two different jobs: as the `RoleGranter` (write a role) and as the `RoleChecker` (read roles for `RequireRole`). Same object, two small interfaces.

## 7. Test the approval rule

The part worth a test is the order and the guard in `Approve`: grant happens, a decided application is refused, and a bad id never reaches storage.

```go
// File: Backend/internal/modules/issuer/service_test.go
package issuer

import (
	"context"
	"errors"
	"testing"
)

const appID = "11111111-1111-1111-1111-111111111111"

type fakeRepo struct{ app Application }

func (f *fakeRepo) Create(context.Context, string, ApplyInput) (Application, error) {
	return f.app, nil
}
func (f *fakeRepo) Latest(context.Context, string) (*Application, error) { return &f.app, nil }
func (f *fakeRepo) ListByStatus(context.Context, string) ([]Application, error) {
	return []Application{f.app}, nil
}
func (f *fakeRepo) Get(context.Context, string) (Application, error) { return f.app, nil }
func (f *fakeRepo) Decide(_ context.Context, _, status, _, _ string) error {
	f.app.Status = status
	return nil
}

type fakeRoles struct{ granted []string }

func (g *fakeRoles) GrantRole(_ context.Context, _, user, role string) ([]string, error) {
	g.granted = append(g.granted, user+":"+role)
	return nil, nil
}

func TestApprove(t *testing.T) {
	tests := []struct {
		name      string
		status    string
		id        string
		wantErr   error
		wantGrant bool
	}{
		{name: "pending application is approved and role granted", status: StatusPending, id: appID, wantGrant: true},
		{name: "already decided application is refused", status: StatusRejected, id: appID, wantErr: ErrNotPending},
		{name: "malformed id is not found", status: StatusPending, id: "not-a-uuid", wantErr: ErrNotFound},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &fakeRepo{app: Application{ID: appID, UserID: "applicant", Status: tc.status}}
			roles := &fakeRoles{}
			svc := NewService(repo, roles)

			got, err := svc.Approve(context.Background(), "admin1", tc.id)

			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("Approve() error = %v, want %v", err, tc.wantErr)
			}
			if granted := len(roles.granted) == 1 && roles.granted[0] == "applicant:issuer"; granted != tc.wantGrant {
				t.Errorf("issuer granted = %v, want %v (calls: %v)", granted, tc.wantGrant, roles.granted)
			}
			if tc.wantGrant && got.Status != StatusApproved {
				t.Errorf("status = %q, want approved", got.Status)
			}
		})
	}
}

func TestApplyValidation(t *testing.T) {
	good := ApplyInput{CompanyName: "Acme Realty", RegistrationNumber: "U12345MH2020PTC000001", ContactPhone: "+91 98765 43210"}
	bad := good
	bad.ContactPhone = "call me"

	svc := NewService(&fakeRepo{}, &fakeRoles{})

	if _, err := svc.Apply(context.Background(), "u1", good); err != nil {
		t.Errorf("valid input rejected: %v", err)
	}
	var input InputError
	if _, err := svc.Apply(context.Background(), "u1", bad); !errors.As(err, &input) {
		t.Errorf("bad phone: error = %v, want an InputError", err)
	}
}
```

Run `go vet ./... && go test ./...` from `Backend/`.

## 8. Make yourself the first platform admin

Nobody can approve anything until one `platform_admin` exists, and only a platform admin can create one. Break the loop once, by hand, in the Neon SQL editor (replace the email with the account you signed up with):

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM auth."user" u, roles r
WHERE u.email = 'you@example.com' AND r.name = 'platform_admin';
```

**Verify against docs:** Better Auth names its user table `user`; with `schemaName: "auth"` it should be `auth."user"`. If the query says the relation does not exist, run `SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'user';` and use what it shows.

### Try it with curl

Use two browser sessions (or two accounts): an applicant token `$TOKEN` and an admin token `$ADMIN`.

```bash
curl -s -X POST localhost:8080/api/v1/issuer/applications \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"company_name":"Acme Realty","registration_number":"U12345","contact_phone":"+919876543210"}'
# a non-admin must be refused:
curl -s localhost:8080/api/v1/admin/issuer-applications -H "Authorization: Bearer $TOKEN"
# the admin sees it and approves it (use the id from the first response):
curl -s localhost:8080/api/v1/admin/issuer-applications -H "Authorization: Bearer $ADMIN"
curl -s -X POST localhost:8080/api/v1/admin/issuer-applications/ID/approve -H "Authorization: Bearer $ADMIN"
curl -s localhost:8080/api/v1/me -H "Authorization: Bearer $TOKEN"
```

Expect: `201` with `"status":"pending"`; `403 forbidden` for the non-admin; the admin list shows one item; approve returns `"status":"approved"`; `/me` shows `"roles":["issuer"]`. Applying a second time gives `409 already_applied`.

## Common errors

- `struct field X has no matching column`: `Application` and `cols` are out of step. Check every tag.
- `invalid input syntax for type uuid`: an id reached SQL without passing `pending()`. Keep the `uuidRE` check.
- `403` for your own admin account: the SQL insert in section 8 matched no row. Check the email and re-run; it inserts nothing silently if the user is not found.
- `cannot use identitySvc as middleware.RoleChecker`: `RolesFor` signature mismatch in identity.

## Checkpoint

- [ ] `go vet ./...` and `go test ./...` pass.
- [ ] The curl flow above gives exactly the listed results.
- [ ] A rejected application can be followed by a new one; an approved one cannot.
- [ ] I can explain why role-grant comes before the status update.

Next: [15-frontend-onboarding.md](15-frontend-onboarding.md)
