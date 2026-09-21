package id.ac.itera.ressist.update

import android.app.DownloadManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.content.FileProvider
import id.ac.itera.ressist.MainActivity
import java.io.File

/**
 * Download + install APK sideload (tiru Mihon PackageInstallerInstaller).
 *
 * Download tetap via DownloadManager sistem (tahan rotate/background +
 * notifikasi progress bawaan). Install jalur utama via PackageInstaller
 * session API: update dengan cert sama + versionCode naik dianggap update
 * oleh sistem (tidak scan ulang penuh seperti ACTION_VIEW tiap kali).
 * ACTION_VIEW via FileProvider disimpan sebagai fallback Legacy bila
 * session gagal (mis. OEM aneh / izin ditolak).
 *
 * Auto-install background tetap dibatasi Android di luar Play Store:
 * user tetap konfirmasi 1x di prompt sistem.
 */
class AppUpdater(private val context: Context) {

    fun startDownload(url: String, fileName: String): Long {
        val req = DownloadManager.Request(Uri.parse(url))
            .setTitle("Ressist $fileName")
            .setDescription("Mengunduh pembaruan aplikasi")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
            .setMimeType("application/vnd.android.package-archive")
            .setAllowedOverMetered(true)
            .setDestinationInExternalFilesDir(
                context, Environment.DIRECTORY_DOWNLOADS, "updates/$fileName",
            )
        return (context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
    }

    data class Progress(val downloaded: Long, val total: Long, val status: Int)

    fun queryProgress(downloadId: Long): Progress? {
        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        dm.query(DownloadManager.Query().setFilterById(downloadId))?.use { c ->
            if (!c.moveToFirst()) return null
            val downloaded = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
            val total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
            val status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            return Progress(downloaded, total, status)
        }
        return null
    }

    fun localFile(fileName: String): File =
        File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "updates/$fileName")

    fun canRequestInstalls(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
            context.packageManager.canRequestPackageInstalls()

    fun openUnknownSourcesSettings() {
        context.startActivity(
            Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${context.packageName}"),
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }

    /**
     * Install via PackageInstaller session (jalur utama ala Mihon).
     * Return true bila session berhasil di-commit (prompt sistem muncul),
     * false bila gagal dan caller harus pakai fallback Legacy.
     */
    fun installViaSession(file: File): Boolean {
        if (!file.exists() || !file.canRead()) return false
        var sessionId = -1
        return try {
            val installer = context.packageManager.packageInstaller
            val params = PackageInstaller.SessionParams(
                PackageInstaller.SessionParams.MODE_FULL_INSTALL,
            ).apply {
                // Tandai sebagai update paket sendiri: sistem + Play Protect
                // memperlakukannya sebagai update (cert sama), bukan install baru.
                setAppPackageName(context.packageName)
            }
            sessionId = installer.createSession(params)
            installer.openSession(sessionId).use { session ->
                file.inputStream().use { input ->
                    session.openWrite("package", 0, file.length()).use { output ->
                        input.copyTo(output)
                        session.fsync(output)
                    }
                }
                session.commit(commitIntentSender(sessionId))
            }
            true
        } catch (_: Exception) {
            if (sessionId != -1) {
                try {
                    context.packageManager.packageInstaller.abandonSession(sessionId)
                } catch (_: Exception) {
                }
            }
            false
        }
    }

    /** Buka prompt install untuk file yang sudah terdownload (session dulu, Legacy bila gagal). */
    fun promptInstall(fileName: String) {
        val file = localFile(fileName)
        if (installViaSession(file)) return
        promptInstallLegacy(file)
    }

    fun promptInstallByDownloadId(downloadId: Long) {
        // Coba materialisasi ke file dulu agar bisa masuk session API.
        val staged = stageDownloadToFile(downloadId)
        if (staged != null && installViaSession(staged)) return
        // Fallback: ACTION_VIEW langsung ke uri DownloadManager.
        val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val uri = dm.getUriForDownloadedFile(downloadId) ?: return
        if (staged != null) {
            promptInstallLegacy(staged)
        } else {
            context.startActivity(
                Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                },
            )
        }
    }

    // ---------- internal ----------

    private fun commitIntentSender(sessionId: Int): android.content.IntentSender {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = "id.ac.itera.ressist.INSTALL_COMMIT"
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
        return PendingIntent.getActivity(context, sessionId, intent, flags).intentSender
    }

    /** Salin isi unduhan DownloadManager ke file updates/ agar bisa di-session-install. */
    private fun stageDownloadToFile(downloadId: Long): File? {
        return try {
            val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val uri = dm.getUriForDownloadedFile(downloadId) ?: return null
            // Bila uri sudah file:// langsung pakai.
            if (uri.scheme == "file") {
                uri.path?.let { File(it).takeIf { f -> f.exists() } }?.let { return it }
            }
            val outDir = File(context.cacheDir, "updates").apply { mkdirs() }
            val out = File(outDir, "update-$downloadId.apk")
            context.contentResolver.openInputStream(uri)?.use { input ->
                out.outputStream().use { output -> input.copyTo(output) }
            }
            out.takeIf { it.exists() && it.length() > 0 }
        } catch (_: Exception) {
            null
        }
    }

    /** Fallback Legacy: ACTION_VIEW via FileProvider (jalur lama). */
    private fun promptInstallLegacy(file: File) {
        val uri = FileProvider.getUriForFile(
            context, "${context.packageName}.fileprovider", file,
        )
        context.startActivity(
            Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            },
        )
    }
}
