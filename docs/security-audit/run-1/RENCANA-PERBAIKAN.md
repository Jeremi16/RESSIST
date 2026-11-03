# RENCANA PERBAIKAN — RESSIST backend/

Turunan dari audit `run-1` (23 lead `needs_validation`, 0 `confirmed`). Karena tidak ada sandbox, rencana ini **tidak menunggu validasi runtime**: setiap item di bawah adalah kontrol yang hilang dan patch-nya aman diterapkan tanpa observasi. Validasi runtime hanya menentukan *prioritas*, bukan *apakah* diperbaiki.

Legenda usaha: **S** ≤ 0,5 hari · **M** 1–2 hari · **L** 3–5 hari.

---

## WS-0 — Kredensial (lakukan hari ini, sebelum menyentuh kode)

| # | Tindakan | Detail |
|---|---|---|
| 0.1 | **Rotasi semua nilai** `backend/.env` | `DATABASE_URL`, `GOOGLE_CLIENT_SECRET`, `JWT_ACCESS_SECRET`, `BOT_SERVICE_TOKEN`, `TELEGRAM_BOT_TOKEN`. Rotasi `JWT_ACCESS_SECRET` otomatis me-logout semua sesi — jadwalkan di luar jam ujian. |
| 0.2 | ~~Cek kebocoran riwayat git~~ **SUDAH DIVERIFIKASI BERSIH** | `git ls-files backend/.env` → tidak ter-track; `git log --all -- backend/.env` → kosong; `.gitignore:16` sudah memuat `.env`. Tidak perlu `git filter-repo`. |
| 0.3 | Pertahankan status tak-ter-track | Jangan pernah `git add -f backend/.env`. Tambahkan juga `backend/.env.*` bila nanti ada varian. |
| 0.4 | **Pindahkan ke secret manager** | Coolify/Docker secrets atau env injection; `godotenv.Load()` hanya untuk lokal (sudah begitu, aman). Nilai live saat ini ada sebagai file plaintext di disk — itu risiko yang tersisa, bukan risiko riwayat git. |
| 0.5 | **`.env.example` jangan berisi nilai nyata** | Saat ini `REFRESH_REUSE_GRACE_SECONDS=300` di example berbeda dari default kode 30 — lihat WS-8.3. |

**Usaha: S.** Ini satu-satunya item yang eksploitasinya tidak butuh apa pun selain akses file.

---

## WS-1 — Batas kepercayaan & rate limiting · usaha **M**

Akar masalah bersama untuk lead #2 dan #4: `gin.New()` tanpa `SetTrustedProxies` membuat `c.ClientIP()` = nilai yang dikirim klien.

### 1.1 Kunci trusted proxy (`router.go:39`)
```go
r := gin.New()
// TRUSTED_PROXIES: CIDR yang boleh mengisi X-Forwarded-For.
// Kosong = tidak ada proxy tepercaya → ClientIP() = RemoteAddr (aman untuk
// deployment tanpa proxy; set eksplisit bila di belakang Coolify/Traefik).
if len(cfg.TrustedProxies) == 0 {
    _ = r.SetTrustedProxies(nil)
} else if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
    // router.New mengembalikan *gin.Engine (bukan error), jadi konfigurasi
    // yang salah harus gagal saat load config, bukan di sini.
    panic(fmt.Sprintf("invalid TRUSTED_PROXIES: %v", err))
}
```
Tambah `TrustedProxies []string` di `config.Config` + `getEnvAsList("TRUSTED_PROXIES", "")` (`config.go:231` sudah punya helper-nya) + validasi `net.ParseCIDR` **di `config.Load()`** dengan fail fast (kembalikan error, jangan diam-diam longgar). `router.New` sendiri tidak punya jalur error — jadi jangan mengubah signature-nya hanya untuk ini; validasi cukup di config, dan sisa `panic` di atas hanya jaring pengaman.

**Efek berantai:** memperbaiki bucket rate-limit auth (#2), bucket API-key (#4), dan `client_ip` di access log/`refresh_tokens.ip_address`.

### 1.2 Pre-limiter murah sebelum auth (`router.go:118,128,135,159`)
`apiKeyRateLimit` saat ini **setelah** `APIKeyOrJWT`, jadi request tanpa kredensial valid tetap melakukan sha256 + SELECT `api_keys` + load user sebelum ditolak limiter. Tambah limiter IP murah di depan:
```go
preLimit := middleware.IPRateLimit(cfg.PreAuthRateLimitPerMinute, cfg.PreAuthRateLimitBurst) // mis. 300/60
calendarGroup.Use(preLimit, middleware.APIKeyOrJWT(...), apiKeyRateLimit)
```
`IPRateLimit` = `AuthRateLimit` tanpa nama auth (reuse `newIPRateLimiter`). Ini menutup "work imbalance pra-auth".

### 1.3 Limiter yang hilang — lead #16 (`router.go:150-155`)
```go
telegramGroup := v1.Group("/telegram")
telegramGroup.Use(
    middleware.AccessToken(tokenParser),
    middleware.PrincipalRateLimit(cfg.TelegramTestRateLimitPerMinute, cfg.TelegramTestRateLimitBurst),
)
telegramGroup.POST("/test-reminder", telegramSender.Handler.SendTestReminder)
telegramGroup.POST("/test-briefing", telegramSender.Handler.SendMorningBriefing)
```
`POST /v1/telegram/test-reminder` dan `/test-briefing` adalah satu-satunya grup terautentikasi **tanpa limiter sama sekali** (`router.go:152` hanya memasang `AccessToken`), padahal keduanya memicu panggilan keluar melalui **satu** `TELEGRAM_BOT_TOKEN` bersama yang juga dipakai seluruh reminder dan briefing terjadwal. Kuota Telegram adalah sumber daya operator yang dipakai bersama semua mahasiswa.

Dua hal yang harus ikut diperbaiki di jalur ini, karena limiter saja tidak cukup:

**(a) Tidak ada deadline pada panggilan keluar.** `SendMessage` (`service.go:17-22`) memanggil `b.api.Send(msg)` di goroutine request. `TimeoutContext` (`middleware/timeout.go:17-22`) **memang** memasang deadline pada `c.Request.Context()` — tetapi panggilan itu tidak pernah membacanya: `tgbotapi.NewBotAPI` membangun `&http.Client{}` **tanpa** `Timeout`, dan `MakeRequest` memakai `http.NewRequest` tanpa context. Jadi deadline request hanya diperiksa **setelah** `c.Next()` selesai (`timeout.go:24`), tidak bisa memutus panggilan yang sedang berjalan. `WriteTimeout` (`main.go:72`) menutup koneksi klien, bukan goroutine handler. Satu upstream yang menggantung menahan goroutine + socket tanpa batas.

Perbaikan: bungkus pengiriman dengan context ber-deadline dan pakai API yang menerimanya, atau bangun klien sendiri:
```go
// di NewBot
api, err := tgbotapi.NewBotAPIWithClient(cfg.TelegramBotToken, tgbotapi.APIEndpoint, &http.Client{
    Timeout: 10 * time.Second,
})
```
lalu di handler gunakan `c.Request.Context()` agar disconnect klien membatalkan kirim.

**(b) Pra-kirim tidak dibatasi.** `SendMorningBriefing` (`telegram/handler.go:161`) memilih **semua** event pending dalam jendela `now..akhir hari berikutnya` dengan `Find` tanpa `Limit`, lalu menyambung semuanya jadi satu body. Tambahkan `LIMIT` (mis. 50) + catatan "dan N tugas lainnya".

**Definition of done:** request ke-6 `/v1/telegram/test-briefing` dalam semenit → 429; mock Bot API yang menerima koneksi lalu diam → handler kembali dalam ≤10 detik, bukan menggantung.

### 1.4 Bucket per-principal, bukan per-alamat
Untuk endpoint berbiaya (preview force, sync, telegram test), kunci bucket ke **user id** yang sudah terautentikasi, bukan IP:
```go
func PrincipalRateLimit(perMinute, burst int) gin.HandlerFunc {
    // kunci = "u:"+AuthenticatedUserID(c) ; fallback IP bila tidak ada
}
```
Ini membuat replika/rotasi IP tidak mengalikan kuota.

**Definition of done:** `curl` 11× `/v1/auth/refresh` dengan `X-Forwarded-For` berbeda → request ke-11 **429** (sekarang: 200 semua). Test unit: fixture `gin.New()` + `SetTrustedProxies(nil)`.

### 1.5 `Cache-Control` + `Vary` pada respons berkredensial (lead #5)

Seluruh rantai middleware (`router.go:40-63`) tidak pernah menyetel `Cache-Control`, `Pragma`, atau `Expires` — pencarian di seluruh `backend/` mengembalikan nol kemunculan token itu. Satu-satunya `Vary` yang muncul adalah `Vary: Origin` dari `gin-contrib/cors`, dan itu **tidak** membedakan principal.

Yang membuat ini berbeda dari sekadar "header kurang lengkap": kredensial di `GET /v1/user`, `/v1/calendar/*`, `/v1/courses`, `/v1/assignments` bisa datang lewat **`X-API-Key`** (`auth.go:68-75`), bukan `Authorization`. RFC 9111 memperlakukan `Authorization` sebagai sinyal yang menghalangi shared cache menyimpan respons, tetapi **tidak** berlaku untuk header kredensial buatan sendiri seperti `X-API-Key`. Jadi bila ada reverse proxy dengan caching di depan origin, dua pengguna berbeda yang meminta URL sama dapat menerima body yang sama — dan `buildUserResponse` (`user/handler.go:364-369`) memuat `MoodleCalendarURL` (yang berisi token authtoken Moodle), `TelegramChatID`, dan `WhatsAppNumber`.

```go
// dipasang global, setelah RequestID, sebelum grup mana pun
r.Use(func(c *gin.Context) {
    c.Header("Cache-Control", "no-store")
    c.Header("Vary", "X-API-Key, Authorization")
    c.Next()
})
```
`no-store` lebih tepat daripada `no-cache` di sini: respons ini berisi rahasia per-pengguna dan tidak layak disimpan di disk cache mana pun.

**Catatan prioritas:** ini **hanya** berdampak bila ada shared cache di depan origin — dan repo tidak memuat konfigurasi nginx/CDN apa pun (`docker-compose.yml` mempublikasikan `api` langsung di `${API_PORT}`). Jadi kemungkinan besar ini bukan kerentanan aktif saat ini, tetapi biayanya dua baris dan menghapus seluruh kelas risiko bila topologi berubah. **Jangan tunda sprint lain untuk ini.**

---

## WS-2 — SSRF & fetch keluar · usaha **M** · **prioritas tertinggi**

Lead #1. `IsLikelyMoodleCalendarURL` hanya mencocokkan substring path, dan `FetchMoodleCalendar` tidak punya kebijakan redirect/egress.

### 2.1 Validasi URL yang sebenarnya (`urlutil.go:20`)
```go
var ErrUnsafeURL = errors.New("unsafe url")

func ValidateOutboundHTTPURL(rawURL string, allowHTTP bool) (*url.URL, error) {
    u, err := url.Parse(strings.TrimSpace(rawURL))
    if err != nil { return nil, ErrUnsafeURL }
    if u.User != nil { return nil, ErrUnsafeURL }            // userinfo@host
    switch u.Scheme {
    case "https":
    case "http":
        if !allowHTTP { return nil, ErrUnsafeURL }
    default:
        return nil, ErrUnsafeURL
    }
    if u.Hostname() == "" { return nil, ErrUnsafeURL }
    return u, nil
}
```
Pertahankan `IsLikelyMoodleCalendarURL` sebagai **filter bentuk**, bukan otorisasi; tambahkan validasi di **dua** titik:
- `user/handler.go:254` `validateUpdateRequest` — tolak simpan (400).
- `moodle/client.go:60` `FetchMoodleCalendar` — tolak fetch (**wajib**, karena baris lama di DB bisa berisi URL jahat).

### 2.2 Tolak alamat privat di lapisan dial (tahan DNS rebinding)
```go
var privBlocks = mustCIDRs("127.0.0.0/8","10.0.0.0/8","172.16.0.0/12",
    "192.168.0.0/16","169.254.0.0/16","::1/128","fc00::/7","fe80::/10")

client := &http.Client{
    Timeout: 12 * time.Second,
    Transport: &http.Transport{
        DialContext: (&net.Dialer{
            Timeout: 5 * time.Second,
            Control: func(network, addr string, _ syscall.RawConn) error {
                host, _, _ := net.SplitHostPort(addr)
                ip := net.ParseIP(host)
                if ip == nil || inAnyBlock(ip, privBlocks) {
                    return fmt.Errorf("egress blocked: %s", addr)
                }
                return nil
            },
        }).DialContext,
    },
    CheckRedirect: func(req *http.Request, via []*http.Request) error {
        if len(via) >= 3 { return errors.New("too many redirects") }
        _, err := ValidateOutboundHTTPURL(req.URL.String(), false)
        return err
    },
}
```
`Control` dipanggil **setelah** resolusi DNS, jadi hostname yang me-resolve ke `127.0.0.1` tetap tertolak.

### 2.3 Batas body + validasi content-type (`moodle/client.go:79`)
```go
const maxCalendarBytes = 8 << 20 // 8 MiB
data, err := io.ReadAll(io.LimitReader(resp.Body, maxCalendarBytes+1))
if err != nil { return "", err }
if len(data) > maxCalendarBytes {
    return "", fmt.Errorf("moodle calendar exceeds %d bytes", maxCalendarBytes)
}
```
Jika perlu konfigurabel: `MOODLE_MAX_CALENDAR_BYTES`.

**Definition of done:** tabel uji `ValidateOutboundHTTPURL` menolak `http://169.254.169.254/...?authtoken=a&userid=1`, `http://moodle.itera.ac.id@127.0.0.1/calendar.ics`, `file://`, `gopher://`; dan `FetchMoodleCalendar` ke `127.0.0.1` gagal di lapisan dial meski hostname lolos.

**Dua jalur yang harus ikut divalidasi** (keduanya memakai fungsi yang sama):
- `calendar/handler.go:81` `GetRaw` → `FetchMoodleCalendar` langsung.
- `lmssync/service.go:92` → `SyncProviders` → `FetchMoodleAssignments` → `FetchMoodleCalendar` (jalur cron, tidak lewat HTTP handler sama sekali).

Karena validasi diletakkan di `FetchMoodleCalendar` (bukan hanya di handler), kedua jalur tercakup. Ini alasan 2.1 menekankan validasi di **client**, bukan hanya di `validateUpdateRequest`.

---

## WS-3 — Tegakkan anggaran & cooldown · usaha **M**

Lead #3 dan #7.

### 3.1 Tegakkan `syncCooldown` (`calendar/handler.go:28,107`)
Konstanta ini sekarang hanya dipakai untuk menghitung `nextRefreshAt` di response. Terapkan:
```go
func (h *Handler) GetPreview(c *gin.Context) {
    ...
    if forceRefresh {
        if remaining, ok := h.cooldownRemaining(user); ok {
            c.Header("Retry-After", strconv.Itoa(int(remaining.Seconds())))
            c.JSON(http.StatusTooManyRequests, gin.H{
                "error": "refresh cooldown active",
                "retry_after_seconds": int(remaining.Seconds()),
            })
            return
        }
        ...
    }
}

func (h *Handler) cooldownRemaining(u *models.User) (time.Duration, bool) {
    // Pakai field yang SAMA dengan yang sudah diiklankan ke klien oleh
    // calculateNextRefreshAt (handler.go:475-481): LMSLastSyncedAt + syncCooldown.
    // Kalau enforcement memakai field lain, header nextRefreshAt akan berbohong.
    if u.LMSLastSyncedAt == nil { return 0, false }
    if el := time.Since(*u.LMSLastSyncedAt); el < syncCooldown {
        return syncCooldown - el, true
    }
    return 0, false
}
```
Terapkan pola sama di `auth/handler.go:359` `SyncAfterLogin` (lead #3: `/auth/sync` tidak punya limiter **sama sekali**, padahal memicu fan-out yang sama).

**Tiga endpoint memicu sync penuh, hanya satu yang saat ini bisa dibatasi:**

| Endpoint | Handler | Cooldown | Limiter |
|---|---|---|---|
| `GET /v1/calendar/preview?force=true` | `calendar/handler.go:110` | **tidak** (target patch ini) | `apiKeyRateLimit` per IP/API-key |
| `POST /v1/calendar/test` | `calendar/handler.go:155` | **tidak** | `apiKeyRateLimit` per IP/API-key |
| `POST /v1/auth/sync` | `auth/handler.go:359` | **tidak** | **tidak ada** |

`TestPreview` juga memanggil `syncAndBuildResponse` tanpa memeriksa cooldown, jadi menerapkan cooldown hanya di `GetPreview` akan meninggalkan pintu yang sama terbuka. Terapkan `cooldownRemaining` di **ketiganya**.

**Catatan penting:** `GetRaw` (`calendar/handler.go:81`) juga memicu fetch keluar tetapi **tidak** menulis `LMSLastSyncedAt`, jadi ia tidak terkena cooldown. Batasi dengan `PrincipalRateLimit` per user, bukan cooldown.

**Catatan desain:** `force=true` tetap harus bisa memaksa setelah cooldown. Jika produk butuh force sejati, beri kuota eksplisit: mis. 3 force/jam per user via `PrincipalRateLimit`, bukan tanpa batas.

### 3.2 Batasi paginasi Google (`google/client.go:316-336, 346-369, 378-403`)
Tiga loop hanya berhenti pada `NextPageToken` kosong atau berulang — tidak ada batas jumlah halaman, jadi jumlah record ditentukan sepenuhnya oleh isi akun Google penyerang.
```go
const maxPages = 50 // 50 x pageSize 100 = 5.000 record per koleksi

for page := 0; ; page++ {
    if page >= maxPages {
        return nil, fmt.Errorf("google pagination exceeded %d pages", maxPages)
    }
    // ... request
    if response.NextPageToken == "" || response.NextPageToken == pageToken {
        break
    }
    pageToken = response.NextPageToken
}
```
Terapkan pada ketiga fungsi. Ini juga membatasi efek lead #3 (fan-out per coursework), karena `FetchStudentSubmissions` dipanggil sekali per coursework (`client.go:236`).

### 3.3 Serialisasi refresh token Google per user (lead #7)
`EnsureGoogleAccessToken` (`google/client.go:432-445`) memutuskan berdasarkan **expiry di struct `*models.User`** yang dipegang pemanggil. Dua permintaan paralel untuk user yang sama (preview force + cron sync, atau dua tab) sama-sama melihat token kedaluwarsa, sama-sama memanggil `RefreshGoogleToken`, lalu `UpdateGoogleTokens` (`client.go:488-509`) menulis **tanpa guard**:
```go
c.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", user.ID).Updates(updates)
```
Hasil terakhir menang, dan bila Google memutar refresh token, salah satu hasil exchange menjadi yatim.

**(a) Serialisasi per user** — cukup `singleflight` (tidak perlu map mutex manual):
```go
import "golang.org/x/sync/singleflight"

type Client struct {
    db   *gorm.DB
    cfg  *config.Config
    sf   singleflight.Group
}

func (c *Client) EnsureGoogleAccessToken(ctx context.Context, user *models.User) (string, error) {
    v, err, _ := c.sf.Do("gtok:"+user.ID, func() (any, error) {
        // baca ulang baris agar tidak memakai struct basi
        var fresh models.User
        if err := c.db.WithContext(ctx).Where("id = ?", user.ID).First(&fresh).Error; err != nil {
            return "", err
        }
        return c.ensureGoogleAccessTokenLocked(ctx, &fresh)
    })
    if err != nil { return "", err }
    return v.(string), nil
}
```
`singleflight` juga mendedup panggilan dalam satu proses. Untuk multi-replika, lapisan kedua di (b) yang menyelamatkan. **Tidak perlu dependency baru:** `golang.org/x/sync v0.22.0` sudah ada di `go.mod:15`.

**(b) Guard optimistik pada tulis** — kunci pada nilai lama:
```go
func (c *Client) UpdateGoogleTokens(ctx context.Context, user *models.User, token *oauth2.Token) error {
    oldAccess := text.Dereference(user.GoogleAccessToken, "")
    updates := map[string]interface{}{"google_access_token": token.AccessToken}
    if !token.Expiry.IsZero() {
        updates["google_token_expiry"] = token.Expiry.UTC()
    }
    if token.RefreshToken != "" {
        updates["google_refresh_token"] = token.RefreshToken
    }

    res := c.db.WithContext(ctx).Model(&models.User{}).
        Where("id = ? AND google_access_token = ?", user.ID, oldAccess).
        Updates(updates)
    if res.Error != nil { return res.Error }
    if res.RowsAffected == 0 {
        // Baris sudah diubah proses lain: pakai hasil mereka, jangan menimpa.
        var fresh models.User
        if err := c.db.WithContext(ctx).Where("id = ?", user.ID).First(&fresh).Error; err != nil {
            return err
        }
        if tok := text.Dereference(fresh.GoogleAccessToken, ""); tok != "" {
            *user = fresh
            return nil
        }
        return fmt.Errorf("google token update lost race")
    }
    // sukses: sinkronkan struct in-memory
    user.GoogleAccessToken = &token.AccessToken
    if v, ok := updates["google_token_expiry"]; ok {
        e := v.(time.Time); user.GoogleTokenExpiry = &e
    }
    if v, ok := updates["google_refresh_token"]; ok {
        r := v.(string); user.GoogleRefreshToken = &r
    }
    return nil
}
```

**Definition of done:** dua `EnsureGoogleAccessToken` konkuren (jalankan dengan `-race`) → hanya **satu** panggilan keluar ke Google; `RowsAffected` pada penulisan kedua = 0 dan nilainya diambil dari baris terbaru, bukan ditimpa; `force=true` kedua dalam 1 jam → 429 + `Retry-After`.

**Jebakan SQL yang harus diingat:** `google_access_token` adalah `*string` (`models/user.go:27`). Bila nilainya `NULL` di DB, predikat `google_access_token = ''` **tidak** cocok (SQL three-valued logic), sehingga `RowsAffected` akan 0 dan fungsi salah menyimpulkan "kalah race" — padahal `EnsureGoogleAccessToken` sudah menolak lebih awal bila token kosong (`client.go:434-436`), jadi kasus ini hanya muncul bila ada baris `NULL` yang lolos. Pakai predikat yang menangani NULL:
```go
Where("id = ? AND google_access_token IS NOT DISTINCT FROM ?", user.ID, nullableOrNil(oldAccess))
```
atau kirim `nil` saat `oldAccess == ""`.

---

## WS-4 — Kardinalitas metrik · usaha **S**

Lead #8. Satu baris:
```go
path := c.FullPath()
if path == "" {
    path = "unmatched"   // JANGAN c.Request.URL.Path
}
```
Alternatif lebih informatif tanpa risiko: bucket berdasarkan prefiks segmen pertama (`"/"+strings.SplitN(strings.TrimPrefix(p,"/"),"/",2)[0]`) — tapi `"unmatched"` adalah pilihan paling aman. Tambahkan juga `NoRoute` handler yang mengembalikan 404 JSON murah agar request tak ter-match tidak melewati seluruh chain.

**Definition of done:** 5.000 path acak → jumlah seri `ressist_http_requests_total` bertambah ≤ 2, bukan 5.000.

---

## WS-5 — Parser & batas body · usaha **S–M**

Lead #10, #11.

### 5.1 Line unfolding O(N²) → O(N) (`ics/parser.go:56-59`)
```go
var sb strings.Builder
sb.WriteString(strings.TrimRight(lines[i], " \t"))
for i+1 < len(lines) && strings.HasPrefix(lines[i+1], " ") {
    sb.WriteString(strings.TrimPrefix(lines[i+1], " "))
    i++
}
line := sb.String()
```
Tambahkan juga batas: `const maxICSLineBytes = 1 << 20` — jika `sb.Len()` melewati batas, `return events` (berhenti) atau lewati baris.

### 5.2 Batas body global untuk JSON (`router.go:40-63`)
Tidak ada `MaxBytesReader` di seluruh `backend/` — satu-satunya `LimitReader` hanya untuk **membaca body error** dari respons keluar (`google/client.go:424`, `moodle/client.go:75`), bukan untuk request masuk. Setiap handler yang memakai `ShouldBindJSON` karena itu membaca body sebesar apa pun ke memori.

```go
const maxRequestBodyBytes = 1 << 20 // 1 MiB

r.Use(func(c *gin.Context) {
    if c.Request.Body != nil {
        c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxRequestBodyBytes)
    }
    c.Next()
})
```
Letakkan **setelah** `middleware.RequestID()` (`router.go:40`) dan sebelum grup mana pun. Catatan: `MaxBytesReader` sudah menangani `ContentLength == 0` dengan benar, jadi guard tambahan tidak diperlukan. Handler yang menerima body >1 MiB akan mendapat error bind dan mengembalikan 400 — untuk API ini tidak ada endpoint yang butuh payload besar.

Batas ini **tidak** melindungi dari body yang di-stream perlahan (slowloris); itu sudah ditangani `ReadTimeout` di `main.go:71`. Keduanya saling melengkapi.

### 5.3 Property ICS berparameter (`ics/parser.go:92-95`)
`SUMMARY:` dan `CATEGORIES:` masih dicocokkan dengan `HasPrefix` mentah, sedangkan `DESCRIPTION`/`URL` (`parser.go:96-103`) sudah memakai `icsPropertyValue` yang menerima bentuk berparameter.

Akibatnya bukan "nilai tercemar parameter", melainkan **baris tidak dikenali sama sekali**: `SUMMARY;LANGUAGE=en:UTS Kalkulus` tidak berawalan `SUMMARY:` sehingga tidak masuk case mana pun → `event.Title` tetap kosong → dan karena `parser.go:66` hanya menambahkan event bila `Title != ""`, **seluruh VEVENT itu dibuang tanpa jejak**. Sama untuk `CATEGORIES;LANGUAGE=en:...` → `Course` kosong, sehingga event kehilangan kelas dan ikut tersaring oleh filter kelas.

```go
case strings.HasPrefix(line, "SUMMARY"):
    if value, ok := icsPropertyValue(line, "SUMMARY"); ok {
        event.Title = cleanMoodleTitle(unescapeICS(value))
    }
case strings.HasPrefix(line, "CATEGORIES"):
    if value, ok := icsPropertyValue(line, "CATEGORIES"); ok {
        event.Course = unescapeICS(value)
    }
```
Perbaikan murah, dan mencegah kehilangan tugas secara diam-diam bila Moodle mengubah format ekspornya.

### 5.4 Validasi skema URL saat menulis `events.url` (pertahanan berlapis)
Lead `injection/...unvalidated-url-property-scheme` **ditolak** karena klien sudah menetralkannya (React `sanitizeURL`, mobile Intent handler). Meski begitu, menyimpan URL non-`http(s)` di kolom yang dirender sebagai anchor adalah utang desain. Di `moodle/client.go:104-107` dan jalur Google, saring dengan `ValidateOutboundHTTPURL(..., allowHTTP=false)` sebelum menyimpan; simpan `NULL` bila tidak lolos. Murah, dan menutup seluruh kelas masalah bila kelak ada klien baru.

**Definition of done:** benchmark `ParseMoodleICS` pada blok terlipat N=40k: alokasi ≈ linear terhadap N (sekarang kuadratik).

---

## WS-6 — Integritas binding Telegram · usaha **M–L** · **prioritas tinggi**

Lead #17, #18, #19, #21, #22.

### 6.1 Hentikan penulisan `telegram_chat_id` dari jalur yang tidak sah

Ada **tiga** penulis `telegram_chat_id` di `backend/`, padahal seharusnya hanya satu:

| Lokasi | Status | Tindakan |
|---|---|---|
| `botservice/handler.go:117-122` `VerifyTelegram` | **sah** — dipanggil bot service via `POST /internal/telegram/verify` (`bot/internal/client/api.go:166`) | pertahankan |
| `user/handler.go:312-314` `buildUpdateData` | **tidak sah** — `PUT /v1/user` menerima `telegram_chat_id` apa pun dari klien | **hapus blok itu** |
| `telegram/bot.go:108-114` `verifyCode` | **dead code** — `Module.Start`/`StartBot` tidak pernah dipanggil dari `cmd/api/main.go` (lihat komentar `main.go:83-85`), tetapi tetap penulis kedua | **hapus fungsi `verifyCode` + `handleStartCommand`**, atau hapus seluruh `bot.go` bila `NewBot` juga tidak dipakai |

Untuk yang terakhir, pemisahannya persis begini:
- **Dipakai:** `NewBot` (`bot.go:23-36`) dan seluruh `service.go` (`SendMessage:17`, `SendAssignmentNotification:25`).
- **Dead:** `Start` (`bot.go:39-65`), `handleCommand` (`:67`), `handleStartCommand` (`:79`), `verifyCode` (`:90`), `handleHelpCommand` (`:128`). Tidak ada pemanggil — `Module.Start`/`StartBot` (`module.go:51-71`) tidak dipanggil dari `cmd/api/main.go`, dan `main.go:83-85` menyatakan polling sengaja dipindah ke service `bot/`.

Hapus keempat handler + `Start` dari `bot.go`, sisakan struct + `NewBot`. Membiarkannya berarti logika verifikasi hidup di dua tempat dengan aturan berbeda (`bot.go:94` memakai `NOW()` SQL, `botservice/handler.go:107` memakai `time.Now()`), dan setiap patch keamanan harus diterapkan dua kali — termasuk CSPRNG dan counter percobaan di 6.4.

Jika produk butuh "unbind", sediakan endpoint eksplisit `DELETE /v1/user/telegram` yang hanya mengosongkan nilai milik sendiri — jangan lewatkan `telegram_chat_id` di body `PUT`.

### 6.2 Unique index parsial + dedupe (`models/user.go:20`)
```go
TelegramChatID *string `gorm:"column:telegram_chat_id;uniqueIndex:idx_users_telegram_chat_id,where:telegram_chat_id IS NOT NULL"`
```
Migrasi manual (karena `AUTO_MIGRATE` akan gagal bila sudah ada duplikat):
```sql
-- 1) lihat duplikat
SELECT telegram_chat_id, COUNT(*) FROM users
 WHERE telegram_chat_id IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1;
-- 2) sisakan yang paling baru aktif, NULL-kan sisanya (keputusan owner)
UPDATE users SET telegram_chat_id = NULL
 WHERE id IN (SELECT id FROM (
   SELECT id, ROW_NUMBER() OVER (PARTITION BY telegram_chat_id
     ORDER BY updated_at DESC) rn FROM users
    WHERE telegram_chat_id IS NOT NULL) t WHERE rn > 1);
-- 3) index
CREATE UNIQUE INDEX CONCURRENTLY idx_users_telegram_chat_id
  ON users (telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
```

### 6.3 Resolusi ambigu → tolak (`botservice/handler.go:33-35`)
```go
var users []models.User
err := h.db.WithContext(ctx).
    Where("telegram_chat_id = ? AND telegram_enabled = true", chatID).
    Limit(2).Find(&users).Error
if err != nil { ... }
switch len(users) {
case 0: c.JSON(404, ...)
case 1: // normal
default:
    log.Printf("[botservice] ambiguous chat id: %s", chatID) // jangan log chat id mentah di prod
    c.JSON(http.StatusConflict, gin.H{"error": "ambiguous chat binding"})
}
```

### 6.4 Kode verifikasi: CSPRNG + panjang + counter + lockout (`user/handler.go:387-394`)
Saat ini `math/rand` (`rand.Intn`, import di `user/handler.go:6`) dengan alfabet 32 karakter × 6 posisi = **30 bit**. `math/rand` di Go 1.20+ memang di-seed acak, jadi bukan prediktabel seperti versi lama, dan `rand.Intn` sendiri memakai rejection sampling (tidak ada modulo bias). Masalahnya bukan kualitas distribusi, melainkan **jenis generator**: `math/rand` tidak dirancang tahan terhadap pengamat yang bisa melihat sebagian output, dan 30 bit terlalu kecil untuk ruang yang bisa disapu tanpa rate limit.
```go
import (
    crand "crypto/rand"
    "math/big"
)

const verifyCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // 32 char = 5 bit/char

func generateAlphanumericCode(length int) (string, error) {
    b := make([]byte, length)
    max := big.NewInt(int64(len(verifyCodeAlphabet)))
    for i := range b {
        n, err := crand.Int(crand.Reader, max)
        if err != nil {
            return "", fmt.Errorf("crypto/rand: %w", err)
        }
        b[i] = verifyCodeAlphabet[n.Int64()]
    }
    return string(b), nil
}
```
Perbesar ke **8 karakter (40 bit)** dan tambahkan:
- kolom `telegram_verify_attempts int default 0` + `telegram_verify_locked_until timestamptz`
- increment pada setiap percobaan salah; ≥5 → tolak 10 menit
- rate limit per chat id di `botservice` (`PrincipalRateLimit` dengan kunci chat id)

**Yang sudah benar (jangan diubah):** `VerifyTelegram` (`botservice/handler.go:117-122`) sudah menghapus kode setelah dipakai, jadi kode bersifat single-use, dan pencarian memakai `telegram_verify_expires > now` sehingga TTL 10 menit (`user/handler.go:201`) ditegakkan. Yang hilang hanya **counter percobaan**: tebakan salah saat ini kembali 404 tanpa menaikkan apa pun (`botservice/handler.go:109-111`), sehingga ruang 2^30 bisa disapu tanpa jejak.

**Catatan penting:** `generateAlphanumericCode` mengembalikan `string` sekarang; mengubahnya ke `(string, error)` menyentuh pemanggil di `user/handler.go:200` dan harus menangani error dengan 500, bukan menghasilkan kode kosong.

### 6.5 Escape Markdown — **empat** titik, bukan satu
Semua pengiriman memakai `ParseMode = "Markdown"` (`service.go:19`, `scheduler.go:108`, `bot.go:83,124`), dan **seluruh** pesan dibangun dengan `fmt.Sprintf` dari data yang berasal dari LMS atau dari nama user:

| Lokasi | Data yang diinterpolasi |
|---|---|
| `service.go:104-117` | `courseName`, `assignmentTitle` (dari ICS/Google) |
| `scheduler.go:121-136` | `user.Name`, `a.Title`, `course` |
| `handler.go:119` | detail reminder (memuat judul/kursus) |
| `handler.go:185-200` | `userName`, `a.Title`, `course` |

Karakter `_ * ` [ ]` di judul tugas membuat Telegram menolak seluruh pesan dengan `400 Bad Request: can't parse entities`. Efeknya bukan sekadar tampilan rusak: **notifikasi hilang untuk tugas itu**, dan karena pengiriman tidak di-retry, user tidak pernah tahu.

```go
var mdEscaper = strings.NewReplacer(
    "_", "\\_", "*", "\\*", "`", "\\`", "[", "\\[", "]", "\\]",
)

func escapeMarkdown(s string) string { return mdEscaper.Replace(s) }
```
Terapkan pada **setiap** nilai dinamis di keempat lokasi. Alternatif yang lebih tahan banting: ganti ke `ParseMode = "HTML"` dan bungkus setiap nilai dengan `html.EscapeString` — tidak ada karakter khusus yang perlu di-escape manual, dan tidak ada risiko meleset.

**Definition of done:** `PUT /v1/user` dengan `telegram_chat_id` → field diabaikan; dua baris berbagi chat id tidak mungkin (unique index); salah kode 5× → 423/429; judul `Tugas_1` terkirim utuh tanpa parse error.

---

## WS-7 — Batas volume data · usaha **M**

Lead #14, #15.

### 7.1 `GET /v1/assignments` (`assignment/handler.go:126, 131-141, 143-182`)
Tiga masalah di satu handler:
1. Dua kueri memakai `h.db` **tanpa** `WithContext` (`:126`, `:131`) → deadline request & disconnect klien tidak menjalar ke query.
2. `SELECT ... FROM events WHERE user_id = ?` tanpa `LIMIT` dan tanpa filter `deadline` → seluruh riwayat user dimaterialisasi.
3. Pola `assignments` → slice `[]models.Event` paralel → `classcode.FilterWithCourseClass` → rekonsiliasi indeks (`:143-182`) memakai memori 2× dan logika pencocokan rapuh: dua baris dengan `title`+`course`+`class_code` identik akan salah pasang.

```go
ctx := c.Request.Context()
// 1) konteks + filter user
h.db.WithContext(ctx).Table("users")...

// 2) filter di SQL + batas keras
rows := h.db.WithContext(ctx).Raw(`
    SELECT id, title, title AS full_title, course, course AS original_course,
           class_code, deadline, COALESCE(completed,false) AS completed,
           completed_at, COALESCE(status,'pending') AS status,
           status_updated_at, source, description, url
      FROM events
     WHERE user_id = ?
       AND deadline >= ? AND deadline < ?
     ORDER BY deadline ASC
     LIMIT ?`, userID, windowStart, windowEnd, maxAssignments)
```
`windowStart`/`windowEnd` sebaiknya **sama** dengan yang dipakai `loadCachedEvents` (`calendar/handler.go:489-490`: `now` s/d `now + 60 hari`) agar preview dan daftar tugas tidak menampilkan himpunan berbeda.

Filter mute/kata-kunci/kelas tetap boleh di memori **setelah** `LIMIT` — pada titik itu jumlah barisnya sudah terbatas. Tetapi rekonsiliasi indeks di `:153-181` harus **dihapus**, bukan dipertahankan: pencocokan berbasis `title`+`course`+`class_code` akan salah pasang bila ada dua baris identik, dan setelah `LIMIT` pun bug itu tetap ada. Sebagai gantinya, sertakan `id` di `SELECT` lalu simpan `id → row` dalam map agar pemetaan balik bersifat eksak, bukan tebakan posisional.

**Definition of done:** `GET /v1/assignments` untuk user dengan 50k baris → p95 < 500 ms dan heap tidak naik > 20 MB; `EXPLAIN` menunjukkan `Index Scan` + `Limit`.

### 7.2 `GET /v1/courses` (`course/handler.go:54-98`)
Tiga masalah dalam satu handler:
1. `h.db.Where(...)` **tanpa** `WithContext` (`:56`).
2. `Find(&events)` memuat **seluruh kolom** setiap baris `events` milik user hanya untuk mengambil `course` dan `title` — 20 kolom per baris (`models/event.go:5-26`), termasuk `description` (teks panjang).
3. Exchange sort O(n²) di `:92-98` padahal `sort.Strings` tersedia.

Perbaikan (a) — proyeksikan hanya dua kolom yang dipakai:
```go
var rows []struct {
    Course string `gorm:"column:course"`
    Title  string `gorm:"column:title"`
}
if err := h.db.WithContext(c.Request.Context()).Table("events").
    Select("course, title").
    Where("user_id = ? AND course IS NOT NULL AND course <> ''", userID).
    Scan(&rows).Error; err != nil { ... }
```
Bila `len(normKeywordFilters) == 0` (kasus umum — user tanpa filter kata kunci), `title` tidak dibutuhkan sama sekali, jadi lebih murah lagi:
```sql
SELECT DISTINCT course FROM events
 WHERE user_id = ? AND course IS NOT NULL AND course <> ''
```
Perbaikan (b) — ganti loop exchange sort dengan `sort.Strings(courses)`; O(n²) → O(n log n).

**Definition of done:** `GET /v1/courses` untuk user dengan 50k baris → heap tidak naik > 10 MB (sekarang seluruh baris termaterialisasi); `EXPLAIN` menunjukkan `Index Scan` pada `user_id`.

### 7.3 Retensi
Belum ada job pembersih `events`. Tambah cron: hapus/arsipkan `deadline < now() - 90 days` (kecuali yang `status='pending'` untuk reminder). Ini yang membuat semua bound di atas stabil dalam jangka panjang — tanpa retensi, `LIMIT` hanya menunda pertumbuhan.

**Definition of done gabungan WS-7:** `GET /v1/assignments` dan `GET /v1/courses` untuk user dengan 50k baris masing-masing p95 < 500 ms, heap tidak naik > 20 MB, dan `EXPLAIN` menunjukkan `Index Scan` (bukan `Seq Scan`).

---

## WS-8 — Higiene token & sesi · usaha **M**

Lead #6, #13, plus catatan hardening.

### 8.1 Grace hanya untuk rotasi, bukan untuk logout/theft (`auth/service.go:417-437` + `:502-511`)

**Akar masalah #6:** ada **dua** cabang grace yang keduanya hanya melihat **waktu**, bukan **alasan** revoke:
- `rotate` cabang utama (`service.go:417-437`) — bila `existing.RevokedAt != nil` dan masih dalam `reuseGrace()`, token **baru diterbitkan** tanpa peduli siapa yang mencabut.
- `rotate` cabang kompensasi di dalam `Transaction` (`service.go:489-511`) — pola sama setelah kalah race.

Konsekuensi: `Logout` (`handler.go:288`) → `RevokeRefreshToken` (`service.go:525-532`) hanya menyetel `revoked_at`. Bila penyerang memegang refresh token itu dan memakainya **≤ 30 detik** setelah korban logout, penyerang mendapat sesi baru yang sah. Setelah 30 detik baru dianggap reuse.

**Perbaikan — bedakan alasan revoke:**
```go
// models/refresh_token.go — tambahkan satu kolom
RevokedReason string `gorm:"column:revoked_reason;size:16;index"`
// nilai: "rotation" | "logout" | "reuse" | "expired" | "absolute_max"
```
```go
// service.go:417 — cabang utama
if existing.RevokedAt != nil {
    if existing.RevokedReason == "rotation" && now.Sub(*existing.RevokedAt) < s.reuseGrace() {
        // ... perilaku sekarang: terbitkan token kompensasi
    }
    _ = s.RevokeAllUserRefreshTokens(ctx, existing.UserID)
    return nil, ErrRefreshTokenReuse
}
```
Terapkan guard yang sama di cabang kompensasi `service.go:502`:
```go
if current.RevokedAt != nil && current.RevokedReason == "rotation" &&
   now.Sub(*current.RevokedAt) < s.reuseGrace() {
```

**Titik tulis yang harus diisi** (semua `Update("revoked_at", &now)` harus jadi `Updates(map[string]any{"revoked_at": &now, "revoked_reason": ...})`):

| Lokasi | Alasan |
|---|---|
| `service.go:476-477` (revoke di dalam transaksi rotasi) | `"rotation"` ← **kunci patch ini** |
| `service.go:530-531` `RevokeRefreshToken` (dipanggil Logout) | `"logout"` |
| `service.go:521-522` `RevokeAllUserRefreshTokens` | `"reuse"` |
| `service.go:441-442` (token kedaluwarsa) | `"expired"` |
| `service.go:450-451` (batas umur absolut) | `"absolute_max"` |

**Catatan migrasi:** baris lama punya `revoked_reason = ''`. Karena `''` ≠ `"rotation"`, seluruh baris lama otomatis **tidak** mendapat grace — itu perilaku yang aman (fail-closed). Tidak perlu backfill. Bila rollout bertahap menyebabkan satu kali logout massal, isi backfill satu kali: `UPDATE refresh_tokens SET revoked_reason='rotation' WHERE revoked_at IS NOT NULL AND revoked_reason=''` — tetapi **hanya** bila yakin semua revoke lama berasal dari rotasi.

**Ini patch inti lead #6** — setelah ini, logout benar-benar mengakhiri sesi.

### 8.2 JWT wajib punya `exp` (`auth/token.go:57-72`)
`ParseWithClaims` saat ini memakai `WithValidMethods`, `WithIssuer`, `WithAudience`, `WithLeeway` — tetapi **tidak** `WithExpirationRequired()`. Token bertanda tangan dengan secret yang sama tanpa klaim `exp` diterima selamanya.
```go
jwt.WithLeeway(30*time.Second),
jwt.WithExpirationRequired(),   // <-- tambahan
```
Sekaligus: `jti` + denylist pendek (TTL 60 menit) agar logout bisa membatalkan access token. Saat ini `Logout` hanya mencabut refresh token (`handler.go:288`), sehingga access token tetap sah sampai `exp`.

### 8.3 Samakan grace default (`config.go:110`)
Tiga sumber tidak sepakat:

| Sumber | Nilai |
|---|---|
| `config.go:110` `getEnvAsInt("REFRESH_REUSE_GRACE_SECONDS", 30)` | **30** |
| Komentar `config.go:44` ("Default 300s. Naik dari 120s…") | 300 |
| `backend/.env.example:25` | 300 |
| `backend/.env` (aktual) | **tidak diset** → jatuh ke default kode 30 |

Jadi nilai runtime saat ini **30 detik**, dan komentar + example menyesatkan. Ini juga mempersempit jendela serangan lead #6 menjadi 30 detik — tetap nyata, tetapi bukan 5 menit seperti yang tersirat dari dokumentasi.

**Perbaikan:** pilih satu angka. Rekomendasi **30 detik** (pertahankan perilaku runtime yang sudah berjalan; tidak ada alasan memperlebarnya). Perbaiki komentar `:42-44` dan `.env.example:25` agar menyebut 30, atau hapus baris itu dari example agar default kode yang berlaku.

### 8.4 Jangan interpolasi token ke log SQL (`database/postgres.go:22`)
Saat ini `Logger: logger.Default.LogMode(logger.Warn)` memakai logger default GORM yang **menginterpolasi nilai parameter** ke teks SQL. `google_access_token`/`google_refresh_token` adalah kolom plaintext (`models/user.go:27-28`), sehingga keduanya muncul di stdout pada statement >200 ms atau error.
```go
gormLogger := logger.New(log.New(os.Stdout, "\r\n", log.LstdFlags), logger.Config{
    SlowThreshold:             200 * time.Millisecond,
    LogLevel:                  logger.Warn,
    IgnoreRecordNotFoundError: true,
    ParameterizedQueries:      true,   // <-- kunci: nilai tidak diinterpolasi
})
db, err := gorm.Open(postgres.New(postgres.Config{
    DSN:                  databaseURL,
    PreferSimpleProtocol: true,
}), &gorm.Config{Logger: gormLogger})
```
Ini menutup lead #13 tanpa perlu enkripsi kolom. Sebagai lapis kedua, enkripsi `google_access_token`/`google_refresh_token` at-rest (AES-GCM dengan key dari env) — perlu migrasi data, jadwalkan terpisah.

### 8.5 `AUTO_MIGRATE` di produksi
`docker-compose.yml:33` menyetel `"true"`. Flag itu **dihormati** (`postgres.go:38`), jadi `AutoMigrate` memang berjalan penuh di produksi tiap start — termasuk dua backfill `UPDATE` tanpa `WHERE` pada kolom status (`postgres.go:44`) dan `reminder_hours` (`postgres.go:47`), yang berarti setiap restart menyentuh ulang seluruh baris `events` dan `users`. Selain itu DDL `postgres.go:52-55` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` untuk `refresh_tokens.session_started_at`) sengaja berjalan **tanpa** mempedulikan flag, dengan komentar eksplisit (`:50-51`) bahwa itu disengaja agar production yang `AUTO_MIGRATE=false` tetap punya kolom wajib sebelum insert refresh token.

**Perbaikan:** set `AUTO_MIGRATE: "false"` di compose produksi, dan pindahkan DDL `postgres.go:52-55` ke migrasi bernomor yang dijalankan sekali oleh job rilis. Selama DDL itu masih di jalur startup, setiap replika baru ikut berebut `CREATE INDEX` (dilindungi `IF NOT EXISTS`, jadi tidak gagal, tetapi tetap mengambil lock).

---

## WS-9 — Dedup antar-replika sync · usaha **M**

Lead #9. `SyncBatch` (`lmssync/service.go:41-49`) menjalankan `SELECT ... FOR UPDATE SKIP LOCKED` sebagai statement tunggal di luar transaksi, lalu **seluruh kerja** (panggilan HTTP ke Google/Moodle, `service.go:92`) terjadi setelah statement itu selesai. Lock dilepas saat statement berakhir, jadi `SKIP LOCKED` tidak mendedup apa pun: dua replika yang tick pada menit yang sama mengambil himpunan user yang sama.

**Jangan** membungkus seluruh batch dalam satu `Transaction`. Cron tick (`scheduler.go:31`) memberi `10*time.Minute`, dan `SyncProviders` melakukan HTTP keluar per user (`LMSSyncTimeoutSeconds` default 90 detik). Transaksi sepanjang itu menahan lock, memblokir `VACUUM`, dan berisiko `idle_in_transaction_session_timeout`.

**Gunakan klaim berbasis kolom** — tidak menahan lock, tetap mendedup lintas replika:
```sql
ALTER TABLE users ADD COLUMN sync_claimed_until timestamptz;
CREATE INDEX idx_users_sync_claimed_until ON users (sync_claimed_until);
```
```go
// 1) klaim atomik: satu statement, lock hanya sesaat
var claimed []models.User
err := s.db.WithContext(ctx).Raw(`
    UPDATE users SET sync_claimed_until = now() + interval '15 minutes'
     WHERE id IN (
       SELECT id FROM users
        WHERE (moodle_enabled OR google_classroom_enabled)
          AND (sync_claimed_until IS NULL OR sync_claimed_until < now())
          AND (  (moodle_enabled AND (moodle_last_synced_at IS NULL OR moodle_last_synced_at < now() - interval '24 hours'))
              OR (google_classroom_enabled AND (google_classroom_last_synced_at IS NULL OR google_classroom_last_synced_at < now() - interval '24 hours')))
        ORDER BY COALESCE(LEAST(moodle_last_synced_at, google_classroom_last_synced_at), lms_last_synced_at) ASC NULLS FIRST
        LIMIT ? FOR UPDATE SKIP LOCKED)
    RETURNING *`, batchSize).Scan(&claimed).Error
```
```go
// 2) setelah kerja selesai (sukses ATAU gagal), lepas klaim agar bisa di-retry
defer s.db.Model(&models.User{}).Where("id = ?", user.ID).
    Update("sync_claimed_until", nil)
```
Klaim 15 menit > timeout 10 menit cron, sehingga replika yang mati di tengah jalan melepas klaim otomatis.

**Definition of done:** dua replika, satu tick cron → himpunan user id di log kedua replika **disjoint**; setelah satu replika dibunuh paksa di tengah batch, user-nya kembali bisa diklaim pada tick berikutnya.

---

## WS-10 — Postur container & observabilitas · usaha **S**

Dari 815 catatan hardening, yang paling berdampak:

| # | Item | Perbaikan |
|---|---|---|
| 10.1 | `docker-compose.yml:23-60` — service `api` tanpa pengerasan | `read_only: true`, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, `mem_limit`, `pids_limit`, `tmpfs: [/tmp]`. Tanpa `mem_limit`, lead #11 (body tak terbatas) tidak punya batas akhir. |
| 10.2 | `curl` di image runtime (`Dockerfile:20`) | Healthcheck compose **sudah** pakai `wget` (`docker-compose.yml:54`), jadi `curl` hanya untuk healthcheck Coolify. Hapus `curl` dan arahkan healthcheck Coolify ke `wget` — memangkas permukaan serang image. |
| 10.3 | `/metrics` anonim (`router.go:87`) | Pindah ke listener internal terpisah, atau wajibkan `BOT_SERVICE_TOKEN`/mTLS |
| 10.4 | `openapi.json` anonim membocorkan hostname produksi (`internal/shared/docs/openapi.json:8-15`) | `servers` memuat `https://ressist-api.nodryx.com`. Hapus entri absolut; sisakan `{"url": "/"}` atau sajikan hanya bila `cfg.Env != "production"`. |
| 10.5 | `X-Request-ID` dari klien tanpa batas (`request_id.go:17-23`) | Terima hanya `^[A-Za-z0-9_-]{1,64}$`, selain itu generate baru. Tanpa batas, nilai sepanjang 1 MB ikut tercatat di setiap baris access log dan disalin ke header respons. |
| 10.6 | `bot_auth.go:97` `ConstantTimeCompare` bocor panjang | `subtle.ConstantTimeCompare` langsung mengembalikan 0 bila panjang berbeda, sehingga waktu eksekusi membocorkan panjang token yang benar. Bandingkan hash: `subtle.ConstantTimeCompare(sha256.Sum256([]byte(got))[:], sha256.Sum256([]byte(want))[:])` — panjang selalu 32 byte. |
| 10.7 | `GET /internal/scheduler/briefing-candidates` mengembalikan roster (`botservice/handler.go:243-257`) | Mengembalikan **seluruh** user dengan `telegram_enabled AND morning_briefing` tanpa paginasi dan tanpa `LIMIT`, termasuk `telegram_chat_id`. Tambah paginasi (`?after_id=&limit=`) dan audit log per panggilan. |
| 10.8 | API key tanpa expiry default (`apikey/service.go:82-90`) | `expiresInDays == nil` → `expiresAt = nil` → **key tidak pernah kedaluwarsa**. Default ke 90 hari bila klien tidak menentukan; turunkan batas atas dari 3650 (`:85`) ke 365. |
| 10.9 | `scopes` API key tidak pernah dibaca (`apikey/service.go:103`) | Kolom diisi hardcode `"[]"` saat pembuatan dan `ValidateApiKey` (`:136-158`) tidak pernah memeriksanya — key mendapat **otoritas penuh**. Implementasikan cek scope di middleware, atau hapus kolom dan dokumentasikan "full authority" secara eksplisit. |
| 10.10 | `readyz` membocorkan `db_unavailable` vs `db_ping_failed` (`router.go:76,82`) dan ping DB tiap request | Kembalikan body seragam `503 {"status":"not_ready"}`; pindahkan detail ke log |

---

## WS-11 — Integritas data sync · usaha **M** · **prioritas tinggi**

Dua lead yang tidak terlihat seperti masalah keamanan, tetapi efeknya **kehilangan data pengguna secara diam-diam**: #20 (semua tugas ter-flip selesai) dan #12 (sync satu pengguna menggagalkan sync pengguna lain). Keduanya adalah bug kebenaran di lapisan persist, bukan sekadar hardening.

### 11.1 Sync sukses-tapi-kosong menandai SEMUA tugas pending sebagai selesai/missed (lead #20)

`persist` (`sync/service.go:110-179`) menganggap himpunan record yang dikembalikan fetch sebagai **enumerasi lengkap** keadaan provider, lalu memanggil `markStaleAsMissed`/`markStaleAsCompleted` untuk apa pun yang tidak ada di himpunan itu. Masalahnya, guard yang membatasi UPDATE ke "himpunan yang diamati" bersifat **kondisional**:

```go
// sync/service.go:383 dan :405 — pola yang sama di kedua fungsi
if len(keys) > 0 {
    query = query.Where("sync_key NOT IN ?", keys)
}
```
Bila fetch mengembalikan **nol** record dengan `err == nil`, `len(keys) == 0` → guard dilewati → `UPDATE events SET status='completed' WHERE user_id=? AND source=? AND status='pending'` mengenai **seluruh** tugas pending provider itu.

Dan fetch kosong dengan `err == nil` adalah hal yang **normal**, bukan anomali:
- `google/client.go:158` — `if len(courses) == 0 { return []AssignmentRecord{}, &CourseFetchStats{}, nil }`. Nol kursus ACTIVE (semua diarsipkan di akhir semester) = sukses.
- `google/client.go:230` — coursework di luar jendela 60 hari atau tanpa due date dibuang (`skippedFarFuture`, `skippedNoDeadline`), jadi fetch bisa sah-sah saja menyisakan nol record.
- `moodle/client.go:100` — filter kelas (`ShouldIncludeForUserClass`) + jendela 60 hari bisa mengosongkan hasil meski ICS berhasil diambil.

Kode sudah mengenali invarian ini untuk kasus **partial** (`calendar/service.go:133` merutekan `*PartialFetchError` ke `PersistAssignmentsWithoutStale`), tetapi tidak untuk kasus **kosong-sukses**.

**Perbaikan — bedakan "tidak ada yang berubah" dari "semuanya hilang":**
```go
// sync/service.go, sebelum panggilan stale-marking
if len(keys) == 0 {
    // Enumerasi kosong bukan bukti bahwa semua tugas hilang. Jangan sentuh apa pun.
    return nil
}
if provider == "moodle" {
    return s.markStaleAsMissed(tx, userID, provider, keys, now)
}
return s.markStaleAsCompleted(tx, userID, provider, keys, now)
```
Ini perubahan tiga baris dan menutup seluruh kelas masalah. Alternatif yang lebih presisi (bila produk memang butuh menandai tugas yang benar-benar hilang): tambahkan parameter `enumerated bool` yang hanya `true` bila fetch melaporkan **cakupan penuh** — dan itu tidak pernah benar selama ada jendela 60 hari + filter kelas. **Rekomendasi: pakai guard `len(keys) == 0`.**

**Catatan pemulihan:** `updateAssignment` (`sync/service.go:269`) menghidupkan kembali baris `missed` → `pending` dan me-reset `completed` → `pending` pada fetch berikutnya yang tidak kosong. Jadi kerusakan bersifat sementara — **tetapi hanya setelah** penyebab divergensi hilang, dan selama itu user melihat tugas hilang dari kalender (`calendar/handler.go:494`) dan berhenti menerima reminder (`botservice/handler.go:176`).

### 11.2 Unique index global `courses.name` menggagalkan transaksi sync pengguna lain (lead #12)

`models/course.go:12` menetapkan `Name string \`gorm:"uniqueIndex;not null"\`` — unik **global**, tanpa dimensi pemilik. `PersistAssignments` me-resolve-nya dengan `FirstOrCreate` (`sync/service.go:129`) yang, pada gorm v1.31.2, mengeluarkan `SELECT` lalu `INSERT` **tanpa** `ON CONFLICT`. Dua pengguna yang sync bersamaan dengan nama kursus sama (mis. "Kalkulus II") dan baris kursus belum ada → keduanya `SELECT` miss → satu `INSERT` menang, yang lain kena unique violation → error itu keluar dari callback transaksi (`sync/service.go:119`) → **seluruh** persist per-provider pengguna yang kalah di-rollback, dan provider-nya dilaporkan gagal.

Jadi dampaknya bukan kebocoran data (baris `courses` hanya berisi nama), melainkan **kegagalan sync lintas-pengguna yang tidak dapat diarahkan** — siapa pun yang kalah race kehilangan sync-nya. Bersifat sementara (retry berikutnya berhasil karena baris sudah ada), tetapi menimbulkan noise kegagalan yang menyamarkan masalah nyata.

**Perbaikan (pilih salah satu, keduanya murah):**

**(a) Atomikkan upsert** — hilangkan jendela SELECT-then-INSERT:
```go
var course models.Course
err := tx.Clauses(clause.OnConflict{
    Columns:   []clause.Column{{Name: "name"}},
    DoNothing: true,
}).Create(&models.Course{Name: originalCourse}).Error
if err != nil { return err }
if err := tx.Where("name = ?", originalCourse).First(&course).Error; err != nil {
    return err
}
```
Pada Postgres, `ON CONFLICT DO NOTHING` menunggu transaksi pemenang lalu tidak melakukan apa pun — tidak ada unique violation yang lolos.

**(b) Hapus tabel `courses` dari jalur kritis** — `course_id` hanya di-echo kembali (`calendar/handler.go:438`), tidak pernah dipakai untuk join atau otorisasi. Menyimpan `course` sebagai string di `events` (sudah ada, `models/event.go:9`) sudah cukup. Ini juga menghapus satu titik tulis global dari jalur sync.

**Definition of done WS-11:** (1) `PersistAssignments(ctx, userA, "google_classroom", nil, "{}")` → **nol** baris berubah, bukan seluruh baris pending ter-flip; (2) dua user dummy dengan nama kursus sama, sync konkuren dari tabel `courses` kosong → **kedua** transaksi commit, tidak ada `duplicate key` di log.

---

## Urutan eksekusi yang disarankan

| Sprint | Isi | Alasan |
|---|---|---|
| **Hari 0** | WS-0 (rotasi kredensial) | Eksploitasi tidak butuh apa pun selain akses file |
| **Sprint 1** | **WS-11.1** (guard `len(keys)==0`), WS-2 (SSRF), WS-4 (metrik), WS-5.1–5.3 (parser+body cap+property), WS-10.6, WS-1.5 (`no-store`) | Semua patch ≤10 baris, dampak besar, tanpa risiko regresi. WS-11.1 adalah **tiga baris** yang mencegah kehilangan tugas massal — kerjakan paling awal. |
| **Sprint 2** | WS-1 (trusted proxy + pre-limiter + limiter Telegram), WS-8.4 (log SQL), WS-8.2 (`exp`), WS-11.2 (upsert kursus) | Memperbaiki akar #2/#4/#13/#16/#12 sekaligus |
| **Sprint 3** | WS-6 (Telegram binding), WS-3.1 (cooldown) | Butuh migrasi data + keputusan produk |
| **Sprint 4** | WS-7 (batas volume), WS-9 (dedup sync), WS-3.2–3.3 | Perubahan query & transaksi, butuh uji beban |
| **Sprint 5** | WS-8.1 (revoked_reason), WS-8.5, WS-10 sisanya | Migrasi kolom + perubahan topologi |

**Catatan urutan:** WS-11.1 sengaja diletakkan di Sprint 1 meski bukan "kerentanan" klasik, karena (a) patch-nya tiga baris, (b) efeknya kehilangan data pengguna yang tidak terlihat, dan (c) ia menyamarkan bug lain — setiap kali guard ini aktif, log sync penuh kegagalan palsu yang membuat investigasi WS-9/WS-11.2 jauh lebih sulit.

## Prasyarat pengujian

Repositori hanya punya `internal/config/config_test.go` dan `internal/pkg/classcode/exam_test.go`. Tanpa sandbox di host audit, **CI adalah satu-satunya tempat verifikasi**. Tambahkan minimal:

1. `urlutil` table test — semua kasus SSRF (tanpa jaringan).
2. `ics` benchmark — kurva alokasi linear (tanpa jaringan).
3. `middleware` fixture — `gin.New()` + limiter, XFF tidak berpengaruh setelah `SetTrustedProxies(nil)`; plus assert `Cache-Control: no-store` dan `Vary` pada respons.
4. `metrics` fixture — 5.000 path → seri konstan.
5. Handler test dengan `sqlmock` atau Postgres service container di CI untuk `assignments`/`courses` (bisa tanpa Postgres nyata bila query dipindah ke `WHERE`).
6. **Sync persist test** — `PersistAssignments(..., nil)` → nol baris berubah; dua user nama kursus sama konkuren → kedua commit. Ini regresi paling penting untuk WS-11.
7. Race detector (`go test -race`) untuk `EnsureGoogleAccessToken` dan `SyncBatch`.

## Yang **tidak** perlu diperbaiki

Tiga kandidat yang ditolak verifikator — jangan buang waktu:
- `injection/ics-parsemoodleics/unvalidated-url-property-scheme` — React `sanitizeURL` + mobile Intent handler sudah menetralkan; cukup catatan hardening (validasi skema di `events.url` tetap ide bagus sebagai pertahanan berlapis).
- `lmssync/syncbatch:no-provider-timestamp-reselect` — baris yang ditulis justru jatuh ke belakang antrean, bukan memblokir kepala.
- `apikey/...:detached-last-used-goroutine` — biaya konstan per request, bukan akumulasi; kausalitas terbalik.

---

## Peta lead → workstream (23 lead, tanpa yang terlewat)

Nomor mengikuti tabel `REPORT.md` / `NEEDS-VALIDATION.md`.

| Lead | Ringkas | Workstream |
|---|---|---|
| 1 | SSRF URL kalender Moodle | WS-2 |
| 2 | Trusted-proxy default → bucket rate-limit pilihan klien | WS-1.1 |
| 3 | `syncCooldown` tidak ditegakkan | WS-3.1 |
| 4 | Bucket `apiKeyRateLimit` berkunci alamat klien | WS-1.1, WS-1.4 |
| 5 | Tidak ada `Cache-Control`/`Vary` pada GET ber-`X-API-Key` | **WS-1.5** |
| 6 | Refresh token revoked masih ditukar sesi baru di grace window | WS-8.1 |
| 7 | Race tulis refresh token Google tanpa serialisasi | WS-3.3 |
| 8 | Kardinalitas label Prometheus dari raw path | WS-4 |
| 9 | `FOR UPDATE SKIP LOCKED` di luar transaksi | WS-9 |
| 10 | ICS line-unfolding O(N²) | WS-5.1 |
| 11 | Body Moodle dibuffer tanpa batas | WS-2.3, WS-5.2 |
| 12 | Unique index global `courses.name` + FirstOrCreate non-atomik | **WS-11.2** |
| 13 | Token OAuth plaintext + logger GORM menginterpolasi | WS-8.4 |
| 14 | `GET /v1/assignments` tanpa LIMIT/konteks | WS-7.1 |
| 15 | `GET /v1/courses` + exchange sort kuadratik | WS-7.2 |
| 16 | `POST /v1/telegram/test-briefing` tanpa limiter/deadline | **WS-1.3** |
| 17 | Binding chat Telegram via `PUT /v1/user` tanpa bukti | WS-6.1 |
| 18 | Resolusi bot by-chat-id ambigu | WS-6.2, WS-6.3 |
| 19 | Kode bind 30-bit `math/rand` tanpa counter | WS-6.4 |
| 20 | Sync kosong menandai semua pending selesai/missed | **WS-11.1** |
| 21 | `telegram_chat_id` terikat ke >1 akun | WS-6.2 |
| 22 | Judul/kursus tanpa escape ke Markdown Telegram | WS-6.5 |
| 23 | `scopes` API key selalu `[]` dan tidak dibaca | WS-10.9 |

**Verifikasi cakupan:** 23 dari 23 lead punya workstream. Empat yang sebelumnya tidak tercakup (#5, #12, #16, #20) sekarang punya item eksplisit.
