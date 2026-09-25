package id.ac.itera.ressist.domain.model

import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.days

data class AuthAccount(
    val id: String,
    val email: String,
    val name: String,
    val avatarUrl: String? = null,
    /** True bila login ini membuat user baru di backend (login pertama). */
    val isNewUser: Boolean = false,
)

data class Assignment(
    val id: String,
    val title: String,
    val course: String?,
    val classCode: String?,
    val deadline: Instant,
    val completed: Boolean,
    val completedAt: Instant?,
    val source: String?,
    val description: String?,
    val url: String?,
) {
    /** Classroom tasks are read-only on the server (400 on complete). */
    val isReadOnly: Boolean = source?.contains("google", ignoreCase = true) == true
}

/** Mirrors the web Dashboard's 3-column task layout. */
data class TaskBuckets(
    val overdue: List<Assignment>,
    val upcoming: List<Assignment>,
    val done: List<Assignment>,
) {
    val total: Int get() = overdue.size + upcoming.size + done.size
}

fun List<Assignment>.bucketize(now: Instant): TaskBuckets {
    val sorted = sortedBy { it.deadline }
    return TaskBuckets(
        overdue = sorted.filter { !it.completed && it.deadline < now },
        upcoming = sorted.filter { !it.completed && it.deadline >= now },
        done = sorted.filter { it.completed },
    )
}

/**
 * Batas tampilan tugas (Lainnya -> Batas Tampilan Tugas): sembunyikan tugas
 * mendatang yang deadline-nya lebih dari [days] hari lagi. null = semua.
 * Tugas tanpa deadline tetap tampil; terlewat & selesai tidak diubah.
 */
fun TaskBuckets.limitUpcoming(days: Int?, now: Instant): TaskBuckets {
    if (days == null || days <= 0) return this
    val limit = now + days.days
    return copy(
        upcoming = upcoming.filter { it.deadline == Instant.DISTANT_FUTURE || it.deadline <= limit },
    )
}

data class CalendarEvent(
    val id: String,
    val title: String,
    val course: String?,
    val deadline: Instant,
    val source: String?,
    val completed: Boolean,
)

data class CalendarPreview(
    val events: List<CalendarEvent>,
    val total: Int,
    val fromCache: Boolean,
    val lastSyncedAt: Instant?,
)

data class User(
    val id: String,
    val email: String,
    val name: String,
    val avatarUrl: String?,
    val moodleEnabled: Boolean,
    val moodleCalendarUrl: String?,
    val googleClassroomEnabled: Boolean,
    val googleConnected: Boolean,
    val telegramChatId: String?,
    val telegramEnabled: Boolean,
    val reminderHours: List<Int>,
    val morningBriefing: Boolean,
    val mutedCourses: List<String>,
    val courseAliases: Map<String, String>,
    val courseClassFilters: Map<String, String>,
    val classCode: String?,
    val availableClassCodes: List<String>,
    val lmsLastSyncedAt: Instant?,
) {
    val isConnected: Boolean get() = moodleEnabled || googleClassroomEnabled
}

data class Course(val id: String, val name: String)

data class NewAssignmentInfo(
    val title: String,
    val course: String?,
    val deadline: Instant?,
    val source: String?,
)

data class SyncSummary(
    val totalEvents: Int,
    val newAssignments: List<NewAssignmentInfo>,
    val message: String?,
)
