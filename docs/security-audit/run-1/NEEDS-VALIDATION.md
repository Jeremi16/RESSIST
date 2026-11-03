# NEEDS-VALIDATION.md — RESSIST backend/ (run-1)

Seluruh 23 lead di bawah adalah kandidat `needs_validation`: jejak sumber dan line-nya sudah diverifikasi dua kali oleh verifikator independen, tetapi dampak/volume/kelayakan akhirnya butuh satu observasi runtime atau satu fakta deployment yang tidak ada di repositori. **Tidak ada severity.** Kerangka waktu dan urutan di bawah hanyalah urutan kasar berdasarkan potensi dampak menurut sumber. Jangan mengirim traffic audit ke deployment; `deployment plan` selalu bersifat owner-observed dan read-only.

Blocker yang berulang di hampir semua entri (tidak diulang per baris tabel): **tidak ada sandbox OS-enforced di host audit** dan **binary tidak dapat boot tanpa Postgres hidup** (`database.New` error pada `DATABASE_URL` kosong; hanya driver Postgres yang di-pin, tanpa seam DI/SQLite). Setiap `local plan` mengandaikan keduanya tersedia.

| # | Judul | Boundary terdampak | Blocker pertama |
|---|---|---|---|
| 1 | A refresh token revoked by logout or by the RevokeAll theft response is still exchanged for a brand-new rotating session inside the reuse-grace window, because the grace branch keys only on elapsed time since revocation | `backend/internal/modules/auth/handler.go:213` | No OS-enforced sandbox exists on this host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu absent; WSL2 has no distribution), so the logout-then-refresh sequence could … |
| 2 | Google token refresh has no per-user serialization, so a concurrent refresh can clobber a provider-rotated refresh token | `backend/internal/modules/calendar/handler.go:107` | Decisive and outside source: whether Google's OAuth client configured for this deployment (GOOGLE_CLIENT_ID, access_type=offline at auth/service.go:122) actually returns a new refr… |
| 3 | Unbounded Prometheus label cardinality from raw request path on unmatched routes | `backend/internal/shared/router/router.go:44` | No OS-enforced sandbox exists on the audit host. Verified absent: docker, podman, nerdctl, containerd, ctr, vagrant and qemu; the installed WSL2 reports 'no installed distributions… |
| 4 | Sync batch row claim uses FOR UPDATE SKIP LOCKED outside a transaction, so the documented replica deduplication has no effect | `backend/internal/modules/lmssync/scheduler.go:29` | No OS-enforced sandbox exists on this audit host (no docker, podman, nerdctl, containerd, ctr, vagrant or qemu; WSL2 has no distribution), so two concurrent SyncBatch invocations a… |
| 5 | ICS line unfolding uses line += in a loop, so a folded block costs O(N^2) copied bytes and O(N^2) allocation for O(N) attacker-supplied input | `backend/internal/modules/calendar/handler.go:81` | No OS-enforced sandbox exists on this audit host: docker, podman, nerdctl, containerd, ctr, vagrant and qemu are all absent and WSL has no installed distribution, so no isolated fi… |
| 6 | Moodle calendar fetch buffers an attacker-sized response with no byte cap, in one shared API process | `backend/internal/modules/calendar/handler.go:81` | No OS-enforced sandbox exists on the audit host (no docker/podman/containerd, no WSL distribution), so the memory growth curve could not be measured and no target-controlled reques… |
| 7 | Global unique index on courses.name plus a non-atomic FirstOrCreate lets a concurrent first insert abort another principal's sync transaction | `backend/internal/shared/router/router.go:129` | No OS-enforced sandbox exists on the audit host (no container runtime, no WSL2 distribution), so the duplicate-key race could not be reproduced against a local Postgres with two du… |
| 8 | Google OAuth token pair is stored in plaintext and the default GORM logger interpolates it into SQL written to stdout on error or slow statements | `backend/internal/modules/auth/handler.go:162` | No OS-enforced sandbox is available on this host (no docker, podman, nerdctl, containerd, ctr, vagrant or qemu; WSL2 has no distribution), so the target cannot be built, started, o… |
| 9 | API keys carry an empty scopes record that no authorization decision consults, yet the credential reaches the state-changing calendar sync routes | `backend/internal/shared/router/router.go:128` | No OS-enforced sandbox exists on the audit host (no container runtime, no WSL2 distribution), so the end-to-end demonstration - a key minted for user A calling GET /v1/calendar/pre… |
| 10 | GET /v1/assignments materialises and serialises the caller's entire events table with no row bound and no request-context cancellation | `backend/internal/shared/router/router.go:159` | No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are all absent and WSL2 has no distribution installed), so the growth-po… |
| 11 | Bot chat-id resolution is ambiguous: users.telegram_chat_id is user-writable without proof of chat ownership and carries no uniqueness constraint, so a Telegram chat can be attributed to the wrong student's account | `backend/internal/modules/user/handler.go:312` | No OS-enforced sandbox exists on this host: docker, podman, nerdctl, containerd, ctr, vagrant and qemu are all absent and WSL2 has no installed distribution, so the two-dummy-tenan… |
| 12 | GET /v1/courses materialises every event row the caller owns and orders the distinct course names with a hand-written quadratic exchange sort, with cardinality the caller controls through their own LMS feed | `backend/internal/modules/course/handler.go:34` | No OS-enforced sandbox exists on this host (verified: docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent and `wsl -l -v` reports no installed distribution), so t… |
| 13 | POST /v1/telegram/test-briefing issues one synchronous, deadline-less outbound Bot API send per request through the single shared TELEGRAM_BOT_TOKEN, with no per-principal or per-chat quota on the chain | `backend/internal/shared/router/router.go:152` | Telegram's actual metering for this bot token is outside the repository and cannot be contacted: the enforced global messages-per-second budget, the per-chat budget, and whether a … |
| 14 | PUT /v1/user binds an arbitrary Telegram chat ID without the verify-code ownership proof | `backend/internal/shared/router/router.go:119` | No OS-enforced sandbox is available on this host and the binary requires a live Postgres, so the API write/query sequence cannot be exercised here; evidence is source-only.… |
| 15 | Telegram chat-binding code is a 30-bit math/rand value verified with no attempt counter or throttle | `backend/internal/modules/user/handler.go:200` | No OS-enforced sandbox exists on this host (docker, podman, containerd, qemu, and WSL2 distributions are all absent), so no harness can be compiled or run and the generator's outpu… |
| 16 | The shared apiKeyRateLimit buckets authenticated callers by a client-chosen address, so one principal can escape its budget and unrelated principals share one | `backend/internal/shared/router/router.go:128` | No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent and WSL2 has no distribution installed), so the bounded local… |
| 17 | Calendar preview performs an unbounded persisting LMS fan-out on every force request; the advertised one-hour refresh cooldown is never enforced | `backend/internal/shared/router/router.go:129` | No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent; WSL2 has no distribution installed), so no target code was e… |
| 18 | A successful but empty LMS fetch marks every pending assignment of that provider as completed or missed, because the stale-marking scope restriction is omitted when the fetched key set is empty | `backend/internal/modules/calendar/handler.go:155` | No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant, qemu absent; WSL2 has no distribution) and the binary cannot boot without a live… |
| 19 | Global middleware chain emits no cache directive or credential cache-key discriminator for X-API-Key authenticated GET responses | `backend/internal/shared/router/router.go:118` | No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent; WSL2 has no distribution installed), so no request was issue… |
| 20 | Gin trusted-proxy default lets any direct caller choose the rate-limit bucket key and audit client IP via X-Forwarded-For | `backend/internal/shared/router/router.go:39` | No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent; the installed WSL2 has no distribution), so the target binar… |
| 21 | Moodle calendar URL predicate inspects only path and query substrings, so any authenticated student can make the API fetch an arbitrary internal HTTP origin and read the response body back | `backend/internal/shared/router/router.go:119` | No OS-enforced sandbox exists on this host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent; WSL2 has no distribution installed), so no target-controlled requ… |
| 22 | Assignment title and course name are interpolated unescaped into a Markdown-parsed Telegram message | `backend/internal/modules/telegram/handler.go:59` | No OS-enforced sandbox exists on the audit host and no outbound network calls are permitted, so the decisive observation — whether the Telegram Bot API rejects a message containing… |
| 23 | Telegram chat id can be bound to more than one account, so chat-to-account resolution returns one fixed row that can belong to the other account | `backend/internal/modules/botservice/handler.go:92` | No OS-enforced sandbox exists on this host (no docker/podman/WSL distribution), and the API cannot boot without a live Postgres (internal/database/postgres.go:13-16 fatals on an em… |


---

## 1. A refresh token revoked by logout or by the RevokeAll theft response is still exchanged for a brand-new rotating session inside the reuse-grace window, because the grace branch keys only on elapsed time since revocation

- **Fingerprint:** `backend/internal/modules/auth/service.go:rotate:revoked-token-grace-mints-session`
- **Boundary terdampak:** `backend/internal/modules/auth/handler.go:213` (Refresh) — efek akhir di `backend/internal/modules/auth/service.go:430` (rotate)

**Klaim akar masalah (claimed_root_cause):**

> The reuse-grace branch keys only on 'revoked recently' and cannot distinguish a rotation race from an explicit logout or a RevokeAll revocation, because models.RefreshToken records only a single revoked_at timestamp with no revocation reason, so rotation mints a valid replacement token for a token the system has already decided to invalidate.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/auth/handler.go:213` — *Refresh* — Unauthenticated handler has read the raw token from cookie, X-Refresh-Token header or JSON body (:197-211) and passes it straight to RotateRefreshTokenEx with no client authentication and no session-state binding.
propagation → `backend/internal/modules/auth/service.go:525` — *RevokeRefreshToken* — Logout (from handler.go:288) sets revoked_at = now on the single row matching the token hash, recording nothing about why, so the row is indistinguishable from one revoked by rotation.
propagation → `backend/internal/modules/auth/service.go:417` — *rotate* — The replay enters the RevokedAt != nil branch, which sits ahead of the expiry and absolute-cap checks and never asks who revoked the row or why.
propagation → `backend/internal/modules/auth/service.go:418` — *rotate* — now.Sub(*existing.RevokedAt) < s.reuseGrace() is the only condition; reuseGrace falls back to 30s (service.go:39-44), config default is 30 (config.go:110) and .env.example ships 300, so a seconds-old logout revocation satisfies it.
propagation → `backend/internal/modules/auth/service.go:423` — *rotate* — mintFreshToken creates a new row for the same user with the original SessionStartedAt (service.go:377), a fresh 48-byte CSPRNG value and a cap-limited sliding expiry, returning it instead of calling RevokeAllUserRefreshTokens.
sink → `backend/internal/modules/auth/service.go:430` — *rotate* — A RotateResult with Rotated=false is returned for an already-revoked token; the handler issues a new access token, returns 200, and writes the new refresh token into the httpOnly cookie (handler.go:254) and the mobile body (:267-270).

**Bukti terverifikasi:**

- `backend/internal/modules/auth/service.go:417` — The revoked branch precedes the expiry (438) and cap (446) checks and inspects only the timestamp, never the cause of revocation.
- `backend/internal/modules/auth/service.go:502` — The same time-only grace logic is duplicated in the lost-race branch, so both revoked-row paths funnel into mintFreshToken on identical criteria.
- `backend/internal/modules/auth/service.go:435` — RevokeAllUserRefreshTokens, the intended theft response, is reached only outside the grace window; in-window replays skip it entirely.
- `backend/internal/modules/auth/service.go:517` — RevokeAll writes only revoked_at, so theft-revoked tokens are grace-eligible for the next window, undoing the very response meant to evict them.
- `backend/internal/models/refresh_token.go:15` — A single RevokedAt pointer with no reason, actor or replacement link, so no consumer can separate logout from rotation revocation.
- `backend/internal/modules/auth/handler.go:288` — Logout revokes the presented token best-effort (errors only logged), clears the cookie (:292) and returns 204; this is what the grace path silently undoes, and it revokes only this row.
- `backend/internal/modules/auth/handler.go:254` — On a grace hit the handler still writes the newly minted token into the httpOnly refresh_token cookie, so the replayer keeps a live credential.
- `backend/internal/config/config.go:110` — Default 30s, while the field comment (config.go:42-44) and .env.example:25 both say 300, so shipped and documented values widen the window.
- `backend/internal/modules/auth/service.go:39` — reuseGrace applies the config only when positive and otherwise returns 30s, so the window cannot be disabled by setting 0; minimum exposure is 30 seconds.
- `backend/internal/modules/auth/service.go:331` — The RotateResult comment explicitly accepts that an attacker replaying a stolen token inside the short grace window also gets a fresh token, calibrating this as an unmitigated design trade-off and confirming the branch is reachable and intended.
- `backend/internal/modules/auth/token.go:37` — Access tokens carry no jti or revocation field and are verified on signature, issuer, audience and expiry only (token.go:59-72), so logout cannot kill an issued access token; the grace path extends a revoked chain past that horizon.

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on this host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu absent; WSL2 has no distribution), so the logout-then-refresh sequence could not be executed and no bounded local observation exists; the confirmed branch's observed_result cannot be filled truthfully here.
1. Service holds a concrete *gorm.DB with no interface seam and go.mod pins only gorm.io/driver/postgres, while database.New errors on an empty DATABASE_URL (postgres.go:14-16) and cmd/api/main.go:25-27 log.Fatals, so exercising RevokeRefreshToken then RotateRefreshTokenEx needs a live Postgres this host may not run.
1. The deployed REFRESH_REUSE_GRACE_SECONDS is not pinned: code default 30 (config.go:110), comment 300 (config.go:44), .env.example 300, docker-compose.yml passes nothing, and the repo-root .env compose interpolates from is absent. All readings are at least 30s, so the defect exists in every case, but the exact deployed width is unconfirmed.
1. Threat-model precondition outside source: the attacker must already hold the raw refresh-token value and replay it within the window after the legitimate revocation. Source establishes sufficiency of possession plus in-window replay, not that possession occurs in the deployment.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In an isolated fixture with a disposable Postgres, insert one RefreshToken row for a dummy user, call Service.RevokeRefreshToken on its raw value to simulate logout, then call Service.RotateRefreshTokenEx with the same value and assert the result is non-nil with Rotated=false, a non-empty NewRefresh, and a second non-revoked row for that user. Then the theft variant: create a live token, rotate once so the old row is revoked by rotation, replay the old value to trigger ErrRefreshTokenReuse and the RevokeAll at service.go:435, and assert an immediate second replay now returns a fresh token instead of 401. For the outside-grace leg set REFRESH_REUSE_GRACE_SECONDS=1, wait about two seconds, replay and assert ErrRefreshTokenReuse. Dummy rows only, no network, throwaway database.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Ask the owner for the effective REFRESH_REUSE_GRACE_SECONDS of the deployed api service, then on staging with a dummy account (never a real student) run logout followed by POST /v1/auth/refresh carrying the just-revoked refresh_token cookie inside that window, and record whether the response is 200 with X-Refresh-Rotated: false and a fresh Set-Cookie rather than 401. Repeat once after the window to confirm the 401 reuse path still fires. Non-destructive; touches only the dummy account's own session.


---

## 2. Google token refresh has no per-user serialization, so a concurrent refresh can clobber a provider-rotated refresh token

- **Fingerprint:** `crypto/google-refreshgoogletoken/concurrent-refresh-token-write-race`
- **Boundary terdampak:** `backend/internal/modules/calendar/handler.go:107` (Handler.GetPreview) — efek akhir di `backend/internal/modules/calendar/google/client.go:503` (Client.UpdateGoogleTokens)

**Klaim akar masalah (claimed_root_cause):**

> The refresh-and-persist sequence has no per-user mutual exclusion and writes the credential back with last-writer-wins semantics, so a concurrently rotated refresh token can be overwritten by a stale copy.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/calendar/handler.go:107` — *Handler.GetPreview* — Verified: line 107 is forceRefresh := c.Query("force") == "true", and line 111 calls syncAndBuildResponse. The handler is mounted at GET /v1/calendar/preview behind APIKeyOrJWT plus a per-key rate limit (60/min, burst 20), so two overlapping syncs for one user are trivially startable. syncCooldown (handler.go:28) is only read by calculateNextRefreshAt (handler.go:475-481) to populate the response nextRefreshAt; it gates nothing. POST /v1/calendar/test, POST /auth/sync and the 07:00 batch reach the same Service.SyncProviders path.
propagation → `backend/internal/modules/calendar/google/client.go:444` — *Client.EnsureGoogleAccessToken* — Verified: an access token whose expiry is at or past (now - 1 minute) falls through to c.RefreshGoogleToken(ctx, user, accessToken) using the user struct loaded at the start of the request (handler.go:100 and :533). No re-read, no lock, no in-flight marker.
propagation → `backend/internal/modules/calendar/google/client.go:472` — *Client.RefreshGoogleToken* — Verified: the provider exchange is oauthConfig.TokenSource(ctx, seedToken).Token(). The mutex inside oauth2's reuseTokenSource (oauth2.go:300) only guards that single TokenSource instance, which is constructed per call, so it provides no cross-request serialization. The package has no mutex or singleflight; the only sync.Mutex in the file is the per-request result aggregator at line 185.
sink → `backend/internal/modules/calendar/google/client.go:503` — *Client.UpdateGoogleTokens* — Verified sink: c.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", user.ID).Updates(updates). The map holds google_access_token and google_token_expiry, plus google_refresh_token when non-empty (lines 498-501). The predicate is user ID only - no version column, no compare-and-swap on the prior refresh token, no optimistic-lock hook on models.User - so the last writer wins.

**Bukti terverifikasi:**

- `backend/internal/modules/calendar/google/client.go:130` — Verified: Client is struct { db *gorm.DB; cfg *config.Config }. A repo-wide grep finds only three sync.Mutex declarations (this file's line 185 aggregator, middleware/rate_limit.go:19, lmssync/service.go:64) and no singleflight import, so no serialization exists anywhere on this path.
- `backend/internal/modules/calendar/google/client.go:449` — Verified: refreshToken := text.Dereference(user.GoogleRefreshToken, "") reads the caller's snapshot of the row, not a value re-read under a lock before the exchange.
- `backend/internal/modules/calendar/google/client.go:498` — Corrected from the candidate's framing: the guard text.Dereference(&token.RefreshToken, "") != "" is true on essentially every refresh, not only on rotation, because golang.org/x/oauth2 v0.36.0 backfills a missing response refresh_token from the request value (internal/token.go:250-254). Harm therefore requires the provider to return a genuinely different token, not merely a non-empty one; in the non-rotating case both writers persist the same string and the race is a no-op.
- `backend/internal/config/config.go:110` — Verified: RefreshReuseGraceSeconds: getEnvAsInt("REFRESH_REUSE_GRACE_SECONDS", 30) exists and the app's own rotate path uses it as an explicit lost-rotation-race tolerance (auth/service.go rotate, Rotated=false compensating path). The Google path has no equivalent. Calibration only - it shows the class is known to the codebase, not that this instance is exploitable.
- `backend/internal/modules/calendar/google/client.go:496` — Verified: user.GoogleTokenExpiry is assigned while building the update map, and user.GoogleRefreshToken at line 500, both before the DB write at 503; user.GoogleAccessToken is set only after success at 507. A failed write leaves the in-memory struct advanced with a stale access token. Impact is confined to that request's struct - the caller returns an error - so this is a cosmetic divergence, not the primary issue.
- `backend/internal/modules/calendar/google/client.go:439` — Verified but tangential: a nil user.GoogleTokenExpiry short-circuits renewal, so a NULL expiry reuses a dead access token indefinitely. This is a distinct defect from the claimed race (a missing-expiry bug, not a concurrency bug) and is included only as context; it should not carry the race fingerprint.

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. Decisive and outside source: whether Google's OAuth client configured for this deployment (GOOGLE_CLIENT_ID, access_type=offline at auth/service.go:122) actually returns a new refresh token on a refresh_token grant. If it does not - Google's default for the web authorization-code flow, where the response normally omits refresh_token and the library backfills the request value - both concurrent writers persist an identical string and the lost update has no observable effect. Neither the repo nor any pinned dependency records the client's rotation policy.
1. No OS-enforced sandbox on this host: docker, podman, nerdctl, containerd and ctr are absent and WSL2 has no distribution, so no concurrent schedule can be executed and no write ordering observed. All checks here are method source with artifact null, so the confirmed branch is unreachable.
1. The fixture needs a live Postgres: go.mod carries only gorm.io/driver/postgres (no SQLite driver) and database.New errors on an empty DATABASE_URL, so an isolated scratch database is a real prerequisite rather than a given.
1. Deployment facts needed to size the window: the api is documented as replicable but docker-compose.yml fixes no replica count, and the overlap between the 07:00 batch and user-initiated previews depends on scheduling that source does not pin.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

Fixture, all external networking blocked, no real credentials. The token URL is hardcoded to google.Endpoint (oauth2.googleapis.com/token) with no config seam, but RefreshGoogleToken passes the caller's ctx straight into oauthConfig.TokenSource(ctx, seedToken), and oauth2 resolves its client via internal.ContextClient(ctx) - so inject ctx = context.WithValue(ctx, oauth2.HTTPClient, &http.Client{Transport: stubRT}) where stubRT is a RoundTripper that answers the fixed token URL locally. Have stubRT return a distinct refresh_token and access_token per call, with a deliberate delay so both callers are in flight before either returns. Seed one scratch Postgres user row with google_access_token, google_refresh_token=RT0 and google_token_expiry one hour in the past; load the row into a *models.User (EnsureGoogleAccessToken reads only the passed struct) and drive two concurrent EnsureGoogleAccessToken calls. Assert (a) both exchanges reached the stub, and (b) the re-read users row does not hold the refresh token from the first response. Repeat with stubRT returning no refresh_token to confirm the non-rotating case is a harmless no-op - that control is what separates this from a benign write. Deterministic ordering via channels, no provider contact, dummy values only.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner-observed, non-destructive: state whether refresh tokens are rotated on exchange for the configured GOOGLE_CLIENT_ID (inspect the OAuth client type and any rotation policy; the observed shape of the response body on a refresh_token grant is sufficient), and record the running api replica count plus the actual cron overlap with peak /v1/calendar/preview?force=true traffic so the concurrent-refresh window can be sized. If rotation is off, this reduces to a robustness fix with no demonstrated impact.


---

## 3. Unbounded Prometheus label cardinality from raw request path on unmatched routes

- **Fingerprint:** `internal/shared/middleware/metrics.go:HTTPMetrics:unmatched-route-raw-path-label-cardinality`
- **Boundary terdampak:** `backend/internal/shared/router/router.go:44` (router.New) — efek akhir di `backend/internal/shared/middleware/metrics.go:57` (middleware.HTTPMetrics)

**Klaim akar masalah (claimed_root_cause):**

> middleware.HTTPMetrics falls back to the raw, attacker-chosen c.Request.URL.Path when c.FullPath() is empty, and that value is used directly as a Prometheus label on a counter vector and a ten-bucket histogram vector registered in the global default registerer with no eviction, no cardinality cap and no path normalisation, so any unmatched request permanently creates metric series whose label values the caller chooses.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/shared/router/router.go:44` — *router.New* — HTTPMetrics is installed on the global middleware chain with r.Use. Verified: gin's Use calls rebuild404Handlers (gin.go:340-345) so the chain is copied into engine.allNoRoute, and handleHTTPRequest assigns that chain to c.handlers before serveError for unmatched requests (gin.go:758-759). An anonymous request to any non-existent path therefore reaches the recorder with no authentication and no rate limiter in front of it.
propagation → `backend/internal/shared/router/router.go:162` — *router.New* — The fully registered engine is returned here without any call to NoRoute or NoMethod and without setting HandleMethodNotAllowed, which keeps gin's default of false (gin.go:213). A repository-wide grep over backend/ for NoRoute, NoMethod and HandleMethodNotAllowed returns zero matches. Consequently no custom 404 handler replaces the global chain and no 405 short-circuit exists, so unmatched requests fall through to gin's serveError with status 404 after the global chain has already been selected.
propagation → `backend/internal/shared/middleware/metrics.go:49` — *middleware.HTTPMetrics* — path is taken from c.FullPath(), which returns c.fullPath (context.go:177-179). That field is set only on a routing-tree hit (gin.go:721) and is cleared on every context reset (context.go:109), so it is empty for an unmatched request and line 51 replaces it with c.Request.URL.Path, the fully attacker-chosen raw path.
propagation → `backend/internal/shared/middleware/metrics.go:55` — *middleware.HTTPMetrics* — The status label is rendered from whatever code the chain produced for the unmatched request. serveError presets 404 before c.Next() runs (gin.go:764-766), Maintenance aborts 503 for non-probe paths while MAINTENANCE_MODE is on (maintenance.go:45), and the CORS handler can abort with its own status, so a single raw path can additionally fan out across several status values.
sink → `backend/internal/shared/middleware/metrics.go:57` — *middleware.HTTPMetrics* — WithLabelValues(c.Request.Method, path, status).Inc() and the matching histogram Observe on line 58 create and retain a new counter child and a new histogram child for every distinct triple. In client_golang v1.24.1 both go through getOrCreateMetricWithLabelValues, which appends the new child to the vector's metricMap and returns it on every later lookup (vec.go:491-510, append at 507); nothing in backend/ ever deletes it.

**Bukti terverifikasi:**

- `backend/internal/shared/middleware/metrics.go:27` — The counter vector's label set is exactly method, path and status, so the request path is a label value rather than a log field. Verified in source.
- `backend/internal/shared/middleware/metrics.go:33` — The histogram declares exactly ten buckets (5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000), so each distinct label triple retains a comparatively large child object (bucket counts, sum and count) in addition to the counter child. Verified in source.
- `backend/internal/shared/middleware/metrics.go:38` — MustRegister is a shortcut for DefaultRegisterer.MustRegister (registry.go:176-177), so both vectors live in the process-global default registry rather than a private one. Verified in source.
- `backend/internal/shared/middleware/metrics.go:50` — This empty-FullPath test, with the assignment on line 51, is the exact branch that admits attacker-chosen label values into both vectors. Verified in source.
- `backend/internal/shared/router/router.go:39` — The engine is created with gin.New() and no NoRoute handler is ever set anywhere in backend/, so unmatched requests still traverse the global chain. Verified in source and by repository-wide grep.
- `backend/internal/shared/router/router.go:87` — /metrics is served by promhttp.Handler wrapped in gin, which gathers from prometheus.DefaultGatherer - the same default registry (promhttp/http.go:209-212) - with no authentication and with Maintenance explicitly allowing it (maintenance.go:37). Every retained series therefore also inflates each scrape response. Verified in source.
- `backend/internal/shared/middleware/logging.go:29` — Counter-evidence examined: JSONAccessLogger applies the identical empty-FullPath fallback, but the raw path is marshalled into a log line and discarded rather than retained in a bounded-lifetime in-memory map, so it is not an accumulating resource and does not displace metrics.go as the root cause. [Pinned dependency source: github.com/gin-gonic/gin@v1.12.0/gin.go:758 — Pinned dependency source in the module cache: handleHTTPRequest sets c.handlers = engine.allNoRoute and calls serveError with 404 for an unmatched path, which is why the global chain - and the recorder - executes for 404 responses. serveError (gin.go:764-766) sets the writer status to 404 before calling c.Next().] [Pinned dependency source: github.com/gin-gonic/gin@v1.12.0/gin.go:356 — Pinned dependency source: rebuild404Handlers assigns engine.allNoRoute = engine.combineHandlers(engine.noRoute), and combineHandlers (routergroup.go:241-248) copies the engine's global Handlers first, so all seven r.Use middlewares including HTTPMetrics are in the 404 chain. The Use doc comment at gin.go:337-338 states the middleware is included 'for every single request. Even 404, 405, static files'.] [Pinned dependency source: github.com/prometheus/client_golang@v1.24.1/prometheus/vec.go:507 — Pinned dependency source: getOrCreateMetricWithLabelValues appends the newly created child to m.metrics[hash] and never removes it; the metricMap (vec.go:319-320) is guarded only by an RWMutex and has no size or cardinality limit, and the registry (registry.go:273-280) exposes no series cap. Retention is therefore permanent for the process lifetime absent an explicit delete call, and backend/ contains none.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on the audit host. Verified absent: docker, podman, nerdctl, containerd, ctr, vagrant and qemu; the installed WSL2 reports 'no installed distributions'. So the engine cannot be exercised locally and no observed series count, registry family count or heap delta can be recorded. Every check in this record is source-only.
1. The target binary cannot boot without a live Postgres: database.New returns an error on an empty DATABASE_URL (internal/database/postgres.go:13-15) and cmd/api/main.go:25-28 turns that into log.Fatalf, with no SQLite path and no injection seam for a fake DB. Even an in-sandbox fixture would need a dummy database alongside the sandbox.
1. Whether a reverse proxy, ingress or CDN in front of api:8080 rejects, normalises, collapses or rate-limits unusual paths before they reach gin is not visible in the repository. docker-compose.yml publishes ${API_PORT:-8080}:8080 directly with no proxy service, and its only comment tells operators to put a load balancer in front when scaling, so the deployed ingress is genuinely undetermined.
1. The deployed Prometheus configuration - scrape interval, retention, any series-limit or cardinality enforcement, and whether registry growth is alerted on - lives outside the repository and decides how visible and how self-limiting the effect is to operators.
1. Retained bytes per series for prometheus/client_golang v1.24.1 cannot be measured without executing the target, so the memory-per-series figure needed to convert request count into container pressure remains an estimate derived from source structure rather than a measurement.
1. How often the api container restarts in the deployed environment - the only reclaim path for these series - is unknown, and docker-compose.yml declares no memory limit for the api service, so the OOM boundary and the recovery behaviour are both operator-side facts.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In the parent-approved sandbox only (never on this host), add a throwaway test beside metrics.go that builds an engine with gin.New() plus middleware.HTTPMetrics(), issues a few thousand httptest requests to distinct unmatched paths, and then (a) counts families and metrics from prometheus.DefaultGatherer, (b) samples runtime.MemStats before and after, and (c) confirms no series is reclaimed across a forced GC. Run a control arm that repeats one unmatched path and must stay flat in series count and heap. Keep the iteration count small, cap the fixture with strict CPU, memory and wall-clock limits, and stop as soon as monotonic growth without reclamation is observable - do not push toward saturation.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

On an owner-controlled staging instance only, send a small pre-declared set of distinct non-existent paths (for example 200, each well under the 1 MiB request-line limit), then compare the count of ressist_http_requests_total series returned by GET /metrics and the api container resident memory before and after, and confirm both stay elevated until the container is restarted. Also confirm whether the fronting proxy forwards those paths verbatim or collapses them. This is bounded, read-only against user data, and must be stopped immediately if memory or scrape latency moves unexpectedly.


---

## 4. Sync batch row claim uses FOR UPDATE SKIP LOCKED outside a transaction, so the documented replica deduplication has no effect

- **Fingerprint:** `lmssync/syncbatch:for-update-outside-transaction`
- **Boundary terdampak:** `backend/internal/modules/lmssync/scheduler.go:29` (Scheduler.Start cron callback) — efek akhir di `backend/internal/modules/lmssync/service.go:92` (SyncBatch worker goroutine)

**Klaim akar masalah (claimed_root_cause):**

> The batch claim relies on FOR UPDATE SKIP LOCKED for mutual exclusion but executes it outside any transaction, so the row locks live only for the duration of the implicit single-statement transaction and are gone before any per-user sync work starts, leaving the documented cross-replica dedup with no effect.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/lmssync/scheduler.go:29` — *Scheduler.Start cron callback* — cron.AddFunc registers LMS_SYNC_CRON (default "0 7 * * *", WIB fixed zone) and its callback builds a 10-minute context and calls s.svc.SyncBatch. Each api process that reaches this point schedules its own timer, so N replicas produce N independent ticks at the same wall-clock second.
propagation → `backend/cmd/api/main.go:38` — *main scheduler wiring* — The scheduler is constructed and started in a goroutine whenever cfg.LMSSyncEnabled is true. That flag defaults to true (internal/config/config.go:135) and docker-compose.yml:47 sets LMS_SYNC_ENABLED to ${LMS_SYNC_ENABLED:-true} on the api service, while the api service has no deploy.replicas pin (only bot has replicas: 1 at docker-compose.yml:82-83), so every api replica runs the batch.
propagation → `backend/internal/modules/lmssync/service.go:41` — *SyncBatch batch claim* — The batch is claimed by s.db.WithContext(ctx).Raw(...) with no surrounding transaction: SyncBatch contains no Transaction, Begin, Session, Commit or Rollback call anywhere between :28 and :116.
propagation → `backend/internal/modules/lmssync/service.go:48` — *SyncBatch claim SQL* — The statement ends in LIMIT ? FOR UPDATE SKIP LOCKED, but because it is executed as its own implicit transaction the row locks are released as soon as Scan returns at :49, before the users slice is even inspected at :55.
sink → `backend/internal/modules/lmssync/service.go:92` — *SyncBatch worker goroutine* — The provider fetches and persistence run in goroutines spawned at :76 (semaphore-bounded at :75) that call cal.SyncProviders, i.e. entirely after the claim has been released, so concurrent replicas issue the same upstream requests and writes for the same user ids.

**Bukti terverifikasi:**

- `backend/internal/modules/lmssync/service.go:38` — Comment states the intent explicitly: "Fetch users needing sync with SKIP LOCKED to dedup across replicas", establishing that cross-replica partitioning is the designed behaviour being violated.
- `backend/internal/modules/lmssync/service.go:49` — The Raw call terminates at `.Scan(&users).Error`; a repo-wide grep for Transaction, Begin(, Session(, Commit and Rollback over this file returns nothing, so the claim is never held open.
- `backend/internal/modules/lmssync/service.go:76` — The per-user goroutine is spawned only after the claim statement has returned, confirming the intended protected region starts after the locks are already gone.
- `backend/internal/modules/lmssync/README.md:25` — Module documentation repeats the false guarantee: "Dedup aman untuk multi-replica (SKIP LOCKED)".
- `backend/internal/modules/calendar/service.go:192` — Each synced user's per-provider timestamps are written here after the fetch work, so duplicate concurrent syncs also issue redundant writes to the same users row for the same user id.
- `backend/internal/models/event.go:17` — SyncKey participates in the composite unique index idx_user_sync_key with UserID, so duplicate concurrent persists collide on the constraint (making one persist transaction fail) rather than inserting duplicate rows; the duplicated upstream fetch is the durable cost. [Pinned dependency source: docker-compose.yml:59 — Deployment documents scaling api past one replica (`docker compose up -d --scale api=2`) while only bot is pinned to replicas: 1 at :82-83; this is the exact topology the broken claim was written to handle.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on this audit host (no docker, podman, nerdctl, containerd, ctr, vagrant or qemu; WSL2 has no distribution), so two concurrent SyncBatch invocations against a local Postgres fixture cannot be run to observe the overlapping row sets and the already-released locks.
1. The deployed api replica count is a deployment fact absent from the repository: docker-compose.yml defines no deploy.replicas for api and `docker compose up -d` starts exactly one, so the defect materialises only when an operator scales api to two or more, which the repo documents as supported (docker-compose.yml:2 and :59, README.md:52 and :113) but never performs.
1. Whether the duplicated Google Classroom and Moodle calls actually exhaust a shared upstream limit is provider-side: the effective per-project quota behind GOOGLE_CLIENT_ID, and whether a 429 or an upstream limiter absorbs the doubled traffic instead of degrading other users' syncs, cannot be read from source.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

Against a throwaway Postgres (no external network) with a handful of dummy user rows whose moodle_enabled/google_classroom_enabled are true and whose per-provider sync timestamps are NULL, instrument calendar.Service with a fake provider that only records the user id it was asked to fetch, then invoke SyncBatch twice from two goroutines started in the same instant. Expect both invocations to log the same user ids. Then change only the claim to run inside a single db.Transaction that stays open until the per-user WaitGroup completes, repeat, and expect the second invocation to receive a disjoint or empty set (SKIP LOCKED skipping the held rows). Keep the batch small and the fake provider offline; do not contact Moodle or Google.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Non-destructive owner check: set LMS_SYNC_CRON to a quiet minute, run api at two replicas, and compare the `[lmssync] starting daily sync for N users` and `[lmssync] daily sync done` log lines from each replica for the same tick, confirming whether the same user ids are reported as synced by both in the same minute. Also record the actual api replica count from the orchestrator, since docker-compose.yml pins only bot to replicas: 1.


---

## 5. ICS line unfolding uses line += in a loop, so a folded block costs O(N^2) copied bytes and O(N^2) allocation for O(N) attacker-supplied input

- **Fingerprint:** `resource/ics-parsemoodleics/quadratic-line-unfolding`
- **Boundary terdampak:** `backend/internal/modules/calendar/handler.go:81` (Handler.GetRaw) — efek akhir di `backend/internal/modules/calendar/ics/parser.go:56` (parseMoodleICS)

**Klaim akar masalah (claimed_root_cause):**

> Line unfolding builds the logical line with line += ... inside a loop over continuation lines, so Go's immutable-string concatenation reallocates and re-copies the whole accumulated block on every continuation, making cost quadratic in the folded block length; the block length and the retained event count are both attacker-chosen because the fetched body is buffered with no LimitReader and no parser stage observes cancellation.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/calendar/handler.go:81` — *Handler.GetRaw* — Authenticated (APIKeyOrJWT) route GET /v1/calendar/raw, registered at router.go:130, fetches the student-supplied users.moodle_calendar_url with no egress allow-list and no response cap. The same fetch-plus-parse pair is reached from GET /v1/calendar/preview?force=true and POST /v1/calendar/test via handler.go:292 -> service.go:58 -> moodle/client.go:56, and from the daily cron via lmssync/service.go:92.
propagation → `backend/internal/modules/calendar/moodle/client.go:79` — *Client.FetchMoodleCalendar* — io.ReadAll(resp.Body) with no io.LimitReader on the success path (the 1024-byte LimitReader at :75 applies only to non-2xx error bodies), so the parser input size is chosen entirely by the remote server the student pointed at. Verified: this is the only unbounded read on the path and no body-limit middleware exists in the router chain.
propagation → `backend/internal/modules/calendar/ics/parser.go:43` — *parseMoodleICS* — strings.Split(content, newline) turns the whole buffered body into one slice entry per line, so a body of many short space-prefixed lines yields a maximal number of continuation entries for a given byte count.
sink → `backend/internal/modules/calendar/ics/parser.go:56` — *parseMoodleICS* — The unfolding loop at :56-59 appends each continuation with line += strings.TrimPrefix(lines[i+1], " ") (:57) and advances i in the same loop (:58). Because Go strings are immutable this is a fresh allocation plus full copy of the accumulated block per iteration, giving O(N^2) bytes copied and allocated for N continuation lines. The loop takes no context and never checks one, so the 15s REQUEST_TIMEOUT_SECONDS deadline (config.go:92) cannot interrupt it.

**Bukti terverifikasi:**

- `backend/internal/modules/calendar/ics/parser.go:57` — line += strings.TrimPrefix(lines[i+1], " ") is the superlinear concatenation; i++ at :58 keeps one folded block in one unit of work. Verified against the pinned toolchain: runtime/string.go concatstrings() takes the count >= 2 path and rawstringtmp() falls through to rawstring()/mallocgc() whenever the accumulated length exceeds the 32-byte tmpStringBufSize, so no buffer is reused across iterations and each step copies the whole block.
- `backend/internal/modules/calendar/ics/parser.go:67` — Events are appended with no cardinality cap (only a non-empty-title check at :66), so the number of folded blocks and the number of retained events are both attacker-chosen.
- `backend/internal/modules/calendar/ics/parser.go:45` — The event slice starts at capacity 32 and grows without bound; nothing trims or limits it before the 60-day window and class filters are applied downstream at moodle/client.go:95-102.
- `backend/internal/modules/calendar/moodle/client.go:79` — No LimitReader on the fetched body, so the parser input size is set entirely by the remote server.
- `backend/internal/modules/calendar/handler.go:87` — ics.ParseMoodleICS(raw) runs synchronously inside the request goroutine after the fetch returns, so the parse is not detached work but blocking work: the TimeoutContext middleware c.Next() at timeout.go:22 has not returned, so the 15s deadline bounds nothing about parse duration.
- `backend/internal/pkg/urlutil/urlutil.go:26` — IsLikelyMoodleCalendarURL only tests strings.Contains on parsed.Path ('.ics', '/calendar/export', 'export_execute.php') and a query-has check at :29; it never inspects scheme, host, port or resolved IP, so a student can satisfy it with their own host, for example https://attacker.example/calendar.ics. The predicate is reached from user/handler.go:256.
- `backend/internal/config/config.go:92` — The 15s REQUEST_TIMEOUT_SECONDS deadline cancels the fetch context but is never consulted by the parser, so CPU work is not bounded by the request lifetime. The cron path uses 90s (config.go:139).

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on this audit host: docker, podman, nerdctl, containerd, ctr, vagrant and qemu are all absent and WSL has no installed distribution, so no isolated fixture with strict CPU, memory and wall-clock limits could be built. No growth curve was measured and no artifact was produced; every check here is method 'source' with artifact null, which makes the confirmed branch unreachable.
1. The per-process CPU share available to the api container and any CPU limit are deployment facts outside the repository: docker-compose.yml declares no cpus, mem_limit, or deploy.resources.limits for the api service, and no reverse proxy or ingress config is in scope. The wall-clock cost per megabyte of hostile input, and how many concurrent parses the host can absorb before /livez latency degrades for other users, are therefore unknown.
1. The remaining quantitative unknown is the constant factor, not the asymptotics: source already settles that the concatenation reallocates and re-copies per iteration, but achievable memcpy throughput and GC pressure for a fixed body size can only be obtained by running the parser under measurement, which requires the missing sandbox.
1. Reachability requires a valid student.itera.ac.id Google identity (auth/service.go:185-189) plus the ability to host the hostile calendar, so the requester is an authenticated student rather than an anonymous client; this narrows the attacker set to any enrolled student, which is the normal threat model for this service but is still a prerequisite the owner should weigh.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In an isolated fixture with strict CPU, memory and wall-clock limits (no network, mocked or file-backed body), call ParseMoodleICS on three inputs, each a single folded block of N space-prefixed one-byte continuation lines with N = 10k, 20k and 40k, and record elapsed time, total bytes allocated (runtime.ReadMemStats TotalAlloc delta or testing.B.ReportAllocs) and peak heap per run. Doubling N should roughly quadruple both elapsed time and TotalAlloc; a linear parser would roughly double them. Then repeat the 40k case with a context that is already cancelled to confirm the parse runs to completion unchanged, demonstrating that cancellation is not observed. Stop at 40k and do not escalate.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner-observed and non-destructive: read the effective CPU quota of the api container (docker inspect or cgroup cpu.max) and, using one dummy student account whose moodle_calendar_url points at an owner-controlled host serving a fixed-size hostile ICS, measure /livez and /v1/user latency for a second idle account while one such parse is in flight. Report the CPU limit, the observed parse duration for a known body size, and whether unrelated-user latency degrades; do not run a sustained load test.


---

## 6. Moodle calendar fetch buffers an attacker-sized response with no byte cap, in one shared API process

- **Fingerprint:** `resource/moodle-fetchmoodlecalendar/unbounded-response-body-buffering`
- **Boundary terdampak:** `backend/internal/modules/calendar/handler.go:81` (Handler.GetRaw) — efek akhir di `backend/internal/modules/calendar/moodle/client.go:79` (Client.FetchMoodleCalendar)

**Klaim akar masalah (claimed_root_cause):**

> The response body of a user-chosen URL is fully materialized with io.ReadAll and no size bound, so the amount of memory one request can retain is set by the remote server's output rather than by any repository-visible limit.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/calendar/handler.go:81` — *Handler.GetRaw* — The stored, user-supplied calendar URL is handed to the fetcher on every request. The route is registered at router.go:130 behind APIKeyOrJWT plus ApiKeyRateLimit, and GetRaw's only precondition (handler.go:77) is that moodle_calendar_url is non-empty, so moodle_enabled is not required. The same stored value reaches the same function through /v1/calendar/preview?force=true, POST /v1/calendar/test and the lmssync batch.
propagation → `backend/internal/modules/calendar/moodle/client.go:61` — *Client.FetchMoodleCalendar* — The request is built with http.NewRequestWithContext on strings.TrimSpace(calendarURL), so the attacker-chosen origin also chooses the response size, the transfer rate and whether the response is a tiny gzip stream that expands in the client.
propagation → `backend/internal/modules/calendar/moodle/client.go:67` — *Client.FetchMoodleCalendar* — The client applies a 12s timeout (which per net/http covers connection, redirects and reading the body, and interrupts the read via cancelTimerBody) but no body limit. Because 12s is tighter than both the 15s request timeout and the 90s cron context, wall clock is the only bound on the number of bytes accumulated.
sink → `backend/internal/modules/calendar/moodle/client.go:79` — *Client.FetchMoodleCalendar* — io.ReadAll buffers the entire decompressed body with no cap; line 83 then copies it again into a string that the caller duplicates for the raw response and for the parser.

**Bukti terverifikasi:**

- `backend/internal/modules/calendar/moodle/client.go:75` — The non-2xx path is capped with io.ReadAll(io.LimitReader(resp.Body, 1024)), so the codebase demonstrably knows the cap pattern; the 2xx path at line 79 does not apply it.
- `backend/internal/modules/calendar/moodle/client.go:83` — return string(data) makes a second full copy of the buffered body before it is returned, so peak residency for the fetch alone is roughly twice the response size.
- `backend/internal/modules/calendar/handler.go:89` — c.Data(..., []byte(raw)) converts the string back to a byte slice, a third full copy, before gin writes it to the connection.
- `backend/internal/modules/calendar/ics/parser.go:43` — GetRaw always parses (handler.go:87), and strings.Split allocates a 16-byte string header per line whose substrings share the source backing array. For a body made of newlines the header array alone is about 16x the body size. The content copy is made by normalizeLineEndings at parser.go:42 only when the body contains CR, which the attacker controls.
- `backend/internal/modules/calendar/moodle/client.go:67` — The effective per-request ceiling is this 12s client timeout, not the 15s REQUEST_TIMEOUT_SECONDS at config.go:92 and not the 90s LMS_SYNC_TIMEOUT_SECONDS at config.go:139; bytes retained per request equal the ingest rate times 12s.
- `backend/internal/modules/lmssync/service.go:92` — The daily batch calls SyncProviders for up to LMS_SYNC_BATCH_SIZE (200) users at LMS_SYNC_CONCURRENCY (2) inside the api process, so up to two hostile origins are buffered at once per replica while the batch works through other users. The 90s per-user context at line 79 does not lengthen the Moodle read past the 12s client timeout.
- `backend/internal/pkg/urlutil/urlutil.go:20` — IsLikelyMoodleCalendarURL is the only write-time predicate and inspects only path substrings and two query keys; it never checks scheme, host, port or resolved IP, so any attacker-owned host with a path containing .ics is accepted. user/handler.go:254 skips it entirely when moodle_enabled is false, and re-enabling later does not re-validate.
- `backend/internal/shared/middleware/rate_limit.go:107` — The calendar group's limiter buckets JWT callers by c.ClientIP(), which gin derives from X-Forwarded-For because this codebase never calls SetTrustedProxies and gin.go:225 defaults trustedProxies to 0.0.0.0/0 and ::/0. Concurrent requests are therefore not bounded by a per-user quota for JWT callers; only the API-key path (burst 20, 60/min) is. [Pinned dependency source: docker-compose.yml:23 — The api service block declares no mem_limit and no deploy.resources limits, and backend/Dockerfile sets no GOMEMLIMIT, so no repository-visible ceiling tells us how much buffering is needed to kill the process.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on the audit host (no docker/podman/containerd, no WSL distribution), so the memory growth curve could not be measured and no target-controlled request was issued; every check here is method 'source' with artifact null and the confirmed branch is unreachable.
1. The decisive deployment fact is absent from the repository: docker-compose.yml's api service declares no memory limit and no deploy.resources block, the Dockerfile sets no GOMEMLIMIT, and the README places the deployment on Coolify, so the effective container memory limit and the Go runtime memory limit are operator-side. Without them the number of concurrent 12s hostile fetches that kills the process is unknown.
1. The ingest rate that converts a 12s window into bytes is outside source: the hostile origin's uplink, any ingress path, and the gzip decompression throughput the runtime achieves on that host. Whether one request can retain hundreds of megabytes or only a few depends on this.
1. Whether an OOM kill is contained or user-visible depends on the supervisor: docker-compose.yml sets restart: unless-stopped for api, but whether Coolify applies a restart backoff and whether the healthcheck at 30s interval marks the service unhealthy long enough to matter was not observed.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In an isolated fixture with strict CPU, memory and wall-clock limits and all external networking blocked, serve fixed bodies from a loopback listener to a harness that calls FetchMoodleCalendar with a short context, and record peak HeapAlloc via runtime.ReadMemStats for 1 MiB, 16 MiB and 256 MiB bodies plus one gzip case whose compressed size is about 1/1000 of the decompressed size, showing retained bytes track the served or expanded bytes rather than any constant. Then point the same harness at a listener that sends headers and stalls, to confirm the only bound is wall-clock and that the partial buffer is released when the 12s timeout aborts the read. Stop at the smallest pair of growth points that establishes the slope.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner-observed and non-destructive: read the effective memory limit of the api container (docker inspect MemLimit or the Coolify resource setting) and any GOMEMLIMIT in the runtime environment, then have one dummy account whose moodle_calendar_url points at an owner-controlled endpoint that serves a fixed 256 MiB calendar, request GET /v1/calendar/raw once, and sample process RSS before, during and after. Record the peak RSS delta and whether the container is OOM-killed, and confirm recovery time from the restart. Do not repeat with larger bodies or higher concurrency.


---

## 7. Global unique index on courses.name plus a non-atomic FirstOrCreate lets a concurrent first insert abort another principal's sync transaction

- **Fingerprint:** `ressist/backend/internal/models/course.go:Course:global-unique-name-without-owner`
- **Boundary terdampak:** `backend/internal/shared/router/router.go:129` (calendarGroup.GET("/preview", calendarModule.Handler.GetPreview) under middleware.APIKeyOrJWT) — efek akhir di `backend/internal/modules/calendar/sync/service.go:119` (err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error { ... }))

**Klaim akar masalah (claimed_root_cause):**

> models.Course enforces uniqueness on Name globally with no owner or tenant dimension, and PersistAssignments resolves it with a non-atomic FirstOrCreate (SELECT-then-INSERT with no clause.OnConflict) inside the caller's sync transaction, so a concurrent first insert of the same course name raises a unique violation that rolls back an unrelated principal's entire per-provider persist.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/shared/router/router.go:129` — *calendarGroup.GET("/preview", calendarModule.Handler.GetPreview) under middleware.APIKeyOrJWT* — A JWT- or API-key-authenticated caller triggers a sync with GET /v1/calendar/preview?force=true; the course names come from the caller's own LMS feed (Moodle ICS CATEGORIES or Classroom course name).
propagation → `backend/internal/modules/calendar/handler.go:111` — *response, err := h.syncAndBuildResponse(c, user, providers, sortBy)* — The force=true branch enters the sync/persist chain, which calls SyncProviders and then PersistAssignments/PersistAssignmentsWithoutStale.
propagation → `backend/internal/modules/calendar/sync/service.go:129` — *tx.Where("name = ?", originalCourse).FirstOrCreate(&course, models.Course{Name: originalCourse})* — The course name is resolved by a non-atomic SELECT-then-INSERT with no owner predicate and no conflict handling.
propagation → `backend/internal/models/course.go:12` — *Name string `gorm:"uniqueIndex;not null"`* — Uniqueness is global; the model has no column that could scope it per user or environment, and it stores only the name and timestamps.
propagation → `backend/internal/modules/calendar/sync/service.go:132` — *courseIDValue := text.NullableStringPointer(course.ID)* — The shared row's id is copied into the caller's event and later returned as course_id; because the row holds only the shared name, this reuse carries no confidential content.
sink → `backend/internal/modules/calendar/sync/service.go:119` — *err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error { ... })* — A duplicate-key error from the insert returns from the callback and rolls back the entire per-provider persist, so the loser's assignments are not written and its source is reported failed.

**Bukti terverifikasi:**

- `backend/internal/models/course.go:12` — Global uniqueIndex on Name with no owner, tenant, or environment column anywhere in the model; the struct is only ID, Name, CreatedAt, UpdatedAt.
- `backend/internal/modules/calendar/sync/service.go:129` — FirstOrCreate is used with no clause.OnConflict/DoNothing and no Assign, so the hit path is a plain reuse and the miss path is an unprotected INSERT.
- `backend/internal/modules/calendar/sync/service.go:119` — The FirstOrCreate runs inside the transaction that performs every other assignment upsert and the stale-marking step, so the collision aborts the whole provider persist rather than one row.
- `backend/internal/database/postgres.go:39` — AutoMigrate includes &models.Course{}, and docker-compose sets AUTO_MIGRATE=true, so the global unique index is the deployed schema rather than a dormant struct field.
- `backend/internal/modules/calendar/handler.go:438` — course_id is echoed from the caller's own event into the response; no handler selects from the courses table, so the reused id discloses nothing beyond the shared name. [Pinned dependency source: gorm.io/gorm@v1.31.2/finisher_api.go:364 — Pinned gorm v1.31.2 FirstOrCreate issues queryTx.Find (line 364) and, when RowsAffected==0, returns tx.Create(dest) (line 387) with no clause.OnConflict, confirming SELECT-then-INSERT that can raise a duplicate-key violation.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on the audit host (no container runtime, no WSL2 distribution), so the duplicate-key race could not be reproduced against a local Postgres with two dummy users.
1. The pinned gorm v1.31.2 FirstOrCreate SELECT-then-INSERT emission without ON CONFLICT is confirmed by reading the module source, but the resulting unique-violation abort of the enclosing transaction requires executing the ORM against Postgres, which the execution boundary forbids.
1. Whether the failed provider sync is retried by any caller and whether the interference is transient (self-healing once the winner's row is committed) or persistent is a runtime fact outside the repository.
1. Whether a deliberate collision is even reachable requires an attacker to race a victim's first insert of the same course name in the same instant; the attacker cannot force a victim to sync a chosen name, so attacker-directability itself is a runtime/deployment fact.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In an OS-enforced sandbox with no external network, start the API against a throwaway Postgres and create two dummy users whose Moodle feed fixtures declare the same course name. Clear the courses table, run both users' syncs concurrently behind a barrier so both FirstOrCreate SELECTs miss, and assert that exactly one transaction commits, the other returns a duplicate-key error on idx_courses_name, and the loser's events are absent while its source is reported failed. Then re-run the loser's sync alone and assert it now succeeds, demonstrating the failure is transient and self-healing rather than persistent.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner checks production logs for '[calendar] PersistAssignments failed' / '[auth] PersistAssignments failed' entries whose underlying error is a duplicate-key violation on the courses.name unique index, and confirms whether any caller retries the failed provider sync and whether affected users recover on the next daily lmssync batch.


---

## 8. Google OAuth token pair is stored in plaintext and the default GORM logger interpolates it into SQL written to stdout on error or slow statements

- **Fingerprint:** `ressist/backend/internal/models/user.go:User:plaintext-oauth-tokens-interpolated-into-gorm-logs`
- **Boundary terdampak:** `backend/internal/modules/auth/handler.go:162` (Handler.GoogleNative (POST /auth/google/native)) — efek akhir di `backend/internal/database/postgres.go:22` (database.New logger configuration)

**Klaim akar masalah (claimed_root_cause):**

> The secret-bearing OAuth columns live in the ORM model as plaintext, and the single shared database constructor installs GORM's default logger, whose configuration leaves ParameterizedQueries false so the callback layer interpolates every bind parameter into the SQL text it writes to os.Stdout on any statement error or any statement slower than 200ms; no layer exists between the stored credential and process output that could redact it.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/auth/handler.go:162` — *Handler.GoogleNative (POST /auth/google/native)* — Unauthenticated, rate-limited route (router.go:168) that exchanges a server auth code and calls UpsertGoogleTokens with the freshly issued token pair; the same service method is reached from GoogleCallback via handler.go:484 in processGoogleAuth.
propagation → `backend/internal/modules/auth/service.go:253` — *Service.UpsertGoogleTokens updates map* — token.AccessToken is placed as a raw string value in the Updates map at line 253 and token.RefreshToken at line 258 when non-empty, so both become bind parameters of the generated UPDATE ... WHERE id = ? (service.go:265-268).
propagation → `backend/internal/models/user.go:28` — *models.User.GoogleRefreshToken* — The refresh token lands in a plaintext *string column with no gorm serializer, encryption helper, BeforeSave/BeforeUpdate hook, or redaction annotation; the only hook on the model is BeforeCreate assigning the UUID at user.go:45-50.
sink → `backend/internal/database/postgres.go:22` — *database.New logger configuration* — logger.Default.LogMode(logger.Warn) leaves ParameterizedQueries false and SlowThreshold at 200ms, so callbacks.go:139-146 interpolates every bind variable via Dialector.Explain and logger.Trace writes the resulting SQL to os.Stdout whenever the statement errors or exceeds the threshold, emitting the refresh and access tokens in cleartext.

**Bukti terverifikasi:**

- `backend/internal/models/user.go:27` — GoogleAccessToken is a plain *string column with no protection annotation or hook.
- `backend/internal/models/user.go:28` — GoogleRefreshToken is a plain *string column; the model's only hook is BeforeCreate at user.go:45-50.
- `backend/internal/modules/auth/service.go:253` — google_access_token is set from token.AccessToken without transformation.
- `backend/internal/modules/auth/service.go:258` — google_refresh_token is set from token.RefreshToken without transformation.
- `backend/internal/database/postgres.go:22` — The global DB logger is logger.Default at Warn level with no ParameterizedQueries override; this is the only gorm.Config in the repository.
- `backend/internal/modules/calendar/google/client.go:499` — A second write path binds a rotated google_refresh_token and, at line 490, a refreshed google_access_token into an Updates map on the same logger.
- `backend/internal/modules/auth/service.go:202` — Save(&user) on the struct binds every User column, including any already-stored google_refresh_token, giving the interpolating logger further opportunities to emit it.

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox is available on this host (no docker, podman, nerdctl, containerd, ctr, vagrant or qemu; WSL2 has no distribution), so the target cannot be built, started, or exercised and the interpolated SQL line cannot be observed; every check here is source-only.
1. The leak requires the token UPDATE to exceed the 200ms slow threshold or to return an error against a live Postgres. Deployed statement latency, lock contention, connection-pool exhaustion against SetMaxOpenConns(25), and error rate are not source-visible, so whether the trigger ever fires for a real login is unobserved.
1. Whether the API container's stdout is captured by a durable log store, how long it is retained, and which principals can read it is a deployment fact absent from the repository; the compose file declares no logging driver and no log-shipping configuration.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

Inside the parent-approved sandbox, start a loopback-only Postgres fixture and a minimal harness that opens it exactly as database.New does (postgres.Config{DSN, PreferSimpleProtocol: true} with &gorm.Config{Logger: logger.Default.LogMode(logger.Warn)}), creates a dummy user with google_refresh_token set to a unique sentinel string, then calls auth.Service.UpsertGoogleTokens with dummy token values while a second session holds a row lock on that user row so the UPDATE blocks past 200ms. Capture the process stdout and assert it contains the sentinel access and refresh token values. Repeat once more by forcing an error (close the connection or cancel the context) to exercise the error branch of logger.Trace. Non-destructive: dummy users and sentinel values only, no real Google credentials.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner greps one hour of API container stdout for the literal column names google_refresh_token and google_access_token, and for the 'SLOW SQL >= 200ms' marker, then reports whether interpolated SQL text appears at all and which principals can read that log store. Read-only log inspection; no production writes.


---

## 9. API keys carry an empty scopes record that no authorization decision consults, yet the credential reaches the state-changing calendar sync routes

- **Fingerprint:** `ressist/backend/internal/modules/apikey/service.go:ValidateApiKey:scopes-never-enforced-grants-write`
- **Boundary terdampak:** `backend/internal/shared/router/router.go:128` (calendarGroup.Use(middleware.APIKeyOrJWT(tokenParser, apiKeyValidator), apiKeyRateLimit)) — efek akhir di `backend/internal/modules/calendar/service.go:192` (if err := s.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {)

**Klaim akar masalah (claimed_root_cause):**

> The ApiKey.Scopes column is written once as the literal empty list and is never consulted by ValidateApiKey or by any middleware, so the credential's effective authority is the union of every route mounted behind APIKeyOrJWT, including the state-changing calendar sync routes, rather than the authority recorded on the key.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/shared/router/router.go:128` — *calendarGroup.Use(middleware.APIKeyOrJWT(tokenParser, apiKeyValidator), apiKeyRateLimit)* — The whole /v1/calendar group is reachable with an API key rather than a JWT, including the routes registered at lines 129-131 (GET /preview, GET /raw, POST /test). The credential is issued only to the caller's own user id via the JWT-only POST /v1/api-keys, so the holder is a delegate of the owner rather than an unrelated attacker.
propagation → `backend/internal/shared/middleware/auth.go:78` — *claims, err := validator.ValidateApiKey(rawApiKey)* — The raw header value is the sole argument passed to the validator; the interface is ValidateApiKey(raw string) (middleware/auth.go:22), so no requested action, route, or scope reaches the validator and it could not bind an authorization decision even if it tried.
propagation → `backend/internal/modules/apikey/service.go:165` — *claims := &middleware.AccessClaims{* — Claims are built only from the owning user's Email, Name and ID. key.Scopes is never read on this path, so a record with empty scopes and a record with fully populated scopes produce identical authority.
propagation → `backend/internal/modules/calendar/handler.go:107` — *forceRefresh := c.Query("force") == "true"* — A plain GET parameter selects the mutating branch, so a read-shaped API-key request can be routed into the sync path at line 111 without any second authorization check.
propagation → `backend/internal/modules/calendar/handler.go:155` — *response, err := h.syncAndBuildResponse(c, user, providers, sortBy)* — TestPreview reaches the same sync path directly, so POST /v1/calendar/test performs the same persistence as the force-refresh GET.
propagation → `backend/internal/modules/calendar/sync/service.go:119` — *err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {* — Inside the transaction the caller's events are created or updated and stale rows are marked missed for moodle (line 170) or completed for google_classroom (line 172), all performed with a credential whose server-side record grants no scopes.
sink → `backend/internal/modules/calendar/service.go:192` — *if err := s.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {* — The sync also rewrites user-scoped columns: lms_last_synced_at here and available_class_codes at line 229, so the boundary effect extends beyond events into the user row.

**Bukti terverifikasi:**

- `backend/internal/modules/apikey/service.go:103` — Create hardcodes Scopes: "[]" on every new key, so the stored authority is always empty and there is no code path that can write a non-empty scopes record.
- `backend/internal/models/api_key.go:16` — The Scopes column exists in the schema with default '[]', establishing that per-key scoping was modelled.
- `backend/internal/shared/middleware/auth.go:22` — The ApiKeyValidator interface is ValidateApiKey(raw string), carrying no route, action, or scope argument, so scope enforcement is structurally impossible at the middleware layer.
- `backend/internal/shared/middleware/auth.go:85` — The comment concedes api_key_id is never populated; GetApiKeyID has no callers anywhere in the repository, so no handler can bind an action to the specific key or to a key-scoped policy.
- `backend/internal/shared/router/router.go:129` — GET /preview sits behind APIKeyOrJWT, so an API key reaches the force-sync path at handler.go:107.
- `backend/internal/shared/router/router.go:112` — The route group is introduced with the comment 'External read API', documenting read-only intent for a group that also exposes the mutating sync routes.
- `backend/internal/modules/apikey/README.md:1` — The module titles itself 'Programmatic Read Access', corroborating that the key is intended as a read credential.
- `backend/API_DOCUMENTATION.md:80` — States the invariant explicitly: GET /v1/user accepts Bearer or X-API-Key, while 'mutasi Bearer only' - mutation is documented as unreachable by API key, which the calendar sync routes contradict.
- `backend/internal/modules/apikey/handler.go:117` — Correction to the candidate: .Scopes IS read here (and at line 72), but only to serialize it into keyResponse. No authorization decision consumes it, so the column is vestigial rather than unread.
- `backend/internal/modules/calendar/service.go:229` — available_class_codes is rewritten by the sync, confirming that the API-key-reachable path mutates user-scoped state, not only events.
- `backend/internal/modules/calendar/handler.go:479` — syncCooldown is referenced only here to compute nextRefreshAt for the response; it is never enforced as a gate, so repeated force=true calls by an API key are bounded only by the 60/min per-key rate limiter and can consume the shared Google Cloud project quota.
- `backend/internal/modules/apikey/service.go:156` — The owning user is loaded by key.UserID and Subject is set from user.ID, so the credential is strictly bound to its owner and cannot be pointed at another account; this bounds the finding to the owner's own data.

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on the audit host (no container runtime, no WSL2 distribution), so the end-to-end demonstration - a key minted for user A calling GET /v1/calendar/preview?force=true and mutating events.status, events.completed, users.available_class_codes and users.lms_last_synced_at - could not be run against a throwaway database. The schema's observed_result cannot be filled truthfully from source alone.
1. Decisive and outside the repository: whether API keys are in practice held by a party other than the account owner. Source proves the key is minted only through a JWT-authenticated call for the caller's own user id and that Subject is always the owner, so the gap can never cross accounts; it becomes an authorization violation only if a delegate holds the key, and a same-principal integrity quirk if only the owner ever does.
1. Whether any deployment control restricts which paths X-API-Key may reach - an ingress route allow-list, a BFF that strips the header, or a WAF rule - is not visible in source.
1. Narrower than the candidate claimed: the read-only intent is documented (apikey/README.md:1, router.go:112, API_DOCUMENTATION.md:80), so that is no longer a blocker. What remains unstated is only whether an empty Scopes array is meant to be deny-all or advisory, which decides whether the missing check is a defect or a deliberate no-op column.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

Non-destructive and loopback-only. Start a throwaway Postgres and run the API with AUTO_MIGRATE=true. Insert two dummy users A and B, one pending moodle event for each, and serve a static .ics fixture from a local stub HTTP server on 127.0.0.1 so no external network is touched. Set user A moodle_enabled=true and moodle_calendar_url to the loopback stub, google_classroom_enabled=false. Mint a key via POST /v1/api-keys authenticated as A, and assert the stored api_keys.scopes for that row is exactly "[]". Snapshot events.status/completed for A and B plus users.available_class_codes and users.lms_last_synced_at for both. Then issue GET /v1/calendar/preview?force=true with only X-API-Key, and separately POST /v1/calendar/test with {"test_moodle":true}, and assert both return 200 rather than 401/403, that A's event and user columns changed, that B's rows are byte-identical, and that api_keys.scopes was still "[]" throughout. Repeat with force absent to confirm the cached read path does not mutate, isolating the force branch. Then delete the stub, stop the API and drop the database.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner confirms two product facts that source cannot settle: (1) whether API keys are intended to be strictly read-only, in which case the documented promise at frontend/app/api-docs/page.tsx:122-124 and API_DOCUMENTATION.md:80 is violated by the sync routes; and (2) whether any key is held by a party other than the account owner, for example a personal script or campus integration as the docs invite. Owner also confirms whether ingress restricts X-API-Key to read-only paths, and whether an empty Scopes array is meant to deny all actions.


---

## 10. GET /v1/assignments materialises and serialises the caller's entire events table with no row bound and no request-context cancellation

- **Fingerprint:** `ressist/backend/internal/modules/assignment/handler.go:GetAssignments:unbounded-uncancellable-event-read`
- **Boundary terdampak:** `backend/internal/shared/router/router.go:159` (router.New / assignmentGroup.GET) — efek akhir di `backend/internal/modules/assignment/handler.go:184` (Handler.GetAssignments)

**Klaim akar masalah (claimed_root_cause):**

> GetAssignments issues an unbounded, non-paginated raw events read on the root *gorm.DB instead of a request-scoped handle, so there is neither a row-count bound nor a cancellation path between the accepted request and the fully buffered response.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/shared/router/router.go:159` — *router.New / assignmentGroup.GET* — GET /v1/assignments is mounted with middleware.BotOrAPIKeyOrJWT(tokenParser, apiKeyValidator, cfg.BotServiceToken) and apiKeyRateLimit, so any JWT holder, any API key, or the bot acting as an arbitrary user (X-Bot-Token + X-Act-As-User, bot_auth.go:52-69) reaches the handler; the only pre-handler bound is the shared bucket in rate_limit.go:87-124.
propagation → `backend/internal/modules/assignment/handler.go:96` — *Handler.GetAssignments* — The subject comes from the token claims via middleware.AuthenticatedUserID, so the row set is exactly the caller's own events - which is why the effect is per-account rather than cross-tenant.
propagation → `backend/internal/modules/assignment/handler.go:126` — *Handler.GetAssignments* — The user-preference read is `h.db.Table("users").Select(...).Where("id = ?", userID).Scan(&user)` on the root handle, discarding the request context.
propagation → `backend/internal/modules/assignment/handler.go:131` — *Handler.GetAssignments* — `h.db.Raw(...)` on the root handle selects every row for the user with no LIMIT, no OFFSET, no deadline window and no status filter, so completed, missed and long-past rows are all returned.
propagation → `backend/internal/modules/assignment/handler.go:144` — *Handler.GetAssignments* — A second slice `events := make([]models.Event, 0, len(assignments))` is allocated and populated, doubling the resident set before filtering.
propagation → `backend/internal/pkg/classcode/classcode.go:274` — *classcode.FilterWithCourseClass* — A third slice `filtered := make([]models.Event, 0, len(events))` is allocated with capacity len(events), and per-event regex extraction (IsExamTitle at classcode.go:20-22, Extract at 276-295) runs over attacker-supplied titles.
propagation → `backend/internal/modules/assignment/handler.go:154` — *Handler.GetAssignments* — A fourth full-size slice `var filtered []declType` is built by the ordered re-projection loop (154-181) and then assigned back over assignments at 182.
sink → `backend/internal/modules/assignment/handler.go:184` — *Handler.GetAssignments* — c.JSON(http.StatusOK, assignments) hands the whole slice to gin, whose WriteJSON (gin render/json.go:67-75) marshals the complete array into one []byte before writing, so peak heap and response size are unbounded and the body is built even after the client has gone away.

**Bukti terverifikasi:**

- `backend/internal/modules/assignment/handler.go:131` — The events statement: `SELECT ... FROM events WHERE user_id = ? ORDER BY deadline ASC` - no LIMIT, no OFFSET, no time window, no status predicate.
- `backend/internal/modules/assignment/handler.go:126` — First of two statements issued on the root *gorm.DB; the package contains no WithContext call at all (verified by searching internal/modules/assignment/*.go).
- `backend/internal/modules/botservice/handler.go:33` — Sibling control: the bot handler uses `h.db.WithContext(c.Request.Context())`; the same pattern appears at 61, 106, 127, 172, 208, 227 and 245, so cancellation does propagate elsewhere in this codebase.
- `backend/internal/modules/calendar/handler.go:494` — Sibling bound on the same table: loadCachedEvents applies `deadline > now AND deadline <= cutoff` plus a pending-status predicate and uses `h.db.WithContext(c.Request.Context())` at 493, capping a comparable endpoint.
- `backend/internal/modules/telegram/handler.go:52` — Sibling bound: the test-reminder read applies `.Limit(10)`.
- `backend/internal/modules/calendar/sync/service.go:396` — markStaleAsMissed (396-413) and markStaleAsCompleted (374-393) only issue Updates, and deleteStaleAssignments (415-423) delegates to markStaleAsCompleted, so no sync path ever removes the rows GetAssignments reads.
- `backend/internal/modules/user/handler.go:124` — The only events DELETE in the whole backend (verified by repository-wide search for Delete(/DELETE FROM/Unscoped): Google Classroom disconnect, `WHERE user_id = ? AND source = 'google_classroom'`.
- `backend/internal/modules/calendar/moodle/client.go:79` — The ICS body is read with an uncapped io.ReadAll (the 1 KiB LimitReader at line 75 applies only to the non-2xx error path), so the requester chooses how large a document is ingested.
- `backend/internal/modules/calendar/ics/parser.go:67` — One record is appended per END:VEVENT with no event-count cap; the only per-event predicate is a non-empty SUMMARY at line 66, so ingested cardinality is chosen by the ICS author.
- `backend/internal/pkg/urlutil/urlutil.go:26` — The gate on the ingestion path checks only path/query substrings (`.ics`, `/calendar/export`, `export_execute.php`, authtoken+userid) and never scheme, host, port or resolved IP, so an attacker-hosted calendar URL passes.
- `backend/internal/database/postgres.go:33` — The shared pool is capped at SetMaxOpenConns(25) with 10 idle; this is the shared resource that non-cancellable queries occupy.
- `backend/internal/shared/middleware/timeout.go:22` — c.Next() runs the handler synchronously and the deadline is inspected only afterwards (line 24), so the middleware cannot stop work that ignores the context; defer cancel() at line 19 fires after the handler has already finished. [Pinned dependency source: gorm@v1.31.2/gorm.go (module cache):238 — Load-bearing dependency fact: the root handle is created with Statement.Context = context.Background(), and getInstance (gorm.go:448-475) propagates that context into every clone, so h.db.Raw in this handler reaches QueryContext (callbacks/query.go:19) with a non-cancellable context.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are all absent and WSL2 has no distribution installed), so the growth-point fixture that would measure peak heap, response byte size and pool occupancy for N rows cannot be executed; every check here is method "source" with artifact null.
1. The target cannot boot without a live Postgres: database.New returns an error on an empty DATABASE_URL (postgres.go:14-16) and cmd/api/main.go:25-28 log.Fatals on it, with no SQLite path and no DI seam, so even the query cannot be observed locally.
1. Whether the deployment fronts Moodle fetching with a proxy or egress control that caps response size or event count is outside the repository - no nginx/ingress configuration, client_max_body_size or proxy rule exists anywhere in the repo.
1. The deployed limits that decide real impact are outside source: docker-compose.yml defines no deploy.resources block for api, so the container memory limit and OOM policy are unknown, as are the Postgres max_connections for the shared instance and whether docker-compose.yml is the production topology.
1. The per-user row count actually reachable depends on data outside the repository: how many VEVENTs a real Moodle export emits, and how long the events table has accumulated without pruning, since no retention job exists in source.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In an isolated fixture with a throwaway Postgres and strict memory/CPU/wall-clock limits, insert N synthetic events for one dummy user at growth points N = 1k, 10k, 50k, then call Handler.GetAssignments against a request context that is cancelled immediately after the request is issued. Record peak heap (runtime.ReadMemStats), response byte size, wall time, and whether the query completes after cancellation. Repeat with both statements switched to h.db.WithContext(c.Request.Context()) to show the cancelled case returns promptly and heap stays flat. Separately confirm ingestion amplification with the pure parser: feed a synthetic ICS containing 10k distinct-UID VEVENTs with deadlines spread over the next 60 days to ics.ParseMoodleICS and to moodle.Client.ParseMoodleEvents and record the returned record count. Use no real user data and never run this against a deployed instance.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Ask the operator, read-only: (1) the api container memory limit and any OOM/restart history; (2) Postgres max_connections and current saturation of the 25-connection api pool; (3) the largest events row count for any single user_id and the total events row count; (4) whether any out-of-repo cron or SQL job prunes past-deadline events; (5) whether Moodle fetching is fronted by a proxy or egress gateway that enforces a response-size or event-count limit.


---

## 11. Bot chat-id resolution is ambiguous: users.telegram_chat_id is user-writable without proof of chat ownership and carries no uniqueness constraint, so a Telegram chat can be attributed to the wrong student's account

- **Fingerprint:** `ressist/backend/internal/modules/botservice/handler.go:GetUserByTelegram:ambiguous-chat-id-identity-resolution`
- **Boundary terdampak:** `backend/internal/modules/user/handler.go:312` (Handler.buildUpdateData) — efek akhir di `backend/internal/modules/botservice/handler.go:43` (Handler.GetUserByTelegram)

**Klaim akar masalah (claimed_root_cause):**

> The bot treats users.telegram_chat_id as a unique identity key, but the column has no uniqueness constraint and is writable without verification through PUT /v1/user, and GetUserByTelegram resolves duplicates with First() (a single primary-key-ordered row) instead of rejecting ambiguity, so a chat can be attributed to the wrong account.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/user/handler.go:312` — *Handler.buildUpdateData* — The real lower-trust entry: any JWT holder supplies telegram_chat_id in PUT /v1/user (router.go:119 gates the route with AccessToken only), and the value is copied verbatim into the update map at line 313, so the identity column the bot later trusts is attacker-chosen.
propagation → `backend/internal/modules/user/handler.go:253` — *Handler.validateUpdateRequest* — The only guard on that write path checks moodle_calendar_url, google_classroom_enabled and whatsapp_number through line 278; telegram_chat_id is never checked for format, ownership, or uniqueness, so no verify-code proof is required.
propagation → `backend/internal/models/user.go:20` — *models.User* — TelegramChatID is declared without uniqueIndex or index, so AutoMigrate creates a plain nullable column and the database accepts two rows holding the same chat id.
propagation → `backend/internal/modules/botservice/handler.go:34` — *Handler.GetUserByTelegram* — The lookup matches telegram_chat_id alone, adds no telegram_enabled predicate, and First() contributes only ORDER BY primary key LIMIT 1, so a duplicated value resolves to one of the matching rows with no ambiguity check.
sink → `backend/internal/modules/botservice/handler.go:43` — *Handler.GetUserByTelegram* — The chosen user id is returned to the bot as the authoritative account for that chat; the bot then lists that account's assignments, receives that account's reminders in the chat, and applies mark-complete to that account's rows.

**Bukti terverifikasi:**

- `backend/internal/modules/botservice/handler.go:33` — Verified resolution statement spanning lines 33-35: `Where("telegram_chat_id = ?", chatID).First(&user)` — single-column match, no uniqueness guard, no enabled predicate.
- `backend/internal/models/user.go:20` — Verified: `TelegramChatID *string gorm:"column:telegram_chat_id"` with no uniqueIndex and no index tag, unlike Email (line 12), GoogleID (line 15) and TelegramVerifyCode (line 22).
- `backend/internal/modules/user/handler.go:313` — Verified: `updateData["telegram_chat_id"] = nullableString(req.TelegramChatID)` writes the request body field straight into the column.
- `backend/internal/modules/user/handler.go:253` — Verified: validateUpdateRequest spans lines 253-278 and returns after checking only moodle_calendar_url, google_classroom_enabled and whatsapp_number.
- `backend/internal/modules/botservice/handler.go:107` — Verified: the intended binding path requires `telegram_verify_code = ? AND telegram_verify_expires > ?` before writing the same column at lines 117-131, i.e. proof of chat ownership that the PUT /v1/user path bypasses.
- `backend/internal/shared/router/router.go:119` — Verified: `userGroup.PUT("", middleware.AccessToken(tokenParser), userModule.Handler.UpdateCurrentUser)` — any authenticated student can reach the unvalidated identity write; no admin or ownership gate exists.
- `backend/internal/modules/telegram/scheduler.go:81` — Verified: `Where("telegram_enabled = ? AND morning_briefing = ? AND telegram_chat_id IS NOT NULL", true, true)` then sends each user's briefing to that user's stored chat id (lines 87-113), so a colliding chat id receives another student's data.
- `backend/internal/modules/telegram/handler.go:139` — Verified: delivery paths require `id = ? AND telegram_enabled = ? AND telegram_chat_id IS NOT NULL` (also line 75, telegram/service.go:27, botservice/handler.go:176 and :248); the resolver applies neither predicate, so a disabled link still resolves as the chat's owner.

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on this host: docker, podman, nerdctl, containerd, ctr, vagrant and qemu are all absent and WSL2 has no installed distribution, so the two-dummy-tenant fixture cannot be run under the required empty-environment, read-only-mount and resource-limited controls. Every check is method "source" with artifact null and the promotion allowlist is empty.
1. The target exposes no testable seam for this path: database.New returns an error on an empty DATABASE_URL and pgx/v5 Postgres is the only driver (no SQLite path, no injected DB interface), so reaching GetUserByTelegram requires a live Postgres plus running the compiled API — target execution, which the execution boundary forbids on this host.
1. Which row First() returns is data-dependent, not source-deterministic: GORM appends ORDER BY <primary key> LIMIT 1 and users.id is a random v4 UUID (models/user.go:47), so whether the colliding row or the legitimate row wins must be observed in a live fixture; source establishes only that exactly one of the matching rows is chosen with no ambiguity rejection.
1. Whether production already holds duplicate telegram_chat_id values (from the pre-verify-code flow or manual edits) is a data-state fact outside the repository. This bounds pre-existing exposure only; it is not a reachability blocker, because an authenticated student can create the duplicate on demand through PUT /v1/user.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In a disposable Postgres instance containing dummy users only (no real student data, no Telegram or other external calls): create dummy users A and B; send PUT /v1/user as B carrying A's telegram_chat_id; assert the write succeeds and that `SELECT telegram_chat_id, count(*) FROM users WHERE telegram_chat_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1` returns the collided pair. Then call Handler.GetUserByTelegram with that chat id and record which of A or B is returned, and repeat with the two ids relabelled to confirm the winner is the lexicographically smaller primary key. Finally drive GET /v1/assignments and POST /v1/assignments/complete with X-Bot-Token plus X-Act-As-User set to the resolved id, and record which row set is read and which event row is mutated. Also call the resolver for a user whose telegram_enabled is false to confirm it still resolves. This requires an OS-enforced sandbox, which is absent here.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

On a read replica, run `SELECT telegram_chat_id, count(*) FROM users WHERE telegram_chat_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1` and report any duplicates. Then confirm with the operator whether a partial unique index on users (telegram_chat_id) WHERE telegram_chat_id IS NOT NULL can be applied without a data fix, and whether adding the telegram_enabled predicate plus a multi-row-match rejection to GetUserByTelegram would break any live bot session.


---

## 12. GET /v1/courses materialises every event row the caller owns and orders the distinct course names with a hand-written quadratic exchange sort, with cardinality the caller controls through their own LMS feed

- **Fingerprint:** `ressist/backend/internal/modules/course/handler.go:GetAllCourses:unbounded-event-load-quadratic-sort`
- **Boundary terdampak:** `backend/internal/modules/course/handler.go:34` (func (h *Handler) GetAllCourses(c *gin.Context)) — efek akhir di `backend/internal/modules/course/handler.go:92` (for i := 0; i < len(courses); i++ { for j := i + 1; j < len(courses); j++ { if courses[i] > courses[j] ... } })

**Klaim akar masalah (claimed_root_cause):**

> course/handler.go:GetAllCourses issues an unbounded per-user event query and then orders the resulting distinct-name slice with a hand-written quadratic exchange sort, while no layer bounds the number of distinct course names a caller can introduce through their own LMS feed, so per-request CPU and row materialisation grow superlinearly with attacker-controlled persisted state on a process shared by every student.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/course/handler.go:34` — *func (h *Handler) GetAllCourses(c *gin.Context)* — Authenticated GET /v1/courses with no body and no parameters beyond the credential. Mounted in backend/internal/shared/router/router.go:134-136 behind middleware.APIKeyOrJWT then apiKeyRateLimit, so both a JWT and an X-API-Key reach it; the request itself costs the caller one small HTTP round trip.
propagation → `backend/internal/modules/course/handler.go:56` — *h.db.Where("user_id = ?", userID).Find(&events)* — Every event row owned by the caller is selected with all columns, with no LIMIT, no deadline window and no status filter, materialising the caller's full accumulated history into one slice on the synchronous request path. Contrast loadCachedEvents in the calendar handler (backend/internal/modules/calendar/handler.go:493-496), which does bound by a 60-day deadline window, source and status.
propagation → `backend/internal/modules/course/handler.go:88` — *courses := make([]string, 0, len(courseMap))* — Distinct events.course values are collected into a map and flattened into a slice whose length n is the attacker-influenced cardinality; the map, the slice and the response slice built at line 100 all scale with it. Nothing in the handler caps len(courseMap).
sink → `backend/internal/modules/course/handler.go:92` — *for i := 0; i < len(courses); i++ { for j := i + 1; j < len(courses); j++ { if courses[i] > courses[j] ... } }* — Nested exchange sort performs roughly n*(n-1)/2 full string comparisons inside the request goroutine with no early exit, no cap and no sort.Strings; with large n this is the dominant CPU cost and it is paid again on every subsequent request for as long as the rows persist.

**Bukti terverifikasi:**

- `backend/internal/modules/course/handler.go:56` — Unbounded Find of all of the caller's event rows, all columns, no limit, no window, no status filter, on the synchronous request path.
- `backend/internal/modules/course/handler.go:92` — Hand-written exchange sort over the distinct course-name slice, quadratic in the number of distinct course values, instead of a bounded or linearithmic sort.
- `backend/internal/modules/calendar/moodle/client.go:79` — io.ReadAll on the body of the fully caller-chosen feed URL with no size cap; only the non-2xx branch at line 75 uses io.LimitReader(resp.Body, 1024), so a 2xx ICS body is unbounded (bounded only by the client's 12 s timeout).
- `backend/internal/modules/calendar/ics/parser.go:67` — One event record is appended per END:VEVENT block with no count cap, and the course value is taken verbatim from the CATEGORIES line, so a single feed yields an arbitrary number of attacker-chosen distinct course names.
- `backend/internal/modules/calendar/sync/service.go:145` — Each distinct sync key becomes its own events row via createAssignment, and synckey.Build prefers the attacker-supplied UID, so distinct UIDs persist as distinct rows even under a repeated course name; the course name is additionally inserted into the global courses table by FirstOrCreate at line 129.
- `backend/internal/shared/middleware/rate_limit.go:94` — The only request-rate gate on this path is a 60/minute, burst-20 token bucket, and its bucket key falls back to c.ClientIP() for JWT callers, which Gin resolves from X-Forwarded-For under its default 0.0.0.0/0 and ::/0 trusted-proxy set because backend/ never calls SetTrustedProxies.
- `backend/internal/shared/middleware/timeout.go:24` — The global 15 s deadline is only consulted after c.Next() returns and only to decide whether to write a 504, so it neither interrupts the CPU-bound sort nor releases the already-materialised rows; it bounds the ctx-carrying DB query but not the per-request CPU.

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on this host (verified: docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent and `wsl -l -v` reports no installed distribution), so the bounded local growth measurement of the n^2 comparison count, per-request heap and wall-clock cost could not be taken, and no target-controlled execution was attempted.
1. The binary cannot boot without a live Postgres in this environment: database.New returns an error on an empty DATABASE_URL and offers no SQLite or DI seam (backend/internal/database/postgres.go:14-16), and the only pure-unit test files in the tree are internal/config/config_test.go and internal/pkg/classcode/exam_test.go, so the handler cannot be exercised in-process either.
1. The deployed CPU and memory limits, replica count and autoscaling policy for the `api` service are not in the repository: docker-compose.yml declares no resources/limits for `api` (only `bot` carries deploy.replicas: 1), so the cross-user blast radius of saturating one replica cannot be fixed from source.
1. Whether an ingress, reverse proxy or CDN in front of the service bounds concurrent GET requests per client, and whether it overwrites X-Forwarded-For, is outside the repository; in source the only control is the per-bucket token limiter, so the real concurrency bound is an owner observation.
1. How many distinct course rows a single sync call can persist before the 15 s RequestTimeoutSeconds deadline cancels the ctx-bound transaction, and therefore how many sync calls one caller needs to reach a cardinality where the quadratic sort dominates, is a runtime measurement: the attacker-controlled accumulation rate, not the existence of the missing bound, is the fact that source cannot settle.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In an OS-enforced sandbox with no external network, start a throwaway Postgres 16 and the API with ENV=development, AUTO_MIGRATE=true, LMS_SYNC_ENABLED=false and a synthetic JWT_ACCESS_SECRET, using a single dummy user (never real user data). Insert synthetic events rows for that one user carrying 1k, 2k, 4k, 8k and 16k distinct course values, then time GET /v1/courses at each point under a strict per-process CPU and memory limit and record wall-clock, CPU seconds and peak heap. Confirm the growth curve is quadratic in the distinct-course count rather than linear, and separately confirm that with a 15 s REQUEST_TIMEOUT_SECONDS a large-n request returns 504 only after the CPU work has already completed. No stress or saturation testing, and stop at the point where the superlinear term is unambiguous.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner observes, read-only and non-destructively, on one production replica the p99 latency and CPU seconds of GET /v1/courses for the account with the largest distinct-course count (SELECT user_id, COUNT(DISTINCT course) FROM events GROUP BY user_id ORDER BY 2 DESC LIMIT 5), and confirms (a) the CPU/memory limits and replica count configured for the `api` service, (b) whether the ingress bounds per-client request rate and concurrency for this route, and (c) whether the ingress sets or strips X-Forwarded-For, which decides whether the per-IP token bucket is an effective concurrency bound.


---

## 13. POST /v1/telegram/test-briefing issues one synchronous, deadline-less outbound Bot API send per request through the single shared TELEGRAM_BOT_TOKEN, with no per-principal or per-chat quota on the chain

- **Fingerprint:** `ressist/backend/internal/modules/telegram/handler.go:SendMorningBriefing:unbounded-outbound-send-shared-bot-token`
- **Boundary terdampak:** `backend/internal/shared/router/router.go:152` (router.New / telegramGroup) — efek akhir di `backend/internal/modules/telegram/bot.go:27` (telegram.NewBot)

**Klaim akar masalah (claimed_root_cause):**

> The test-briefing handler performs an outbound send through the single shared bot token with no per-principal or per-chat quota and no deadline on the outbound call, so one authenticated student's request volume is metered only by the shared upstream budget that all other students depend on.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/shared/router/router.go:152` — *router.New / telegramGroup* — The /v1/telegram group is created with middleware.AccessToken(tokenParser) as its only middleware; POST /test-briefing at :154 therefore requires a valid student JWT and nothing else - no apiKeyRateLimit, no per-user bucket, and no limiter in the global chain at :40-63.
propagation → `backend/internal/modules/telegram/handler.go:139` — *Handler.SendMorningBriefing* — The account is loaded for the authenticated subject with id = ? AND telegram_enabled = ? AND telegram_chat_id IS NOT NULL, and the destination chat id used at :154 and :166 comes from that same row. Scoping holds structurally, but the column value itself is attacker-chosen through PUT /v1/user (user/handler.go:312-313), which has no ownership verification.
propagation → `backend/internal/modules/telegram/handler.go:161` — *Handler.SendMorningBriefing* — Every pending event in the window now..endOfNextDay is selected with no Limit; :163 filters the whole slice in memory and :165 concatenates every survivor into one Markdown body. The pre-send database read and string build are unbounded in the user's pending-event count.
propagation → `backend/internal/modules/telegram/service.go:20` — *Bot.SendMessage* — SendMessage calls b.api.Send(msg) synchronously inside the request goroutine. The pinned library issues the call with http.NewRequest plus Client.Do on a client built with no Timeout and no request context, so neither the request deadline nor a client disconnect propagates to the outbound call.
sink → `backend/internal/modules/telegram/bot.go:27` — *telegram.NewBot* — The send consumes the single shared TELEGRAM_BOT_TOKEN (config.go:119, docker-compose.yml:45 and :73), whose global and per-chat message budget is the operator-owned resource that also carries every other student's scheduled reminders and morning briefings.

**Bukti terverifikasi:**

- `backend/internal/shared/router/router.go:152` — The telegram group's only middleware is AccessToken; no rate limiter is attached, in contrast with router.go:118, :128, :135 and :159 which all carry apiKeyRateLimit.
- `backend/internal/shared/router/router.go:40` — Start of the global chain: RequestID, TimeoutContext, JSONAccessLogger, gin.Recovery, HTTPMetrics, cors.New, Maintenance (:40-63). No request-rate control exists anywhere in it, so the /v1/telegram group has no limiter on either layer.
- `backend/internal/modules/telegram/handler.go:166` — err = h.bot.SendMessage(chatID, message) - exactly one synchronous outbound Bot API call per accepted request, on the request goroutine.
- `backend/internal/modules/telegram/handler.go:161` — The briefing query ends in Order("deadline asc").Find(&allAssignments) with no Limit, so the pre-send work scales with the user's pending event count.
- `backend/internal/modules/telegram/bot.go:27` — tgbotapi.NewBotAPI(cfg.TelegramBotToken) builds the client from the shared token; the pinned version is v5.5.1 (go.mod:8), where NewBotAPI (module cache bot.go:39-40) delegates to NewBotAPIWithClient(token, APIEndpoint, &http.Client{}) - an http.Client with no Timeout - and MakeRequest uses http.NewRequest (bot.go:104) plus bot.Client.Do(req) (bot.go:110) with no context.
- `backend/internal/shared/middleware/timeout.go:24` — The deadline is only inspected after c.Next() returns, so TimeoutContext cannot interrupt a handler blocked inside the outbound send.
- `backend/cmd/api/main.go:72` — WriteTimeout = requestTimeout+5s is the only outer bound; it closes the client connection but not the handler goroutine or the in-flight upstream request.
- `backend/internal/modules/user/handler.go:313` — telegram_chat_id is written straight from the request body with no verification that the chat belongs to the caller, so the destination of this send is caller-chosen. [Pinned dependency source: bot/internal/scheduler/scheduler.go:111 — The operative scheduled briefing path (the in-API telegram scheduler at backend/internal/modules/telegram/scheduler.go:109 is never started - cmd/api/main.go only starts the lmssync scheduler at :38-56) sends through s.send, which is bot/internal/telegram/bot.go:38 and uses the same TELEGRAM_BOT_TOKEN injected at docker-compose.yml:73. This is what a spent upstream budget degrades for every other user.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. Telegram's actual metering for this bot token is outside the repository and cannot be contacted: the enforced global messages-per-second budget, the per-chat budget, and whether a 429 is returned as a library error the handler merely surfaces as HTTP 500. Because the destination is the caller's own chat and the cost ratio is 1:1 with no amplification, the per-chat limit may make the shared-budget drain from a single caller negligible, which would reduce this to hardening rather than a cross-user availability failure.
1. Whether the missing client Timeout produces retained handler goroutines and sockets in practice depends on api.telegram.org stalling after the TCP connection is established; the zero-value http.Client still inherits http.DefaultTransport's 30 s dial and 10 s TLS-handshake timeouts, so the indefinite-retention scenario needs an upstream hang the attacker cannot induce. Establishing this needs an isolated mock endpoint that accepts and never responds.
1. The target cannot boot without a live Postgres (database.New fatals on an empty DATABASE_URL and there is no SQLite or DI seam), so the handler cannot be reached locally even against a mocked Telegram endpoint.
1. No OS-enforced sandbox exists on this host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu absent; WSL2 has no distribution), so the mock-upstream fixture that would show goroutine and socket retention, and the 429-continues-issuing check, cannot be executed; every check here is method source with artifact null.
1. Deployed concurrency headroom is unknown: the api replica count, goroutine and connection limits and memory limit are not in source (docker-compose.yml declares no deploy.resources for api and only the bot service pins replicas: 1), so the volume at which retained handlers become a shared-availability problem must be measured by the owner.
1. Whether a production proxy in front of api already rate-limits /v1/telegram/* is outside the repository; docker-compose.yml publishes api directly on ${API_PORT} with no proxy service defined.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In an isolated fixture with a throwaway Postgres and a local mock standing in for the Bot API endpoint, issue N sequential POST /v1/telegram/test-briefing calls as one dummy user under strict goroutine, memory and wall-clock limits, and record goroutine count, open sockets and whether the handler returns after the 15 s TimeoutContext deadline. Then repeat against a mock that answers 429 with retry_after and record whether the caller can keep issuing requests and whether each attempt still opens a socket. Separately, seed one dummy user with a large pending-event count inside the window and record the query time and built message length to quantify the unbounded pre-send work. Do not contact api.telegram.org and do not use a real bot token.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Ask the operator for: the observed Telegram 429 rate and error counts for the shared bot token over the last month; whether any other students' scheduled reminders or morning briefings failed in the same windows; whether the api process logged 'failed to send morning briefing' spikes correlated with any single account; the api container's replica count and memory limit; and whether an edge proxy in front of api already rate-limits /v1/telegram/*. Also ask whether per-chat Telegram limits, not the global budget, absorb a single account's loop - that answer decides whether this is a cross-user availability issue or hardening.


---

## 14. PUT /v1/user binds an arbitrary Telegram chat ID without the verify-code ownership proof

- **Fingerprint:** `ressist/backend/internal/modules/user/handler.go:buildUpdateData:telegram-chat-id-write-bypasses-verify-code-ownership-proof`
- **Boundary terdampak:** `backend/internal/shared/router/router.go:119` (PUT /v1/user route) — efek akhir di `backend/internal/modules/botservice/handler.go:174` (Handler.GetDueAssignments)

**Klaim akar masalah (claimed_root_cause):**

> The Telegram chat binding is written from a general preference update that performs no ownership proof, so the same state transition the verify-code flow guards is reachable through a weaker path that accepts any chat identifier supplied in the request body.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/shared/router/router.go:119` — *PUT /v1/user route* — The update route is guarded by AccessToken only, so a valid access-token holder reaches the handler.
propagation → `backend/internal/modules/user/handler.go:312` — *Handler.buildUpdateData* — The request field telegram_chat_id is copied to the update map after trimming only; no proof, format, or ownership check is applied.
propagation → `backend/internal/modules/user/handler.go:253` — *Handler.validateUpdateRequest* — Validation covers Moodle, Google, and WhatsApp fields, never TelegramChatID.
propagation → `backend/internal/models/user.go:20` — *models.User.TelegramChatID* — The model declares no unique index for telegram_chat_id, permitting duplicate bindings in an AutoMigrate-created schema.
sink → `backend/internal/modules/botservice/handler.go:174` — *Handler.GetDueAssignments* — Reminder fan-out selects users.telegram_chat_id as each eligible event owner's delivery destination.

**Bukti terverifikasi:**

- `backend/internal/modules/user/handler.go:313` — telegram_chat_id is placed directly into the update map from the request body.
- `backend/internal/modules/user/handler.go:253` — The update validator does not inspect TelegramChatID.
- `backend/internal/modules/botservice/handler.go:107` — The dedicated active verification flow requires a matching unexpired verification code before binding a chat.
- `backend/internal/modules/botservice/handler.go:118` — The verified flow writes telegram_chat_id only after that lookup succeeds.
- `backend/internal/modules/botservice/handler.go:34` — Chat-to-user resolution uses First over telegram_chat_id, which the model does not declare unique.

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox is available on this host and the binary requires a live Postgres, so the API write/query sequence cannot be exercised here; evidence is source-only.
1. The repository exposes no source-visible way for one account to learn another account's numeric Telegram chat ID, so third-party delivery and command-misattribution impact depends on an out-of-band disclosure that source review cannot establish.
1. Telegram's requirement that a bot cannot initiate a conversation with a user who has not started it bounds deliverable target chats; that platform fact cannot be observed from this source review.
1. The deployed database may have a unique index on users.telegram_chat_id beyond the GORM model. The repository has no user-table SQL migrations, and AutoMigrate defaults off in production, so that deployment fact is not locally visible.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

Inside an approved sandbox, boot a loopback Postgres fixture with AutoMigrate, users A and B, a valid access token for A, B's numeric Telegram chat ID, and an eligible event for A. PUT /v1/user as A with telegram_chat_id equal to B's chat ID and no verification code; assert a successful response and DB update. Call GET /internal/scheduler/due as the bot service; assert A's row carries B's chat ID. Call GET /internal/users/by-telegram/<chatID>; assert it resolves one of the duplicate rows. Remove/reset the duplicate binding, add a unique index, repeat the PUT, and assert the duplicate write fails. Do not contact Telegram.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner checks the production schema for a unique index on users.telegram_chat_id, then reviews available application/audit logs for PUT /v1/user telegram_chat_id writes lacking a preceding successful verification-code consumption for that account and timeframe.


---

## 15. Telegram chat-binding code is a 30-bit math/rand value verified with no attempt counter or throttle

- **Fingerprint:** `ressist/backend/internal/modules/user/handler.go:generateAlphanumericCode:non-csprng-30bit-telegram-bind-code-without-attempt-bound`
- **Boundary terdampak:** `backend/internal/modules/user/handler.go:200` (Handler.GenerateTelegramVerifyCode) — efek akhir di `backend/internal/modules/botservice/handler.go:107` (Handler.VerifyTelegram lookup and binding update)

**Klaim akar masalah (claimed_root_cause):**

> An authentication secret used to prove ownership of a Telegram chat is generated from a non-cryptographic source (math/rand) with only about 30 bits of entropy, and neither verification path that consumes it bounds guesses by an attempt counter, failure invalidation, or throttle, so the ownership proof rests on a small guessable space exposed through an unauthenticated message surface.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/user/handler.go:200` — *Handler.GenerateTelegramVerifyCode* — An authenticated user (JWT via middleware.AccessToken, router.go:124) requests a code; the handler calls generateAlphanumericCode(6), stores it in plaintext with a ten-minute expiry (handler.go:203-206), and returns it only to the owner (handler.go:211-214). A re-request overwrites the previous value, so exactly one code per user is live at a time.
propagation → `backend/internal/modules/user/handler.go:391` — *generateAlphanumericCode* — Each of the six characters is chosen with rand.Intn from math/rand over the 32-symbol charset declared at line 388, giving 32^6 = 1,073,741,824 possibilities (about 30 bits) with no CSPRNG guarantee; the Go 1.25 module means the global source is auto-seeded, so the defect is the non-CSPRNG contract and the 30-bit ceiling, not a deterministic seed.
propagation → `backend/internal/models/user.go:22` — *models.User.TelegramVerifyCode* — The code is stored as a plain indexed string with only a telegram_verify_expires column (user.go:23); the model (user.go:10-43) declares no attempt-count or lockout field, and GORM AutoMigrate (database/postgres.go:39) migrates only this model, so no attempt bound can exist without a schema change.
propagation → `bot/internal/telegram/bot.go:107` — *Bot.Start message dispatch / handleVerify* — The deployed bot treats any six-character message from any Telegram user as a code guess with no authentication, no throttle, and no per-chat accounting (bot.go:106-108 -> handleVerify at bot.go:161-174, which POSTs to /internal/telegram/verify); each failure draws a uniform failure reply (bot.go:170) and leaves the code valid for its full ten minutes. The backend's legacy in-process bot contains the same unbounded logic at backend/internal/modules/telegram/bot.go:58-61 and bot.go:94, though its polling is deprecated and never started in the current wiring.
sink → `backend/internal/modules/botservice/handler.go:107` — *Handler.VerifyTelegram lookup and binding update* — Verification is a single equality lookup (WHERE telegram_verify_code = ? AND telegram_verify_expires > now) with no counter, throttle, or lockout; a miss returns 404 at line 110 leaving the code valid, and a hit at lines 117-131 binds the guessing chat to the victim (telegram_chat_id set, telegram_enabled set true, code and expiry cleared), returning a visibly distinct success body with user_id and name at lines 133-137. The legacy sink backend/internal/modules/telegram/bot.go:94-125 performs the identical unbounded lookup and binding.

**Bukti terverifikasi:**

- `backend/internal/modules/user/handler.go:388` — The charset is exactly 32 symbols (ABCDEFGHJKLMNPQRSTUVWXYZ23456789), so six characters give 32^6 = 1,073,741,824 possibilities, about 30 bits.
- `backend/internal/modules/user/handler.go:391` — rand.Intn from math/rand (imported at line 6) generates the security value; crypto/rand is not imported anywhere in the user module (a repo-wide grep finds crypto/rand only in internal/modules/apikey/service.go and internal/modules/auth/service.go).
- `backend/internal/modules/user/handler.go:201` — The expiry window is ten minutes; the update at lines 203-206 writes only telegram_verify_code and telegram_verify_expires, with no attempt counter or failure state, and re-requesting overwrites the previous code.
- `backend/internal/modules/botservice/handler.go:107` — The live service verification path performs a single equality lookup with a live-expiry predicate and no attempt accounting or throttle; a miss returns 404 at line 110 and success returns user_id and name at lines 133-137, giving a clean oracle.
- `backend/internal/modules/telegram/bot.go:94` — The legacy bot verification performs the same single lookup; on a miss it replies at line 97 and returns without changing any state, and on a hit it writes telegram_chat_id and telegram_enabled and clears the code (lines 108-114), replying with a success message distinct from the failure reply. This polling loop is deprecated (cmd/api/main.go:83-85, telegram/module.go:48-50) and superseded by bot/internal/telegram/bot.go:106-108,161-174, which behaves identically.
- `backend/internal/models/user.go:22` — The verify code column is a plain indexed string with only an expiry column at line 23; the model has no attempt-count field, and database/postgres.go:39 AutoMigrates exactly this model.
- `backend/internal/shared/router/router.go:142` — The /internal group applies only middleware.RequireBotService (X-Bot-Token); no rate-limit middleware guards /internal/telegram/verify, so the only bound on guess throughput is whatever the deployed bot and Telegram accept, which is not source-visible.

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on this host (docker, podman, containerd, qemu, and WSL2 distributions are all absent), so no harness can be compiled or run and the generator's output distribution and the database behavior on a wrong guess cannot be observed locally; all evidence above is source-only.
1. The feasible attempt rate against the deployed bot is not source-visible: the bot/ source contains no per-chat throttle or deduplication, but Telegram Bot API limits, client-side send rates, and any throttling applied outside this repository determine effective guesses per second, and roughly 2^30 attempts must be shown feasible before the low-entropy claim becomes a demonstrated account takeover.
1. Whether the deployed database schema adds a unique constraint, an attempt counter, or a lockout that the repository does not declare is an owner-observed fact.
1. Whether the deployment exposes alerting or lockout on repeated verification failures (for example at a reverse proxy or WAF in front of the API) is not present in the repository.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

Inside the approved OS-enforced sandbox, run a harness over generateAlphanumericCode to confirm the observed alphabet and per-position distribution over a bounded sample, and drive Handler.VerifyTelegram against a loopback Postgres fixture (a single seeded user row with a known code) to show that a wrong six-character guess returns 404 while leaving telegram_verify_code and telegram_verify_expires unchanged and incrementing no counter, and that the correct guess rebinds telegram_chat_id to the guessing chat id.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

The owner observes the sustained six-character message rate the deployed bot accepts per chat (and any Telegram Bot API, reverse-proxy, or WAF limit that caps repeated verification failures) and reports the effective guesses per second; with roughly 5 x 10^8 guesses needed on average over the ten-minute window, the owner can state whether that rate is reachable, and confirms the live schema has no attempt counter or lockout beyond what the repository declares.


---

## 16. The shared apiKeyRateLimit buckets authenticated callers by a client-chosen address, so one principal can escape its budget and unrelated principals share one

- **Fingerprint:** `ressist/backend/internal/shared/router/router.go:apiKeyRateLimit:client-chosen-quota-dimension`
- **Boundary terdampak:** `backend/internal/shared/router/router.go:128` (router.New / calendarGroup) — efek akhir di `backend/internal/shared/middleware/rate_limit.go:116` (ipRateLimiter.allow)

**Klaim akar masalah (claimed_root_cause):**

> The rate limiter accounts authenticated traffic on a network address derived from a client-supplied forwarding header (or a shared BFF egress address) rather than on the authenticated principal, so the quota dimension is both escapable by rotating the header and shared by unrelated principals behind one address.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/shared/router/router.go:128` — *router.New / calendarGroup* — The chain is APIKeyOrJWT then apiKeyRateLimit then the handler, so authentication runs before the gate and a JWT caller reaches the limiter with no API key header. The same ordering holds at router.go:118, :135 and :159.
propagation → `backend/internal/shared/middleware/auth.go:97` — *middleware.APIKeyOrJWT* — With no X-API-Key and no ApiKey-scheme Authorization header, the middleware falls through to the Bearer JWT path (lines 91-103), parses the token and sets the subject claims, so the limiter runs after an authenticated principal is already available in the context but does not use it.
propagation → `backend/internal/shared/middleware/rate_limit.go:107` — *ApiKeyRateLimit* — The bucket is set to `bucket := c.ClientIP()` because no key header is present; the key-prefix branch at lines 108-114 is the only principal-derived dimension and applies only to API-key callers.
propagation → `backend/internal/shared/router/router.go:39` — *router.New* — gin.New() is called with no SetTrustedProxies and no TrustedPlatform (no such call exists anywhere in the repository), so with gin v1.12.0 defaults every peer is a trusted proxy and ClientIP honours the client-supplied X-Forwarded-For / X-Real-IP header.
sink → `backend/internal/shared/middleware/rate_limit.go:116` — *ipRateLimiter.allow* — The allow decision is made against the attacker-influenceable bucket: a rotated header value (or a shared BFF/bot/campus address) hits a different entry of the same visitors map, so a fresh dimension yields a limiter with the full burst while a shared dimension drains one 60/min budget for every principal behind it.

**Bukti terverifikasi:**

- `backend/internal/shared/middleware/rate_limit.go:107` — `bucket := c.ClientIP()` — the accounting dimension for JWT (and bot) callers is a network address, not the authenticated subject.
- `backend/internal/shared/middleware/rate_limit.go:108` — The only principal-derived dimension is the first 12 characters of an API key, which applies only to API-key callers and not to the JWT or bot paths.
- `backend/internal/shared/router/router.go:39` — gin.New() with no SetTrustedProxies, TrustedPlatform or RemoteIPHeaders anywhere in the repository (verified by repo-wide search), so Gin's permissive trusted-proxy defaults stand.
- `backend/internal/shared/router/router.go:114` — One ApiKeyRateLimit instance is built once and reused by all four chains (used at router.go:118, :128, :135, :159), so the budget is not per-route either.
- `backend/internal/shared/router/router.go:118` — The gate is listed after APIKeyOrJWT on every chain (also :128, :135, :159), so authentication work precedes the earliest rate decision and rejected-auth requests never reach the limiter.
- `backend/internal/shared/middleware/rate_limit.go:54` — Each new bucket is a fresh rate.NewLimiter seeded with the full burst (x/time/rate rate.go:100-104 initialises tokens to the burst size), so a rotated dimension resets the budget rather than accumulating against the principal; entries idle for the 15-minute TTL are also deleted (lines 42-49).
- `backend/internal/modules/apikey/service.go:143` — The API-key authentication path performs a hash lookup here and a second user load at line 156, both before the limiter runs; both are reachable without any rate gate on these chains.
- `backend/internal/modules/calendar/handler.go:110` — The force-refresh branch behind the same gate (force == "true" at line 107) always calls syncAndBuildResponse, which fans out per-course fetches to classroom.googleapis.com; the 1-hour syncCooldown (line 28) is only computed into the nextRefreshAt response field (lines 474-481) and is never enforced, so each escaped request converts into shared upstream work.
- `backend/internal/modules/calendar/google/client.go:189` — Per-course goroutine fan-out (concurrency 5, lines 182-209) against classroom.googleapis.com, with paginated courses (line 317) and courseWork (line 348) loops — the shared Google Cloud project quota an escaped budget is spent against.
- `backend/internal/config/config.go:132` — Defaults API_KEY_RATE_LIMIT_PER_MINUTE=60 and API_KEY_RATE_LIMIT_BURST=20 (line 133) define the per-dimension budget that rotation escapes and that shared addresses drain. [Pinned dependency source: C:/Users/Jeremi/go/pkg/mod/github.com/gin-gonic/gin@v1.12.0/gin.go:225 — Pinned dependency source: gin.New() initialises trustedProxies to ["0.0.0.0/0", "::/0"] with ForwardedByClientIP true and RemoteIPHeaders [X-Forwarded-For, X-Real-IP] (lines 214-215), and Context.ClientIP (context.go:1014-1022) therefore parses the client-supplied header; validateHeader (gin.go:482-501) returns the right-most untrusted entry, so a single-value or attacker-prefixed header is fully attacker-chosen.] [Pinned dependency source: frontend/server/lib/backend-auth.ts:204 — The web BFF's data-path calls to /v1/* carry only Authorization and Content-Type (lines 204-211) with no X-Forwarded-For, so every browser student's request arrives with the BFF's egress address as the bucket key: all website users share one 60/min budget across all four gated chains.] [Pinned dependency source: bot/internal/client/api.go:174 — The bot service polls GET /v1/assignments per impersonated user from one container address with no forwarding header, so bot-served students also share the single IP bucket on that chain and 429s degrade bot polling.] [Pinned dependency source: docker-compose.yml:51 — api is published directly on ${API_PORT:-8080}; the only mention of a proxy is a comment that a load balancer 'should' be added when scaling (line 59-60), so direct callers (mobile app, documented curl usage against https://ressist-api.nodryx.com in frontend/app/api-docs/page.tsx:226-239) reach the Gin engine with their own headers.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent and WSL2 has no distribution installed), so the bounded local fixture that would show bucket rotation and address sharing cannot be executed; every check here is method "source" with artifact null.
1. The deployed ingress topology in front of api is outside the repository: docker-compose.yml publishes api directly on API_PORT and only comments that a load balancer should be added when scaling, and the production host (ressist-api.nodryx.com) must not be contacted, so whether a real proxy overwrites or appends X-Forwarded-For — or applies its own rate limiting that masks the defect — is unknown.
1. Whether api runs as multiple replicas is a deployment fact; each replica carries an independent in-process limiter, multiplying every budget by the replica count, and compose documents api as scalable but sets no replica count.
1. The real Google Cloud project quota behind GOOGLE_CLIENT_ID (per-project and per-user limits) is an external metering fact that cannot be contacted, so the shared-resource cost of an escaped budget is not established from source.
1. The full router.New chain cannot boot without a live Postgres (database.New fatals on an empty DATABASE_URL and the app container wires every module), so even a local Gin fixture over the real routes requires a throwaway database, although the limiter middleware itself is database-free and testable in isolation.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In an isolated fixture with no network, build a gin.New() engine with no SetTrustedProxies and attach middleware.ApiKeyRateLimit(60, 20) with a stub token parser, then drive it with httptest: (1) a request set with one fixed RemoteAddr and a rotating single-value X-Forwarded-For header — assert every request is accepted, because each distinct value keys a fresh rate.NewLimiter starting at the full 20-token burst with 1 token/s refill; (2) two dummy principals (distinct Bearer JWTs) with identical RemoteAddr and no forwarding header — assert both draw the same bucket and the 21st request inside the burst window returns 429; (3) confirm the single shared instance across chains by exhausting the budget on one path (e.g. GET /v1/assignments) and observing 429 on another (e.g. GET /v1/calendar/preview). Stub the Google and Moodle clients; do not contact Google, Telegram or any external endpoint; no Postgres is needed because the middleware and auth middleware are database-free.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Ask the operator, read-only and non-destructively: (a) the exact ingress in front of ressist-api.nodryx.com, whether it overwrites or appends X-Forwarded-For, and whether it applies its own rate limiting; (b) the api replica count, since each replica carries an independent in-process limiter; (c) Google Cloud Console quota and 429 history for the project behind GOOGLE_CLIENT_ID; (d) from ressist_http_requests_total{path="/v1/assignments"} and access logs, whether 429s coincide with the bot scheduler's per-user polling and whether two students behind one campus NAT (or two website users, who share the BFF egress address) have received 429 at the same time.


---

## 17. Calendar preview performs an unbounded persisting LMS fan-out on every force request; the advertised one-hour refresh cooldown is never enforced

- **Fingerprint:** `ressist:calendar/preview:force-refresh-budget-not-enforced`
- **Boundary terdampak:** `backend/internal/shared/router/router.go:129` (router.New / calendarGroup.GET("/preview")) — efek akhir di `backend/internal/modules/calendar/google/client.go:416` (FetchGoogleJSON)

**Klaim akar masalah (claimed_root_cause):**

> The preview boundary has no enforced refresh budget. GetPreview compares force to "true" (handler.go:107) and calls syncAndBuildResponse (handler.go:111) without consulting user.LMSLastSyncedAt, user.MoodleLastSyncedAt or user.GoogleLastSyncedAt, so the syncCooldown constant declared at handler.go:28 is referenced only by calculateNextRefreshAt when building the response field (handler.go:479). No per-user or per-project quota exists between any request-driven entry point (GET /v1/calendar/preview?force=true, POST /v1/calendar/test, POST /v1/auth/sync) and the provider fan-out, so requester work is one HTTP request while service work is a full multi-provider enumeration against a shared third-party Cloud project quota and a shared 25-connection database pool.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/shared/router/router.go:129` — *router.New / calendarGroup.GET("/preview")* — The preview route is mounted (group at router.go:127-131) with APIKeyOrJWT plus apiKeyRateLimit only. No cooldown, quota or per-user budget middleware is attached to the group.
propagation → `backend/internal/modules/calendar/handler.go:107` — *(*Handler).GetPreview* — forceRefresh is a plain query-string comparison. The handler never reads the user's last-synced timestamps, so the advertised refresh window is not a precondition for any path.
propagation → `backend/internal/modules/calendar/handler.go:111` — *(*Handler).GetPreview* — force=true calls syncAndBuildResponse synchronously inside the request, so the requester's single request carries the entire provider fan-out and persist transaction.
propagation → `backend/internal/modules/calendar/service.go:107` — *(*Service).SyncProviders* — Every enabled provider is re-fetched from scratch on every call. The cooldown value lives in the handler package and is never passed down or consulted here.
propagation → `backend/internal/modules/calendar/google/client.go:236` — *(*Client).FetchAssignmentsFromCoursesWithStats* — One FetchStudentSubmissions HTTP call is issued per coursework item that survives the deadline-window filters, each itself a pagination loop, so upstream cost is the product of active courses and kept coursework under one shared OAuth client.
propagation → `backend/internal/modules/calendar/google/client.go:316` — *(*Client).FetchGoogleCourses* — The courses pagination loop (and the analogous courseWork and studentSubmissions loops at client.go:346 and :378) has no page cap; the only guards are repeated-NextPageToken equality checks, so a stream of distinct tokens is unbounded apart from the request context and the 12s per-call client timeout.
propagation → `backend/internal/modules/calendar/sync/service.go:119` — *(*SyncService).persist* — The whole fetched set is upserted row by row (FirstOrCreate per unique course name at :129, First lookup per assignment at :139) inside a single transaction, so each refresh holds a pooled database connection and performs work proportional to the full upstream set even when nothing changed.
propagation → `backend/internal/modules/calendar/handler.go:479` — *(*Handler).calculateNextRefreshAt* — The only use of syncCooldown is to compute the response's nextRefreshAt (returned to every client at handler.go:414). The one-hour window is advertised to the client and never enforced, so the shared quota, connection pool and process memory consumed by repeated refreshes have no server-side ceiling.
propagation → `backend/internal/shared/router/router.go:172` — *registerAuthRoutes* — group.POST("/sync", middleware.AccessToken(parser), h.SyncAfterLogin) — authenticated but with no rate limiter, unlike the calendar group registered a few lines earlier with apiKeyRateLimit. The same mount exists in internal/modules/auth/routes.go:36, and no other registration of this route carries a limiter.
propagation → `backend/internal/modules/auth/handler.go:359` — *SyncAfterLogin* — The handler immediately calls syncUserLMS with the stored user and the resolved provider list; no timestamp, cooldown or budget check precedes the call.
propagation → `backend/internal/modules/auth/handler.go:392` — *syncUserLMS* — FetchProviderAssignments is invoked for every enabled provider on every request, so each request re-does the full upstream fetch and the full persist.
propagation → `backend/internal/modules/calendar/google/client.go:189` — *FetchAssignmentsFromCoursesWithStats* — A goroutine per course (bounded to 5 concurrent via the semaphore at :183-184) each paginating courseWork, and inside the same goroutine an extra studentSubmissions request per coursework row at line 236.
sink → `backend/internal/modules/calendar/google/client.go:416` — *FetchGoogleJSON* — Each upstream call uses a fresh 12s-timeout client under the caller's user-scoped OAuth token, and every token refresh draws on the single GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET pair, so all students' Classroom traffic is billed to one Cloud project quota.

**Bukti terverifikasi:**

- `backend/internal/modules/calendar/handler.go:28` — syncCooldown = time.Hour is declared here and referenced nowhere else except handler.go:479; a repo-wide search for the identifier returns only those two lines.
- `backend/internal/modules/calendar/handler.go:479` — next := user.LMSLastSyncedAt.Add(syncCooldown) is used solely to build the nextRefreshAt response field returned at handler.go:414.
- `backend/internal/modules/calendar/handler.go:413` — The preview response always carries lastSyncedAt and nextRefreshAt, so the unenforced one-hour window is presented to every client (also surfaced in mobile-kmp CalendarDto.kt:34-35).
- `backend/internal/modules/calendar/service.go:185` — Per-provider and global last-synced timestamps are written after a successful sync (service.go:184-191; also handler.go:184-196 and auth/handler.go:431-441) but are never read back as a gate on any request-driven path. The only reads as a gate are the 24-hour staleness predicates in the background cron query (lmssync/service.go:43-47), which does not bound the request-driven preview, test, or auth/sync paths.
- `backend/internal/modules/calendar/google/client.go:236` — FetchStudentSubmissions is called inside the per-coursework loop, making the per-request upstream cost multiplicative in active courses and kept coursework.
- `backend/internal/modules/calendar/google/client.go:462` — Endpoint: google.Endpoint with the single shared cfg.GoogleClientID and cfg.GoogleClientSecret (client.go:458-462), so all students draw on one Cloud project quota.
- `backend/internal/shared/middleware/rate_limit.go:107` — The limiter bucket is c.ClientIP() or the first 12 characters of the API key, with no per-user dimension; backend/ contains no SetTrustedProxies call, so Gin v1.12.0's default trust of 0.0.0.0/0 and ::/0 with X-Forwarded-For/X-Real-IP honored decides how much influence a caller has over that value (trusted-proxy default is owned by a peer coverage unit).
- `backend/internal/config/config.go:132` — The default API-key rate limit is 60 per minute with burst 20 (rate_limit.go:87-94 applies the same fallbacks when unset), which is the only request-level ceiling in front of the fan-out.
- `backend/internal/modules/calendar/moodle/client.go:79` — io.ReadAll(resp.Body) buffers the whole ICS body with no size limit (only the error path at :75 is capped at 1024 bytes), so the memory cost of the Moodle leg is set by the fetched document rather than by any server-side cap.
- `backend/internal/shared/router/router.go:128` — The calendar group applies APIKeyOrJWT plus apiKeyRateLimit for the same fetch work, showing the intended control that the /auth/sync route at router.go:172 omits.
- `backend/internal/modules/auth/routes.go:36` — The alternative registration path also mounts /sync with AccessToken only (protected group at :31-34), so no mount of the route carries a limiter.
- `backend/internal/modules/calendar/google/client.go:192` — Context cancellation is observed while acquiring the semaphore and inside each HTTP call, so the fan-out stops issuing new calls once the deadline passes, but the number of calls already issued within the window is not budgeted and wg.Wait() at :282 still blocks until every goroutine returns.
- `backend/internal/shared/middleware/timeout.go:18` — The global request deadline (default 15s, config.go:92) bounds each request to a wall-clock window but places no limit on how many requests a single principal may issue, and only writes a 504 when nothing has been written.
- `backend/internal/database/postgres.go:33` — SetMaxOpenConns(25): the persist transaction of each refresh holds one connection from a pool shared by every student, so concurrent forced refreshes contend with all other database work.
- `backend/internal/modules/calendar/handler.go:155` — TestPreview calls the same syncAndBuildResponse with no force parameter and no cooldown check, so the fan-out is reachable from POST /v1/calendar/test on every request as well.

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent; WSL2 has no distribution installed), so no target code was executed and no bounded local measurement of the per-request upstream call count was produced.
1. A live Postgres is required to reach the handler (database.New returns an error on an empty DATABASE_URL at postgres.go:15 and main.go:26-28 log.Fatalf's, with no SQLite path or DI seam), so the endpoint cannot be exercised at all on this host.
1. The Google Cloud project quota attached to the shared GOOGLE_CLIENT_ID — queries per minute and per day, and whether Google throttles Classroom per project, per user, or both, and whether exhausting it returns 429 to every student rather than only to the offender — is a deployed-resource fact outside the repository and decisive for the shared-impact claim.
1. Whether any ingress, CDN, WAF or platform gateway in front of the api service applies its own per-identity request limit is outside the repository; docker-compose.yml publishes the API port directly (line 51-52) with no proxy service defined.
1. The real X-Forwarded-For handling of the deployment is unknown, so the effective key of the per-IP bucket for JWT callers cannot be determined from source; backend/ contains no SetTrustedProxies call and that Gin default is owned by a peer coverage unit.
1. Whether the api service actually runs at N replicas (documented as supported in docker-compose.yml line 59-60 and architecture notes, which would multiply the in-process token-bucket ceiling) is a deployment choice not pinned by the repository.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

Inside the approved OS-enforced sandbox (none exists on this host, so this remains the exact plan for when one does): build a handler harness with the GORM handle replaced by a recording fake and every upstream client pointed at a loopback httptest fixture — the Classroom fixture returns 3 ACTIVE courses and 20 published coursework each with valid future deadlines, and the Moodle fixture returns a small ICS. Call Handler.GetPreview twice with force=true for one dummy user and assert the fixture recorded 2 x (1 courses page + 3 coursework pages + 60 submissions calls) upstream requests, that the second call issued a full re-enumeration although the first call already wrote users.lms_last_synced_at, and that no code path compares the query value against that timestamp. Then call TestPreview once and SyncAfterLogin once with the same fixture and assert they each issue the same full enumeration with no limiter applied to the latter. Stop at the request count; do not raise concurrency or volume, and do not contact any real Google or Moodle endpoint.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner-observed check, non-destructive: read the Cloud console quota page for the project behind GOOGLE_CLIENT_ID and record the Classroom API queries-per-minute and per-day limits and whether throttling is per project or per user. Then have one test student issue a short burst (a few dozen, not a sustained load) of force=true previews and confirm whether a second test student's preview starts returning Google 429/403 errors echoed in calendarSourceInfo.Error, and inspect ingress/API logs for per-user request counts on /v1/calendar/preview, /v1/calendar/test and /v1/auth/sync to determine whether any layer other than the in-process token bucket (which does not apply to /v1/auth/sync at all) limits them.


---

## 18. A successful but empty LMS fetch marks every pending assignment of that provider as completed or missed, because the stale-marking scope restriction is omitted when the fetched key set is empty

- **Fingerprint:** `ressist:calendar/sync:empty-fetch-unscoped-stale-marking`
- **Boundary terdampak:** `backend/internal/modules/calendar/handler.go:155` ((*Handler).TestPreview) — efek akhir di `backend/internal/modules/calendar/sync/service.go:383` ((*SyncService).markStaleAsCompleted)

**Klaim akar masalah (claimed_root_cause):**

> The persist layer treats the provider's returned record set as a complete enumeration of that provider's live state, while the fetch layer returns a windowed and filtered subset that can be empty with a nil error. The stale-marking UPDATEs are scoped only by user_id and source plus the pending predicate, and the sync_key NOT IN ? restriction that would confine the update to the observed universe is added conditionally on len(keys) > 0, so an empty fetch inverts the operation from 'mark the records that vanished' into 'mark everything'.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/calendar/handler.go:155` — *(*Handler).TestPreview* — POST /v1/calendar/test, mounted at router.go:131 under APIKeyOrJWT + ApiKeyRateLimit, resolves providers and calls syncAndBuildResponse with no cooldown comparison and no cache check, so a request presented as a source test reaches the persisting sync. The same persisting path is reachable from POST /v1/auth/sync (router.go:172, auth/handler.go:415), GET /v1/calendar/preview?force=true, and the daily lmssync cron batch (lmssync/service.go:92).
propagation → `backend/internal/modules/calendar/service.go:135` — *(*Service).SyncProviders* — A fetch that did not report a partial failure is persisted with PersistAssignments, i.e. skipStale=false, enabling stale-marking for that provider; only *PartialFetchError takes the PersistAssignmentsWithoutStale branch at line 133.
propagation → `backend/internal/modules/calendar/google/client.go:158` — *(*Client).FetchGoogleClassroomAssignmentsWithStats* — Zero ACTIVE courses (FetchGoogleCourses queries courseStates=ACTIVE only, line 317) returns an empty AssignmentRecord slice with a nil error, so the caller sees a full success rather than a partial or failed fetch.
propagation → `backend/internal/modules/calendar/google/client.go:230` — *(*Client).FetchAssignmentsFromCoursesWithStats* — Coursework at or beyond the 60-day cutoff is dropped as skippedFarFuture, coursework with a past deadline as skippedPast, and coursework without a due date as skippedNoDeadline, so a fetch with zero failed courses can legitimately keep zero records and still return (empty, nil) at line 308.
propagation → `backend/internal/modules/calendar/moodle/client.go:100` — *(*Client).ParseMoodleEvents* — The Moodle leg applies the same now..+60d window (IsValidDeadline, lines 95 and 133-135) plus the class-code filter (ShouldIncludeForUserClass), so changing user.ClassCode or a calendar holding only far-future or past events empties the parsed set while the fetch still succeeds with a nil error.
propagation → `backend/internal/modules/calendar/sync/service.go:115` — *(*SyncService).persist* — keys is derived only from the fetched records, so an empty fetch yields len(keys)==0 and the upsert loop at line 120 performs no iterations at all before the stale-marking call.
propagation → `backend/internal/modules/calendar/sync/service.go:172` — *(*SyncService).persist* — With skipStale false the transaction tail calls markStaleAsMissed for provider 'moodle' (line 170) or markStaleAsCompleted otherwise, passing the possibly empty key slice; the only suppression is the skipStale early return at lines 165-167, which an empty successful fetch does not trigger.
sink → `backend/internal/modules/calendar/sync/service.go:383` — *(*SyncService).markStaleAsCompleted* — The sync_key NOT IN ? restriction is added only when len(keys) > 0, so with an empty fetch the UPDATE covers every pending row for that user and source and sets completed=true, completed_at=now, status=completed, status_updated_at=now; markStaleAsMissed at line 405 has the identical guard and sets status=missed. Verified from GORM v1.31.2 source that a WHERE clause is present (user_id, source, status/completed predicates), so ErrMissingWhereClause is not raised and the UPDATE executes against all matching rows; models.Event defines no BeforeSave/BeforeUpdate hooks and no database triggers or status constraints exist in the repository.

**Bukti terverifikasi:**

- `backend/internal/modules/calendar/sync/service.go:383` — if len(keys) > 0 { query = query.Where("sync_key NOT IN ?", keys) } — the observation scope is applied conditionally, and omitting it widens the update to the whole provider.
- `backend/internal/modules/calendar/sync/service.go:405` — The Moodle counterpart repeats the same conditional guard, so both the completed and the missed transition share the defect.
- `backend/internal/modules/calendar/sync/service.go:381` — The remaining scope is only user_id = ? AND source = ? plus the pending/completed predicate; nothing ties the update to the courses or the time window the fetch actually covered.
- `backend/internal/modules/calendar/google/client.go:158` — if len(courses) == 0 { return []AssignmentRecord{}, &CourseFetchStats{}, nil } — an empty enumeration is reported as success, taking the stale-marking branch.
- `backend/internal/modules/calendar/google/client.go:230` — if !deadline.Before(cutoff) { skippedFar++; continue } — the 60-day window silently narrows the returned set below what is stored.
- `backend/internal/modules/calendar/service.go:133` — The partial path routes to PersistAssignmentsWithoutStale, showing the incomplete-enumeration invariant is already recognised for partial failures but not for empty successes.
- `backend/internal/modules/calendar/sync/service.go:165` — if skipStale { return nil } — the only suppression of stale-marking is the partial-fetch flag, which an empty successful fetch does not set.
- `backend/internal/modules/calendar/handler.go:494` — The preview query selects only status='pending' (or empty status with completed false) within the 60-day window, so rows flipped to completed or missed vanish from the calendar the user sees.
- `backend/internal/modules/botservice/handler.go:176` — The reminder candidate query also filters to status pending and completed=false, so the same flip removes the task from Telegram reminder delivery.
- `backend/internal/modules/assignment/handler.go:73` — completed=true with status='completed' is the user-visible terminal state written by the same columns, so the flip is indistinguishable from a real completion on the product surface (and Classroom rows are even made read-only to the user on that basis, lines 60-64).
- `backend/internal/models/event.go:24` — Status is documented as pending | completed | missed with a default of pending, confirming these three states are the intended lifecycle and that a bulk pending-to-completed transition is a lifecycle change.
- `backend/internal/modules/calendar/sync/service.go:269` — Verifier-added bound on persistence: updateAssignment resurrects Moodle missed rows to pending and resets Classroom completed rows to pending, so the corruption is repaired by a later non-empty successful fetch — but only once the divergence cause (archived courses, changed class code, emptied calendar) is gone.

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant, qemu absent; WSL2 has no distribution) and the binary cannot boot without a live Postgres (database.New fatals on an empty DATABASE_URL), so the UPDATE was not executed and no bounded local observation of the row transition was produced.
1. Whether a real Google Classroom account or a real Moodle ICS export yields a zero-record successful fetch in production (all courses ARCHIVED at semester end, all coursework beyond the 60-day window or without a due date, every event excluded by the user's class_code, or an empty 200 ICS response) is a data-state fact requiring a live database plus a controlled fixture account.
1. Source establishes that the GORM UPDATE executes with the user_id/source/pending WHERE clauses present (no ErrMissingWhereClause, no model hooks, no triggers, no status constraints), but the exact generated SQL text and the observed row effect against the real Postgres 16 schema remain unobserved.
1. Whether the 60-day fetch window is an intended product boundary that the persist layer is permitted to treat as a complete enumeration is a design statement that does not appear anywhere in the repository.
1. The blast radius on reminder delivery depends on the deployed bot scheduler cadence and on whether events.reminders_sent interacts with the resurrection paths, which cannot be observed from this unit.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

Inside the approved sandbox, start a throwaway local Postgres fixture, AutoMigrate the models, and insert two dummy users each with one pending google_classroom event and one pending moodle event. Mock every upstream client. Call SyncService.PersistAssignments(ctx, dummyA, "google_classroom", nil, "{}") and assert dummyA's pending Classroom row becomes completed=true with completed_at set while dummyA's Moodle row and all of dummyB's rows are untouched; repeat for moodle to observe the bulk missed transition. Then call it with one record whose sync_key does not match any stored row to show the same widening when keys is non-empty but disjoint, and with one matching record to show only the non-matching row changes — demonstrating the conditional guard is the sole difference. Finally perform a follow-up non-empty fetch containing the previously flipped task and record whether the resurrection paths (sync/service.go:269-281, :292-312) repair the row. Stop at the row state of the dummy users.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner-observed check: at a semester boundary or after archiving all Classroom courses, compare one student's events.status against the actual Classroom submission state and the Moodle calendar for tasks whose deadline is more than 60 days out, and confirm from application logs ([google] fetch ok / [calendar] logs) whether a sync reported success while returning zero kept records for that user; also verify whether pending tasks flipped to completed or missed with no change at the LMS and whether the affected users stopped receiving Telegram reminders for those tasks.


---

## 19. Global middleware chain emits no cache directive or credential cache-key discriminator for X-API-Key authenticated GET responses

- **Fingerprint:** `router-auth/missing-cache-directive/api-key-get-responses`
- **Boundary terdampak:** `backend/internal/shared/router/router.go:118` (router.New) — efek akhir di `backend/internal/modules/user/handler.go:55` (GetCurrentUser)

**Klaim akar masalah (claimed_root_cause):**

> backend/internal/shared/router/router.go:40-63 composes the global middleware chain without any response-header or cache-policy middleware, and backend/internal/shared/middleware/auth.go:68-75 accepts the account credential from the X-API-Key header (or an ApiKey-prefixed Authorization value), so responses whose identity depends on that header carry neither Cache-Control nor Vary on the credential — the only Vary emitted is 'Vary: Origin' from gin-contrib/cors v1.7.8 (utils.go:24), which does not discriminate principals — leaving a shared cache in front of the API free under RFC 9111 to store and replay them across principals.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/shared/router/router.go:118` — *router.New* — GET /v1/user is registered with middleware.APIKeyOrJWT(tokenParser, apiKeyValidator), so the response identity can be determined solely by the credential in the X-API-Key header; the same guard is applied group-wide to /v1/calendar (line 128, including /raw) and /v1/courses (line 135), and per-route to GET /v1/assignments (line 159).
propagation → `backend/internal/shared/middleware/auth.go:68` — *APIKeyOrJWT* — rawApiKey is read from the X-API-Key header (or an ApiKey/apikey-prefixed Authorization value, lines 71-75) and validated, producing per-user claims; this is a credential that no HTTP cache-key rule excludes by default.
propagation → `backend/internal/shared/router/router.go:63` — *router.New* — The chain terminates at r.Use(middleware.Maintenance()) without ever installing a response-header middleware; no element of the chain (request_id.go, timeout.go, logging.go, gin.Recovery, metrics.go, cors, maintenance.go) sets Cache-Control, Pragma, Expires or a credential Vary, and no handler on the affected routes does either (verified by repo-wide header-set grep: only X-Request-ID, X-Refresh-Rotated, X-Event-Count and Set-Cookie are ever set).
sink → `backend/internal/modules/user/handler.go:55` — *GetCurrentUser* — c.JSON(http.StatusOK, h.buildUserResponse(user)) writes the per-user body (MoodleCalendarURL, TelegramChatID, WhatsAppNumber at lines 364-369) with no cache directive and no Vary on the credential; the only Vary that can appear is 'Vary: Origin' from the CORS library, and only when the caller sent an Origin header.

**Bukti terverifikasi:**

- `backend/internal/shared/router/router.go:40` — Lines 40-63 register RequestID, TimeoutContext, JSONAccessLogger, gin.Recovery, HTTPMetrics, cors.New and Maintenance; none sets Cache-Control, Pragma or Expires, and a repository-wide search of backend/ Go source returns zero matches for those tokens.
- `backend/internal/shared/middleware/auth.go:68` — The API-key credential is taken from the X-API-Key header, a header RFC 9111 does not treat as an automatic shared-cache exclusion the way it treats Authorization.
- `backend/internal/shared/router/router.go:128` — calendarGroup.Use(middleware.APIKeyOrJWT(tokenParser, apiKeyValidator), apiKeyRateLimit) applies the same header credential to every /v1/calendar route, including /raw which returns the fetched Moodle ICS body via c.Data (calendar/handler.go:89, with the X-Event-Count header set at line 88).
- `backend/internal/modules/user/handler.go:369` — buildUserResponse includes MoodleCalendarURL, TelegramChatID (line 366) and WhatsAppNumber (line 364), so a replayed body discloses the per-user Moodle ICS URL that architecture.md section 1 treats as a protected secret.
- `backend/internal/config/config.go:132` — ApiKeyRateLimitPerMinute defaults to 60, which bounds request rate per key but has no bearing on whether a cache may store and replay the response body. [Pinned dependency source: frontend/server/lib/backend-auth.ts:207 — The frontend BFF attaches 'Authorization: Bearer' to every proxied backend call, so the website path is shielded by RFC 9111's Authorization rule; the exposed surface is direct programmatic X-API-Key access to the API origin.] [Pinned dependency source: README.md:14 — The README documents the backend as deployed on a homeserver/Coolify at https://ressist-api.jsx.qzz.io, while the repository itself contains no nginx, CDN, or proxy-cache configuration; the actual ingress in front of the API and its cacheability policy are therefore owner-observed facts.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent; WSL2 has no distribution installed), so no request was issued against a running instance through a caching proxy and no cache behaviour was observed; every check is method=source with artifact=null and no confirmed verdict can be proposed.
1. Whether any shared cache (CDN, edge proxy, service worker, or the Hono BFF) sits in front of the published ${API_PORT:-8080}:8080 mapping is not source-visible: the repository contains no proxy, CDN, or cache configuration for the api service, and the documented deployment (Coolify at https://ressist-api.jsx.qzz.io) supplies its own ingress whose configuration lives outside the repository, so the existence of the caching layer this candidate depends on is unverified.
1. The cacheability policy of any such layer — including whether it stores GET responses with no Cache-Control (heuristic caching) and whether it excludes or keys on non-Authorization credential headers such as X-API-Key — is an owner-observed deployment fact that cannot be established from source; the frontend BFF path is not exposed (it uses Authorization: Bearer) and no service worker exists in the frontend source.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

Inside the parent-approved OS-enforced sandbox, build a fixture that mounts the exact middleware chain from router.go:40-63 (with the repo's cors.Config) on a dummy route requiring the X-API-Key header via middleware.APIKeyOrJWT and returning a fixed per-key body, then place a caching reverse proxy with default cacheability rules (e.g. nginx with proxy_cache and no Cache-Control handling override, and a second pass with a heuristic-caching CDN emulator) in front of it on isolated loopback. Issue key-A then key-B requests for the same URL without an Origin header and record whether the second response is served from cache (compare Age/X-Cache headers and body). Blocked on this host: no sandbox runtime is available, so this step cannot be executed here.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

From an owner-observed position, request GET /v1/user twice with two different disposable API keys (no Origin header) and compare the returned bodies plus Cache-Control, Vary and Age response headers; then confirm with the ingress owner of the Coolify/Traefik front end at ressist-api.jsx.qzz.io (and any CDN in front of it) whether GET responses without Cache-Control are stored, what the cache key includes, and whether X-API-Key or Authorization participates in it.


---

## 20. Gin trusted-proxy default lets any direct caller choose the rate-limit bucket key and audit client IP via X-Forwarded-For

- **Fingerprint:** `router-auth/trusted-proxy-default/client-ip-rate-limit-bucket`
- **Boundary terdampak:** `backend/internal/shared/router/router.go:39` (router.New) — efek akhir di `backend/internal/shared/middleware/rate_limit.go:61` (ipRateLimiter.allow)

**Klaim akar masalah (claimed_root_cause):**

> backend/internal/shared/router/router.go:39 constructs the Gin engine with gin.New() and never calls SetTrustedProxies (no such call exists anywhere in the repository), so the pinned gin v1.12.0 defaults remain: trustedProxies [0.0.0.0/0, ::/0], ForwardedByClientIP true, RemoteIPHeaders [X-Forwarded-For, X-Real-IP], TrustedPlatform empty (appengine build tag not set). Every peer is therefore treated as a trusted proxy, Context.ClientIP() returns the leftmost caller-supplied X-Forwarded-For entry, and every downstream consumer of c.ClientIP() — rate_limit.go:75 (auth bucket), rate_limit.go:107 (API-key bucket fallback), logging.go:43 (access log), auth/handler.go:169/217/497 (refresh_tokens.ip_address) — inherits a caller-controlled client identity.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/shared/router/router.go:39` — *router.New* — r := gin.New() creates the engine with the framework defaults (gin@v1.12.0/gin.go:214-226: ForwardedByClientIP=true, RemoteIPHeaders=[X-Forwarded-For, X-Real-IP], trustedProxies=[0.0.0.0/0, ::/0]); this is the only gin engine construction in the backend and no SetTrustedProxies/TrustedPlatform/RemoteIPHeaders call exists anywhere in the repository, so any direct TCP peer is a 'trusted proxy' and ClientIP() honours a forged X-Forwarded-For.
propagation → `backend/internal/shared/router/router.go:92` — *router.New* — authRateLimit := middleware.AuthRateLimit(cfg.AuthRateLimitPerMinute, cfg.AuthRateLimitBurst) is built once (per-process, in-memory) and attached to every auth entry point on both the /auth (line 97) and /v1/auth (line 104) mounts, so one spoofable bucket scheme covers all ten registrations; the global middleware chain (lines 40-63) contains no other limiter.
propagation → `backend/internal/shared/middleware/rate_limit.go:75` — *AuthRateLimit* — limiter.allow(c.ClientIP()) uses the header-derived address as the map key; allow() creates a new rate.NewLimiter(limit, burst) with a full token bucket for any unseen key, so each new spoofed X-Forwarded-For value yields a fresh full-burst bucket.
propagation → `backend/internal/shared/middleware/rate_limit.go:107` — *ApiKeyRateLimit* — bucket := c.ClientIP() is the fallback bucket key when no X-API-Key header or ApiKey authorization is present, so the same spoofed value escapes the API-key limiter applied to GET /v1/user, /v1/calendar, /v1/courses and GET /v1/assignments (router.go:118, 128, 135, 159) for any JWT caller.
propagation → `backend/internal/shared/router/router.go:166` — *router.registerAuthRoutes* — google/login, google/callback, google/native, refresh and logout (lines 166-170) are registered with authRateLimit as their only pre-authentication control, at both /auth/* and /v1/auth/*; these are reachable by anonymous callers and no per-account limiter, lockout or cooldown exists in internal/modules/auth.
propagation → `backend/internal/shared/middleware/rate_limit.go:51` — *ipRateLimiter.allow* — An unseen key creates a new visitor with rate.NewLimiter(l.limit, l.limiter-burst) (lines 51-58); golang.org/x/time/rate NewLimiter initialises tokens to the full burst, so the first request from any new key value is always allowed.
sink → `backend/internal/shared/middleware/rate_limit.go:61` — *ipRateLimiter.allow* — return v.limiter.Allow() is evaluated against the freshly created full bucket, so a rotated forwarded value yields an unlimited number of accepted pre-authentication attempts instead of a 429; the same spoofed string is also written to the access log (logging.go:43) and persisted as refresh_tokens.ip_address (auth/handler.go:169, 217, 497).

**Bukti terverifikasi:**

- `backend/internal/shared/router/router.go:39` — gin.New() is the only engine constructor used in the backend (repo-wide grep for gin.New(/gin.Default( returns exactly this line); the surrounding middleware registrations (lines 40-63) never configure trusted proxies, and a repository-wide search for SetTrustedProxies, TrustedPlatform, RemoteIPHeaders, ForwardedByClientIP and SetTrustedPlatform returns zero matches across backend/, frontend/, bot/, ops/ and mobile-kmp/.
- `backend/internal/shared/middleware/rate_limit.go:37` — ipRateLimiter.allow() keys the visitors map by the raw string it receives and lazily creates a fresh limiter (lines 51-58) for each unseen key, so bucket identity is entirely caller-controlled whenever the key derives from a header; state is in-process memory with a 15-minute TTL (line 72).
- `backend/internal/shared/middleware/rate_limit.go:75` — The auth limiter passes c.ClientIP() as the key, which under the engine default resolves to the leftmost X-Forwarded-For entry rather than the socket peer; golang.org/x/time/rate@v0.15.0 NewLimiter (rate.go:100-106) initialises tokens to the full burst, so the first Allow() on any new key is true.
- `backend/internal/shared/middleware/rate_limit.go:107` — ApiKeyRateLimit uses the same c.ClientIP() value whenever no API key credential is present, so a JWT-authenticated caller (or an anonymous one reaching a bot-or-JWT-or-key route such as GET /v1/assignments) has the identical escape on the API-key limiter routes.
- `backend/internal/shared/middleware/logging.go:43` — ClientIP: c.ClientIP() writes the same spoofable value into the JSON access log (struct field client_ip, line 19), so the recorded source address of every request is attacker-chosen.
- `backend/internal/modules/auth/handler.go:217` — c.ClientIP() is the ipAddress argument of RotateRefreshTokenEx, persisted into models.RefreshToken.IPAddress (service.go:465-473); the same value is also persisted at handler.go:169 (GoogleNative, CreateRefreshTokenForClient) and handler.go:497 (web login, createAndSetRefreshToken), so refresh-token records store the spoofed address.
- `backend/internal/config/config.go:95` — AUTH_RATE_LIMIT_PER_MINUTE defaults to 30 (line 95) with burst 10 (line 96); there is no per-account or per-project limiter behind it anywhere in internal/modules/auth (no lockout/attempt/throttle/cooldown logic), so the per-IP bucket is the only brake on the auth entry points.
- `backend/internal/shared/router/router.go:92` — A single AuthRateLimit handler is built once and shared by the legacy /auth group (line 97) and the /v1/auth group (line 104), so the bypass defeats both prefixes with one technique; the global chain at lines 40-63 contains no rate limiting.
- `backend/internal/shared/router/router.go:159` — GET /v1/assignments is guarded by BotOrAPIKeyOrJWT plus apiKeyRateLimit, showing the shared ClientIP-keyed selector is not limited to the auth entry points; the same limiter is attached to /v1/user GET (line 118), /v1/calendar (line 128) and /v1/courses (line 135). [Pinned dependency source: C:/Users/Jeremi/go/pkg/mod/github.com/gin-gonic/gin@v1.12.0/gin.go:225 — Pinned gin v1.12.0 New() sets trustedProxies: []string{"0.0.0.0/0", "::/0"} and trustedCIDRs: defaultTrustedCIDRs (line 226, the 0.0.0.0/0 and ::/0 nets at lines 39-47), alongside ForwardedByClientIP: true (line 214) and RemoteIPHeaders: [X-Forwarded-For, X-Real-IP] (line 215), so isTrustedProxy(ip) (lines 469-479) returns true for every possible peer.] [Pinned dependency source: C:/Users/Jeremi/go/pkg/mod/github.com/gin-gonic/gin@v1.12.0/context.go:975 — Context.ClientIP(): TrustedPlatform is empty (defaultPlatform is only set under the `appengine` build tag in context_appengine.go, which the Dockerfile build does not use), so the flow reaches the trusted-proxy branch; since the direct peer is inside 0.0.0.0/0, validateHeader is called on the caller-supplied X-Forwarded-For.] [Pinned dependency source: C:/Users/Jeremi/go/pkg/mod/github.com/gin-gonic/gin@v1.12.0/gin.go:481 — validateHeader walks the X-Forwarded-For list from right to left, skips entries that are trusted proxies (all IPs are, under the default), and returns the entry at i==0 — the leftmost value, which a direct caller fully controls; a forged 'X-Forwarded-For: 203.0.113.7' therefore becomes ClientIP() unchanged.] [Pinned dependency source: docker-compose.yml:52 — The api service publishes ${API_PORT:-8080}:8080 directly; the service comment (line 60) only suggests a load balancer when scaling to N replicas, and README.md line 14 documents a homeserver/Coolify deployment at https://ressist-api.jsx.qzz.io, but no reverse-proxy configuration exists anywhere in the repository (ops/ contains only a backup script), so the deployed ingress's X-Forwarded-For handling is not source-visible.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on the audit host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent; the installed WSL2 has no distribution), so the target binary was never started and no request was ever issued; every check here is method=source with artifact=null, and a confirmed verdict cannot be proposed.
1. The decisive runtime observation — that rotating X-Forwarded-For yields 200 instead of 429 on a rate-limited auth route — cannot be produced locally: besides the missing sandbox, the target binary cannot boot without a live Postgres (database.New returns an error on an empty DATABASE_URL, postgres.go:13-16, and main.go log.Fatalf's on it), so even a fixture needs a dummy database.
1. Whether the deployed ingress in front of the published ${API_PORT:-8080}:8080 mapping (README documents Coolify/homeserver behind https://ressist-api.jsx.qzz.io) appends to, overwrites or strips a client-supplied X-Forwarded-For is not source-visible — no proxy configuration exists in the repository. A proxy that appends does NOT neutralise the bypass (gin's validateHeader returns the leftmost entry and skips trusted right-hand entries), but a proxy that overwrites or strips the header would reduce this to direct-port reachability.
1. Whether the api port is directly reachable past any deployed firewall/host network policy is an owner-observed deployment fact not in the repository.
1. The number of api replicas in the deployed environment is unknown (compose documents --scale api=N as supported); limiter state is per process, so the effective allowance and the magnitude of the bypass depend on it.
1. Whether any upstream gateway or WAF independently rate limits the auth paths is an owner-observed deployment fact not in the repository.
1. Verifying the exact runtime 200-versus-429 transition requires the sandbox fixture described below, which cannot be executed on this host.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

Inside the parent-approved OS-enforced sandbox (with network disabled, read-only target and tools, scratch-only writes, explicit low CPU/memory and wall-clock limits), build a throwaway Go fixture that does NOT touch the target's database: construct an engine with gin.New() and no SetTrustedProxies, mount middleware.AuthRateLimit(30, 10) on a dummy handler returning 200, and drive it over isolated loopback with httptest or a loopback listener. Phase 1 (control): send burst+1 = 11 requests with no X-Forwarded-For header and assert exactly the last one returns 429. Phase 2 (bypass): send 11 requests, each with a distinct valid X-Forwarded-For value (e.g. 203.0.113.1 .. 203.0.113.11), and assert all 11 return 200. Phase 3 (contrast): repeat phase 2 after SetTrustedProxies([]string{"127.0.0.1"}) and assert the forged header is ignored (all requests share the 127.0.0.1 bucket and the sequence matches phase 1). Optionally mount middleware.JSONAccessLogger and assert the logged client_ip equals the forged value in phase 2. Blocked on this host: no sandbox runtime is available and the fixture cannot be built or executed here.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

From an owner-observed position with a disposable account and permission from the deployment owner: (1) determine at the ingress whether X-Forwarded-For is stripped, overwritten or appended before the request reaches the api container's port 8080 (inspect the Coolify/Traefik or other proxy configuration, and confirm whether ${API_PORT:-8080} is additionally reachable directly); (2) send 11 POST requests to /v1/auth/refresh with a fixed dummy JSON body, each carrying a distinct X-Forwarded-For value, and compare the 429 count against the same 11 requests with the header removed; (3) inspect one access-log line and one refresh_tokens.ip_address row (from a successful login with a known forged header, if the ingress forwards it) to confirm which address was recorded; (4) record the deployed api replica count, since limiter state is per process. All probes use a disposable account and a dummy refresh token that hashes to no database row, so no real session is affected.


---

## 21. Moodle calendar URL predicate inspects only path and query substrings, so any authenticated student can make the API fetch an arbitrary internal HTTP origin and read the response body back

- **Fingerprint:** `ssrf/moodle-fetchmoodlecalendar/urlutil-predicate-host-and-scheme-blind`
- **Boundary terdampak:** `backend/internal/shared/router/router.go:119` (PUT /v1/user route) — efek akhir di `backend/internal/modules/calendar/handler.go:89` (Handler.GetRaw)

**Klaim akar masalah (claimed_root_cause):**

> IsLikelyMoodleCalendarURL is a path-substring matcher used as if it were an origin allow-list: it never examines scheme, host, port, userinfo, or resolved address; its authtoken+userid query branch accepts any host; its only live call site (user/handler.go:256) can be skipped by the moodle_enabled field in the same request; and FetchMoodleCalendar has no redirect policy, no private-range rejection, and no egress allow-list while returning the response body to the requester at calendar/handler.go:89.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/shared/router/router.go:119` — *PUT /v1/user route* — Any holder of an HS256 access token reaches Handler.UpdateCurrentUser; the only guard is middleware.AccessToken, with no role, tenant, or admin check, and accounts are self-service through Google OAuth restricted to @student.itera.ac.id, so the attacker cost is one ordinary student account.
propagation → `backend/internal/modules/user/handler.go:254` — *Handler.validateUpdateRequest* — The URL predicate is applied only when req.MoodleEnabled is nil or not false, so a body carrying moodle_calendar_url together with moodle_enabled=false reaches the store with no predicate evaluation at all.
propagation → `backend/internal/modules/user/handler.go:256` — *Handler.validateUpdateRequest* — When the predicate does run it is the only guard on the value: urlutil.IsLikelyMoodleCalendarURL is the sole call, so any string satisfying its path or query substrings passes with an arbitrary scheme, host, port, and userinfo.
propagation → `backend/internal/pkg/urlutil/urlutil.go:26` — *IsLikelyMoodleCalendarURL* — The predicate lowercases parsed.Path and matches .ics, /calendar/export, or export_execute.php; parsed.Scheme, parsed.Host, parsed.Port, parsed.User and any resolved address are never read, so http://127.0.0.1:5432/calendar/export and http://api:8080/calendar/export both return true.
propagation → `backend/internal/pkg/urlutil/urlutil.go:29` — *IsLikelyMoodleCalendarURL* — The query fallback accepts any URL whose query has both authtoken and userid, which admits arbitrary hosts such as http://169.254.169.254/latest/meta-data/?authtoken=a&userid=1 without needing any path substring.
propagation → `backend/internal/modules/user/handler.go:316` — *Handler.buildUpdateData* — The trimmed string is written to users.moodle_calendar_url for the caller's own row whenever the field is present; the write does not depend on the moodle_enabled flag and does not require that the predicate ran.
propagation → `backend/internal/shared/router/router.go:130` — *GET /v1/calendar/raw route* — The read side is registered on a group guarded by APIKeyOrJWT plus a per-IP or per-key token bucket, so the same student JWT or any long-lived rsk_ API key can drive a fetch of the stored value.
propagation → `backend/internal/modules/calendar/handler.go:77` — *Handler.GetRaw* — The stored URL is re-read and checked only for non-emptiness; it is not re-validated and user.MoodleEnabled is not consulted, so the moodle_enabled=false variant still reaches the fetch.
propagation → `backend/internal/modules/calendar/moodle/client.go:67` — *Client.FetchMoodleCalendar* — The client is a bare http.Client with only a 12s timeout: Go's default CheckRedirect follows up to 10 hops to any host, and there is no dial-time private, loopback, or link-local rejection and no egress allow-list anywhere in the module.
propagation → `backend/internal/modules/calendar/moodle/client.go:68` — *Client.FetchMoodleCalendar* — client.Do issues GET to the fully attacker-chosen scheme, host, port, and path; a 2xx body is read unbounded at line 79 and returned as a string, while a non-2xx body is truncated to 1024 bytes and embedded in the returned error at line 76.
sink → `backend/internal/modules/calendar/handler.go:89` — *Handler.GetRaw* — c.Data returns the fetched bytes to the caller with status 200 and text/calendar, converting the blind fetch into a read primitive; the same handler echoes err.Error() in details at line 83, which yields connection-refused versus timeout versus malformed-response distinctions for port-state enumeration.

**Bukti terverifikasi:**

- `backend/internal/pkg/urlutil/urlutil.go:20` — IsLikelyMoodleCalendarURL parses the URL but inspects only the lowercased path (line 25) and the authtoken+userid query pair (line 29); scheme, host, port, userinfo, and resolved IP are never examined, so the function cannot distinguish an intended calendar origin from loopback, RFC1918, link-local, or a single-label compose hostname.
- `backend/internal/modules/user/handler.go:254` — The predicate is reached only under 'req.MoodleEnabled == nil || *req.MoodleEnabled != false', so the same request that disables Moodle stores an arbitrary string unvalidated.
- `backend/internal/modules/user/handler.go:256` — This is the sole live invocation of the predicate in the repository, so it is the entire control surface for the stored fetch target.
- `backend/internal/modules/user/handler.go:316` — moodle_calendar_url is persisted unconditionally when the field is present, so the predicate is not a precondition of the write and skipping it at line 254 leaves no other barrier.
- `backend/internal/modules/user/service.go:16` — ValidateMoodleURL wraps the same path-substring predicate and a repo-wide grep finds no call site, confirming that no stricter validation exists anywhere in the user module.
- `backend/internal/modules/calendar/handler.go:77` — GetRaw checks only that the stored URL is non-nil and non-empty, with no re-validation and no moodle_enabled consultation.
- `backend/internal/modules/calendar/handler.go:83` — Fetch errors are returned verbatim in details, giving a reachability and port-state oracle over every host the container can reach.
- `backend/internal/modules/calendar/handler.go:89` — c.Data re-emits the fetched body to the caller with status 200 and text/calendar, which is what turns this from blind SSRF into a readable internal fetch.
- `backend/internal/modules/calendar/moodle/client.go:61` — http.NewRequestWithContext receives the stored string after TrimSpace only; no scheme or host allow-list is applied anywhere in the moodle module.
- `backend/internal/modules/calendar/moodle/client.go:67` — The fetch client sets only a 12-second timeout, leaving CheckRedirect at Go's default 10-hop follow-any-host policy with no destination filtering.
- `backend/internal/shared/router/router.go:128` — The whole /v1/calendar group, including /raw at line 130, sits behind APIKeyOrJWT and a per-IP or per-key token bucket; no role or scope check narrows who may cause a fetch, so the bucket is throttling rather than authorization.
- `backend/internal/modules/calendar/service.go:43` — Promotion to an active provider needs only user.MoodleEnabled plus a non-empty stored URL, with no re-validation, so the preview path reached by force=true at handler.go:107 also fetches the attacker value. [Pinned dependency source: docker-compose.yml:23 — The api service joins the default compose bridge with db and bot and declares no network policy or egress restriction; only api (8080) and bot (8081) publish host ports, and db publishes none, so the internal peers are the natural first targets.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on this host (docker, podman, nerdctl, containerd, ctr, vagrant and qemu are absent; WSL2 has no distribution installed), so no target-controlled request could be issued, no local listener fixture could be started, and no internal response could be observed. Every check in this record is method 'source' with artifact null, so the confirmed branch is unreachable and the execution and observed_result fields cannot be filled truthfully.
1. Decisive deployment facts are outside the repository: which internal HTTP services actually answer on the compose network (bot publishes 8081; db is Postgres on 5432 and does not speak HTTP, so it yields only a parse error), whether the api container reaches the docker bridge gateway or a cloud metadata address, and whether that metadata endpoint requires a custom header. The primitive is GET-only and sets only a User-Agent, so it cannot satisfy X-Bot-Token on /internal/* nor an IMDSv2 PUT-plus-token handshake.
1. No reverse proxy, ingress, or egress firewall/network policy is present in the repository, so whether outbound requests from the api container to loopback, RFC1918, or link-local ranges are filtered is an owner-observed fact rather than a source-derived one.
1. The impact ceiling depends on what an internal 200-response body would disclose. The api's own /metrics, /livez and /healthz are already unauthenticated on the published port and /internal/* requires X-Bot-Token, so the material disclosure targets and the value of a non-2xx body echo are deployment-specific and cannot be enumerated from source.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In an isolated fixture with all external networking blocked, run two DB-free checks that together span the whole path. First, table-drive urlutil.IsLikelyMoodleCalendarURL over http://127.0.0.1:5432/calendar/export, http://api:8080/calendar/export, http://169.254.169.254/latest/meta-data/?authtoken=a&userid=1 and http://moodle.itera.ac.id@127.0.0.1/calendar.ics, and assert every case returns true. Second, start a dummy 127.0.0.1 listener returning a fixed marker body plus a closed-port case, and call moodle.Client.FetchMoodleCalendar against both, asserting the marker body is returned for the open port and that the dial error text is non-empty for the closed one. Optionally, if a Postgres fixture is available, drive Handler.GetRaw through httptest with a dummy TokenParser and a dummy user row whose moodle_calendar_url is http://127.0.0.1:<port>/calendar/export, and assert the marker body is emitted with 200 and text/calendar, then repeat with moodle_enabled=false. No live endpoint, no real credential, no external request. This host lacks an OS-enforced sandbox, so none of it was executed.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner-observed and read-only: from inside the api container, using a temporary dummy student row's stored moodle_calendar_url, issue GETs to each compose peer (api:8080, bot:8081, db:5432), to the docker bridge gateway, and to the documented metadata address, recording status class and whether any body bytes came back; separately record whether any egress firewall or network policy restricts outbound traffic from the api container. Delete the dummy row afterwards. Do not target any endpoint outside the deployment's own network.


---

## 22. Assignment title and course name are interpolated unescaped into a Markdown-parsed Telegram message

- **Fingerprint:** `telegram/service:unescaped-markdown-sink`
- **Boundary terdampak:** `backend/internal/modules/telegram/handler.go:59` (SendTestReminder) — efek akhir di `backend/internal/modules/telegram/service.go:119` (SendAssignmentNotification)

**Klaim akar masalah (claimed_root_cause):**

> Untrusted LMS-sourced title and course text is interpolated into a Telegram message that is sent with ParseMode Markdown without applying the escaping helper that the sibling sender applies, so markup in the data is parsed as message structure.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/telegram/handler.go:59` — *SendTestReminder* — The caller's stored event title (a.Title), course (a.Course) and class code are passed to SendAssignmentNotification; route is POST /v1/telegram/test-reminder behind JWT only (router.go:153), scoped to the caller's own events.
propagation → `backend/internal/modules/telegram/service.go:104` — *SendAssignmentNotification* — The message is assembled with fmt.Sprintf; courseName (line 113) and assignmentTitle (line 114) are raw format arguments with no escaping applied anywhere in the function or package.
propagation → `backend/internal/modules/telegram/service.go:19` — *SendMessage* — The outgoing message declares msg.ParseMode = "Markdown" (tgbotapi MessageConfig, serialised as parse_mode in the Bot API request per go-telegram-bot-api/v5 configs.go:326,339), which is what makes the interpolated characters structural.
sink → `backend/internal/modules/telegram/service.go:119` — *SendAssignmentNotification* — The assembled string is handed to b.SendMessage -> b.api.Send (POST to https://api.telegram.org/bot%s/sendMessage), which either rejects the message with a parse error or renders the injected markup.

**Bukti terverifikasi:**

- `backend/internal/modules/telegram/service.go:113` — courseName is a raw format argument in a message that is sent as Markdown.
- `backend/internal/modules/telegram/service.go:114` — assignmentTitle is a raw format argument in the same message; grep of backend/ confirms no escape/Sanitize call exists on this path.
- `backend/internal/modules/telegram/handler.go:198` — A second reachable caller: buildMorningBriefingMessage interpolates a.Title unescaped (and user.Name at :185, course at :199) and sends it through the same Markdown sink via handler.go:166 on POST /v1/telegram/test-briefing.
- `backend/internal/modules/calendar/sync/service.go:220` — The stored title is assignment.Title, sourced from Google Classroom coursework title/course name (google/client.go:261-262) or the Moodle ICS SUMMARY of a student-supplied URL (ics/parser.go:93), so the value is third-party controlled; courseValue at :221 may additionally be the user-set alias via coursealias.Apply at :135.
- `backend/internal/modules/telegram/scheduler.go:169` — The legacy backend scheduler also passes stored title and course straight into the unescaped sink, but it is dead code: cmd/api/main.go never calls Module.Start/StartScheduler/StartBot (only the lmssync scheduler at main.go:38-56 is started), and telegram/README.md marks bot.go and scheduler.go as deprecated/legacy, so the reachable callers in this deployable are the two test routes. [Pinned dependency source: bot/internal/telegram/format.go:239 — The sibling implementation defines escape() replacing _ and * with \_ and \*, establishing that escaping is the intended control for this sink.] [Pinned dependency source: bot/internal/telegram/format.go:288 — The sibling's formatReminder applies escape(course) and escape(title) to the identical reminder shape; note however that formatReminder and formatBriefing are unused — the sibling's live reminder path (scheduler.go:173 -> buildReminder at :385-402, sent via Bot.Send with ParseMode Markdown at bot/internal/telegram/bot.go:35-40) is also unescaped, so the two implementations agree on the reminder path and disagree only on interactive command replies.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on the audit host and no outbound network calls are permitted, so the decisive observation — whether the Telegram Bot API rejects a message containing an unbalanced _ or * with a parse error (and thus never delivers the reminder) and renders a balanced [text](url) construct as live markup — cannot be made; that behaviour is server-side in a third party and is not source-visible.
1. The cross-user spoofing condition requires a live Google Classroom course or coursework title that actually carries the required markup and is shared across enrolled students; whether such data exists is not source-visible.
1. Which reminder path production actually runs is partially source-settled (the committed docker-compose runs cmd/api/main.go, which never starts the backend telegram scheduler, and the standalone bot's buildReminder is also unescaped), but a deployment could differ from the committed topology, which only the owner can confirm from runtime configuration and logs.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

Non-destructive: with b.api replaced by a recording stub (BotAPI whose Send captures the MessageConfig), call SendAssignmentNotification once with title "Tugas_1 Matematika" (unbalanced underscore), once with "Kalkulus *I* [klik](https://attacker.example)" (balanced bold + injected inline link), and once with course "Algoritma*Pemrograman"; dump the captured message bodies and assert the markup survives verbatim to the wire with parse_mode=Markdown. Then run the same inputs through bot/internal/telegram/format.go escape() and diff, showing the escaped form the sibling produces. No network access needed.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

Owner greps api and bot logs (non-destructive, read-only) for Bot API send failures containing "can't parse entities" correlated with assignment titles containing _ or *, and checks telegram_chat_id deliveries for messages where a Classroom-supplied title rendered as bold/italic or a clickable link; also confirms from runtime configuration that the backend telegram scheduler is not started and which sender actually delivers scheduled reminders.


---

## 23. Telegram chat id can be bound to more than one account, so chat-to-account resolution returns one fixed row that can belong to the other account

- **Fingerprint:** `telegram/verify:chat-id-uniqueness-missing`
- **Boundary terdampak:** `backend/internal/modules/botservice/handler.go:92` (VerifyTelegram) — efek akhir di `backend/internal/modules/botservice/handler.go:174` (GetDueAssignments)

**Klaim akar masalah (claimed_root_cause):**

> The chat-to-account binding is stored in a column with no uniqueness constraint (models/user.go:20, unlike Email and GoogleID on the same model) and is written by unconditional updates that neither claim the value nor check its current owner (botservice/handler.go:117-122, user/handler.go:312-314, telegram/bot.go:108-115), while the read path resolves the same value to a single row via a primary-key-ordered First() (botservice/handler.go:33-35), so whenever two rows share a chat id the identity the bot acts on is fixed to one row that can belong to the other account. Nothing in the repository, including the GORM AutoMigrate path (internal/database/postgres.go:38-48), creates any unique index on the column, and no migration SQL exists in the repo.

**Jejak sumber (terverifikasi, berurutan):**

entrypoint → `backend/internal/modules/botservice/handler.go:92` — *VerifyTelegram* — Bot-service-authenticated POST /internal/telegram/verify carrying code, chat_id and an optional telegram_username is bound into verifyTelegramRequest; only code and chat_id are required and only whitespace is trimmed.
propagation → `backend/internal/modules/botservice/handler.go:107` — *VerifyTelegram* — The account is selected solely by telegram_verify_code = ? AND telegram_verify_expires > now; the supplied chat_id takes no part in the lookup and no ownership of that chat is proven.
propagation → `backend/internal/modules/botservice/handler.go:118` — *VerifyTelegram* — The updates map unconditionally sets telegram_chat_id to the request value and telegram_enabled to true, with no comparison against existing holders of that chat id and no claim of the value.
propagation → `backend/internal/models/user.go:20` — *User.TelegramChatID* — The column is a plain nullable string with no uniqueIndex tag, unlike Email (line 12) and GoogleID (line 15) on the same model, so duplicate chat ids are schema-legal and GORM AutoMigrate (internal/database/postgres.go:39) creates no unique index for it.
propagation → `backend/internal/modules/user/handler.go:313` — *UpdateCurrentUser* — An alternate writer stores telegram_chat_id from any authenticated student's PUT /v1/user body; validateUpdateRequest (lines 253-278) never inspects that field, so an arbitrary, unverified and possibly already-owned chat id can be stored with no verify code at all.
propagation → `backend/internal/modules/botservice/handler.go:33` — *GetUserByTelegram* — GET /internal/users/by-telegram/:chatID resolves the chat id to one account with a single-row First() read (lines 33-35). GORM v1.31.2 First() appends ORDER BY the primary key LIMIT 1 (finisher_api.go:130-133), so with two matching rows the resolved owner is deterministically the lexicographically smallest user UUID, which can be the other account; the bot then reads and completes that account's assignments and displays its profile under this chat (bot/internal/telegram/bot.go:157-212, 437-474, 537-562).
sink → `backend/internal/modules/botservice/handler.go:174` — *GetDueAssignments* — The due feed selects users.telegram_chat_id through JOIN users ON users.id = events.user_id (line 175) filtered only by telegram_enabled and chat id NOT NULL (line 176), so every account sharing a chat id has its own pending rows emitted against that same chat id and the bot scheduler sends them all to the one chat.

**Bukti terverifikasi:**

- `backend/internal/modules/botservice/handler.go:107` — Lookup predicate is telegram_verify_code AND telegram_verify_expires > now, with the chat id absent from the predicate and no prior-owner or uniqueness check anywhere in the handler.
- `backend/internal/modules/botservice/handler.go:118` — telegram_chat_id is written verbatim from the request body into the updates map; nothing compares it against existing holders.
- `backend/internal/models/user.go:20` — TelegramChatID is declared gorm:"column:telegram_chat_id" with no uniqueIndex, while Email (line 12) and GoogleID (line 15) on the same model are uniqueIndex, so duplicate chat ids are schema-legal.
- `backend/internal/modules/botservice/handler.go:174` — The due feed selects users.telegram_chat_id through a join on users.id = events.user_id, so every account sharing a chat id contributes its own rows tagged with that same chat id.
- `backend/internal/modules/user/handler.go:313` — buildUpdateData stores telegram_chat_id from an authenticated student's PUT /v1/user body; validateUpdateRequest (lines 253-278) validates only moodle_calendar_url, google_classroom_enabled and whatsapp_number, never this field.
- `backend/internal/shared/router/router.go:143` — The /internal group applies only middleware.RequireBotService with no rate limiter, so the code check has no attempt cap at the API layer while any Telegram user can trigger it by messaging the bot a six-character string. [Pinned dependency source: bot/internal/telegram/bot.go:106 — Any six-character plain text is treated as a verify code and forwarded to POST /internal/telegram/verify, making the unauthenticated code check reachable by any Telegram user at unbounded attempt rate.] [Pinned dependency source: C:/Users/Jeremi/go/pkg/mod/gorm.io/gorm@v1.31.2/finisher_api.go:131 — GORM First() (the version pinned in backend/go.mod line 18) is Limit(1).Order(primary key), refuting the candidate's 'no ORDER BY / arbitrary owner' wording: with duplicate chat ids the resolved account is deterministically the lexicographically smallest user UUID, which can still be the wrong owner.]

**Blocker eksak (mengapa belum bisa dikonfirmasi):**

1. No OS-enforced sandbox exists on this host (no docker/podman/WSL distribution), and the API cannot boot without a live Postgres (internal/database/postgres.go:13-16 fatals on an empty DATABASE_URL; no SQLite path or DI seam), so the two-row fixture that would show which account GetUserByTelegram resolves to, and the resulting cross-owner bot behaviour, cannot be executed; running target code or a database is not permitted by this brief.
1. Whether the deployed users table carries a unique index on telegram_chat_id that is not expressed in the GORM model is not visible in the repository: the repo contains no migration SQL, AutoMigrate derives only from the model tags, and an out-of-band ALTER TABLE or a pre-existing constraint in the live database would change the outcome.
1. The live data state is a deployment fact: whether any two rows already share a telegram_chat_id, and which of the three in-repo writers (verify handler, PUT /v1/user, deprecated in-process bot) is actually deployed and active, can only be observed by the owner; source shows all three are unconditional but cannot show which one produced any given row.

**Rencana resolusi — lokal (terbatas, non-destruktif, hanya dalam sandbox yang disetujui):**

In a throwaway Postgres instance with the GORM schema applied (AUTO_MIGRATE on the model as in internal/database/postgres.go:39), insert two dummy users A and B that share one telegram_chat_id, choosing A's UUID to sort lexicographically after B's. Call GET /internal/users/by-telegram/:chatID with a valid X-Bot-Token and record the returned id: First() orders by primary key, so B is expected every time, proving a deterministic wrong-owner resolution rather than an arbitrary one. Then exercise the verify path itself: generate a code for A (POST /v1/user/telegram/verify-code with A's JWT) and call POST /internal/telegram/verify with that code and the shared chat id, confirming the write succeeds with no duplicate rejection. Finally confirm the second writer: with A's JWT, PUT /v1/user with telegram_chat_id equal to the victim's chat id and observe 200 and the stored value. Use only dummy fixtures and stop at the first wrong-owner result; no live Telegram endpoint or real account is contacted.

**Rencana resolusi — owner-observed di deployment (read-only, tanpa traffic audit):**

On a staging deployment the owner checks, non-destructively: (1) list the constraint/index set on the users table (\d users or pg_indexes) to confirm whether any unique constraint on telegram_chat_id exists out of band; (2) run SELECT telegram_chat_id, COUNT(*) FROM users WHERE telegram_chat_id IS NOT NULL GROUP BY telegram_chat_id HAVING COUNT(*) > 1 to see whether duplicates already exist in live data; (3) confirm which writer is active (standalone bot/ service versus the deprecated in-process telegram module) and that the /internal/* group has no rate limiter in front of it, by inspecting the deployed middleware chain and any reverse-proxy configuration.

