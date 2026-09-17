package id.ac.itera.ressist.api

import id.ac.itera.ressist.api.dto.GoogleNativeRequest
import id.ac.itera.ressist.api.dto.RefreshRequest
import id.ac.itera.ressist.api.dto.TokenResponseDto
import io.ktor.client.HttpClient
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody

/**
 * Raw (unauthenticated) auth endpoints. Uses the bare [HttpClient], never
 * [AuthedHttpClient] — otherwise refresh would recurse into itself.
 */
class AuthApi(
    private val client: HttpClient,
    private val baseUrl: String,
) {
    /** Exchange Google server_auth_code → access + refresh tokens. */
    suspend fun googleNative(serverAuthCode: String): TokenResponseDto {
        require(serverAuthCode.isNotBlank()) { "server_auth_code is required" }
        return client.post("$baseUrl/v1/auth/google/native") {
            header("X-Request-ID", randomUuid())
            setBody(GoogleNativeRequest(serverAuthCode))
        }.bodyOrThrow()
    }

    /**
     * Refresh. Backend accepts the token via header OR body — we send both.
     * Throws [UnauthorizedException] when the refresh token is
     * missing/invalid/expired/reused.
     */
    suspend fun refresh(refreshToken: String): TokenResponseDto {
        return client.post("$baseUrl/v1/auth/refresh") {
            header("X-Refresh-Token", refreshToken)
            header("X-Request-ID", randomUuid())
            setBody(RefreshRequest(refreshToken))
        }.bodyOrThrow()
    }

    /** Best-effort server-side revocation (caller clears storage regardless). */
    suspend fun logout(refreshToken: String?) {
        runCatching {
            client.post("$baseUrl/v1/auth/logout") {
                if (refreshToken != null) header("X-Refresh-Token", refreshToken)
                header("X-Request-ID", randomUuid())
            }
        }
    }
}
