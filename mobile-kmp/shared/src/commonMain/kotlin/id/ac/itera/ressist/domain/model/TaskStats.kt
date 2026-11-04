package id.ac.itera.ressist.domain.model

import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.days

data class CourseStats(
    val course: String?,
    val done: Int,
    val overdue: Int,
    val upcoming: Int,
) {
    val total: Int get() = done + overdue + upcoming
    val completionRate: Float get() = if (total > 0) done.toFloat() / total else 0f
}

data class TaskStats(
    val total: Int,
    val done: Int,
    val overdue: Int,
    val upcoming: Int,
    val dueThisWeek: Int,
    /** Selesai sebelum/tepat deadline. Tugas tanpa waktu selesai tidak dihitung. */
    val doneOnTime: Int,
    val doneLate: Int,
    /** Yang paling banyak terlewat lebih dulu, lalu yang paling banyak tugasnya. */
    val courses: List<CourseStats>,
) {
    val completionRate: Float get() = if (total > 0) done.toFloat() / total else 0f
    val onTimeKnown: Int get() = doneOnTime + doneLate
    val onTimeRate: Float get() = if (onTimeKnown > 0) doneOnTime.toFloat() / onTimeKnown else 0f
}

fun List<Assignment>.toTaskStats(now: Instant): TaskStats {
    val buckets = bucketize(now)
    val timed = buckets.done.filter {
        it.completedAt != null && it.deadline != Instant.DISTANT_FUTURE && it.deadline != Instant.DISTANT_PAST
    }
    val doneLate = timed.count { it.completedAt!! > it.deadline }
    val weekEnd = now + 7.days
    return TaskStats(
        total = buckets.total,
        done = buckets.done.size,
        overdue = buckets.overdue.size,
        upcoming = buckets.upcoming.size,
        dueThisWeek = buckets.upcoming.count { it.deadline <= weekEnd },
        doneOnTime = timed.size - doneLate,
        doneLate = doneLate,
        courses = groupBy { it.course?.trim()?.ifEmpty { null } }
            .map { (course, tasks) ->
                val b = tasks.bucketize(now)
                CourseStats(course, b.done.size, b.overdue.size, b.upcoming.size)
            }
            .sortedWith(compareByDescending<CourseStats> { it.overdue }.thenByDescending { it.total }),
    )
}
