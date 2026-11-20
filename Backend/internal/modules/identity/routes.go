package identity

import (
	"log/slog"

	"github.com/go-chi/chi/v5"

	"brickfraction/backend/internal/middleware"
)

// Deps is what the identity module needs to be mounted.
type Deps struct {
	Service *Service
	Log     *slog.Logger
}

// Register adds the identity routes. r is already authenticated and prefixed with /api/v1.
func Register(r chi.Router, d Deps) {
	c := newController(d.Service, d.Log)

	r.Get("/me", c.Me)

	// Only platform admins may assign roles to other users.
	r.With(middleware.RequireRole(d.Service, RolePlatformAdmin)).
		Post("/admin/users/{id}/roles", c.GrantRole)
}
