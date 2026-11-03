# LAPORAN AUDIT KEAMANAN — RESSIST backend/

- **Profil run:** `deep` — seluruh 6 fase (recon, hunting, coverage critic, validasi kandidat, verifikasi record, pelaporan)
- **Scope:** hanya `backend/` pada repositori `resisst`. `bot/`, `frontend/`, dan `mobile-kmp/` eksplisit di luar scope (dicatat sebagai 3 unit `out_of_scope`).
- **Budget:** tidak ditetapkan (`budget: null`). Agen terpakai: 4 recon + 9 hunter + 2 critic + 26 validator kandidat + 23 verifikator record = **64 agen**.
- **Sumber:** tidak ada run sebelumnya yang kompatibel untuk repositori ini; tidak ada konfirmasi bawaan (`prior_status: none` untuk semua unit).
- **Eksekusi:** **source-and-local-only, tanpa sandbox** — tidak ada runtime container OS-enforced di host audit (docker/podman/nerdctl/containerd/ctr/vagrant/qemu absen; WSL2 terpasang tetapi tanpa distribusi), sehingga **tidak ada satu pun pemeriksaan yang bisa dieksekusi** dan **tidak ada temuan `confirmed`**. Semua 3.946 pemeriksaan di ledger bermethod `source` dengan `artifact: null`.
- **Status run:** `complete` — coverage bersih (critic final: `stop=true`), setiap kandidat punya disposisi akhir, dan seluruh 23 record tersimpan lolos verifikasi Phase 5. Run ini **bukan run parsial dari sisi coverage**, tetapi run tanpa observasi runtime: kualitas keputusan dibatasi oleh mode source-only.

## Ringkasan postur keamanan

Postur umum `backend/` **cukup baik untuk layanan kampus skala kecil**: pola positif nyata antara lain rotasi refresh-token dengan deteksi reuse + grace window, bot auth berbasis `X-Act-As-User` dengan pembanding konstan-waktu, hash API-key SHA-256 (256-bit entropi), verifikasi kepemilikan chat Telegram lewat kode, rate limiter token-bucket pada jalur unauthenticated, dan timeout request global.

Kelemahan sistemik yang terlihat lintas temuan: (1) **kontrol yang dihitung tetapi tidak pernah ditegakkan** (`syncCooldown`, `scopes` API key, dedup antar-replika `FOR UPDATE`), (2) **key yang dipilih/dipengaruhi klien** (bucket rate limit dari `X-Forwarded-For`, label metrik dari raw path), dan (3) **fan-out/konsumsi tanpa batas** terhadap kuota pihak ketiga dan memori proses bersama. Semua temuan di bawah adalah **kandidat `needs_validation`**, bukan kerentanan terkonfirmasi — masing-masing butuh satu observasi runtime terbatas untuk naik atau gugur.

## Temuan terkonfirmasi

**Tidak ada.** Tanpa kemampuan eksekusi, cabang `confirmed` dari schema tidak dapat diisi secara jujur (butuh `execution` + `observed_result` yang diobservasi). Tabel confirmed kosong sesuai aturan — run ini **tidak boleh** dibaca sebagai "bersih".

## NEEDS VALIDATION (23 kandidat, tanpa severity)

Urutan kasar berdasarkan potensi dampak menurut sumber (bukan severity resmi).

| # | Judul (ringkas) | Jejak sumber (entrypoint → sink) | Blocker penghalang utama | Langkah lokal berikutnya | Pemeriksaan owner di deployment |
|---|---|---|---|---|---|
| 1 | SSRF: URL kalender Moodle hanya dicek sebagai substring path — API mem-fetch origin internal dan mengembalikan body | `user/handler.go:254` → `urlutil.go:26/29` → `calendar/handler.go:77` → `moodle/client.go:67-68` | Tidak ada sandbox untuk menjalankan fixture listener loopback | Tabel-dorong `IsLikelyMoodleCalendarURL` dengan `http://127.0.0.1:5432/...`, `http://169.254.169.254/...` (cabang query authtoken+userid) + stub listener | Dari dalam container api: cek status/badbyte ke peer compose (api:8080, bot:8081, gateway bridge), dan apakah egress difilter |
| 2 | Default trusted-proxy Gin: pemanggil langsung memilih bucket rate-limit sendiri via `X-Forwarded-For` | `router.go:39` (`gin.New()`, tanpa `SetTrustedProxies`) → `rate_limit.go:75/107` → `rate_limit.go:51/61` | Observasi 200-vs-429 butuh binary hidup + Postgres | Fixture `gin.New()` + `AuthRateLimit(30,10)`: 11 request dengan XFF berbeda semuanya 200; kontras dengan `SetTrustedProxies` | Periksa ingress: XFF di-strip/overwrite/append? Port api langsung terjangkau? |
| 3 | `syncCooldown` dihitung tetapi tidak pernah ditegakkan — fan-out LMS tak terbatas per `force=true` dan `/auth/sync` | `router.go:129/172` → `calendar/handler.go:107` → `google/client.go:236` (1 call submissions per coursework) → `sync/service.go:119` | Kuota Google project bersama + jumlah replika tidak bisa dibaca dari repo | Harness handler + fixture loopback: 2× `force=true` → 2× enumerasi penuh meski timestamp sudah ditulis | Baca kuota Classroom project; burst kecil force=true dari satu mahasiswa uji, amati 429 mahasiswa lain |
| 4 | Bucket `apiKeyRateLimit` berkunci alamat pilihan klien — satu principal lolos budget, principal tak terkait berbagi satu bucket | `router.go:128` → `auth.go:97` → `rate_limit.go:107/116` | Topologi ingress + jumlah replika di luar repo | Fixture middleware (bebas DB): rotasi XFF selalu dapat burst penuh; dua JWT sama RemoteAddr berbagi bucket | Tanya operator ingress XFF + replika; cek 429 historis per path |
| 5 | Tidak ada `Cache-Control`/diskriminator kredensial pada GET ber-X-API-Key | `router.go:118` → `auth.go:68` → `router.go:63` → `user/handler.go:55` | Eksistensi cache bersama (CDN/proxy) di depan api tidak terverifikasi | Fixture chain router + nginx `proxy_cache` loopback, 2 key beda URL sama | Minta GET /v1/user dua kali dengan 2 key sekali pakai, bandingkan body/header cache |
| 6 | Refresh token yang di-revoke masih ditukar sesi baru di dalam grace window (logout & jalur theft) | `auth/handler.go:213` → `auth/service.go:525/417/418/423/430` | Butuh Postgres hidup; lebar grace efektif deployment tidak ter-pinned (30s default vs 300 example) | Fixture Postgres sekali pakai: revoke lalu rotate dengan nilai sama → assert sesi baru minted; kontras di luar window | Owner: konfirmasi `REFRESH_REUSE_GRACE_SECONDS` efektif; uji staging dummy: logout → refresh → 200 atau 401? |
| 7 | Race tulis refresh token Google tanpa serialisasi per-user | `calendar/handler.go:107` → `google/client.go:444/472/503` | Putusan: apakah OAuth client Google yang dipakai benar-benar merotasi refresh token (default web flow: tidak) | Stub RoundTripper via `oauth2.HTTPClient` context, dua `EnsureGoogleAccessToken` konkuren | Owner: nyatakan kebijakan rotasi token untuk GOOGLE_CLIENT_ID tsb |
| 8 | Kardinalitas label Prometheus tak terbatas dari raw path request tak ter-match → OOM proses | `router.go:44/162` → `metrics.go:49/55/57` | Pertumbuhan seri hanya bisa diukur dengan eksekusi; konfigurasi Prometheus di luar repo | Fixture `gin.New()+HTTPMetrics`: ribuan path unik → hitung seri + delta heap; kontrol: satu path berulang tetap datar | Staging: kirim ~200 path tak dikenal, bandingkan jumlah seri `/metrics` + RSS sebelum/sesudah |
| 9 | `FOR UPDATE SKIP LOCKED` di luar transaksi — dedup antar-replika sync harian tidak berfungsi | `lmssync/scheduler.go:29` → `cmd/api/main.go:38` → `lmssync/service.go:41/48/92` | Hanya material saat api di-scale ≥2 replika; komposisi produksi tidak diketahui | Postgres throwaway, dua `SyncBatch` konkuren → assert kedua memproses user sama; versi dalam `Transaction` → disjoint | Jalankan 2 replika di staging satu tick cron, bandingkan log user id per replika |
| 10 | ICS line-unfolding O(N²) pada input penyerang (`line +=` dalam loop) | `calendar/handler.go:81` → `moodle/client.go:79` → `ics/parser.go:43/56` | Konstanta waktu hanya via pengukuran; CPU container tidak di-declare | Fixture: blok terlipat N=10k/20k/40k, waktu & TotalAlloc ≈ quadruple saat N dobel | Owner: baca CPU quota api; ukur latency /livez saat satu parse in-flight |
| 11 | Body response Moodle di-buffer tanpa batas byte dalam proses API bersama | `calendar/handler.go:81` → `moodle/client.go:61/67/79` | Limit memori container + GOMEMLIMIT di luar repo; ingest rate penyerang tidak diketahui | Loopback listener badan 1MiB/16MiB/256MiB + kasus gzip → peak HeapAlloc | Owner: baca MemLimit container; satu request GET /v1/calendar/raw ke origin 256MiB milik owner, sampel RSS |
| 12 | Unique index global `courses.name` + FirstOrCreate non-atomik: insert pertama konkuren menggagalkan transaksi sync principal lain | `router.go:129` → `sync/service.go:129` → `models/course.go:12` → `sync/service.go:119` | Race duplicate-key butuh Postgres hidup; dapat-diarahkan-nya serangan diragukan | Dua user dummy, fixture feed deklarasi nama kursus sama, sync konkuren → tepat satu commit | Owner: grep log produksi `PersistAssignments failed` dengan duplicate-key pada idx_courses_name |
| 13 | Token pair OAuth Google tersimpan plaintext dan logger GORM default menginterpolasinya ke stdout saat error/slow SQL | `auth/handler.go:162` → `auth/service.go:253` → `models/user.go:28` → `postgres.go:22` | Trigger (>200ms slow atau error) butuh DB hidup; tujuan log stdout = fakta deployment | Fixture Postgres + sentinel string, paksa UPDATE >200ms, capture stdout | Owner: grep 1 jam stdout api untuk `google_refresh_token` dan marker `SLOW SQL >= 200ms` |
| 14 | `GET /v1/assignments` materialisasi seluruh tabel events pemanggil tanpa LIMIT dan tanpa pembatalan konteks | `router.go:159` → `assignment/handler.go:96/126/131/144` → `classcode.go:274` → `handler.go:184` | Pertumbuhan heap butuh eksekusi; jumlah baris aktual + retention = data produksi | Fixture N=1k/10k/50k baris, konteks dibatalkan langsung → assert query tetap selesai (bug) | Owner: jumlah baris events terbesar per user, max_connections, keberadaan job pruning |
| 15 | `GET /v1/courses` load semua event + exchange sort kuadratik dengan kardinalitas dikendalikan pemanggil | `course/handler.go:34/56/88/92` | Kurva pertumbuhan butuh pengukuran; ingress concurrency tidak diketahui | Fixture 1k–16k distinct course per user, ukur wall-clock/CPU/heap per titik | Owner: p99 GET /v1/courses untuk akun dengan distinct-course terbesar |
| 16 | `POST /v1/telegram/test-briefing`: satu kirim Bot API sinkron tanpa deadline per request lewat token bot bersama | `router.go:152` → `telegram/handler.go:139/161` → `service.go:20` → `bot.go:27` | Metering Telegram (per-chat vs global) menentukan apakah ini cross-user atau hardening | Mock Bot API lokal: N panggilan, hitung goroutine/socket/429-continues | Owner: riwayat 429 token bot, replika, apakah proxy sudah me-rate-limit /v1/telegram/* |
| 17 | Binding chat Telegram lewat `PUT /v1/user` tanpa bukti kepemilikan (bypass jalur verify-code) | `router.go:119` → `user/handler.go:312/253` → `models/user.go:20` → `botservice/handler.go:174` | Cara akun lain mengetahui chat-id numerik orang lain tidak terlihat di repo | Fixture: PUT /v1/user sebagai B membawa chat-id A → assert tulis sukses; lalu resolv | Owner: audit log PUT telegram_chat_id tanpa konsumsi verify code sebelumnya |
| 18 | Resolusi bot by-chat-id ambigu: kolom tanpa unique index + `First()` tanpa predikat enabled | `user/handler.go:312` → `models/user.go:20` → `botservice/handler.go:34/43` | Baris mana yang menang bersifat data-dependent (UUID PK acak) | Fixture dua user dummy berbagi chat-id → assert pemenang deterministik (PK terkecil) | Owner: query duplikat telegram_chat_id di replika baca; kelayakan partial unique index |
| 19 | Kode bind Telegram 30-bit `math/rand`, diverifikasi tanpa counter percobaan atau throttle | `user/handler.go:200/391` → `models/user.go:22` → `bot/telegram/bot.go:107` (di luar scope, jalur saja) → `botservice/handler.go:107` | Tingkat percobaan feasible terhadap bot produksi tidak terlihat dari sumber | Harness generator + fixture VerifyTelegram: salah tebak → 404 tanpa counter | Owner: ukur rate pesan 6-karakter per chat yang diterima bot; schema live tanpa lockout? |
| 20 | Sync sukses-tapi-kosong menandai SEMUA assignment pending provider itu selesai/missed (guard scope hilang saat key set kosong) | `calendar/service.go:135` → `google/client.go:158/230` → `sync/service.go:115/172/383` | Fetch sukses-nol-record di produksi = fakta data (semester berganti, window 60 hari) | Fixture: `PersistAssignments(..., nil)` → assert baris pending provider itu ter-flip massal | Owner: pada batas semester, bandingkan events.status vs Classroom nyata; cek log "fetch ok" dengan nol record |
| 21 | Kolom `telegram_chat_id` bisa terikat ke lebih dari satu akun — resolusi chat→akun mengembalikan satu baris tetap yang bisa milik akun lain | `botservice/handler.go:92/107/118` → `models/user.go:20` → `user/handler.go:313` | Skema live bisa punya unique index out-of-band; data duplikat eksisting = fakta produksi | Fixture dua row berbagi chat-id + jalur verify → assert tulis duplikat diterima | Owner: `\d users`, query duplikat, writer mana yang aktif |
| 22 | Judul tugas dan nama kursus diinterpolasi TANPA escape ke pesan Telegram ber-parse_mode Markdown | `telegram/handler.go:59` -> `service.go:104/19/119` | Perilaku parse Markdown Bot API ada di sisi pihak ketiga, tidak bisa diobservasi dari sumber | Stub BotAPI rekam: kirim `Tugas_1` dan `[klik](https://attacker.example)` lalu assert markup lolos verbatim | Owner: grep log "can't parse entities" berkorelasi judul berisi underscore/bintang |
| 23 | Scopes API key selalu `[]` dan tidak pernah dibaca middleware, padahal kredensial itu menjangkau route sync yang mengubah state | `router.go:128` -> `auth.go:78` -> `apikey/service.go:165` -> `calendar/handler.go:107` -> `sync/service.go:119` | Apakah key pernah dipegang pihak selain pemilik akun adalah fakta produk di luar repo | Fixture: mint key user A, GET preview?force=true, assert 200 dan baris A berubah sementara baris B utuh | Owner: konfirmasi API key seharusnya read-only, dan apakah ada key di tangan pihak ketiga |

Catatan: #5 dan #6 (missing cache directive, dua fingerprint sisi chain dan sisi response) menggambarkan satu area kontrol yang sama; #2, #4, #5, #6 semuanya berakar pada chain global tanpa kontrol proxy/cache. Record `findings.json` tetap sumber kebenaran per fingerprint.

**3 record ditolak** (bukan temuan; disebut untuk transparansi):
- `injection/ics-parsemoodleics/unvalidated-url-property-scheme` — premise dampak (eksekusi skrip di klien) dibantah source: semua render web lewat `sanitizeURL` React, mobile pakai Intent `UriHandler`, sink Telegram menolak di sisi server.
- `lmssync/syncbatch:no-provider-timestamp-reselect` — rantai dampak dibantah: baris yang ditulis justru jatuh di belakang antrean sort, bukan di depan.
- `.../apikey/service.go:ValidateApiKey:detached-last-used-goroutine` — kausalitas terbalik (DB stall memblokir request sebelum goroutine tercapai) dan biaya konstan per request, bukan akumulasi.

## Catatan hardening (pilihan, dari 815 catatan hunter)

Paling berdampak, tanpa mengubah verdict:
1. **Kolom `scopes` API key tidak pernah dibaca** — implementasikan binding scope eksplisit atau hapus kolom (berkaitan dengan kandidat #5/#12 tabel di atas).
2. **API key tanpa expiry default** — `Create` menerima hingga 3650 hari; wajibkan max-age/rotasi.
3. **JWT tanpa `jwt.WithExpirationRequired`** — token bertanda tangan sama tanpa `exp` diterima selamanya; satu opsi menutupnya.
4. **`AUTO_MIGRATE=true` di compose produksi** sementara `postgres.go:52-55` menjalankan ALTER TABLE/CREATE INDEX tiap start tanpa mempedulikan flag — matikan di produksi.
5. **Container tanpa `read_only`/`cap_drop`/`no-new-privileges`/limit CPU-memori** di `docker-compose.yml`; curl terpasang di image runtime hanya untuk healthcheck — ganti dengan healthcheck biner Go atau wget dari distroless.
6. **`/metrics` anonim dan di-exempt dari maintenance gate** — full route+schema inventory juga dipublikasikan via `openapi.json` unauthenticated.
7. **`X-Request-ID` diterima dari klien tanpa batas panjang/charset** lalu ditulis ke header response dan tiap baris akses-log.
8. **`internal/scheduler/briefing-candidates` mengembalikan roster seluruh akun** (nama, chat-id) ke satu static token tanpa rate limit.
9. **`subtle.ConstantTimeCompare` pada `bot_auth.go:97` leak panjang token** (early-return pada mismatch panjang).
10. **Disconnect Google tidak mencabut grant di provider** — token lokal terhapus, grant tetap aktif di Google.

## Pola positif sumber

- Rotasi refresh-token + deteksi reuse + `RevokeAll` pada reuse (walau grace window-nya bermasalah, mekanisme dasarnya benar).
- `X-Act-As-User` bot auth dengan `subtle.ConstantTimeCompare` dan audit log.
- API key 256-bit base64url dengan hash SHA-256 tanpa penyimpanan plaintext.
- Verifikasi kepemilikan chat Telegram via kode (walau bisa dilewati PUT /v1/user — kandidat #17).
- Token-bucket rate limiter pada semua jalur auth unauthenticated.
- Global `TimeoutContext` + `Recovery` + request-ID di chain middleware.

## Ringkasan coverage (dari ledger)

| Status | Unit |
|---|---|
| covered | 47 |
| candidate | 31 |
| out_of_scope (bot/, frontend/, mobile-kmp/) | 3 |
| **Total** | **81** |

- Distribusi attack-class: 70 unit `ATTACK-CLASSES.md`, 11 unit `RESOURCE-EXHAUSTION-AND-AVAILABILITY.md`; blok `CLIENT-SIDE` di-exclude 79×, `CLOUD-AND-DEPLOYMENT` 71× (alasan per unit tersimpan di `coverage-ledger.json`).
- 15 entri `uncovered` dari hunter semuanya terselesaikan: 11 menjadi kandidat yang sudah dinilai, 4 dikonfirmasi sudah tercakup unit lain.
- **Critic final: `stop=true`** — 0 missing unit, 0 reassign; coverage dinyatakan bersih untuk scope `backend/` pada profil `deep`.
- Deferred eksplisit: seluruh pemeriksaan runtime/sandbox (semua `local` validation plans), konfigurasi ingress/proxy produksi, dan topologi di luar `backend/`.
- Run metadata: `run_status: "complete"`, `sandbox_available: false`, `budget: null`.

## Kredensial live (perhatian)

`backend/.env` berisi **kredensial live** (nama variabel ada di file; nilai tidak dikutip di mana pun dalam artefak audit ini). File tersebut ter-track di working tree repositori — **rotasikan semua nilainya** dan pindahkan ke secret manager / environment injection; jangan pernah commit `.env` (pastikan entri `.gitignore`-nya ada dan berlaku).
