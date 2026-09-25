package id.ac.itera.ressist

import id.ac.itera.ressist.domain.model.Assignment
import id.ac.itera.ressist.domain.model.TaskBuckets
import id.ac.itera.ressist.domain.model.limitUpcoming
import kotlinx.datetime.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertSame
import kotlin.time.Duration.Companion.days

class TaskHorizonTest {
    private val now = Instant.parse("2026-09-25T00:00:00Z")

    private fun task(id: String, deadline: Instant, completed: Boolean = false) = Assignment(
        id = id, title = id, course = null, classCode = null, deadline = deadline,
        completed = completed, completedAt = null, source = null, description = null, url = null,
    )

    private val buckets = TaskBuckets(
        overdue = listOf(task("lewat", now - 3.days)),
        upcoming = listOf(
            task("d5", now + 5.days),
            task("d14", now + 14.days),
            task("d20", now + 20.days),
            task("d40", now + 40.days),
            task("tanpa", Instant.DISTANT_FUTURE),
        ),
        done = listOf(task("jauh-selesai", now + 90.days, completed = true)),
    )

    @Test
    fun nullShowsAll() {
        assertSame(buckets, buckets.limitUpcoming(null, now))
    }

    @Test
    fun hidesUpcomingBeyondLimit() {
        val out = buckets.limitUpcoming(14, now)
        assertEquals(listOf("d5", "d14", "tanpa"), out.upcoming.map { it.id })
        assertEquals(buckets.overdue, out.overdue)
        assertEquals(buckets.done, out.done)
    }

    @Test
    fun widerLimitKeepsMore() {
        assertEquals(listOf("d5", "d14", "d20", "tanpa"), buckets.limitUpcoming(28, now).upcoming.map { it.id })
    }
}
