package id.ac.itera.ressist.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Mirror backend GET /v1/assignments item (server already filters + sorts). */
@Serializable
data class AssignmentDto(
    val id: String = "",
    val title: String = "",
    @SerialName("full_title") val fullTitle: String? = null,
    val course: String? = null,
    @SerialName("original_course") val originalCourse: String? = null,
    @SerialName("class_code") val classCode: String? = null,
    val deadline: String = "",
    val completed: Boolean = false,
    @SerialName("completed_at") val completedAt: String? = null,
    val status: String? = null,
    @SerialName("status_updated_at") val statusUpdatedAt: String? = null,
    val source: String? = null,
    val description: String? = null,
    val url: String? = null,
)

@Serializable
data class CompleteAssignmentRequest(
    @SerialName("assignment_id") val assignmentId: String,
)

@Serializable
data class CompleteAssignmentResponse(
    val success: Boolean = false,
    val message: String? = null,
    @SerialName("completed_at") val completedAt: String? = null,
)
