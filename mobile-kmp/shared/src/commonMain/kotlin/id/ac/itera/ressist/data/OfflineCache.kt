package id.ac.itera.ressist.data

import id.ac.itera.ressist.api.RessistApiException
import id.ac.itera.ressist.api.RessistJson
import id.ac.itera.ressist.api.ServerException
import id.ac.itera.ressist.api.SessionExpiredException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable

/**
 * Penyimpanan key → JSON mentah untuk cache offline. Common interface agar
 * androidApp bisa pakai file ([InMemoryJsonCache] untuk tests/default).
 */
interface JsonCache {
    suspend fun read(key: String): String?
    suspend fun write(key: String, value: String)
    suspend fun clear()
}

class InMemoryJsonCache : JsonCache {
    private val map = mutableMapOf<String, String>()
    override suspend fun read(key: String): String? = map[key]
    override suspend fun write(key: String, value: String) { map[key] = value }
    override suspend fun clear() = map.clear()
}

@Serializable
private data class CacheEntry(val savedAt: String, val data: kotlinx.serialization.json.JsonElement)

/**
 * Stale-while-offline: fetch sukses → simpan; gagal karena jaringan/5xx →
 * kembalikan data terakhir dan tandai [offlineSince]. Error 4xx/sesi
 * habis tetap dilempar (bukan masalah koneksi).
 */
class OfflineCache(
    private val store: JsonCache,
    private val now: () -> Instant = { Clock.System.now() },
) {
    private val _offlineSince = MutableStateFlow<Instant?>(null)

    /** Waktu data cache yang sedang ditampilkan; null = data live. */
    val offlineSince: StateFlow<Instant?> = _offlineSince.asStateFlow()

    suspend fun <T> fetch(key: String, serializer: KSerializer<T>, remote: suspend () -> T): T {
        try {
            val fresh = remote()
            runCatching {
                val entry = CacheEntry(now().toString(), RessistJson.encodeToJsonElement(serializer, fresh))
                store.write(key, RessistJson.encodeToString(CacheEntry.serializer(), entry))
            }
            _offlineSince.value = null
            return fresh
        } catch (e: Throwable) {
            if (!isConnectivityFailure(e)) throw e
            val cached = runCatching {
                store.read(key)?.let { raw ->
                    val entry = RessistJson.decodeFromString(CacheEntry.serializer(), raw)
                    Instant.parse(entry.savedAt) to RessistJson.decodeFromJsonElement(serializer, entry.data)
                }
            }.getOrNull() ?: throw e
            _offlineSince.value = cached.first
            return cached.second
        }
    }

    suspend fun clear() {
        runCatching { store.clear() }
        _offlineSince.value = null
    }

    companion object {
        fun isConnectivityFailure(e: Throwable): Boolean = when (e) {
            is CancellationException, is SessionExpiredException -> false
            is ServerException -> true
            is RessistApiException -> false
            else -> true // IO/timeout/UnknownHost dari engine
        }
    }
}
