package middleware

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"

	"brickfraction/backend/internal/platform/httpx"
)

// TokenVerifier checks a bearer token and returns the user id it was issued to.
type TokenVerifier interface {
	Verify(token string) (userID string, err error)
}

// JWKSVerifier verifies Better Auth JWTs against a cached JWKS endpoint.
type JWKSVerifier struct {
	keyfunc jwt.Keyfunc
	parser  *jwt.Parser
}

// NewJWKSVerifier starts a background refresh of the JWKS at jwksURL. It does not fail if the
// URL is unreachable right now (the frontend may start later); tokens just fail until it is.
// issuer is required both as the token's issuer and as its audience.
func NewJWKSVerifier(ctx context.Context, jwksURL, issuer string) (*JWKSVerifier, error) {
	kf, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL})
	if err != nil {
		return nil, fmt.Errorf("create jwks keyfunc: %w", err)
	}
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"EdDSA"}), // never trust the algorithm named in the token
		jwt.WithIssuer(issuer),
		jwt.WithAudience(issuer),
		jwt.WithExpirationRequired(),
		jwt.WithLeeway(5*time.Second), // tolerate small clock differences
	)
	return &JWKSVerifier{keyfunc: kf.Keyfunc, parser: parser}, nil
}

// Verify implements TokenVerifier.
func (v *JWKSVerifier) Verify(tokenString string) (string, error) {
	claims := jwt.RegisteredClaims{}
	if _, err := v.parser.ParseWithClaims(tokenString, &claims, v.keyfunc); err != nil {
		return "", fmt.Errorf("verify token: %w", err)
	}
	if claims.Subject == "" {
		return "", errors.New("token has no subject")
	}
	return claims.Subject, nil
}

// Authenticate rejects requests without a valid bearer token and puts the user id in the context.
func Authenticate(v TokenVerifier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, ok := bearerToken(r)
			if !ok {
				w.Header().Set("WWW-Authenticate", "Bearer")
				httpx.Error(w, http.StatusUnauthorized, "unauthorized", "missing bearer token")
				return
			}
			userID, err := v.Verify(token)
			if err != nil {
				w.Header().Set("WWW-Authenticate", "Bearer")
				httpx.Error(w, http.StatusUnauthorized, "unauthorized", "invalid or expired token")
				return
			}
			ctx := context.WithValue(r.Context(), userIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserID returns the authenticated user's id, as set by Authenticate.
func UserID(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(userIDKey).(string)
	return id, ok && id != ""
}

// bearerToken extracts the token from "Authorization: Bearer <token>".
func bearerToken(r *http.Request) (string, bool) {
	scheme, token, found := strings.Cut(r.Header.Get("Authorization"), " ")
	if !found || !strings.EqualFold(scheme, "Bearer") || token == "" {
		return "", false
	}
	return token, true
}
