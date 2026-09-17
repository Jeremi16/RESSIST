package id.ac.itera.ressist.data.repository

import id.ac.itera.ressist.api.CalendarApi
import id.ac.itera.ressist.api.CalendarSort
import id.ac.itera.ressist.data.toDomain
import id.ac.itera.ressist.domain.model.CalendarPreview

class CalendarRepository(private val api: CalendarApi) {
    suspend fun preview(
        force: Boolean = false,
        sort: CalendarSort = CalendarSort.DEADLINE_ASC,
    ): CalendarPreview = api.preview(force, sort).toDomain()

    suspend fun testConnection(
        moodleCalendarUrl: String? = null,
        testMoodle: Boolean = false,
        testGoogle: Boolean = false,
    ): CalendarPreview = api.test(moodleCalendarUrl, testMoodle, testGoogle).toDomain()
}
