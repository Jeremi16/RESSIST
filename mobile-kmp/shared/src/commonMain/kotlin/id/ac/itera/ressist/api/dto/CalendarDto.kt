package id.ac.itera.ressist.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Mirror backend GET /v1/calendar/preview + POST /v1/calendar/test. */
@Serializable
data class EventPreviewDto(
    val id: String = "",
    val title: String = "",
    val course: String? = null,
    val deadline: String = "",
    @SerialName("timeRemaining") val timeRemaining: String? = null,
    @SerialName("deadlineDate") val deadlineDate: String? = null,
    val source: String? = null,
    val completed: Boolean = false,
)

@Serializable
data class CalendarSourceDto(
    val provider: String = "",
    val count: Int = 0,
    val success: Boolean = true,
)

@Serializable
data class CalendarPreviewDto(
    val events: List<EventPreviewDto> = emptyList(),
    val sources: List<CalendarSourceDto> = emptyList(),
    val total: Int = 0,
    val successfulSources: Int = 0,
    val failedSources: Int = 0,
    val fromCache: Boolean = false,
    val lastSyncedAt: String? = null,
    val nextRefreshAt: String? = null,
)

@Serializable
data class TestCalendarRequest(
    @SerialName("moodle_calendar_url") val moodleCalendarUrl: String? = null,
    @SerialName("test_moodle") val testMoodle: Boolean = false,
    @SerialName("test_google") val testGoogle: Boolean = false,
)
