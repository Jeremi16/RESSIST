package id.ac.itera.ressist.api

import id.ac.itera.ressist.api.dto.ApiErrorCodes
import id.ac.itera.ressist.api.dto.ApiErrorDto
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.request
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.isSuccess

/** Maps non-2xx responses to typed exceptions. */
suspend fun throwForStatus(response: HttpResponse): Nothing {
    val status = response.status.value
    val err = runCatching { response.body<ApiErrorDto>() }.getOrElse { ApiErrorDto() }
    val code = err.error.ifBlank { "unknown" }
    val msg = err.message ?: err.details ?: code
    throw when (status) {
        400 -> if (code.contains("google", ignoreCase = true) || code.contains("classroom", ignoreCase = true)) {
            ClassroomReadOnlyException(msg)
        } else {
            ValidationException(code, msg)
        }
        401 -> UnauthorizedException(code, msg)
        403 -> if (code == ApiErrorCodes.EMAIL_DOMAIN_NOT_ALLOWED) {
            DomainNotAllowedException(msg)
        } else {
            ForbiddenException(code, msg)
        }
        404 -> NotFoundException(code, msg)
        409 -> if (code == ApiErrorCodes.USER_IDENTITY_CONFLICT) {
            IdentityConflictException(msg)
        } else {
            RessistApiException(status, code, msg)
        }
        429 -> RateLimitedException(msg)
        else -> if (status >= 500) ServerException(status, code, msg) else RessistApiException(status, code, msg)
    }
}

suspend inline fun <reified T> HttpResponse.bodyOrThrow(): T {
    if (!status.isSuccess()) throwForStatus(this)
    try {
        return body()
    } catch (e: kotlinx.serialization.SerializationException) {
        // Backend shape drift (see LenientSerializers): surface as a typed
        // error with a readable message instead of a raw crash dump.
        throw RessistApiException(
            status.value,
            "invalid_response",
            "Respons server tak dikenali: ${e.message?.take(160)}",
        )
    }
}

/**
 * Authenticated client: adds Bearer, retries once after silent refresh on 401,
 * then throws [SessionExpiredException] (caller navigates to Login).
 */
class AuthedHttpClient(
    @PublishedApi internal val client: HttpClient,
    @PublishedApi internal val storage: id.ac.itera.ressist.data.SessionStorage,
    @PublishedApi internal val refresher: TokenRefresher,
    @PublishedApi internal val baseUrl: String,
) {
    suspend inline fun <reified T> get(
        path: String,
        params: Map<String, String?> = emptyMap(),
    ): T = executeWithRefresh(HttpMethod.Get, path, params, null).bodyOrThrow()

    suspend inline fun <reified T> post(path: String): T =
        executeWithRefresh(HttpMethod.Post, path, emptyMap(), null).bodyOrThrow()

    suspend inline fun <reified T, reified B> post(path: String, body: B): T =
        executeWithRefresh(
            HttpMethod.Post, path, emptyMap(),
            RessistJson.encodeToString(kotlinx.serialization.serializer(), body),
        ).bodyOrThrow()

    suspend inline fun <reified T, reified B> put(path: String, body: B): T =
        executeWithRefresh(
            HttpMethod.Put, path, emptyMap(),
            RessistJson.encodeToString(kotlinx.serialization.serializer(), body),
        ).bodyOrThrow()

    @PublishedApi
    internal suspend fun executeWithRefresh(
        method: HttpMethod,
        path: String,
        params: Map<String, String?>,
        rawBody: String?,
        retry: Boolean = true,
    ): HttpResponse {
        val token = storage.accessToken()
        val response = client.request("$baseUrl$path") {
            this.method = method
            params.forEach { (k, v) -> if (v != null) parameter(k, v) }
            if (token != null) header(HttpHeaders.Authorization, "Bearer $token")
            header("X-Request-ID", randomUuid())
            if (rawBody != null) setBody(rawBody)
        }
        // The refresh endpoint itself must not trigger a refresh (recursion).
        // Every other 401 (including /v1/auth/me, /v1/auth/sync) retries once
        // after silent refresh, mirroring the web BFF behaviour.
        if (response.status == HttpStatusCode.Unauthorized && retry && !path.startsWith("/v1/auth/refresh")) {
            refresher.refreshOrThrow()
            return executeWithRefresh(method, path, params, rawBody, retry = false)
        }
        return response
    }
}

/** Random request id (echoed by server logging); no platform dep needed. */
fun randomUuid(): String {
    val hex = "0123456789abcdef"
    fun rnd(n: Int) = (1..n).map { hex[kotlin.random.Random.nextInt(16)] }.joinToString("")
    return "${rnd(8)}-${rnd(4)}-4${rnd(3)}-8${rnd(3)}-${rnd(12)}"
}
