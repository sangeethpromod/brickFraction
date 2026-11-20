package config

import (
	"strings"
	"testing"
)

func TestLoad(t *testing.T) {
	allKeys := []string{"APP_ENV", "PORT", "DATABASE_URL", "AUTH_JWKS_URL", "AUTH_ISSUER", "CORS_ALLOWED_ORIGIN"}
	required := map[string]string{
		"DATABASE_URL":  "postgres://example",
		"AUTH_JWKS_URL": "http://localhost:3000/api/auth/jwks",
		"AUTH_ISSUER":   "http://localhost:3000",
	}

	tests := []struct {
		name        string
		env         map[string]string
		wantErr     []string // every one of these must appear in the error
		wantPort    string
		wantCORS    string
		wantEnvName string
	}{
		{
			name:        "defaults apply when only required vars are set",
			env:         required,
			wantPort:    "8080",
			wantCORS:    "http://localhost:3000",
			wantEnvName: "development",
		},
		{
			name:        "optional vars override defaults",
			env:         merge(required, map[string]string{"PORT": "9090", "APP_ENV": "production", "CORS_ALLOWED_ORIGIN": "https://app.example"}),
			wantPort:    "9090",
			wantCORS:    "https://app.example",
			wantEnvName: "production",
		},
		{
			name:    "one missing var is named",
			env:     map[string]string{"AUTH_JWKS_URL": "x", "AUTH_ISSUER": "y"},
			wantErr: []string{"DATABASE_URL"},
		},
		{
			name:    "all missing vars are reported together",
			env:     nil,
			wantErr: []string{"DATABASE_URL", "AUTH_JWKS_URL", "AUTH_ISSUER"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			for _, k := range allKeys {
				t.Setenv(k, "") // empty counts as unset for Load
			}
			for k, v := range tc.env {
				t.Setenv(k, v)
			}

			cfg, err := Load()

			if len(tc.wantErr) > 0 {
				if err == nil {
					t.Fatalf("Load() error = nil, want error mentioning %v", tc.wantErr)
				}
				for _, want := range tc.wantErr {
					if !strings.Contains(err.Error(), want) {
						t.Errorf("error %q does not mention %q", err, want)
					}
				}
				return
			}
			if err != nil {
				t.Fatalf("Load() unexpected error: %v", err)
			}
			if cfg.Port != tc.wantPort || cfg.CORSAllowedOrigin != tc.wantCORS || cfg.Env != tc.wantEnvName {
				t.Errorf("got port=%q cors=%q env=%q, want port=%q cors=%q env=%q",
					cfg.Port, cfg.CORSAllowedOrigin, cfg.Env, tc.wantPort, tc.wantCORS, tc.wantEnvName)
			}
		})
	}
}

// merge returns a new map holding a, then b (b wins on clashes).
func merge(a, b map[string]string) map[string]string {
	out := make(map[string]string, len(a)+len(b))
	for k, v := range a {
		out[k] = v
	}
	for k, v := range b {
		out[k] = v
	}
	return out
}
