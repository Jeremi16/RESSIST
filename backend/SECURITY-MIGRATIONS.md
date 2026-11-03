# SECURITY-MIGRATIONS — run-1 hardening

Perubahan skema yang menyertai audit `run-1`. Semua DDL di bawah **idempotent**
dan dijalankan oleh runner migrasi bernomor di
`internal/database/migrate.go`, bukan lagi oleh `AutoMigrate` pada setiap boot.

## Cara menjalankan

```bash
docker compose run --rm api migrate          # terapkan migrasi yang belum jalan
docker compose run --rm api migrate status   # lihat apa yang sudah diterapkan
```

Perintah ini adalah **langkah rilis**: jalankan sekali sebelum `docker compose up`
pertama kali, dan setiap kali ada migrasi baru. Aman diulang (idempotent) dan
aman dijalankan bersamaan dari beberapa replika — runner memakai
`pg_advisory_xact_lock` dan mencatat setiap langkah di tabel
`schema_migrations`, jadi satu langkah hanya diterapkan sekali.

Bila langkah ini terlewat, `api` **menolak start** dengan pesan yang menyebut
perintah di atas. Ini disengaja: kegagalan skema muncul saat boot, bukan sebagai
`500` acak pada request pengguna pertama.

> Sebelumnya `AUTO_MIGRATE=false` berarti **tidak ada** yang membuat tabel:
> database baru berakhir tanpa tabel sama sekali. `AUTO_MIGRATE=true` di sisi
> lain menjalankan `AutoMigrate` pada **setiap** restart, termasuk dua `UPDATE`
> backfill atas seluruh baris `events` dan `users`. Keduanya sudah tidak
> berlaku.

Dokumen ini juga memuat satu langkah yang **tidak bisa** diotomasi dengan aman:
unique index `users.telegram_chat_id` gagal bila tabel masih berisi duplikat.
Aplikasi tetap berjalan (endpoint resolusi sudah menolak binding ambigu dengan
`409`), migrasi `0005` melaporkan peringatan dan dicoba lagi pada start
berikutnya, sampai langkah manual di bawah dijalankan.

---

## Katalog migrasi

| Versi | Nama | Isi |
|---|---|---|
| `0001` | `baseline_schema` | Tabel dasar (`users`, `refresh_tokens`, `events`, `courses`, `api_keys`). No-op bila kelima tabel sudah ada — database produksi yang sudah berjalan tidak disentuh. |
| `0002` | `refresh_tokens_session_started_at` | Kolom `session_started_at` + index. Batas umur absolut sesi. |
| `0003` | `refresh_tokens_revoked_reason` | Kolom `revoked_reason` + index. Membedakan rotasi (boleh grace) dari logout/reuse (tidak boleh). Lihat WS-8.1. |
| `0004` | `users_sync_claimed_until` | Kolom + index. Klaim per-user lintas replika untuk cron sync. Lihat WS-9. |
| `0005` | `users_telegram_chat_id_unique` | Unique parsial pada `telegram_chat_id`. **Tolerant**: gagal bila masih ada duplikat, dicoba lagi nanti. Lihat WS-6.2. |
| `0006` | `backfill_event_status_and_reminder_hours` | Backfill satu kali untuk `events.status` dan `users.reminder_hours`. Dulu dijalankan ulang setiap restart. |

Menambah migrasi baru: **append** entri berikutnya di `migrations()` dengan
versi `len+1`. Jangan pernah mengubah atau menghapus entri lama — database yang
sudah mencatat versi itu tidak akan menjalankannya lagi, sehingga perubahan pada
entri lama tidak akan pernah sampai ke produksi.

Setiap `Up` berjalan di dalam satu transaksi bersama pencatatan versinya, jadi
satu langkah diterapkan penuh atau tidak sama sekali. Konsekuensinya: jangan
pakai `CREATE INDEX CONCURRENTLY` di dalam migrasi (Postgres menolaknya di dalam
transaksi). Untuk tabel besar, jalankan bentuk `CONCURRENTLY` secara manual
lebih dulu — migrasinya lalu no-op karena memakai `IF NOT EXISTS`.

Log startup menampilkan peringatan bila index telegram gagal dibuat:

```
[db] WARNING: migration 0005_users_telegram_chat_id_unique could not be applied
and will be retried on next start (ERROR: could not create unique index ...);
see SECURITY-MIGRATIONS.md
```

---

## Langkah manual: dedupe `users.telegram_chat_id`

### 1. Lihat duplikat

```sql
SELECT telegram_chat_id, COUNT(*) AS n
FROM users
WHERE telegram_chat_id IS NOT NULL
GROUP BY 1
HAVING COUNT(*) > 1
ORDER BY n DESC;
```

### 2. Tentukan pemenang per chat id

Keputusan produk: pertahankan baris yang **paling baru aktif**, lepaskan
sisanya. Query di bawah hanya menampilkan calon, belum mengubah apa pun —
periksa dulu hasilnya.

```sql
SELECT id, telegram_chat_id, name, updated_at,
       ROW_NUMBER() OVER (PARTITION BY telegram_chat_id
                          ORDER BY updated_at DESC) AS rn
FROM users
WHERE telegram_chat_id IS NOT NULL
ORDER BY telegram_chat_id, rn;
```

### 3. Lepaskan binding yang kalah

```sql
BEGIN;

UPDATE users SET telegram_chat_id = NULL
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY telegram_chat_id
                              ORDER BY updated_at DESC) AS rn
    FROM users
    WHERE telegram_chat_id IS NOT NULL
  ) t
  WHERE rn > 1
);

-- Verifikasi tidak ada sisa duplikat sebelum COMMIT.
SELECT telegram_chat_id, COUNT(*)
FROM users
WHERE telegram_chat_id IS NOT NULL
GROUP BY 1
HAVING COUNT(*) > 1;

COMMIT;
```

User yang kehilangan binding akan menerima `404` dari bot sampai mereka
menghubungkan ulang lewat dashboard (kode verifikasi baru). Tidak ada data
tugas yang hilang — hanya tautan chat yang dilepas.

### 4. Buat index

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_telegram_chat_id
  ON users (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;
```

`CONCURRENTLY` agar tabel tidak terkunci saat index dibuat.

---

## Catatan untuk operator

- **`AUTO_MIGRATE` di `docker-compose.yml` sekarang `"false"`.** Skema dibuat
  oleh langkah rilis `docker compose run --rm api migrate`, bukan oleh setiap
  replika saat boot. `AUTO_MIGRATE=true` kini berarti "terapkan migrasi yang
  belum jalan saat start" (tetap aman untuk N replika karena ada advisory lock),
  bukan lagi "jalankan `AutoMigrate` penuh setiap restart".
- **`TRUSTED_PROXIES` kosong secara default.** Artinya `ClientIP()` = alamat
  TCP peer. Bila API berada di belakang Coolify/Traefik/nginx, set eksplisit
  CIDR-nya — kalau tidak, semua klien akan terlihat sebagai satu IP dan
  rate-limit per-IP akan terlalu agresif. Entri tidak valid membuat proses
  gagal start (sengaja, agar tidak diam-diam longgar).
- **`/metrics` sekarang butuh `X-Bot-Token`.** Konfigurasi scrape Prometheus
  harus mengirim header tersebut. Bila `BOT_SERVICE_TOKEN` kosong, endpoint
  mengembalikan `503`, bukan terbuka.
- **`REFRESH_REUSE_GRACE_SECONDS` default 30** (sebelumnya `.env.example`
  menulis 300 sementara kode memakai 30). Grace kini **hanya** berlaku untuk
  token yang di-revoke karena rotasi; token yang di-revoke karena logout atau
  reuse tidak pernah mendapat grace.
- **`docker-compose.yml` sekarang meneruskan SELURUH 47 env yang dibaca
  `internal/config/config.go`.** Sebelumnya hanya `LMS_SYNC_*` yang
  diteruskan, sehingga `TRUSTED_PROXIES`, semua knob rate limit, retensi, dan
  bahkan `ACCESS_TOKEN_TTL_MINUTES`/`REFRESH_TOKEN_TTL_HOURS` tidak bisa
  dikonfigurasi lewat `.env` — mengubahnya tidak berefek apa pun. Pola yang
  dipakai `${VAR:-default}` dengan default identik dengan `config.go`, jadi
  perilaku tanpa `.env` tidak berubah.
- **Container `bot` ikut di-harden** (`read_only`, `tmpfs /tmp`, `cap_drop ALL`,
  `no-new-privileges`, `mem_limit 256m`, `pids_limit 128`) menyusul `api`.
  `bot/` tidak melakukan `os.Create`/`os.WriteFile`/`os.MkdirAll`, jadi root
  filesystem read-only aman. Bila container gagal start setelah deploy,
  tersangka pertama adalah `read_only` — tambahkan `tmpfs` untuk path yang
  ternyata ditulis.
- **Klien memperlakukan `429` sebagai kondisi terminal.** Dashboard web
  menampilkan "Sinkronisasi Ditunda: coba lagi dalam N menit" dari
  `retry_after_seconds`, dan `SyncWorker` Android berhenti tanpa `Result.retry()`
  (sebelumnya 3× retry × 2 endpoint = 6 request sia-sia per klik sync berlebih).

---

## Tindakan pemilik yang BELUM dilakukan (WS-0)

Seluruh perubahan kode di repo ini **tidak** memperbaiki satu hal: nilai
rahasia di `backend/.env` saat ini ada sebagai file plaintext di disk dan
harus dianggap sudah terekspos. Ini bukan pekerjaan developer — hanya pemilik
yang bisa melakukannya, karena butuh akses ke konsol penyedia layanan.

Status yang sudah terverifikasi aman (tidak perlu tindakan):

- `backend/.env` **tidak** pernah ter-track di git (`git ls-files` gagal,
  `git log --all -- backend/.env` kosong).
- `.gitignore:16` sudah memuat `.env`, jadi file tidak akan ikut ter-commit.

Checklist rotasi — kerjakan berurutan, dan **jangan** menyalin nilai lama ke
mana pun (termasuk ke dokumen ini atau ke chat).

Urutannya disusun supaya setiap langkah bisa diverifikasi sendiri: kredensial
yang dampaknya paling kecil lebih dulu, dan `JWT_ACCESS_SECRET` **paling
akhir** karena merotasi itu memutus semua sesi aktif.

1. **`GOOGLE_CLIENT_SECRET`** — buat secret baru di Google Cloud Console, deploy,
   pastikan login Google masih berhasil, baru hapus yang lama. Dampak bila salah:
   login gagal, sesi yang ada tetap jalan.
2. **`TELEGRAM_BOT_TOKEN`** — revoke lewat `@BotFather` (`/revoke`), lalu update di
   `backend/.env`, `bot/.env`, dan `.env` root **dalam satu window**. Dampak bila
   salah: bot berhenti mengirim notifikasi (API tetap jalan).
3. **`BOT_SERVICE_TOKEN`** — dipakai bersama oleh `api` dan `bot`; ganti di kedua
   tempat sekaligus, kalau tidak bot mendapat `401` dari `api`. Dampak bila salah:
   bot tidak bisa memanggil `api`.
4. **`DATABASE_URL`** — ganti password role database, lalu update connection
   string. Pastikan `DB_PASSWORD` di `.env` root (dipakai `docker-compose.yml`)
   ikut berubah, kalau tidak container `api` gagal connect. Dampak bila salah:
   seluruh layanan mati — lakukan saat Anda bisa mengawasi.
5. **`JWT_ACCESS_SECRET`** — rotasi ini me-logout **semua** sesi (web dan
   Android). Jadwalkan di luar jam ujian dan beri tahu pengguna lebih dulu.
   Setelah rotasi, pengguna login ulang sekali; tidak ada data yang hilang.
6. **Pindahkan ke secret manager** (Coolify/Docker secrets). Setelah itu file
   `.env` plaintext di disk boleh dihapus.

Catatan: `godotenv.Load()` hanya membaca `.env` bila ada, dan tidak menimpa
environment yang sudah di-inject — jadi injeksi dari secret manager akan
otomatis menang tanpa perubahan kode.

---

## Checklist deploy (urutan eksekusi)

Dijalankan sekali saat pertama kali memasang build ini, lalu diulang pada setiap
deploy yang membawa migrasi baru.

### 1. Sebelum start: dedupe `telegram_chat_id`

Jalankan langkah manual di atas **lebih dulu** bila database sudah berisi data.
Kalau tidak, migrasi `0005` hanya akan memberi peringatan dan index pelindung
tetap belum aktif (aplikasi tetap jalan, tetapi dua user bisa berbagi chat id
sampai dirapikan).

### 2. Set `TRUSTED_PROXIES`

Wajib bila `api` berada di belakang Coolify/Traefik/nginx. Isi CIDR jaringan
internal proxy, contoh:

```
TRUSTED_PROXIES=172.16.0.0/12,10.0.0.0/8
```

Bila dibiarkan kosong, semua pengguna terlihat sebagai satu IP dan rate-limit
per-IP membagi satu kuota untuk seluruh pengguna — gejalanya `429` massal.
Salah format membuat proses gagal start (disengaja).

### 3. Terapkan migrasi

```bash
docker compose run --rm api migrate
docker compose run --rm api migrate status   # opsional: lihat yang sudah jalan
```

### 4. Start layanan

```bash
docker compose up -d
```

### 5. Perbarui scrape Prometheus

`/metrics` sekarang memerlukan header `X-Bot-Token`:

```yaml
scrape_configs:
  - job_name: ressist-api
    metrics_path: /metrics
    static_configs:
      - targets: ["api:8080"]
    http_headers:
      X-Bot-Token:
        values: ["<BOT_SERVICE_TOKEN>"]
```

Tanpa header, scrape mendapat `401`. Bila `BOT_SERVICE_TOKEN` kosong, endpoint
mengembalikan `503` (bukan terbuka).

### 6. Smoke test

```bash
curl -fsS http://<host>/livez     # {"status":"ok"}
curl -fsS http://<host>/readyz    # {"status":"ready"}  -> DB ping berhasil
curl -s -o /dev/null -w '%{http_code}\n' http://<host>/metrics          # 401
curl -s -H "X-Bot-Token: $BOT_SERVICE_TOKEN" http://<host>/metrics | head -1  # 200
```

Lalu periksa dari sisi pengguna: login web, buka dashboard (daftar tugas
muncul), dan kirim satu pesan ke bot (balasan diterima). Terakhir cek log
`api` tidak memuat `WARNING: migration` dan tidak ada container yang
restart-loop.

### 7. Bila container gagal start

Tersangka pertama adalah `read_only: true` pada `api`/`bot`. Cari path yang
ditulis dengan menambah `tmpfs` sementara:

```yaml
    tmpfs:
      - /tmp
```

`backend/` dan `bot/` tidak memakai `os.Create`/`os.WriteFile`/`os.MkdirAll`,
jadi kegagalan biasanya berasal dari library yang menulis cache — tambahkan
`tmpfs` untuk path yang disebut di log, jangan matikan `read_only`.

