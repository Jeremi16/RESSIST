package id.ac.itera.ressist

import id.ac.itera.ressist.domain.time.formatTimeRemainingId
import id.ac.itera.ressist.domain.time.isStale
import id.ac.itera.ressist.domain.time.parseInstantOrNull
import id.ac.itera.ressist.domain.time.parseReminderHours
import id.ac.itera.ressist.domain.time.reminderInstants
import kotlinx.datetime.Instant
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TimeUtilsTest {

    private val now = Instant.parse("2026-09-17T12:00:00Z")

    @Test
    fun stale_nullIsStale() {
        assertTrue(isStale(null, now))
    }

    @Test
    fun stale_thresholdSixHours() {
        assertFalse(isStale(Instant.parse("2026-09-17T08:00:00Z"), now))
        assertTrue(isStale(Instant.parse("2026-09-17T05:59:00Z"), now))
    }

    @Test
    fun reminderHours_parsesBracketString() {
        assertEquals(listOf(24, 12), parseReminderHours("[24,12]"))
        assertEquals(listOf(24, 12, 6, 1), parseReminderHours("[24, 12, 6, 1]"))
        assertEquals(listOf(24, 12), parseReminderHours(null))
        assertEquals(listOf(24, 12), parseReminderHours("garbage"))
    }

    @Test
    fun formatRemaining_indonesianLabels() {
        assertEquals("2 jam lagi", formatTimeRemainingId(Instant.parse("2026-09-17T14:00:00Z"), now))
        assertEquals("3 hari lagi", formatTimeRemainingId(Instant.parse("2026-09-20T12:00:00Z"), now))
        assertEquals("Terlewat 2 jam", formatTimeRemainingId(Instant.parse("2026-09-17T10:00:00Z"), now))
        assertEquals("Terlewat 5 hari", formatTimeRemainingId(Instant.parse("2026-09-12T12:00:00Z"), now))
    }

    @Test
    fun reminderInstants_deadlineMinusHours() {
        val deadline = Instant.parse("2026-09-20T12:00:00Z")
        assertEquals(
            listOf(
                Instant.parse("2026-09-19T12:00:00Z"),
                Instant.parse("2026-09-20T06:00:00Z"),
            ),
            reminderInstants(deadline, listOf(24, 6)),
        )
    }

    @Test
    fun parseInstant_invalidReturnsNull() {
        assertNull(parseInstantOrNull("bukan-tanggal"))
        assertNull(parseInstantOrNull(null))
    }
}
