package id.ac.itera.ressist.api.dto

import kotlinx.serialization.Serializable

/** Mirror backend GET /v1/courses → {courses:[{id,name}]}. */
@Serializable
data class CourseDto(
    val id: String = "",
    val name: String = "",
)

@Serializable
data class CoursesResponseDto(
    val courses: List<CourseDto> = emptyList(),
)

@Serializable
data class SuccessDto(
    val success: Boolean = false,
)
