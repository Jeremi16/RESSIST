package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jeremi16/ressist-bot/internal/client"
	"github.com/jeremi16/ressist-bot/internal/config"
	"github.com/jeremi16/ressist-bot/internal/scheduler"
	"github.com/jeremi16/ressist-bot/internal/telegram"
)

func main() {
	cfg := config.Load()

	if cfg.BotServiceToken == "" {
		log.Fatalf("BOT_SERVICE_TOKEN is required (must match backend)")
	}

	apiClient := client.New(cfg.APIBaseURL, cfg.BotServiceToken)

	bot, err := telegram.New(cfg, apiClient)
	if err != nil {
		log.Fatalf("init telegram: %v", err)
	}

	// Health server so VPS/docker can probe bot separately from api.
	mux := http.NewServeMux()
	mux.HandleFunc("/livez", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	srv := &http.Server{
		Addr:              ":" + cfg.BotPort,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		log.Printf("ressist-bot health on :%s (api=%s)", cfg.BotPort, cfg.APIBaseURL)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("health server: %v", err)
		}
	}()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Scheduler runs in background; polling blocks.
	sched := scheduler.New(apiClient, bot.Send)
	go func() {
		if err := sched.Start(ctx); err != nil && err != context.Canceled {
			log.Printf("scheduler stopped: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-stop
		log.Printf("shutting down bot...")
		cancel()
		shCtx, shCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shCancel()
		_ = srv.Shutdown(shCtx)
	}()

	// Single poller in the whole deployment. Keep bot replicas=1 to avoid
	// "Conflict: terminated by other getUpdates request".
	if err := bot.Start(ctx); err != nil && err != context.Canceled {
		log.Printf("bot stopped: %v", err)
	}
}
