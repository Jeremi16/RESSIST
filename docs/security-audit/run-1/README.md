# Audit keamanan `backend/` — run-1

Hasil audit keamanan `backend/` dan rencana perbaikannya. Dokumen di folder ini
adalah **arsip**: ditulis sebelum perbaikan dikerjakan, dan tidak diperbarui
setelahnya. Untuk perilaku kode saat ini, lihat kode dan
[`backend/SECURITY-MIGRATIONS.md`](../../../backend/SECURITY-MIGRATIONS.md).

## Baca berurutan

| Dokumen | Isi |
|---|---|
| [`REPORT.md`](REPORT.md) | Ringkasan postur, metode run, dan 23 kandidat temuan. Mulai dari sini. |
| [`NEEDS-VALIDATION.md`](NEEDS-VALIDATION.md) | Detail per kandidat: jejak sumber, bukti, blocker, langkah validasi. |
| [`RENCANA-PERBAIKAN.md`](RENCANA-PERBAIKAN.md) | Rencana perbaikan WS-0…WS-11 beserta urutan eksekusi. |
| [`FINDINGS-DETAIL.md`](FINDINGS-DETAIL.md) | Kosong secara sengaja — lihat catatan di bawah. |

## Batasan yang harus dibaca lebih dulu

Run ini **source-and-local-only, tanpa sandbox**. Tidak ada runtime container
yang tersedia di host audit, sehingga **tidak ada satu pun pemeriksaan yang bisa
dieksekusi** dan **tidak ada temuan `confirmed`**.

Artinya:

- Semua 23 temuan berstatus **`needs_validation`**, bukan kerentanan terkonfirmasi.
- Tabel "temuan terkonfirmasi" kosong **bukan** berarti kode bersih. Ini
  keterbatasan metode, bukan hasil pengujian.
- `FINDINGS-DETAIL.md` kosong karena skema hanya mengizinkan entri untuk temuan
  `confirmed`, dan tidak ada `observed_result` yang bisa diisi secara jujur.

## Status pengerjaan

Rencana di `RENCANA-PERBAIKAN.md` sudah dikerjakan dan masuk ke `main` sebagai
commit terpisah per workstream (WS-1…WS-11), ditambah gerbang tes di CI.

Satu workstream **tidak bisa** diselesaikan dari sisi kode:

- **WS-0 (rotasi kredensial)** — hanya pemilik yang bisa melakukannya, karena
  butuh akses ke konsol penyedia layanan. Urutan rotasi dan alasannya ada di
  [`backend/SECURITY-MIGRATIONS.md`](../../../backend/SECURITY-MIGRATIONS.md)
  (`JWT_ACCESS_SECRET` paling akhir, karena merotasinya memutus semua sesi).

## Cakupan

Hanya `backend/`. `bot/`, `frontend/`, dan `mobile-kmp/` berada di luar cakupan
run ini dan dicatat sebagai tiga unit `out_of_scope` — bukan berarti sudah
diperiksa dan bersih.
