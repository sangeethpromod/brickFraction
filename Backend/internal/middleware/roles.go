package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"slices"

	"brickfraction/backend/internal/platform/httpx"
)

// RoleChecker looks up the roles a user holds. identity.Service satisfies it.
type RoleChecker interface {
	RolesFor(ctx context.Context, userID string) ([]string, error)
}

// RequireRole allows the request only if the authenticated user holds at least one of allowed.
// It must run after Authenticate.
func RequireRole(checker RoleChecker, allowed ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := UserID(r.Context())
			if !ok {
				httpx.Error(w, http.StatusUnauthorized, "unauthorized", "not signed in")
				return
			}
			roles, err := checker.RolesFor(r.Context(), userID)
			if err != nil {
				// Fail closed: an outage must never grant access.
				slog.ErrorContext(r.Context(), "role lookup failed", "err", err, "request_id", RequestIDFrom(r.Context()))
				httpx.Error(w, http.StatusInternalServerError, "internal", "something went wrong")
				return
			}
			if !slices.ContainsFunc(roles, func(role string) bool { return slices.Contains(allowed, role) }) {
				httpx.Error(w, http.StatusForbidden, "forbidden", "you do not have permission to do this")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
