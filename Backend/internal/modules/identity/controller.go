package identity

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"brickfraction/backend/internal/middleware"
	"brickfraction/backend/internal/platform/httpx"
)

// service is what the controller needs from the identity service.
type service interface {
	Me(ctx context.Context, userID string) (UserRoles, error)
	GrantRole(ctx context.Context, actorID, targetUserID, role string) ([]string, error)
}

// Controller translates HTTP to service calls and back.
type Controller struct {
	svc service
	log *slog.Logger
}

func newController(svc service, log *slog.Logger) *Controller {
	return &Controller{svc: svc, log: log}
}

// Me handles GET /api/v1/me.
func (c *Controller) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserID(r.Context())
	if !ok { // the Authenticate middleware should make this impossible
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "not signed in")
		return
	}
	me, err := c.svc.Me(r.Context(), userID)
	if err != nil {
		c.fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, me)
}

type grantRoleRequest struct {
	Role string `json:"role"`
}

// GrantRole handles POST /api/v1/admin/users/{id}/roles. The route restricts it to platform admins.
func (c *Controller) GrantRole(w http.ResponseWriter, r *http.Request) {
	actorID, ok := middleware.UserID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", "not signed in")
		return
	}
	var req grantRoleRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_json", `request body must be JSON like {"role":"issuer"}`)
		return
	}
	targetID := chi.URLParam(r, "id")
	roles, err := c.svc.GrantRole(r.Context(), actorID, targetID, req.Role)
	if err != nil {
		c.fail(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, UserRoles{UserID: targetID, Roles: roles})
}

// fail maps a service error to an HTTP response. Unknown errors become a generic 500.
func (c *Controller) fail(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, ErrInvalidRole):
		httpx.Error(w, http.StatusBadRequest, "invalid_role", "unknown role")
	case errors.Is(err, ErrInvalidUser):
		httpx.Error(w, http.StatusBadRequest, "invalid_user", "user id is required")
	default:
		c.log.ErrorContext(r.Context(), "identity request failed",
			"err", err, "request_id", middleware.RequestIDFrom(r.Context()))
		httpx.Error(w, http.StatusInternalServerError, "internal", "something went wrong")
	}
}
