// Package logger builds the application's structured logger
package logger

import (
	"log/slog"
	"os"
)

// New returns a human-readable logger in development and a JSON logger in production
func New(env string) *slog.Logger {
	if env == "production" {
		return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	}
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
}
