# Multi-LMS Support Update

Sistem telah diupdate untuk mendukung pengambilan tugas dari **multiple LMS sources secara bersamaan** (Moodle + Google Classroom).

## Perubahan Utama

### 1. Database Schema

**Perubahan pada tabel `users`:**
- ❌ Dihapus: `lms_type` enum field
- ✅ Ditambah: `moodle_enabled` (boolean)
- ✅ Ditambah: `google_classroom_enabled` (boolean)
- ✅ Tetap: `moodle_calendar_url`, Google token fields

**Perubahan pada tabel `events`:**
- ✅ Ditambah: `source` field untuk tracking sumber tugas
- ✅ Ditambah: `source_id` untuk external ID dari LMS

### 2. Arsitektur LMS

**LMS Factory baru** (`lib/lms/lmsFactory.ts`):
```typescript
// Fetch dari multiple sources secara parallel
const { assignments, results } = await fetchAssignmentsFromMultipleSources(config, userId)
```

**Fitur:**
- Parallel fetching dari Moodle dan Google Classroom
- Deduplikasi otomatis (tugas sama dari sumber berbeda)
- Token refresh otomatis untuk Google
- Error handling per source

### 3. Scheduler Update

Scheduler sekarang:
1. Cek semua LMS yang diaktifkan user
2. Fetch dari semua source secara parallel
3. Gabungkan dan deduplikasi tugas
4. Kirim reminder untuk semua tugas

### 4. UI Dashboard

**LMS Config Component baru:**
- Toggle switch untuk enable/disable masing-masing source
- Moodle: URL input (muncul ketika enabled)
- Google: OAuth connection (muncul ketika enabled)
- Info card menunjukkan sumber aktif
- Test button untuk test semua sumber

### 5. API Endpoints

**Updated:**
- `GET/PUT /api/user` - Support `moodle_enabled`, `google_classroom_enabled`
- `POST /api/test-calendar` - Test multiple sources
- `GET /api/test-calendar` - Get dari semua source yang aktif

## Cara Kerja

### User Flow

1. **Enable Moodle:**
   - Toggle Moodle = ON
   - Masukkan URL kalender ICS
   - Save

2. **Enable Google Classroom:**
   - Klik "Hubungkan" (jika belum terhubung)
   - OAuth flow
   - Toggle Google Classroom = ON
   - Save

3. **Keduanya Aktif:**
   - Sistem fetch dari Moodle AND Google Classroom
   - Tugas digabungkan dan dideduplikasi
   - Reminder dikirim untuk semua tugas

### Deduplikasi

Tugas dianggap duplicate jika:
- Title sama, dan
- Deadline sama (±1 menit)

Duplicate dihapus, hanya satu yang disimpan.

## Response API

### Test Calendar Response
```json
{
  "events": [...],
  "sources": [
    { "provider": "moodle", "count": 5, "error": null },
    { "provider": "google_classroom", "count": 3, "error": null }
  ],
  "total": 8,
  "successfulSources": 2,
  "failedSources": 0
}
```

### Get User Response
```json
{
  "moodle_enabled": true,
  "moodle_calendar_url": "https://...",
  "google_classroom_enabled": true,
  "google_connected": true,
  ...
}
```

## Migration Notes

**Untuk existing users:**
- Jika sebelumnya pakai Moodle (`lms_type = 'moodle'`):
  - `moodle_enabled` otomatis true (perlu di-set manual)
  - `moodle_calendar_url` tetap ada
  
- Jika sebelumnya pakai Google Classroom:
  - `google_classroom_enabled` = false (perlu di-enable manual)
  - Token masih ada

**User perlu:**
1. Login ke dashboard
2. Buka "Sumber Tugas"
3. Enable/disable sumber yang diinginkan
4. Save

## Testing

```bash
# Test single source
curl -X POST /api/test-calendar \
  -d '{"moodle_calendar_url": "...", "test_moodle": true}'

# Test multiple sources
curl -X POST /api/test-calendar \
  -d '{
    "moodle_calendar_url": "...", 
    "test_moodle": true,
    "test_google": true
  }'
```

## Benefits

1. **Flexibility:** User bisa pakai salah satu atau keduanya
2. **Completeness:** Tugas tidak terlewat dari sumber manapun
3. **Deduplication:** Tidak ada notifikasi duplicate untuk tugas sama
4. **Independent Control:** Enable/disable per source
5. **Better UX:** Toggle switch yang intuitif

## Next Steps

1. Deploy schema migration (sudah dilakukan)
2. Test dengan user yang punya kedua sumber
3. Monitor log untuk error handling
4. Consider: Support untuk LMS lain (Canvas, Blackboard, dll)
