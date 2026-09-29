package id.ac.itera.ressist.data.repository

import id.ac.itera.ressist.api.CourseApi
import id.ac.itera.ressist.api.dto.CourseDto
import id.ac.itera.ressist.data.InMemoryJsonCache
import id.ac.itera.ressist.data.OfflineCache
import id.ac.itera.ressist.data.toDomain
import id.ac.itera.ressist.domain.model.Course
import kotlinx.serialization.builtins.ListSerializer

class CourseRepository(
    private val api: CourseApi,
    private val cache: OfflineCache = OfflineCache(InMemoryJsonCache()),
) {
    suspend fun list(): List<Course> =
        cache.fetch("courses", ListSerializer(CourseDto.serializer())) { api.list() }
            .map { it.toDomain() }
}
