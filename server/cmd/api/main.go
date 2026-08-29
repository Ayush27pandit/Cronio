package main

import (
	"context"
	"errors"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Ayush27pandit/Cronio/server/internal/config"
	"github.com/Ayush27pandit/Cronio/server/internal/database"
	"github.com/Ayush27pandit/Cronio/server/internal/server"
	"github.com/joho/godotenv"
)

func main() {
	// Load local environment variables from .env.
	// In production, environment variables should be provided
	// directly by the deployment environment.
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using environment variables")
	}

	// Load and validate application configuration.
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	// Connect to the database.
	db, err := database.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("Connected to the database successfully")

	// Run pending database migrations.
	if err := database.Migrate(db); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	log.Println("Database migrations completed successfully")

	// Create structured logger.
	logger := slog.New(
		slog.NewJSONHandler(os.Stdout, nil),
	)

	// Create HTTP server.
	srv := server.New(cfg.Port, logger, db)

	// Start server in a separate goroutine.
	go func() {
		log.Printf("Cronio server is listening on port %s", cfg.Port)

		if err := srv.ListenAndServe(); err != nil &&
			!errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	// Wait for termination signal.
	stop := make(chan os.Signal, 1)

	signal.Notify(
		stop,
		syscall.SIGINT,
		syscall.SIGTERM,
	)

	<-stop

	log.Println("Shutdown signal received")

	// Give active requests time to finish.
	ctx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("server forced to shutdown: %v", err)
	}

	log.Println("Cronio server stopped")
}
