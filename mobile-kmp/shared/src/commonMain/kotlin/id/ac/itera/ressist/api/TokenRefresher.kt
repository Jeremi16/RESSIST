package id.ac.itera.ressist.api

import id.ac.itera.ressist.data.SessionStorage

/**
 * Silent refresh: 401 on an authed call → refresh once → retry.
 * Any failure wipes the session and throws [SessionExpiredException]
 * (UI navigates to Login with reason=session-expired).
 */
class TokenRefresher(
    private val authApi: AuthApi,
    private val storage: SessionStorage,
) {
    suspend fun refreshOrThrow() {
        val refresh = storage.refreshToken()
        if (refresh.isNullOrBlank()) {
            storage.clear()
            throw SessionExpiredException()
        }
        try {
            val tokens = authApi.refresh(refresh)
            // Backend rotates mobile refresh tokens; keep the old one only
            // when the response carries no new one.
            storage.save(
                access = tokens.accessToken,
                refresh = tokens.refreshToken ?: refresh,
                expiresAt = tokens.expiresAt,
            )
        } catch (e: Exception) {
            storage.clear()
            throw SessionExpiredException(e)
        }
    }
}
