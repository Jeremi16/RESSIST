# SECURITY-MIGRATIONS — run-1 hardening

Perubahan skema yang menyertai audit `run-1`. Semua DDL di bawah **idempotent**
dan dijalankan otomatis oleh `internal/database/postgres.go` saat startup
(termasuk ketika `AUTO_MIGRATE=false`), mengikuti pola yang sudah dipakai untuk
`refresh_tokens.session_started_at`.

Dokumen ini ada karena satu langkah **tidak bisa** diotomasi dengan aman:
unique index `users.telegram_chat_id` gagal bila tabel masih berisi duplikat.
Aplikasi tetap berjalan (endpoint resolusi sudah menolak binding ambigu dengan
`409`), tetapi index pelindungnya belum aktif sampai langkah manual di bawah
dijalankan.

---

## Yang berjalan otomatis

| Objek | Perubahan | Alasan |
|---|---|---|
| `refresh_tokens.revoked_reason` | `varchar(16)` + index | Membedakan rotasi (boleh grace) dari logout/reuse (tidak boleh). Lihat WS-8.1. |
| `users.sync_claimed_until` | `timestamptz` + index | Klaim per-user lintas replika untuk cron sync. Lihat WS-9. |
| `idx_users_telegram_chat_id` | unique parsial | Mencegah dua user berbagi satu chat id. Lihat WS-6.2 — **dibuat hanya bila tidak ada duplikat**. |

Log startup akan menampilkan peringatan bila index telegram gagal dibuat:

```
[db] WARNING: could not create idx_users_telegram_chat_id (duplicate telegram_chat_id rows likely exist; ...)
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

- **`AUTO_MIGRATE` di `docker-compose.yml` sekarang `"false"`.** Migrasi dari
  N replika sekaligus bisa berlomba dan meninggalkan skema setengah jadi.
  DDL yang wajib ada tetap dijalankan oleh kode (idempotent); perubahan skema
  lain harus lewat langkah eksplisit.
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
mana pun (termasuk ke dokumen ini atau ke chat):

1. **`JWT_ACCESS_SECRET`** — rotasi ini otomatis me-logout **semua** sesi.
   Jadwalkan di luar jam ujian, dan beri tahu pengguna lebih dulu.
2. **`DATABASE_URL`** — ganti password role database, lalu update connection
   string. Pastikan `DB_PASSWORD` di `.env` root (dipakai `docker-compose.yml`)
   ikut berubah, kalau tidak container `api` gagal connect.
3. **`GOOGLE_CLIENT_SECRET`** — buat secret baru di Google Cloud Console,
   lalu hapus yang lama setelah deploy berhasil.
4. **`BOT_SERVICE_TOKEN`** — nilai ini dipakai bersama `bot/.env`; ganti di
   kedua tempat dalam satu window deploy, kalau tidak bot mendapat `401`.
5. **`TELEGRAM_BOT_TOKEN`** — revoke lewat `@BotFather` (`/revoke`), lalu
   update di `backend/.env`, `bot/.env`, dan `.env` root.
6. **Pindahkan ke secret manager** (Coolify/Docker secrets). Setelah itu file
   `.env` plaintext di disk boleh dihapus.

Catatan: `godotenv.Load()` hanya membaca `.env` bila ada, dan tidak menimpa
environment yang sudah di-inject — jadi injeksi dari secret manager akan
otomatis menang tanpa perubahan kode.
