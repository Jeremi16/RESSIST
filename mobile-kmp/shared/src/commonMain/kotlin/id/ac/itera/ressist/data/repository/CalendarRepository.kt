package id.ac.itera.ressist.data.repository

import id.ac.itera.ressist.api.CalendarApi
import id.ac.itera.ressist.api.CalendarSort
import id.ac.itera.ressist.api.dto.CalendarPreviewDto
import id.ac.itera.ressist.data.InMemoryJsonCache
import id.ac.itera.ressist.data.OfflineCache
import id.ac.itera.ressist.data.toDomain
import id.ac.itera.ressist.domain.model.CalendarPreview

class CalendarRepository(
    private val api: CalendarApi,
    private val cache: OfflineCache = OfflineCache(InMemoryJsonCache()),
) {
    /** force=true (sinkron LMS) tidak di-fallback ke cache: harus benar-benar sukses. */
    suspend fun preview(
        force: Boolean = false,
        sort: CalendarSort = CalendarSort.DEADLINE_ASC,
    ): CalendarPreview =
        if (force) {
            api.preview(true, sort).toDomain()
        } else {
            cache.fetch("calendar_${sort.param}", CalendarPreviewDto.serializer()) { api.preview(false, sort) }
                .toDomain()
        }

    suspend fun testConnection(
        moodleCalendarUrl: String? = null,
        testMoodle: Boolean = false,
        testGoogle: Boolean = false,
    ): CalendarPreview = api.test(moodleCalendarUrl, testMoodle, testGoogle).toDomain()
}
