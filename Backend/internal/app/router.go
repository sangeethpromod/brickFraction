// Package app wires the HTTP server and mounts every module.
package app

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"brickfraction/backend/internal/config"
	"brickfraction/backend/internal/middleware"
	"brickfraction/backend/internal/modules/identity"
	"brickfraction/backend/internal/platform/httpx"
)

// Deps is everything NewRouter needs from main.
type Deps struct {
	Config   config.Config
	Log      *slog.Logger
	Pool     *pgxpool.Pool
	Verifier middleware.TokenVerifier
}

// NewRouter builds the full HTTP handler.
func NewRouter(d Deps) http.Handler {
	r := chi.NewRouter()

	// Order matters: the first Use is the outermost wrapper.
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger(d.Log))
	r.Use(middleware.Recover(d.Log))
	r.Use(middleware.CORS(d.Config.CORSAllowedOrigin)) // answers preflight before routing

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		httpx.Error(w, http.StatusNotFound, "not_found", "route not found")
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
		httpx.Error(w, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
	})

	r.Get("/healthz", healthz)
	r.Get("/healthz/db", healthDB(d.Pool))

	// Composition root: build each module's repository and service here.
	identitySvc := identity.NewService(identity.NewRepository(d.Pool))

	// Everything under /api/v1 requires a valid token. Each module mounts itself below.
	r.Route("/api/v1", func(api chi.Router) {
		api.Use(middleware.Authenticate(d.Verifier))
		identity.Register(api, identity.Deps{Service: identitySvc, Log: d.Log})
	})

	return r
}

// healthz says the process is up. It does not touch the database (see /healthz/db).
func healthz(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// healthDB checks that the database answers. Neon may need to wake up, so the limit is generous.
func healthDB(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		start := time.Now()
		if err := pool.Ping(ctx); err != nil {
			slog.ErrorContext(ctx, "database ping failed", "err", err)
			httpx.Error(w, http.StatusServiceUnavailable, "db_unavailable", "database is not reachable")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{
			"status":     "ok",
			"latency_ms": time.Since(start).Milliseconds(),
		})
	}
}
