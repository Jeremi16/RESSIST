package id.ac.itera.ressist.domain.time

import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlin.time.Duration.Companion.hours

/** Staleness threshold mirrors the web Dashboard warning (>6h since sync). */
private const val STALE_AFTER_HOURS = 6L

fun parseInstantOrNull(raw: String?): Instant? =
    raw?.takeIf { it.isNotBlank() }?.let {
        runCatching { Instant.parse(it) }.getOrNull()
    }

/** Null last-sync counts as stale (forces first sync, like the web flow). */
fun isStale(lastSyncedAt: Instant?, now: Instant = Clock.System.now()): Boolean {
    if (lastSyncedAt == null) return true
    return (now - lastSyncedAt) > STALE_AFTER_HOURS.hours
}

/** Backend stores reminder_hours as a string, e.g. "[24,12]". */
fun parseReminderHours(raw: String?): List<Int> {
    if (raw.isNullOrBlank()) return listOf(24, 12)
    val hours = Regex("\\d+").findAll(raw).map { it.value.toInt() }.toList()
    return hours.ifEmpty { listOf(24, 12) }
}

fun encodeReminderHours(hours: List<Int>): String = "[${hours.joinToString(",")}]"

/** Indonesian relative deadline label for list rows. Never throws on sentinel values. */
fun formatTimeRemainingId(deadline: Instant, now: Instant = Clock.System.now()): String {
    if (deadline == Instant.DISTANT_FUTURE) return "Tanpa deadline"
    if (deadline == Instant.DISTANT_PAST) return "Terlewat"
    val diff = runCatching { deadline - now }.getOrElse { return "Tanpa deadline" }
    if (diff.isNegative()) {
        val late = -diff
        return when {
            late.inWholeMinutes < 1 -> "Baru saja terlewat"
            late.inWholeMinutes < 60 -> "Terlewat ${late.inWholeMinutes} mnt"
            late.inWholeHours < 24 -> "Terlewat ${late.inWholeHours} jam"
            else -> "Terlewat ${late.inWholeDays} hari"
        }
    }
    return when {
        diff.inWholeMinutes < 1 -> "Segera"
        diff.inWholeMinutes < 60 -> "${diff.inWholeMinutes} mnt lagi"
        diff.inWholeHours < 24 -> "${diff.inWholeHours} jam lagi"
        diff.inWholeDays == 1L -> dayLabelForTomorrow(deadline, now, diff)
        else -> "${diff.inWholeDays} hari lagi"
    }
}

/**
 * Label untuk bucket "1 hari": deadline 00.00 WIB jadi "Hari ini",
 * selain itu jadi "besok" hanya bila selisih <=24 jam dan beda hari WIB.
 */
private fun dayLabelForTomorrow(
    deadline: Instant,
    now: Instant,
    diff: kotlin.time.Duration,
): String {
    runCatching {
        val wib = TimeZone.of("Asia/Jakarta")
        val dl = deadline.toLocalDateTime(wib)
        val r = now.toLocalDateTime(wib)
        if (dl.hour == 0 && dl.minute == 0) return "Hari ini"
        if (diff <= 24.hours && dl.date != r.date) return "besok"
    }
    return "1 hari lagi"
}

/**
 * Alarm instants for one deadline given the user's reminder_hours.
 * F4's ReminderScheduler filters out past instants before scheduling.
 */
fun reminderInstants(deadline: Instant, hoursBefore: List<Int>): List<Instant> =
    hoursBefore.map { deadline - it.hours }

/**
 * Label Indonesia untuk "terakhir sync" (epoch millis DataStore atau
 * Instant server). 0/null = belum pernah.
 */
fun formatLastSyncId(lastSuccessMillis: Long, nowMillis: Long = Clock.System.now().toEpochMilliseconds()): String {
    if (lastSuccessMillis <= 0) return "Belum pernah"
    val diff = nowMillis - lastSuccessMillis
    if (diff < 0) return "Baru saja"
    return when {
        diff < 60_000 -> "Baru saja"
        diff < 3_600_000 -> "${diff / 60_000} mnt lalu"
        diff < 86_400_000 -> "${diff / 3_600_000} jam lalu"
        else -> "${diff / 86_400_000} hari lalu"
    }
}
