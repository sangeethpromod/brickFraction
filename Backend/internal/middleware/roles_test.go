package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

type fakeChecker struct {
	roles []string
	err   error
}

func (f fakeChecker) RolesFor(context.Context, string) ([]string, error) { return f.roles, f.err }

func TestRequireRole(t *testing.T) {
	tests := []struct {
		name       string
		userID     string // "" means Authenticate did not run
		checker    fakeChecker
		allowed    []string
		wantStatus int
		wantCalled bool
	}{
		{"no user in context", "", fakeChecker{}, []string{"platform_admin"}, http.StatusUnauthorized, false},
		{"lookup fails: deny with 500", "u1", fakeChecker{err: errors.New("db down")}, []string{"platform_admin"}, http.StatusInternalServerError, false},
		{"user has no roles", "u1", fakeChecker{roles: []string{}}, []string{"platform_admin"}, http.StatusForbidden, false},
		{"user has a different role", "u1", fakeChecker{roles: []string{"investor"}}, []string{"platform_admin"}, http.StatusForbidden, false},
		{"user has the role", "u1", fakeChecker{roles: []string{"investor", "platform_admin"}}, []string{"platform_admin"}, http.StatusOK, true},
		{"any one of several allowed roles is enough", "u1", fakeChecker{roles: []string{"issuer"}}, []string{"issuer", "platform_admin"}, http.StatusOK, true},
		{"no allowed roles denies everyone", "u1", fakeChecker{roles: []string{"platform_admin"}}, nil, http.StatusForbidden, false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			called := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = true
				w.WriteHeader(http.StatusOK)
			})
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if tc.userID != "" {
				req = req.WithContext(context.WithValue(req.Context(), userIDKey, tc.userID))
			}
			rec := httptest.NewRecorder()

			RequireRole(tc.checker, tc.allowed...)(next).ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tc.wantStatus)
			}
			if called != tc.wantCalled {
				t.Errorf("next handler called = %v, want %v", called, tc.wantCalled)
			}
		})
	}
}
