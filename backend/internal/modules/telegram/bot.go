package telegram

import (
	"context"
	"fmt"
	"log"
	"strings"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/jeremi16/resisst-api/internal/config"
	"github.com/jeremi16/resisst-api/internal/models"
	"gorm.io/gorm"
)

// Bot wraps telegram API with DB and config.
type Bot struct {
	api *tgbotapi.BotAPI
	db  *gorm.DB
	cfg *config.Config
}

// NewBot creates a new Telegram Bot instance.
func NewBot(cfg *config.Config, db *gorm.DB) (*Bot, error) {
	if cfg.TelegramBotToken == "" {
		return nil, fmt.Errorf("telegram bot token is missing")
	}
	api, err := tgbotapi.NewBotAPI(cfg.TelegramBotToken)
	if err != nil {
		return nil, err
	}
	return &Bot{
		api: api,
		db:  db,
		cfg: cfg,
	}, nil
}

// Start begins polling for updates.
func (b *Bot) Start(ctx context.Context) error {
	log.Printf("authorized on account %s", b.api.Self.UserName)

	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60
	updates := b.api.GetUpdatesChan(u)

	for {
		select {
		case <-ctx.Done():
			log.Printf("stopping telegram bot...")
			return ctx.Err()
		case update := <-updates:
			if update.Message == nil {
				continue
			}
			if update.Message.IsCommand() {
				b.handleCommand(update.Message)
			} else {
				text := strings.TrimSpace(update.Message.Text)
				if len(text) == 6 {
					b.verifyCode(update.Message, text)
				}
			}
		}
	}
}

func (b *Bot) handleCommand(msg *tgbotapi.Message) {
	switch msg.Command() {
	case "start":
		b.handleStartCommand(msg)
	case "help":
		b.handleHelpCommand(msg)
	default:
		reply := tgbotapi.NewMessage(msg.Chat.ID, "Maaf, saya tidak mengerti perintah tersebut.")
		b.api.Send(reply)
	}
}

func (b *Bot) handleStartCommand(msg *tgbotapi.Message) {
	code := strings.TrimSpace(msg.CommandArguments())
	if code == "" {
		reply := tgbotapi.NewMessage(msg.Chat.ID, "Halo! Selamat datang di Resisst Bot. 🎓\n\nUntuk menghubungkan akun Anda, silakan buka Dashboard Resisst di website dan salin kode verifikasi Telegram Anda, lalu kirimkan kode tersebut di sini.\n\nContoh: `ABCD12`")
		reply.ParseMode = "Markdown"
		b.api.Send(reply)
		return
	}
	b.verifyCode(msg, code)
}

func (b *Bot) verifyCode(msg *tgbotapi.Message, code string) {
	var user models.User
	chatIDStr := fmt.Sprintf("%d", msg.Chat.ID)

	err := b.db.Where("telegram_verify_code = ? AND telegram_verify_expires > NOW()", code).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			reply := tgbotapi.NewMessage(msg.Chat.ID, "❌ Kode verifikasi tidak valid atau sudah kadaluarsa. Silakan ambil kode baru di Dashboard.")
			b.api.Send(reply)
		} else {
			log.Printf("error finding user by telegram code: %v", err)
			reply := tgbotapi.NewMessage(msg.Chat.ID, "⚠️ Terjadi kesalahan sistem. Silakan coba lagi nanti.")
			b.api.Send(reply)
		}
		return
	}

	username := msg.From.UserName
	updates := map[string]interface{}{
		"telegram_chat_id":        &chatIDStr,
		"telegram_enabled":        true,
		"telegram_username":       &username,
		"telegram_verify_code":    nil,
		"telegram_verify_expires": nil,
	}
	if err := b.db.Model(&user).Updates(updates).Error; err != nil {
		log.Printf("error updating user telegram chat id: %v", err)
		reply := tgbotapi.NewMessage(msg.Chat.ID, "⚠️ Gagal menghubungkan akun. Silakan coba lagi nanti.")
		b.api.Send(reply)
		return
	}

	successMsg := fmt.Sprintf("✅ Akun berhasil terhubung!\n\nHalo *%s*, Anda sekarang akan menerima notifikasi tugas langsung di sini.", user.Name)
	reply := tgbotapi.NewMessage(msg.Chat.ID, successMsg)
	reply.ParseMode = "Markdown"
	b.api.Send(reply)
}

func (b *Bot) handleHelpCommand(msg *tgbotapi.Message) {
	helpText := "Daftar Perintah:\n" +
		"/start - Memulai bot dan menghubungkan akun\n" +
		"/help - Menampilkan bantuan ini"
	reply := tgbotapi.NewMessage(msg.Chat.ID, helpText)
	b.api.Send(reply)
}
