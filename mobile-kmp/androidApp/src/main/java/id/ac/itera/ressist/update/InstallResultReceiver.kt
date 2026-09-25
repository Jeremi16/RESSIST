package id.ac.itera.ressist.update

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.widget.Toast
import java.io.File

/**
 * Callback status PackageInstaller session (tiru Mihon). Untuk app sideload
 * sistem membalas STATUS_PENDING_USER_ACTION + EXTRA_INTENT yang wajib
 * di-startActivity agar dialog konfirmasi install muncul. Gagal selain
 * dibatalkan user → fallback Legacy ACTION_VIEW.
 */
class InstallResultReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirm = confirmIntent(intent) ?: return
                context.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            }
            PackageInstaller.STATUS_SUCCESS,
            PackageInstaller.STATUS_FAILURE_ABORTED -> Unit
            else -> {
                val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
                Toast.makeText(
                    context,
                    "Pemasangan gagal ($status)${msg?.let { ": $it" } ?: ""}. Mencoba cara lain…",
                    Toast.LENGTH_LONG,
                ).show()
                val file = intent.getStringExtra(EXTRA_APK_PATH)?.let(::File)
                if (file != null && file.exists()) {
                    runCatching { AppUpdater(context).promptInstallLegacy(file) }
                }
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun confirmIntent(intent: Intent): Intent? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
        } else {
            intent.getParcelableExtra(Intent.EXTRA_INTENT)
        }

    companion object {
        const val EXTRA_APK_PATH = "id.ac.itera.ressist.APK_PATH"
    }
}
