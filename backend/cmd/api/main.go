package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jeremi16/resisst-api/internal/auth"
	"github.com/jeremi16/resisst-api/internal/bot"
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/database"
	"github.com/jeremi16/resisst-api/internal/http/handlers"
	"github.com/jeremi16/resisst-api/internal/http/router"
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

	tokenSvc, err := auth.NewTokenService(
		cfg.JWTAccessSecret,
		cfg.AccessTokenTTLMinute,
		"resisst-api",
		"resisst-frontend",
	)
	if err != nil {
		log.Fatalf("init token service: %v", err)
	}

	authSvc, err := auth.NewService(db, cfg, tokenSvc)
	if err != nil {
		log.Fatalf("init auth service: %v", err)
	}

	// Initialize Telegram Bot
	telegramBot, err := bot.New(cfg, db)
	if err != nil {
		log.Printf("warning: failed to init telegram bot: %v", err)
	}

	userHandler := handlers.NewUserHandler(db)
	calendarHandler := handlers.NewCalendarHandler(db, cfg)
	courseHandler := handlers.NewCourseHandler(db)
	authHandler := handlers.NewAuthHandler(cfg, authSvc, db, calendarHandler)
	telegramHandler := handlers.NewTelegramHandler(db, telegramBot)
	assignmentHandler := handlers.NewAssignmentHandler(db)
	engine := router.New(cfg, authHandler, userHandler, calendarHandler, courseHandler, telegramHandler, assignmentHandler, authSvc, db, telegramBot)
	if err != nil {
		log.Printf("warning: failed to init telegram bot: %v", err)
	}

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

	// Start Telegram Bot in background
	botCtx, cancelBot := context.WithCancel(context.Background())
	defer cancelBot()
	if telegramBot != nil {
		go func() {
			if err := telegramBot.Start(botCtx); err != nil && err != context.Canceled {
				log.Printf("error: telegram bot unexpected stop: %v", err)
			}
		}()

		// Start Telegram Scheduler
		scheduler := bot.NewScheduler(telegramBot)
		go func() {
			if err := scheduler.Start(botCtx); err != nil && err != context.Canceled {
				log.Printf("error: telegram scheduler unexpected stop: %v", err)
			}
		}()
	}

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
