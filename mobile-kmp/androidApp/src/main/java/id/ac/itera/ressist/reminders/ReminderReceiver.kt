package id.ac.itera.ressist.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import id.ac.itera.ressist.data.repository.AssignmentRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.datetime.Clock
import org.koin.core.context.GlobalContext

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val title = intent?.getStringExtra(ReminderScheduler.EXTRA_TITLE) ?: "Pengingat tugas"
        val text = intent?.getStringExtra(ReminderScheduler.EXTRA_TEXT) ?: "Ada deadline mendekat"
        val id = intent?.getIntExtra(ReminderScheduler.EXTRA_CODE, 0) ?: 0
        val assignmentId = intent?.getStringExtra(ReminderScheduler.EXTRA_ASSIGNMENT_ID)
        val app = context.applicationContext
        when (intent?.action) {
            ReminderScheduler.ACTION_REMIND ->
                if (intent.getBooleanExtra(ReminderScheduler.EXTRA_SNOOZED, false) && assignmentId != null) {
                    fireSnoozed(app, id, title, text, assignmentId)
                } else {
                    NotificationHelper.notify(app, id, title, text, assignmentId)
                }
            ReminderScheduler.ACTION_SNOOZE -> {
                NotificationManagerCompat.from(app).cancel(id)
                if (assignmentId != null) {
                    GlobalContext.get().get<ReminderScheduler>().snooze(assignmentId, title, text)
                }
            }
        }
    }

    /**
     * Pengingat tunda: cek ulang tugasnya saat berbunyi. Tugas yang sudah
     * selesai/terhapus dilewati, dan sisa waktu dihitung ulang. Gagal memuat
     * data → tetap tampilkan teks tersimpan agar pengingat tidak hilang.
     */
    private fun fireSnoozed(context: Context, id: Int, title: String, text: String, assignmentId: String) {
        val pending = goAsync()
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            try {
                val koin = GlobalContext.get()
                val scheduler = koin.get<ReminderScheduler>()
                scheduler.clearSnooze(assignmentId)
                val tasks = withTimeoutOrNull(FETCH_TIMEOUT_MS) {
                    runCatching { koin.get<AssignmentRepository>().list() }.getOrNull()
                }
                if (tasks == null) {
                    NotificationHelper.notify(context, id, title, text, assignmentId)
                    return@launch
                }
                val task = tasks.firstOrNull { it.id == assignmentId }
                if (task == null || task.completed) return@launch
                val now = Clock.System.now()
                val countdown = if (task.deadline <= now) {
                    "deadline sudah lewat"
                } else {
                    scheduler.formatCountdown(task.deadline, now)
                }
                NotificationHelper.notify(
                    context, id, title, "${task.course ?: "Tugas"} • $countdown", assignmentId,
                )
            } finally {
                pending.finish()
            }
        }
    }

    private companion object {
        // goAsync hanya diberi sekitar 10 detik oleh sistem.
        const val FETCH_TIMEOUT_MS = 8_000L
    }
}
