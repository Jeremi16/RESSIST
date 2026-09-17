package id.ac.itera.ressist.api.dto

import kotlinx.serialization.Serializable

/** Backend error envelope: always JSON {"error":"..."} + optional extras. */
@Serializable
data class ApiErrorDto(
    val error: String = "unknown",
    val details: String? = null,
    val message: String? = null,
    val reason: String? = null,
)

/** Well-known error codes returned by the Go API. */
object ApiErrorCodes {
    const val EMAIL_DOMAIN_NOT_ALLOWED = "email_domain_not_allowed"
    const val USER_IDENTITY_CONFLICT = "user_identity_conflict"
    const val MISSING_BEARER_TOKEN = "missing bearer token"
    const val INVALID_ACCESS_TOKEN = "invalid access token"
    const val MISSING_REFRESH_TOKEN = "missing refresh token"
    const val INVALID_REFRESH_TOKEN = "invalid refresh token"
    const val REFRESH_TOKEN_EXPIRED = "refresh token expired"
    const val REFRESH_TOKEN_REUSE_DETECTED = "refresh token reuse detected"
}
