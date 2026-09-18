# Ressist Mobile KMP — Android dulu, siap iOS

Pengganti app Android Capacitor (`frontend/android/`). Modul `shared`
Kotlin Multiplatform murni + UI `androidApp` Jetpack Compose native.
App Capacitor tetap hidup paralel sampai KMP rilis (lihat plan F6).

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
ressist.googleWebClientId=<sama dengan VITE_GOOGLE_WEB_CLIENT_ID / backend GOOGLE_CLIENT_ID>
```

> `applicationId` = `id.ac.itera.ressist` (sama dengan Capacitor) supaya Play
> Store menganggap KMP sebagai update. Saat rilis: `versionCode` KMP harus
> LEBIH TINGGI dari rilis Capacitor terakhir + signing key yang sama
> (`frontend/android/ressist-release.jks`).

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

## Rilis (F5)

```bash
cd mobile-kmp
./gradlew :androidApp:bundleRelease   # AAB signed → androidApp/build/outputs/bundle/release/
./gradlew :androidApp:assembleRelease # APK signed → .../apk/release/ (uji di HP)
```

Syarat & checklist:

1. `mobile-kmp/keystore.properties` ada (gitignored) menunjuk ke
   `../frontend/android/ressist-release.jks` — keystore yang SAMA dengan
   Capacitor agar Play menganggap ini update.
2. `versionCode` di `androidApp/build.gradle.kts` HARUS di atas rilis
   Capacitor terakhir (Capacitor berhenti di 1 → KMP mulai dari 2).
3. **SHA-1 check (sekali saja):** sidik jari sertifikat rilis
   (`apksigner verify --print-certs ...apk`) harus cocok dengan Android OAuth
   client di Google Cloud Console. Kalau tidak cocok, Google Sign-In gagal
   dengan `exchange_failed`. Ambil SHA-1:
   `keytool -list -v -keystore ../frontend/android/ressist-release.jks -alias ressist | grep SHA1`
4. Upload AAB ke Play Console → Internal Testing. Capacitor tetap rilis
   paralel sampai KMP dinyatakan stabil (crash-free 99% 14 hari, F6).
5. Device uji butuh backend terjangkau: emulator → `10.0.2.2:8080`,
   HP fisik → IP LAN laptop (`ressist.apiBaseUrl` di `local.properties`).
   Atau arahkan ke prod `https://ressist-api.jsx.qzz.io`.
6. HP fisik WAJIB base URL yang terjangkau dari HP (`10.0.2.2` hanya
   jalan di emulator). Build release sudah hardcode prod.

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
  F3 kalender+LMS+profil → F4 reminder lokal+polish → F5 rilis paralel →
  F6 pensiun Capacitor (terpisah, setelah crash-free 99% 14 hari)
