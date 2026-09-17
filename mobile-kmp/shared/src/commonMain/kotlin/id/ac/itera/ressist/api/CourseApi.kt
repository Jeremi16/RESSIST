package id.ac.itera.ressist.api

import id.ac.itera.ressist.api.dto.CourseDto
import id.ac.itera.ressist.api.dto.CoursesResponseDto

class CourseApi(private val http: AuthedHttpClient) {
    suspend fun list(): List<CourseDto> =
        http.get<CoursesResponseDto>("/v1/courses").courses
}
