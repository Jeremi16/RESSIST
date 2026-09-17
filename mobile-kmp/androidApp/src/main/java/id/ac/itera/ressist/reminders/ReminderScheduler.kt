package id.ac.itera.ressist.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import id.ac.itera.ressist.data.repository.AssignmentRepository
import id.ac.itera.ressist.data.repository.UserRepository
import id.ac.itera.ressist.domain.time.reminderInstants
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

/**
 * Local deadline reminders (no FCM). Alarms are exact when the OS grants
 * SCHEDULE_EXACT_ALARM, otherwise inexact-but-battery-friendly.
 * Rebuilt from server data by [SyncWorker] every 6h, after login,
 * after reminder-pref changes, and after reboot.
 */
class ReminderScheduler(
    private val context: Context,
    private val assignments: AssignmentRepository,
    private val users: UserRepository,
) {
    companion object {
        const val ACTION_REMIND = "id.ac.itera.ressist.REMIND"
        const val EXTRA_TITLE = "title"
        const val EXTRA_TEXT = "text"
        const val EXTRA_CODE = "code"
        private const val PREFS = "ressist_alarms"
        private const val KEY_CODES = "codes"
        private const val MAX_TASKS = 100
    }

    private val alarmManager: AlarmManager
        get() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private fun prefs() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun rememberCode(code: Int) {
        val set = prefs().getStringSet(KEY_CODES, emptySet())!!.toMutableSet()
        set.add(code.toString())
        prefs().edit().putStringSet(KEY_CODES, set).apply()
    }

    fun cancelAll() {
        val codes = prefs().getStringSet(KEY_CODES, emptySet())!!.mapNotNull { it.toIntOrNull() }
        codes.forEach { code ->
            val intent = PendingIntent.getBroadcast(
                context, code,
                Intent(context, ReminderReceiver::class.java).setAction(ACTION_REMIND),
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
            )
            if (intent != null) alarmManager.cancel(intent)
        }
        prefs().edit().remove(KEY_CODES).apply()
    }

    fun schedule(at: Instant, assignmentId: String, title: String, text: String) {
        val code = "$assignmentId@${at.epochSeconds}".hashCode()
        val intent = PendingIntent.getBroadcast(
            context, code,
            Intent(context, ReminderReceiver::class.java)
                .setAction(ACTION_REMIND)
                .putExtra(EXTRA_TITLE, title)
                .putExtra(EXTRA_TEXT, text)
                .putExtra(EXTRA_CODE, code),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
        if (exact) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP, at.toEpochMilliseconds(), intent,
            )
        } else {
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP, at.toEpochMilliseconds(), intent,
            )
        }
        rememberCode(code)
    }

    /** Rebuild the whole alarm set from current server data + prefs. */
    suspend fun rescheduleAll(now: Instant = Clock.System.now()) {
        cancelAll()
        val user = runCatching { users.get() }.getOrNull() ?: return
        val buckets = runCatching { assignments.buckets(now) }.getOrNull() ?: return
        buckets.upcoming.take(MAX_TASKS).forEach { task ->
            // Skip sentinel deadlines (backend rows without a deadline):
            // toEpochMilliseconds() overflows on them and AlarmManager
            // cannot schedule them anyway.
            if (task.deadline == Instant.DISTANT_FUTURE || task.deadline == Instant.DISTANT_PAST) return@forEach
            reminderInstants(task.deadline, user.reminderHours).forEach { instant ->
                if (instant > now) {
                    schedule(
                        at = instant,
                        assignmentId = task.id,
                        title = "Deadline: ${task.title}",
                        text = "${task.course ?: "Tugas"} • ${formatCountdown(task.deadline, now)}",
                    )
                }
            }
        }
    }

    private fun formatCountdown(deadline: Instant, now: Instant): String {
        val hours = (deadline - now).inWholeHours
        return when {
            hours < 1 -> "kurang dari 1 jam lagi"
            hours < 24 -> "$hours jam lagi"
            else -> "${hours / 24} hari lagi"
        }
    }
}
