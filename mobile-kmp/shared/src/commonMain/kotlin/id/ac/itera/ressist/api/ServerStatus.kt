package id.ac.itera.ressist.api

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpSend
import io.ktor.client.plugins.plugin
import io.ktor.client.plugins.timeout
import io.ktor.client.request.get
import io.ktor.http.isSuccess
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable

sealed interface ServerState {
    data object Up : ServerState
    data object Down : ServerState
    data class Maintenance(val message: String?) : ServerState
}

@Serializable
private data class HealthDto(val status: String = "", val message: String? = null)

/**
 * Tracks whether the RESSIST backend is reachable. Watches every request the
 * shared [HttpClient] sends to [baseUrl] (other hosts, e.g. GitHub releases,
 * are ignored): transport failures and 502/503/504 mark it down, anything
 * else marks it up. [check] probes `/healthz`, which also reports planned
 * maintenance. Exceptions are rethrown unchanged.
 */
class ServerStatusMonitor(
    private val client: HttpClient,
    private val baseUrl: String,
) {
    private val _state = MutableStateFlow<ServerState>(ServerState.Up)
    val state: StateFlow<ServerState> = _state.asStateFlow()

    init {
        client.plugin(HttpSend).intercept { request ->
            val url = request.url.buildString()
            if (!url.startsWith(baseUrl)) return@intercept execute(request)
            try {
                execute(request).also { record(it.response.status.value) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                _state.value = ServerState.Down
                throw e
            }
        }
    }

    // The body is left unread so callers can still parse it; a 503 marks the
    // server down and the UI's follow-up [check] tells maintenance apart.
    private fun record(status: Int) {
        if (status == 502 || status == 503 || status == 504) {
            if (_state.value == ServerState.Up) _state.value = ServerState.Down
        } else {
            _state.value = ServerState.Up
        }
    }

    /** Probe `/healthz` (also updates [state] through the interceptor). */
    suspend fun check(): ServerState {
        try {
            val response = client.get("$baseUrl/healthz") { timeout { requestTimeoutMillis = 8_000 } }
            if (response.status.isSuccess()) {
                val health = runCatching { response.body<HealthDto>() }.getOrNull()
                _state.value = if (health?.status == "maintenance") {
                    ServerState.Maintenance(health.message)
                } else {
                    ServerState.Up
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Throwable) {
            _state.value = ServerState.Down
        }
        return _state.value
    }
}
