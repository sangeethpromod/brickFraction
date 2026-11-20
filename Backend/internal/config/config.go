// Package config reads application settings from environment variables.
package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds every setting the API needs.
type Config struct {
	Env               string // "development" or "production"
	Port              string
	DatabaseURL       string // pooled Neon connection string
	AuthJWKSURL       string // where Better Auth publishes its public keys
	AuthIssuer        string // Better Auth base URL; used as the JWT issuer and audience
	CORSAllowedOrigin string // the one browser origin allowed to call this API
	KYCHashKey        string // AAdhar and KYC Hash
}

// Load reads the environment. .env.local then .env in the working directory are used if present.
// It reports every missing required variable at once, not one at a time.
func Load() (Config, error) {
	// Missing files are normal in production, so errors are ignored on purpose. Real env vars win.
	_ = godotenv.Load(".env.local")
	_ = godotenv.Load(".env")

	var missing []string
	require := func(key string) string {
		v := os.Getenv(key)
		if v == "" {
			missing = append(missing, key)
		}
		return v
	}

	cfg := Config{
		Env:               getenv("APP_ENV", "development"),
		Port:              getenv("PORT", "8080"),
		DatabaseURL:       require("DATABASE_URL"),
		AuthJWKSURL:       require("AUTH_JWKS_URL"),
		AuthIssuer:        require("AUTH_ISSUER"),
		CORSAllowedOrigin: getenv("CORS_ALLOWED_ORIGIN", "http://localhost:3000"),
		KYCHashKey:        require("KYC_HASH_KEY")
	}
	if len(missing) > 0 {
		return Config{}, fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}
	return cfg, nil
}

// getenv returns the variable's value, or fallback when it is unset or empty.
func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
