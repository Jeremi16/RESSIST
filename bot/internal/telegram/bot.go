package telegram

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/jeremi16/ressist-bot/internal/client"
	"github.com/jeremi16/ressist-bot/internal/config"
)

// Bot polls Telegram and serves assignment queries 100% via ressist-api.
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
			"Halo! Selamat datang di Ressist Bot. 🎓\n\nUntuk menghubungkan akun, buka Dashboard Ressist di website dan salin kode verifikasi Telegram Anda, lalu kirim di sini atau via `/start KODE`.\n\nContoh: `/start ABCD12`\n\nSetelah terhubung, coba `/tugas` untuk cek tugas.\n\nBot: @%s",
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
		b.handleListFiltered(msg, "all", 0, 0)
	case "hariini", "today":
		b.handleListFiltered(msg, "today", 0, 0)
	case "minggu", "week":
		b.handleListFiltered(msg, "week", 0, 0)
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
	b.handleListFiltered(msg, "all", 0, 0)
}

func (b *Bot) handleListRange(msg *tgbotapi.Message, title string, from, to time.Time) {
	// legacy range — map to filter via direct send at page 0 without extra fetch cycle
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
	filtered := filterDue(items, from, to)
	b.sendAssignmentsPaged(msg.Chat.ID, title, filtered, 0, "custom", 0)
}

func (b *Bot) handleListFiltered(msg *tgbotapi.Message, filter string, page int, messageID int) {
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
	filtered := applyFilter(items, filter)
	title := titleForFilter(filter)
	b.sendAssignmentsPaged(msg.Chat.ID, title, filtered, page, filter, messageID)
}

func titleForFilter(filter string) string {
	switch filter {
	case "today":
		return "📅 *Tugas Hari Ini s/d Besok*\n"
	case "week":
		return "🗓️ *Tugas 7 Hari ke Depan*\n"
	default:
		return "📚 *Daftar Tugas*\n"
	}
}

func applyFilter(items []client.Assignment, filter string) []client.Assignment {
	switch filter {
	case "today":
		now := time.Now()
		return filterDue(items, now.Add(-1*time.Hour), endOfNextDay(now))
	case "week":
		now := time.Now()
		return filterDue(items, now.Add(-1*time.Hour), now.Add(7*24*time.Hour))
	default:
		return pending(items)
	}
}

func (b *Bot) sendAssignments(chatID int64, title string, items []client.Assignment) {
	b.sendAssignmentsPaged(chatID, title, items, 0, "all", 0)
}

func (b *Bot) sendAssignmentsPaged(chatID int64, title string, items []client.Assignment, page int, filter string, messageID int) {
	if len(items) == 0 {
		text := formatAssignmentListPaged(title, items, 0)
		if messageID != 0 {
			b.editMessage(chatID, messageID, text, nil)
		} else {
			b.reply(chatID, text)
		}
		return
	}
	total := len(items)
	pages := (total + pageSize - 1) / pageSize
	if page < 0 {
		page = 0
	}
	if page >= pages {
		page = pages - 1
	}
	text := formatAssignmentListPaged(title, items, page)
	markup := buildAssignmentsKeyboard(items, page, pages, filter)
	if messageID != 0 {
		b.editMessage(chatID, messageID, text, markup)
		return
	}
	msg := tgbotapi.NewMessage(chatID, text)
	msg.ParseMode = "Markdown"
	if markup != nil {
		msg.ReplyMarkup = markup
	}
	if _, err := b.api.Send(msg); err != nil {
		log.Printf("send to %d failed: %v", chatID, err)
	}
}

func buildAssignmentsKeyboard(items []client.Assignment, page, pages int, filter string) *tgbotapi.InlineKeyboardMarkup {
	if len(items) == 0 {
		return nil
	}
	var rows [][]tgbotapi.InlineKeyboardButton

	// filter switcher (highlight active with •)
	allLabel, todayLabel, weekLabel := "📚 Semua", "📅 Hari Ini", "🗓️ Minggu"
	switch filter {
	case "today":
		todayLabel = "• 📅 Hari Ini •"
	case "week":
		weekLabel = "• 🗓️ Minggu •"
	case "custom":
		// no highlight
	default:
		allLabel = "• 📚 Semua •"
	}
	rows = append(rows, tgbotapi.NewInlineKeyboardRow(
		tgbotapi.NewInlineKeyboardButtonData(allLabel, "filter:all"),
		tgbotapi.NewInlineKeyboardButtonData(todayLabel, "filter:today"),
		tgbotapi.NewInlineKeyboardButtonData(weekLabel, "filter:week"),
	))

	start := page * pageSize
	end := start + pageSize
	if end > len(items) {
		end = len(items)
	}
	pageItems := items[start:end]
	for i, a := range pageItems {
		globalIdx := start + i
		// two buttons per task: Selesai + Detail
		if isClassroom(a) {
			// Classroom read-only → only Detail
			rows = append(rows, tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData(fmt.Sprintf("🔍 %d. Detail", globalIdx+1), "detail:"+a.ID),
			))
		} else {
			rows = append(rows, tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData(fmt.Sprintf("✅ %d", globalIdx+1), "done:"+a.ID),
				tgbotapi.NewInlineKeyboardButtonData(fmt.Sprintf("🔍 %d. Detail", globalIdx+1), "detail:"+a.ID),
			))
		}
		// URL row if available
		if a.URL != nil && strings.TrimSpace(*a.URL) != "" {
			rows = append(rows, tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonURL(fmt.Sprintf("🔗 Buka %d", globalIdx+1), strings.TrimSpace(*a.URL)),
			))
		}
	}

	// pagination footer
	if pages > 1 {
		var navRow []tgbotapi.InlineKeyboardButton
		if page > 0 {
			navRow = append(navRow, tgbotapi.NewInlineKeyboardButtonData("◀ Prev", fmt.Sprintf("page:%d:%s", page-1, filter)))
		} else {
			navRow = append(navRow, tgbotapi.NewInlineKeyboardButtonData("—", "noop"))
		}
		navRow = append(navRow, tgbotapi.NewInlineKeyboardButtonData(fmt.Sprintf("%d/%d", page+1, pages), "noop"))
		if page < pages-1 {
			navRow = append(navRow, tgbotapi.NewInlineKeyboardButtonData("Next ▶", fmt.Sprintf("page:%d:%s", page+1, filter)))
		} else {
			navRow = append(navRow, tgbotapi.NewInlineKeyboardButtonData("—", "noop"))
		}
		rows = append(rows, navRow)
	}

	markup := tgbotapi.NewInlineKeyboardMarkup(rows...)
	return &markup
}

func (b *Bot) editMessage(chatID int64, messageID int, text string, markup *tgbotapi.InlineKeyboardMarkup) {
	edit := tgbotapi.NewEditMessageText(chatID, messageID, text)
	edit.ParseMode = "Markdown"
	if markup != nil {
		edit.ReplyMarkup = markup
	}
	if _, err := b.api.Send(edit); err != nil {
		// fallback to edit markup separately or send new message if text unchanged
		if strings.Contains(err.Error(), "message is not modified") {
			if markup != nil {
				em := tgbotapi.NewEditMessageReplyMarkup(chatID, messageID, *markup)
				if _, err2 := b.api.Send(em); err2 != nil {
					log.Printf("edit markup to %d failed: %v", chatID, err2)
				}
			}
			return
		}
		log.Printf("edit to %d failed: %v", chatID, err)
		// fallback: send new message
		msg := tgbotapi.NewMessage(chatID, text)
		msg.ParseMode = "Markdown"
		if markup != nil {
			msg.ReplyMarkup = markup
		}
		if _, err2 := b.api.Send(msg); err2 != nil {
			log.Printf("fallback send to %d failed: %v", chatID, err2)
		}
	}
}

func (b *Bot) sendDetail(chatID int64, messageID int, assignmentID string) {
	user, err := b.resolveUser(chatID)
	if err != nil {
		b.answerCallbackForDetail(chatID, messageID, "Belum terhubung.")
		return
	}
	items, err := b.client.GetAssignments(user.ID)
	if err != nil {
		b.answerCallbackForDetail(chatID, messageID, "Gagal ambil tugas.")
		return
	}
	var target *client.Assignment
	for _, a := range items {
		if a.ID == assignmentID {
			aa := a
			target = &aa
			break
		}
	}
	if target == nil {
		b.answerCallbackForDetail(chatID, messageID, "Tugas tidak ditemukan.")
		return
	}
	text := formatDetail(*target)
	var rows [][]tgbotapi.InlineKeyboardButton
	if !target.Completed && !isClassroom(*target) {
		rows = append(rows, tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✅ Tandai Selesai", "done:"+target.ID),
		))
	}
	if target.URL != nil && strings.TrimSpace(*target.URL) != "" {
		rows = append(rows, tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonURL("🔗 Buka di Moodle/Classroom", strings.TrimSpace(*target.URL)),
		))
	}
	rows = append(rows, tgbotapi.NewInlineKeyboardRow(
		tgbotapi.NewInlineKeyboardButtonData("⬅️ Kembali ke daftar", "filter:all"),
	))
	markup := tgbotapi.NewInlineKeyboardMarkup(rows...)
	if messageID != 0 {
		b.editMessage(chatID, messageID, text, &markup)
	} else {
		msg := tgbotapi.NewMessage(chatID, text)
		msg.ParseMode = "Markdown"
		msg.ReplyMarkup = markup
		if _, err := b.api.Send(msg); err != nil {
			log.Printf("send detail to %d failed: %v", chatID, err)
		}
	}
}

func (b *Bot) answerCallbackForDetail(chatID int64, messageID int, text string) {
	// best effort callback answer is handled by caller; here just send message if needed
	_ = messageID
	_ = chatID
	_ = text
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
	var chatID int64
	var messageID int
	if q.Message != nil {
		chatID = q.Message.Chat.ID
		messageID = q.Message.MessageID
	} else if q.From != nil {
		b.answerCallback(q.ID, "Tidak bisa resolve chat.")
		return
	}

	// noop
	if data == "noop" || data == "" {
		b.answerCallback(q.ID, " ")
		return
	}

	// detail
	if strings.HasPrefix(data, "detail:") {
		assignmentID := strings.TrimPrefix(data, "detail:")
		// answer quickly to remove loading
		b.answerCallback(q.ID, "Membuka detail…")
		b.sendDetail(chatID, messageID, assignmentID)
		return
	}

	// filter:all|today|week
	if strings.HasPrefix(data, "filter:") {
		filter := strings.TrimPrefix(data, "filter:")
		if filter == "" {
			filter = "all"
		}
		b.answerCallback(q.ID, "Memuat…")
		b.refreshList(chatID, messageID, filter, 0)
		return
	}

	// page:<n>:<filter>
	if strings.HasPrefix(data, "page:") {
		rest := strings.TrimPrefix(data, "page:")
		parts := strings.SplitN(rest, ":", 2)
		if len(parts) == 0 {
			b.answerCallback(q.ID, " ")
			return
		}
		page, err := strconv.Atoi(parts[0])
		if err != nil {
			b.answerCallback(q.ID, " ")
			return
		}
		filter := "all"
		if len(parts) == 2 && parts[1] != "" {
			filter = parts[1]
		}
		b.answerCallback(q.ID, " ")
		b.refreshList(chatID, messageID, filter, page)
		return
	}

	// done:<id>
	if strings.HasPrefix(data, "done:") {
		assignmentID := strings.TrimPrefix(data, "done:")
		user, err := b.resolveUser(chatID)
		if err != nil {
			b.answerCallback(q.ID, "Belum terhubung.")
			return
		}
		// guard Classroom read-only: check source via fetching assignments
		if items, err := b.client.GetAssignments(user.ID); err == nil {
			for _, a := range items {
				if a.ID == assignmentID && isClassroom(a) {
					b.answerCallback(q.ID, "Classroom read-only, ikuti Classroom.")
					return
				}
			}
		}
		if err := b.client.CompleteAssignment(user.ID, assignmentID); err != nil {
			// surface BE message if Classroom read-only
			if strings.Contains(strings.ToLower(err.Error()), "classroom") {
				b.answerCallback(q.ID, "Classroom read-only.")
			} else {
				b.answerCallback(q.ID, "Gagal menandai selesai.")
			}
			return
		}
		b.answerCallback(q.ID, "Ditandai selesai ✅")
		// try to refresh the list view in place if this was a list message
		// heuristic: if original message text contains Daftar/Hari Ini/Minggu, refresh
		refreshed := false
		if q.Message != nil && q.Message.Text != "" {
			txt := q.Message.Text
			if strings.Contains(txt, "Daftar Tugas") || strings.Contains(txt, "Hari Ini") || strings.Contains(txt, "Hari ke Depan") || strings.Contains(txt, "hal ") {
				// try to keep same filter if we can infer, default all
				filter := "all"
				if strings.Contains(txt, "Hari Ini") {
					filter = "today"
				} else if strings.Contains(txt, "Hari ke Depan") {
					filter = "week"
				}
				// keep same page if we can parse "hal X/Y", else 0
				page := 0
				if idx := strings.Index(txt, "hal "); idx != -1 {
					rest := txt[idx+4:]
					if parts := strings.Fields(rest); len(parts) > 0 {
						if slash := strings.Split(parts[0], "/"); len(slash) == 2 {
							if p, err := strconv.Atoi(slash[0]); err == nil && p > 0 {
								page = p - 1
							}
						}
					}
				}
				b.refreshList(chatID, messageID, filter, page)
				refreshed = true
			}
		}
		if !refreshed {
			if _, err := b.api.Send(tgbotapi.NewMessage(chatID, "✅ Tugas ditandai selesai. Mantap! 💪\nKetik /tugas untuk lihat sisa tugas.")); err != nil {
				log.Printf("send to %d failed: %v", chatID, err)
			}
		} else {
			// also send ephemeral confirmation via answer already, plus maybe a small toast message
			// we already refreshed list, optionally send a tiny follow-up that auto-deletes? skip for now
		}
		return
	}
}

func (b *Bot) refreshList(chatID int64, messageID int, filter string, page int) {
	user, err := b.resolveUser(chatID)
	if err != nil {
		b.editMessage(chatID, messageID, "❌ Belum terhubung. Kirim kode verifikasi dari Dashboard.", nil)
		return
	}
	items, err := b.client.GetAssignments(user.ID)
	if err != nil {
		log.Printf("GetAssignments for refresh failed: %v", err)
		return
	}
	filtered := applyFilter(items, filter)
	title := titleForFilter(filter)
	b.sendAssignmentsPaged(chatID, title, filtered, page, filter, messageID)
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
