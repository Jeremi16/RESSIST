package id.ac.itera.ressist.data.repository

import id.ac.itera.ressist.api.CourseApi
import id.ac.itera.ressist.data.toDomain
import id.ac.itera.ressist.domain.model.Course

class CourseRepository(private val api: CourseApi) {
    suspend fun list(): List<Course> = api.list().map { it.toDomain() }
}
