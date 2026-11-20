package middleware

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type fakeVerifier struct {
	userID string
	err    error
}

func (f fakeVerifier) Verify(string) (string, error) { return f.userID, f.err }

func TestAuthenticate(t *testing.T) {
	tests := []struct {
		name       string
		header     string
		verifier   fakeVerifier
		wantStatus int
		wantUser   string
	}{
		{"no header", "", fakeVerifier{userID: "u1"}, http.StatusUnauthorized, ""},
		{"wrong scheme", "Basic abc", fakeVerifier{userID: "u1"}, http.StatusUnauthorized, ""},
		{"bearer without token", "Bearer ", fakeVerifier{userID: "u1"}, http.StatusUnauthorized, ""},
		{"verifier rejects", "Bearer abc", fakeVerifier{err: errors.New("bad")}, http.StatusUnauthorized, ""},
		{"valid token", "Bearer abc", fakeVerifier{userID: "u1"}, http.StatusOK, "u1"},
		{"scheme is case-insensitive", "bearer abc", fakeVerifier{userID: "u1"}, http.StatusOK, "u1"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var gotUser string
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				gotUser, _ = UserID(r.Context())
				w.WriteHeader(http.StatusOK)
			})
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			rec := httptest.NewRecorder()

			Authenticate(tc.verifier)(next).ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tc.wantStatus)
			}
			if gotUser != tc.wantUser {
				t.Errorf("user in context = %q, want %q", gotUser, tc.wantUser)
			}
			if tc.wantStatus == http.StatusUnauthorized && rec.Header().Get("WWW-Authenticate") != "Bearer" {
				t.Errorf("missing WWW-Authenticate header on 401")
			}
		})
	}
}

// jwksServer serves the public half of key as a JWKS, shaped like Better Auth's (OKP, Ed25519, kid, alg).
func jwksServer(t *testing.T, pub ed25519.PublicKey, kid string) *httptest.Server {
	t.Helper()
	body := fmt.Sprintf(`{"keys":[{"alg":"EdDSA","kty":"OKP","crv":"Ed25519","x":%q,"kid":%q}]}`,
		base64.RawURLEncoding.EncodeToString(pub), kid)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func sign(t *testing.T, method jwt.SigningMethod, key any, kid string, claims jwt.RegisteredClaims) string {
	t.Helper()
	tok := jwt.NewWithClaims(method, claims)
	tok.Header["kid"] = kid
	s, err := tok.SignedString(key)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return s
}

func TestJWKSVerifier(t *testing.T) {
	const issuer = "http://localhost:3000"

	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	_, otherPriv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	srv := jwksServer(t, pub, "key-1")

	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	verifier, err := NewJWKSVerifier(ctx, srv.URL, issuer)
	if err != nil {
		t.Fatalf("NewJWKSVerifier: %v", err)
	}

	now := time.Now()
	valid := jwt.RegisteredClaims{
		Subject:   "user-123",
		Issuer:    issuer,
		Audience:  jwt.ClaimStrings{issuer},
		ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
		IssuedAt:  jwt.NewNumericDate(now),
	}
	with := func(mutate func(*jwt.RegisteredClaims)) jwt.RegisteredClaims {
		c := valid
		mutate(&c)
		return c
	}

	tests := []struct {
		name     string
		token    string
		wantUser string
		wantErr  bool
	}{
		{"valid token", sign(t, jwt.SigningMethodEdDSA, priv, "key-1", valid), "user-123", false},
		{"expired", sign(t, jwt.SigningMethodEdDSA, priv, "key-1",
			with(func(c *jwt.RegisteredClaims) { c.ExpiresAt = jwt.NewNumericDate(now.Add(-time.Hour)) })), "", true},
		{"no expiry", sign(t, jwt.SigningMethodEdDSA, priv, "key-1",
			with(func(c *jwt.RegisteredClaims) { c.ExpiresAt = nil })), "", true},
		{"wrong issuer", sign(t, jwt.SigningMethodEdDSA, priv, "key-1",
			with(func(c *jwt.RegisteredClaims) { c.Issuer = "http://evil.example" })), "", true},
		{"wrong audience", sign(t, jwt.SigningMethodEdDSA, priv, "key-1",
			with(func(c *jwt.RegisteredClaims) { c.Audience = jwt.ClaimStrings{"http://evil.example"} })), "", true},
		{"no subject", sign(t, jwt.SigningMethodEdDSA, priv, "key-1",
			with(func(c *jwt.RegisteredClaims) { c.Subject = "" })), "", true},
		{"signed by a different key", sign(t, jwt.SigningMethodEdDSA, otherPriv, "key-1", valid), "", true},
		{"unknown key id", sign(t, jwt.SigningMethodEdDSA, priv, "no-such-key", valid), "", true},
		{"wrong algorithm (HMAC)", sign(t, jwt.SigningMethodHS256, []byte("secret"), "key-1", valid), "", true},
		{"not a token", "not.a.jwt", "", true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := verifier.Verify(tc.token)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("Verify() = %q, want an error", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("Verify() unexpected error: %v", err)
			}
			if got != tc.wantUser {
				t.Errorf("Verify() = %q, want %q", got, tc.wantUser)
			}
		})
	}
}
