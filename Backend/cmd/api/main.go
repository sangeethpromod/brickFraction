package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"brickfraction/backend/internal/app"
	"brickfraction/backend/internal/config"
	"brickfraction/backend/internal/middleware"
	"brickfraction/backend/internal/platform"
	"brickfraction/backend/internal/platform/logger"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

// run holds the real startup logic so that main can stay tiny and returns errors normally
func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	log := logger.New(cfg.Env)
	slog.SetDefault(log) // so packages can use slog.Error(...) without being handed a logger

	// ctx is cancelled on Ctrl+C or SIGTERM.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := platform.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	verifier, err := middleware.NewJWKSVerifier(ctx, cfg.AuthJWKSURL, cfg.AuthIssuer)
	if err != nil {
		return err
	}

	handler := app.NewRouter(app.Deps{Config: cfg, Log: log, Pool: pool, Verifier: verifier})
	return app.NewServer(":"+cfg.Port, handler, log).Run(ctx)
}
