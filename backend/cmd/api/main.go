package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jeremi16/resisst-api/internal/app"
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/database"
	"github.com/jeremi16/resisst-api/internal/shared/router"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	db, err := database.New(cfg.DatabaseURL, cfg.AutoMigrate)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}

	container, err := app.New(cfg, db)
	if err != nil {
		log.Fatalf("init container: %v", err)
	}

	engine := router.New(cfg, db, container.Auth, container.User, container.Calendar, container.Course, container.Internal, container.Assignment, container.ApiKey, container.TelegramSender)

	requestTimeout := time.Duration(cfg.RequestTimeoutSeconds) * time.Second
	if requestTimeout <= 0 {
		requestTimeout = 15 * time.Second
	}
	shutdownTimeout := time.Duration(cfg.ShutdownTimeoutSeconds) * time.Second
	if shutdownTimeout <= 0 {
		shutdownTimeout = 20 * time.Second
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           engine,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       requestTimeout + 5*time.Second,
		WriteTimeout:      requestTimeout + 5*time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("resisst-api listening on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("run server: %v", err)
		}
	}()

	// NOTE: Telegram polling intentionally NOT started here anymore.
	// It lives in the standalone resisst-bot service (bot/) to avoid
	// "Conflict: terminated by other getUpdates" when api scales to N replicas.

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	log.Printf("shutting down server with timeout=%s", shutdownTimeout)
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("graceful shutdown failed: %v", err)
	}
	log.Printf("server stopped")
}
