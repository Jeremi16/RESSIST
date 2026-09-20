# Ressist Mobile KMP — Android dulu, siap iOS

Aplikasi Android native (pengganti WebView hybrid yang sudah dipensiunkan).
Modul `shared` Kotlin Multiplatform murni + UI `androidApp` Jetpack Compose native.

## Prasyarat

- JDK 17, Android SDK (compileSdk 35) — `sdk.dir` di `local.properties`
- Android Studio Ladybug+ (buka folder `mobile-kmp/` sebagai project), atau `./gradlew`

## Setup

```bash
cd mobile-kmp
cp local.properties.example local.properties   # sesuaikan sdk.dir + apiBaseUrl
./gradlew :androidApp:assembleDebug             # Windows: gradlew.bat
```

`local.properties` (gitignored):

```properties
sdk.dir=C\:\\Users\\<kamu>\\AppData\\Local\\Android\\Sdk
ressist.apiBaseUrl=http://10.0.2.2:8080   # emulator → localhost; device fisik: http://<LAN-IP>:8080
ressist.googleWebClientId=<sama dengan backend GOOGLE_CLIENT_ID>
```

> `applicationId` = `id.ac.itera.ressist`. Saat rilis: signing key
> (`mobile-kmp/ressist-release.jks`, gitignored — jangan sampai hilang).

## Struktur

```
mobile-kmp/
├── shared/                 # KMP murni — DILARANG import android.* / compose
│   └── src/{commonMain,androidMain,iosMain}/
├── androidApp/             # Compose UI + ViewModel + DataStore + WorkManager
├── gradle/libs.versions.toml
└── .github/workflows/mobile-kmp.yml  (di root repo)
```

Kontrak API: `backend/API_DOCUMENTATION.md` — selalu prefix `/v1`,
`Authorization: Bearer`, refresh via header `X-Refresh-Token`.
Mobile dilarang import kode `frontend/src/*`; hanya meniru behavior-nya.

## Rilis (sideload APK via RESSIST-MOBILE)

```bash
# 1. bump versionCode+1 & versionName di androidApp/build.gradle.kts, commit
git commit -m "release v0.2.3 (code 5)"
# 2. tag + push → CI (.github/workflows/release-mirror.yml) bangun
#    assembleRelease lalu mirror ke repo public Jeremi16/RESSIST-MOBILE
git tag v0.2.3; git push origin main --tags
```

Nama file wajib `ressist-X.Y.Z-codeN-release.apk` (N = versionCode) —
update-checker HP membaca versionCode dari nama file ini (GitHub API
tidak punya field versionCode). Contoh: `ressist-0.2.2-code4-release.apk`.
Cek manual lokal tetap bisa: `./gradlew :androidApp:assembleRelease`
(APK signed → `androidApp/build/outputs/apk/release/`).

Syarat & checklist:

1. `mobile-kmp/keystore.properties` ada (gitignored) menunjuk ke
   `ressist-release.jks` (satu folder, relatif terhadap `mobile-kmp/`).
2. `versionCode = 4`, `versionName = "0.2.2"` di `androidApp/build.gradle.kts`.
   Versi UI (Lainnya/Tentang) otomatis ikut via `BuildConfig.VERSION_NAME`.
   Pemilik KMP 0.2.2/code 4 lama (bila masih ada) wajib uninstall manual
   karena Android menolak code yang sama/turun.
3. **SHA-1 check (sekali saja):** sidik jari sertifikat rilis
   (`apksigner verify --print-certs ...apk`) harus cocok dengan Android OAuth
   client di Google Cloud Console. Kalau tidak cocok, Google Sign-In gagal
   dengan `exchange_failed`. Ambil SHA-1:
    `keytool -list -v -keystore ressist-release.jks -alias ressist | grep SHA1`
4. Distribusi otomatis via `release-mirror.yml` ke dua tempat: repo public
   `Jeremi16/RESSIST-MOBILE` (kanonis — HP cek
   `api.github.com/repos/Jeremi16/RESSIST-MOBILE/releases/latest`
   langsung, tanpa backend; web juga menunjuk ke sini) dan repo ini
   sendiri (sekadar arsip, tak terbaca publik setelah repo di-private).
   Jangan commit binary ke `releases/` (di-gitignore).
5. Build release hardcode prod `https://ressist-api.jsx.qzz.io`,
   jadi HP fisik langsung bisa pakai. Debug tetap pakai
   `ressist.apiBaseUrl` di `local.properties` (emulator `10.0.2.2:8080`).
6. Skema versi ke depan: `versionName` semver manual + `versionCode` +1
   tiap rilis, 1 commit bump + 1 tag `vX.Y.Z` (CI yang membuat release
   + file `SHA256SUMS.txt`). Update-checker di HP: tombol manual di
   Tentang + auto-check 1x/24 jam + notifikasi + download via
   DownloadManager (lihat `update/AppUpdater.kt`, `ui/update/`).

## Loop di consent Google (diagnosis)

Gejala: consent muncul → terima → consent lagi, tanpa error jelas.
Aplikasi tidak auto-retry; loop selalu berarti tiap percobaan gagal
dan sesi dibersihkan. Cek berurutan:

1. `adb logcat -s RessistAuth` — lihat `status=` (10 = SHA-1 belum
   terdaftar, 12501 = dibatalkan user) atau `native login failed`.
2. SHA-1 APK yang terpasang (`apksigner verify --print-certs`) vs
   Android OAuth client di GCP Console. Debug KMP memakai keystore
   rilis — daftarkan SHA-1 varian yang dipakai, bukan debug key lama.
3. OAuth consent screen masih Testing → akun penguji harus terdaftar
   di Test Users (scope Classroom sensitif).
4. `GOOGLE_CLIENT_ID` backend == Web Client ID aplikasi.
5. HP fisik mencapai backend (bukan `10.0.2.2`).

## Roadmap

- F0 scaffold (ini) → F1 shared API+auth → F2 login+overview+tugas →
  F3 kalender+LMS+profil → F4 reminder lokal+polish → F5 rilis

## Warisan WebView hybrid (sudah dihapus dari `frontend/`)

Perilaku yang dipindahkan/diwarisi — jangan regresi:

- Flow auth: `server_auth_code` → `POST /v1/auth/google/native`,
  refresh via header `X-Refresh-Token` (+ body `{"refresh_token"}`),
  token keys `ressist.access_token` / `ressist.refresh_token`.
- Scope Google: `classroom.courses.readonly`,
  `classroom.coursework.me.readonly` (+ `openid`, `profile`, `email`).
  Catatan: config lama juga meminta `classroom.course-work.readonly`
  (tanda hubung) — belum diminta KMP; tambahkan bila backend butuh.
- Endpoint web-only yang belum ada di KMP (tetap via BFF web, bukan blocker):
  `GET/POST/DELETE /v1/api-keys*`, `POST /v1/telegram/test-reminder`,
  `POST /v1/telegram/test-briefing`, `POST /v1/user/telegram/verify-code`.
- Deep link `ressist://auth` tidak dibawa — KMP memakai GoogleSignIn
  native, bukan OAuth via Custom Tabs.
