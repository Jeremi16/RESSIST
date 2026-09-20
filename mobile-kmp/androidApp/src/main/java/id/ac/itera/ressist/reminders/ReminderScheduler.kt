package id.ac.itera.ressist.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import id.ac.itera.ressist.data.repository.AssignmentRepository
import id.ac.itera.ressist.data.repository.UserRepository
import id.ac.itera.ressist.domain.model.TaskBuckets
import id.ac.itera.ressist.domain.time.reminderInstants
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.time.Duration.Companion.hours

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
        private const val BRIEFING_ID = "morning-briefing"
        private val JAKARTA: ZoneId = ZoneId.of("Asia/Jakarta")
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
                        // Hitung dari waktu bunyi (fire instant), bukan waktu
                        // penjadwalan, agar label "besok"/"Hari ini" benar
                        // saat notifikasi tampil.
                        text = "${task.course ?: "Tugas"} • ${formatCountdown(task.deadline, instant)}",
                    )
                }
            }
        }
        if (user.morningBriefing) {
            scheduleMorningBriefing(now, buckets)
        }
    }

    /**
     * Alarm harian 07:00 WIB berisi ringkasan tugas hari ini (notifikasi lokal,
     * pengganti briefing via bot). Dijadwalkan ulang tiap sync/save/reboot
     * sehingga isi ringkasan selalu segar.
     */
    private fun scheduleMorningBriefing(now: Instant, buckets: TaskBuckets) {
        val nowJava = java.time.Instant.ofEpochMilli(now.toEpochMilliseconds())
        var target = nowJava.atZone(JAKARTA).toLocalDate().atTime(7, 0).atZone(JAKARTA)
        if (!target.toInstant().isAfter(nowJava)) target = target.plusDays(1)
        val today: LocalDate = target.toLocalDate()
        fun isToday(deadline: Instant): Boolean {
            if (deadline == Instant.DISTANT_FUTURE || deadline == Instant.DISTANT_PAST) return false
            return java.time.Instant.ofEpochMilli(deadline.toEpochMilliseconds())
                .atZone(JAKARTA).toLocalDate() == today
        }
        val overdueCount = buckets.overdue.size
        val todayCount = buckets.upcoming.count { isToday(it.deadline) }
        val text = when {
            todayCount > 0 && overdueCount > 0 -> "$todayCount tugas hari ini • $overdueCount terlewat"
            todayCount > 0 -> "$todayCount tugas deadline hari ini"
            overdueCount > 0 -> "$overdueCount tugas terlewat — kejar hari ini"
            else -> "Tidak ada deadline hari ini. Tetap semangat!"
        }
        schedule(
            at = Instant.fromEpochMilliseconds(target.toInstant().toEpochMilli()),
            assignmentId = BRIEFING_ID,
            title = "Morning Briefing",
            text = text,
        )
    }

    private fun formatCountdown(deadline: Instant, ref: Instant): String {
        val diff = deadline - ref
        val hours = diff.inWholeHours
        if (hours < 1) return "kurang dari 1 jam lagi"
        if (hours < 24) return "$hours jam lagi"
        val days = hours / 24
        if (days == 1L) {
            runCatching {
                val dl = java.time.Instant.ofEpochMilli(deadline.toEpochMilliseconds()).atZone(JAKARTA)
                val r = java.time.Instant.ofEpochMilli(ref.toEpochMilliseconds()).atZone(JAKARTA)
                // Deadline 00.00 WIB tidak boleh jadi "besok": tampilkan "Hari ini".
                if (dl.hour == 0 && dl.minute == 0) return "Hari ini"
                // "1 hari" jadi "besok" hanya bila selisih <=24 jam dan beda hari WIB.
                if (diff <= 24.hours && dl.toLocalDate() != r.toLocalDate()) return "besok"
            }
            return "1 hari lagi"
        }
        return "$days hari lagi"
    }
}
