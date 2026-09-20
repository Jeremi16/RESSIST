package id.ac.itera.ressist.reminders

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import id.ac.itera.ressist.api.CalendarApi
import id.ac.itera.ressist.api.RessistApiException
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.api.UnauthorizedException
import id.ac.itera.ressist.data.SyncPrefs
import id.ac.itera.ressist.data.repository.AuthRepository
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

/**
 * Sinkronisasi otomatis berkala (selalu force LMS) + rebuild alarm lokal
 * + notifikasi tugas baru.
 *
 * Flow: POST /v1/auth/sync (dapat newAssignments) → fallback
 * GET /v1/calendar/preview?force=true bila sync gagal → rebuild alarm →
 * catat lastSuccess/lastFail → notif tugas baru (dedup via SyncPrefs).
 * No-op silenc saat logout (SessionExpired) agar tidak retry loop.
 */
class SyncWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params), KoinComponent {

    companion object {
        const val PERIODIC = "ressist-sync-periodic"
        const val ONE_SHOT = "ressist-sync-once"
        const val TAG_SYNC = "ressist-sync"
        const val KEY_NOTIFY = "notify"
        private const val MAX_NOTIFY = 5
    }

    private val auth: AuthRepository by inject()
    private val calendar: CalendarApi by inject()
    private val scheduler: ReminderScheduler by inject()
    private val prefs: SyncPrefs by inject()

    override suspend fun doWork(): Result {
        val notify = inputData.getBoolean(KEY_NOTIFY, true)
        val now = System.currentTimeMillis()

        // 1. Force LMS — sumber utama newAssignments.
        val sync = runCatching { auth.sync() }
        if (sync.isSuccess) {
            val items = sync.getOrNull()?.newAssignments.orEmpty()
            handleNewAssignments(items, notify)
            runCatching { scheduler.rescheduleAll() }
            runCatching { prefs.setLastSuccess(now) }
            return Result.success()
        }
        val err = sync.exceptionOrNull()
        if (err is SessionExpiredException || err is UnauthorizedException) {
            // Logout / sesi mati — no-op, jangan retry.
            return Result.success()
        }
        if (err is RessistApiException && err.code == "no_lms_configured") {
            // Belum ada LMS: cukup rebuild dari cache agar alarm tetap segar.
            runCatching { scheduler.rescheduleAll() }
            runCatching { prefs.setLastSuccess(now) }
            return Result.success()
        }

        // 2. Fallback: preview force (juga memicu SyncProviders di backend).
        val fallback = runCatching { calendar.preview(force = true) }
        if (fallback.isSuccess) {
            runCatching { scheduler.rescheduleAll() }
            runCatching { prefs.setLastSuccess(now) }
            return Result.success()
        }
        val fallbackErr = fallback.exceptionOrNull()
        if (fallbackErr is SessionExpiredException || fallbackErr is UnauthorizedException) {
            return Result.success()
        }

        // 3. Keduanya gagal (offline/server) — catat + retry terbatas.
        runCatching { prefs.setLastFail(now) }
        return if (runAttemptCount < 3) Result.retry() else Result.success()
    }

    private suspend fun handleNewAssignments(
        items: List<id.ac.itera.ressist.domain.model.NewAssignmentInfo>,
        notify: Boolean,
    ) {
        if (items.isEmpty()) return
        val keys = items.map { "${it.title}|${it.deadline}|${it.course}" }
        val known = runCatching { prefs.knownKeysOnce() }.getOrDefault(emptySet())
        // First run: seed baseline tanpa notif agar tidak spam tugas lama.
        if (known.isEmpty()) {
            runCatching { prefs.addKnownKeys(keys) }
            return
        }
        val unseen = items.filterIndexed { i, _ -> !known.contains(keys[i]) }.take(MAX_NOTIFY)
        runCatching { prefs.addKnownKeys(keys) }
        if (!notify || unseen.isEmpty()) return
        val count = unseen.size
        val preview = unseen.take(3).joinToString("\n") {
            "• ${it.title}" + (it.course?.let { c -> " ($c)" } ?: "")
        }
        runCatching {
            NotificationHelper.notifySyncNewTasks(applicationContext, count, preview)
        }
    }
}
