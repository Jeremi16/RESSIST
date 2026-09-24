package id.ac.itera.ressist.data.repository

import id.ac.itera.ressist.api.AuthApi
import id.ac.itera.ressist.api.AuthedHttpClient
import id.ac.itera.ressist.api.dto.AuthUserDto
import id.ac.itera.ressist.api.dto.SyncResponseDto
import id.ac.itera.ressist.data.SessionStorage
import id.ac.itera.ressist.data.toDomain
import id.ac.itera.ressist.domain.model.AuthAccount
import id.ac.itera.ressist.domain.model.SyncSummary

class AuthRepository(
    private val authApi: AuthApi,
    private val http: AuthedHttpClient,
    private val storage: SessionStorage,
) {
    suspend fun hasSession(): Boolean = storage.hasSession()

    /** Full native login: exchange code → persist tokens → return account. */
    suspend fun loginNative(serverAuthCode: String): AuthAccount {
        val tokens = authApi.googleNative(serverAuthCode)
        storage.save(tokens.accessToken, tokens.refreshToken.orEmpty(), tokens.expiresAt)
        return tokens.user.toDomain().copy(isNewUser = tokens.isNewUser)
    }

    suspend fun me(): AuthAccount =
        http.get<AuthUserDto>("/v1/auth/me").toDomain()

    /** Post-login LMS sync (mirrors web sync-lms; drives the "N tugas baru" toast). */
    suspend fun sync(): SyncSummary =
        http.post<SyncResponseDto>("/v1/auth/sync").toDomain()

    /** Revokes server-side best-effort, then always wipes local storage. */
    suspend fun logout() {
        try {
            authApi.logout(storage.refreshToken())
        } finally {
            storage.clear()
        }
    }
}
