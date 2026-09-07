package telegram

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/jeremi16/resisst-bot/internal/client"
	"github.com/jeremi16/resisst-bot/internal/config"
)

// Bot polls Telegram and serves assignment queries 100% via resisst-api.
type Bot struct {
	api    *tgbotapi.BotAPI
	client *client.Client
	cfg    *config.Config
}

func New(cfg *config.Config, c *client.Client) (*Bot, error) {
	if strings.TrimSpace(cfg.TelegramBotToken) == "" {
		return nil, fmt.Errorf("TELEGRAM_BOT_TOKEN is missing")
	}
	api, err := tgbotapi.NewBotAPI(cfg.TelegramBotToken)
	if err != nil {
		return nil, err
	}
	return &Bot{api: api, client: c, cfg: cfg}, nil
}

// Send delivers a markdown message. Used by the scheduler too.
func (b *Bot) Send(chatID int64, text string) error {
	msg := tgbotapi.NewMessage(chatID, text)
	msg.ParseMode = "Markdown"
	_, err := b.api.Send(msg)
	return err
}

func (b *Bot) Start(ctx context.Context) error {
	log.Printf("authorized on account %s", b.api.Self.UserName)

	u := tgbotapi.NewUpdate(0)
	u.Timeout = b.cfg.PollTimeout
	updates := b.api.GetUpdatesChan(u)

	for {
		select {
		case <-ctx.Done():
			log.Printf("stopping telegram bot...")
			b.api.StopReceivingUpdates()
			return ctx.Err()
		case update := <-updates:
			if update.CallbackQuery != nil {
				b.handleCallback(update.CallbackQuery)
				continue
			}
			if update.Message == nil {
				continue
			}
			msg := update.Message
			if msg.IsCommand() {
				b.handleCommand(msg)
				continue
			}
			text := strings.TrimSpace(msg.Text)
			// Plain 6-char code behaves like /start <code> (legacy UX).
			if len(text) == 6 {
				b.handleVerify(msg, text)
			}
		}
	}
}

func (b *Bot) reply(chatID int64, text string) {
	msg := tgbotapi.NewMessage(chatID, text)
	msg.ParseMode = "Markdown"
	if _, err := b.api.Send(msg); err != nil {
		log.Printf("send to %d failed: %v", chatID, err)
	}
}

func (b *Bot) handleCommand(msg *tgbotapi.Message) {
	switch msg.Command() {
	case "start":
		if code := strings.TrimSpace(msg.CommandArguments()); code != "" {
			b.handleVerify(msg, code)
			return
		}
		b.reply(msg.Chat.ID, fmt.Sprintf(
			"Halo! Selamat datang di Resisst Bot. 🎓\n\nUntuk menghubungkan akun, buka Dashboard Resisst di website dan salin kode verifikasi Telegram Anda, lalu kirim di sini atau via `/start KODE`.\n\nContoh: `/start ABCD12`\n\nSetelah terhubung, coba `/tugas` untuk cek tugas.\n\nBot: @%s",
			b.cfg.TelegramBotUsername,
		))
	case "help":
		b.reply(msg.Chat.ID,
			"Daftar Perintah:\n"+
				"/start [KODE] - Menghubungkan akun\n"+
				"/tugas - Semua tugas belum selesai\n"+
				"/hariini - Deadline hari ini s/d besok\n"+
				"/minggu - Deadline 7 hari ke depan\n"+
				"/selesai <id> - Tandai tugas selesai\n"+
				"/status - Status koneksi & pengaturan\n"+
				"/help - Bantuan ini")
	case "tugas", "list":
		b.handleList(msg, "📚 *Daftar Tugas*\n", 0)
	case "hariini", "today":
		now := time.Now()
		b.handleListRange(msg, "📅 *Tugas Hari Ini s/d Besok*\n", now.Add(-1*time.Hour), endOfNextDay(now))
	case "minggu", "week":
		now := time.Now()
		b.handleListRange(msg, "🗓️ *Tugas 7 Hari ke Depan*\n", now.Add(-1*time.Hour), now.Add(7*24*time.Hour))
	case "selesai", "done":
		b.handleComplete(msg, strings.TrimSpace(msg.CommandArguments()))
	case "status":
		b.handleStatus(msg)
	default:
		b.reply(msg.Chat.ID, "Maaf, saya tidak mengerti perintah tersebut. Coba /help.")
	}
}

func (b *Bot) resolveUser(chatID int64) (*client.TelegramUser, error) {
	return b.client.GetUserByTelegram(strconv.FormatInt(chatID, 10))
}

func (b *Bot) handleVerify(msg *tgbotapi.Message, code string) {
	code = strings.ToUpper(strings.TrimSpace(code))
	chatStr := strconv.FormatInt(msg.Chat.ID, 10)
	username := ""
	if msg.From != nil {
		username = msg.From.UserName
	}
	res, err := b.client.VerifyTelegram(code, chatStr, username)
	if err != nil {
		b.reply(msg.Chat.ID, "❌ Kode verifikasi tidak valid atau sudah kadaluarsa. Silakan ambil kode baru di Dashboard.")
		return
	}
	b.reply(msg.Chat.ID, fmt.Sprintf("✅ Akun berhasil terhubung!\n\nHalo *%s*, Anda akan menerima notifikasi tugas di sini. Coba `/tugas` untuk cek tugas.", escape(res.Name)))
}

func (b *Bot) handleList(msg *tgbotapi.Message, title string, _ int) {
	user, err := b.resolveUser(msg.Chat.ID)
	if err != nil {
		b.reply(msg.Chat.ID, "❌ Akun Telegram ini belum terhubung. Kirim kode verifikasi dari Dashboard dulu ya.")
		return
	}
	items, err := b.client.GetAssignments(user.ID)
	if err != nil {
		log.Printf("GetAssignments failed: %v", err)
		b.reply(msg.Chat.ID, "⚠️ Gagal mengambil tugas. Coba lagi nanti.")
		return
	}
	b.sendAssignments(msg.Chat.ID, title, pending(items))
}

func (b *Bot) handleListRange(msg *tgbotapi.Message, title string, from, to time.Time) {
	user, err := b.resolveUser(msg.Chat.ID)
	if err != nil {
		b.reply(msg.Chat.ID, "❌ Akun Telegram ini belum terhubung. Kirim kode verifikasi dari Dashboard dulu ya.")
		return
	}
	items, err := b.client.GetAssignments(user.ID)
	if err != nil {
		log.Printf("GetAssignments failed: %v", err)
		b.reply(msg.Chat.ID, "⚠️ Gagal mengambil tugas. Coba lagi nanti.")
		return
	}
	b.sendAssignments(msg.Chat.ID, title, filterDue(items, from, to))
}

func (b *Bot) sendAssignments(chatID int64, title string, items []client.Assignment) {
	text := formatAssignmentList(title, items)
	if len(items) == 0 {
		b.reply(chatID, text)
		return
	}
	// Attach inline "Selesai" buttons (max 5 to stay under Telegram limits).
	msg := tgbotapi.NewMessage(chatID, text)
	msg.ParseMode = "Markdown"
	var rows [][]tgbotapi.InlineKeyboardButton
	for i, a := range items {
		if i >= 5 {
			break
		}
		label := "✅ " + truncateRunes(a.Title, 24)
		rows = append(rows, tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData(label, "done:"+a.ID),
		))
	}
	msg.ReplyMarkup = tgbotapi.NewInlineKeyboardMarkup(rows...)
	if _, err := b.api.Send(msg); err != nil {
		log.Printf("send to %d failed: %v", chatID, err)
	}
}

func (b *Bot) handleComplete(msg *tgbotapi.Message, arg string) {
	if arg == "" {
		b.reply(msg.Chat.ID, "Pakai: `/selesai <id>` — id tertera di daftar `/tugas`.")
		return
	}
	user, err := b.resolveUser(msg.Chat.ID)
	if err != nil {
		b.reply(msg.Chat.ID, "❌ Akun Telegram ini belum terhubung.")
		return
	}
	if err := b.client.CompleteAssignment(user.ID, arg); err != nil {
		b.reply(msg.Chat.ID, "❌ Gagal menandai selesai. Pastikan id benar (lihat `/tugas`).")
		return
	}
	b.reply(msg.Chat.ID, "✅ Tugas ditandai selesai. Mantap! 💪")
}

func (b *Bot) handleStatus(msg *tgbotapi.Message) {
	user, err := b.resolveUser(msg.Chat.ID)
	if err != nil {
		b.reply(msg.Chat.ID, "❌ Belum terhubung. Kirim kode verifikasi dari Dashboard.")
		return
	}
	full, err := b.client.GetUser(user.ID)
	if err != nil {
		b.reply(msg.Chat.ID, "⚠️ Gagal mengambil status. Coba lagi nanti.")
		return
	}
	classCode := "-"
	if full.ClassCode != nil && *full.ClassCode != "" {
		classCode = *full.ClassCode
	}
	b.reply(msg.Chat.ID, fmt.Sprintf(
		"👤 *Status Akun*\n\nNama: %s\nTelegram: %s\nMorning briefing: %v\nReminder hours: %s\nMuted courses: %s\nClass code: %s",
		escape(full.Name), boolID(full.TelegramEnabled), full.MorningBriefing,
		escape(emptyDefault(full.ReminderHours, "[24]")), escape(emptyDefault(full.MutedCourses, "[]")), escape(classCode),
	))
}

func (b *Bot) handleCallback(q *tgbotapi.CallbackQuery) {
	data := strings.TrimSpace(q.Data)
	if !strings.HasPrefix(data, "done:") {
		return
	}
	assignmentID := strings.TrimPrefix(data, "done:")
	var chatID int64
	if q.Message != nil {
		chatID = q.Message.Chat.ID
	} else if q.From != nil {
		// Fallback: cannot resolve chat without message; acknowledge only.
		b.answerCallback(q.ID, "Tidak bisa resolve chat.")
		return
	}
	user, err := b.resolveUser(chatID)
	if err != nil {
		b.answerCallback(q.ID, "Belum terhubung.")
		return
	}
	if err := b.client.CompleteAssignment(user.ID, assignmentID); err != nil {
		b.answerCallback(q.ID, "Gagal menandai selesai.")
		return
	}
	b.answerCallback(q.ID, "Ditandai selesai ✅")
	if _, err := b.api.Send(tgbotapi.NewMessage(chatID, "✅ Tugas ditandai selesai. Mantap! 💪")); err != nil {
		log.Printf("send to %d failed: %v", chatID, err)
	}
}

func (b *Bot) answerCallback(id, text string) {
	cb := tgbotapi.NewCallback(id, text)
	if _, err := b.api.Request(cb); err != nil {
		log.Printf("callback answer failed: %v", err)
	}
}

func endOfNextDay(now time.Time) time.Time {
	return time.Date(now.Year(), now.Month(), now.Day()+1, 23, 59, 59, 0, now.Location())
}

func boolID(v bool) string {
	if v {
		return "terhubung ✅"
	}
	return "nonaktif ❌"
}

func emptyDefault(s, def string) string {
	if strings.TrimSpace(s) == "" {
		return def
	}
	return s
}

func truncateRunes(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "…"
}
