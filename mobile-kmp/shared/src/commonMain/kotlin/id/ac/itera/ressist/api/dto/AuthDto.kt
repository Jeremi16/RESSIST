package id.ac.itera.ressist.api.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Mirror backend POST /v1/auth/google/native + POST /v1/auth/refresh. */
@Serializable
data class GoogleNativeRequest(
    @SerialName("server_auth_code") val serverAuthCode: String,
)

@Serializable
data class RefreshRequest(
    @SerialName("refresh_token") val refreshToken: String,
)

@Serializable
data class AuthUserDto(
    val id: String = "",
    val email: String = "",
    val name: String = "",
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("email_verified") val emailVerified: Boolean? = null,
)

@Serializable
data class TokenResponseDto(
    @SerialName("access_token") val accessToken: String = "",
    @SerialName("token_type") val tokenType: String = "Bearer",
    @SerialName("expires_at") val expiresAt: String? = null,
    /** Present on native login; on refresh only for mobile (rotated). */
    @SerialName("refresh_token") val refreshToken: String? = null,
    val user: AuthUserDto = AuthUserDto(),
)

@Serializable
data class NewAssignmentDto(
    val title: String = "",
    val course: String? = null,
    val deadline: String? = null,
    val source: String? = null,
)

/**
 * POST /v1/auth/sync response. Backend has two shapes (legacy + current);
 * all fields optional so both parse.
 */
@Serializable
data class SyncResponseDto(
    @SerialName("total_events") val totalEvents: Int = 0,
    @SerialName("totalEvents") val totalEventsAlt: Int = 0,
    @SerialName("new_assignments") val newAssignments: List<NewAssignmentDto> = emptyList(),
    @SerialName("newAssignments") val newAssignmentsAlt: List<NewAssignmentDto> = emptyList(),
    val synced: Boolean? = null,
    val message: String? = null,
)
