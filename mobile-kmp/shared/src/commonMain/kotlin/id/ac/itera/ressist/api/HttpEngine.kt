package id.ac.itera.ressist.api

import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/** Shared JSON config: tolerant to backend shape drift. */
val RessistJson = Json {
    ignoreUnknownKeys = true
    isLenient = true
    coerceInputValues = true
    explicitNulls = false
    encodeDefaults = true
}

/**
 * Engine is injected per platform: androidApp passes OkHttp, iosApp will pass
 * Darwin, tests pass MockEngine. No expect/actual needed.
 */
fun createHttpClient(engine: HttpClientEngine, enableLogging: Boolean = false): HttpClient =
    HttpClient(engine) {
        install(ContentNegotiation) { json(RessistJson) }
        install(HttpTimeout) {
            // Mirrors server TimeoutContext(15s) in backend router.
            requestTimeoutMillis = 15_000
            connectTimeoutMillis = 15_000
            socketTimeoutMillis = 15_000
        }
        install(Logging) {
            level = if (enableLogging) LogLevel.INFO else LogLevel.NONE
            logger = object : Logger {
                override fun log(message: String) = println("HttpClient: $message")
            }
        }
        defaultRequest { contentType(ContentType.Application.Json) }
    }
