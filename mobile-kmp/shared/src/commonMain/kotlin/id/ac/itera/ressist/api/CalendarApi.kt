package id.ac.itera.ressist.api

import id.ac.itera.ressist.api.dto.CalendarPreviewDto
import id.ac.itera.ressist.api.dto.TestCalendarRequest

enum class CalendarSort(val param: String) {
    DEADLINE_ASC("deadline_asc"),
    DEADLINE_DESC("deadline_desc"),
    NEWEST("newest"),
    OLDEST("oldest"),
}

class CalendarApi(private val http: AuthedHttpClient) {
    suspend fun preview(
        force: Boolean = false,
        sort: CalendarSort = CalendarSort.DEADLINE_ASC,
    ): CalendarPreviewDto = http.get(
        "/v1/calendar/preview",
        mapOf(
            "force" to if (force) "true" else null,
            "sort" to sort.param,
        ),
    )

    suspend fun test(
        moodleCalendarUrl: String? = null,
        testMoodle: Boolean = false,
        testGoogle: Boolean = false,
    ): CalendarPreviewDto = http.post(
        "/v1/calendar/test",
        TestCalendarRequest(moodleCalendarUrl, testMoodle, testGoogle),
    )
}
