package id.ac.itera.ressist.domain.model

import kotlinx.datetime.Instant

data class AuthAccount(
    val id: String,
    val email: String,
    val name: String,
    val avatarUrl: String? = null,
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
