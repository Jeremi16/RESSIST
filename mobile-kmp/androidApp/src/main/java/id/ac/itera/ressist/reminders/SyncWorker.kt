package id.ac.itera.ressist.reminders

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

/**
 * Periodic refresh (6h): rebuilds local alarms from server data.
 * No-ops silently when logged out (repositories throw SessionExpired).
 */
class SyncWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params), KoinComponent {

    companion object {
        const val PERIODIC = "ressist-sync-periodic"
        const val ONE_SHOT = "ressist-sync-once"
    }

    private val scheduler: ReminderScheduler by inject()

    override suspend fun doWork(): Result {
        runCatching { scheduler.rescheduleAll() }
        return Result.success()
    }
}
