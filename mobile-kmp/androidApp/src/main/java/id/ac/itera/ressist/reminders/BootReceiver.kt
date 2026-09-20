package id.ac.itera.ressist.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import id.ac.itera.ressist.data.SyncPrefs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.koin.core.context.GlobalContext

/**
 * After reboot, alarms are gone — re-enqueue a sync to rebuild them.
 * Hormati mode Manual: jika user mematikan auto-sync, jangan jadwalkan ulang.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                val koin = runCatching { GlobalContext.get() }.getOrNull()
                // Koin belum siap sesaat setelah boot → fallback: one-shot langsung.
                if (koin == null) {
                    SyncManager(context.applicationContext, SyncPrefs(context.applicationContext))
                        .syncNow(notify = false)
                    return@launch
                }
                val prefs: SyncPrefs = koin.get()
                if (prefs.intervalOnce() == SyncPrefs.MANUAL) return@launch
                koin.get<SyncManager>().syncNow(notify = false)
            } catch (_: Exception) {
            } finally {
                pending.finish()
            }
        }
    }
}
