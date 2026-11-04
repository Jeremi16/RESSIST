package id.ac.itera.ressist

import id.ac.itera.ressist.domain.model.Assignment
import id.ac.itera.ressist.domain.model.toTaskStats
import kotlinx.datetime.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.time.Duration.Companion.days

class TaskStatsTest {
    private val now = Instant.parse("2026-09-25T00:00:00Z")

    private fun task(
        deadline: Instant,
        course: String? = "Kalkulus",
        completed: Boolean = false,
        completedAt: Instant? = null,
    ) = Assignment(
        id = "$deadline$course$completed", title = "t", course = course, classCode = null, deadline = deadline,
        completed = completed, completedAt = completedAt, source = null, description = null, url = null,
    )

    @Test
    fun emptyListHasZeroRates() {
        val stats = emptyList<Assignment>().toTaskStats(now)
        assertEquals(0, stats.total)
        assertEquals(0f, stats.completionRate)
        assertEquals(0f, stats.onTimeRate)
    }

    @Test
    fun countsBucketsAndThisWeek() {
        val stats = listOf(
            task(now - 1.days),
            task(now + 3.days),
            task(now + 7.days),
            task(now + 8.days),
            task(Instant.DISTANT_FUTURE),
        ).toTaskStats(now)
        assertEquals(1, stats.overdue)
        assertEquals(4, stats.upcoming)
        assertEquals(2, stats.dueThisWeek)
    }

    @Test
    fun onTimeIgnoresUnknownCompletion() {
        val deadline = now - 5.days
        val stats = listOf(
            task(deadline, completed = true, completedAt = deadline - 1.days),
            task(deadline, course = "A", completed = true, completedAt = deadline),
            task(deadline, course = "B", completed = true, completedAt = deadline + 1.days),
            task(deadline, course = "C", completed = true, completedAt = null),
            task(Instant.DISTANT_PAST, course = "D", completed = true, completedAt = now),
        ).toTaskStats(now)
        assertEquals(5, stats.done)
        assertEquals(2, stats.doneOnTime)
        assertEquals(1, stats.doneLate)
        assertEquals(2f / 3f, stats.onTimeRate)
    }

    @Test
    fun coursesSortedByOverdueThenTotalAndBlankGrouped() {
        val stats = listOf(
            task(now + 1.days, course = "Banyak"),
            task(now + 2.days, course = "Banyak"),
            task(now - 1.days, course = "Terlewat"),
            task(now + 1.days, course = null),
            task(now + 2.days, course = "  "),
            task(now + 3.days, course = null),
        ).toTaskStats(now)
        assertEquals(listOf("Terlewat", null, "Banyak"), stats.courses.map { it.course })
        assertEquals(3, stats.courses[1].total)
    }
}
