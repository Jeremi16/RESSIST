package id.ac.itera.ressist.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.syncStore by preferencesDataStore("ressist_sync")

/**
 * Preferensi sinkronisasi otomatis (DataStore terpisah agar logout tidak menghapus).
 *
 * Interval dalam menit; 0 = Manual (mati). Minimal 60 (maksimal 1x/jam)
 * sesuai keputusan produk — selalu-force LMS tiap <1 jam terlalu berat
 * untuk baterai + beban Moodle/Classroom.
 */
class SyncPrefs(private val context: Context) {
    companion object {
        const val MANUAL = 0
        const val MIN_INTERVAL_MINUTES = 60
        const val DEFAULT_INTERVAL_MINUTES = 180

        /** Opsi yang ditawarkan ke user: 1h / 3h / 6h / 12h / Manual. */
        val OPTIONS_MINUTES = listOf(60, 180, 360, 720, MANUAL)

        fun sanitizeInterval(minutes: Int): Int {
            if (minutes == MANUAL) return MANUAL
            return maxOf(minutes, MIN_INTERVAL_MINUTES)
        }

        fun labelFor(minutes: Int): String = when (minutes) {
            60 -> "Tiap 1 jam"
            180 -> "Tiap 3 jam"
            360 -> "Tiap 6 jam"
            720 -> "Tiap 12 jam"
            MANUAL -> "Manual"
            else -> "Tiap ${minutes / 60} jam"
        }
    }

    private object Keys {
        val INTERVAL = intPreferencesKey("sync_interval_minutes")
        val WIFI_ONLY = booleanPreferencesKey("sync_wifi_only")
        val LAST_SUCCESS = longPreferencesKey("sync_last_success")
        val LAST_FAIL = longPreferencesKey("sync_last_fail")
        val KNOWN_KEYS = stringPreferencesKey("sync_known_new_keys")
    }

    val intervalMinutes: Flow<Int> =
        context.syncStore.data.map { sanitizeInterval(it[Keys.INTERVAL] ?: DEFAULT_INTERVAL_MINUTES) }
    val wifiOnly: Flow<Boolean> =
        context.syncStore.data.map { it[Keys.WIFI_ONLY] ?: false }
    val lastSuccess: Flow<Long> =
        context.syncStore.data.map { it[Keys.LAST_SUCCESS] ?: 0L }
    val lastFail: Flow<Long> =
        context.syncStore.data.map { it[Keys.LAST_FAIL] ?: 0L }
    val knownKeys: Flow<Set<String>> =
        context.syncStore.data.map {
            it[Keys.KNOWN_KEYS].takeIf { s -> !s.isNullOrBlank() }?.split("\n")?.toSet() ?: emptySet()
        }

    suspend fun intervalOnce(): Int = intervalMinutes.first()
    suspend fun wifiOnlyOnce(): Boolean = wifiOnly.first()
    suspend fun lastSuccessOnce(): Long = lastSuccess.first()
    suspend fun lastFailOnce(): Long = lastFail.first()
    suspend fun knownKeysOnce(): Set<String> = knownKeys.first()

    suspend fun setInterval(minutes: Int) {
        val clean = sanitizeInterval(minutes)
        context.syncStore.edit { it[Keys.INTERVAL] = clean }
    }

    suspend fun setWifiOnly(enabled: Boolean) {
        context.syncStore.edit { it[Keys.WIFI_ONLY] = enabled }
    }

    suspend fun setLastSuccess(nowMillis: Long) {
        context.syncStore.edit { it[Keys.LAST_SUCCESS] = nowMillis }
    }

    suspend fun setLastFail(nowMillis: Long) {
        context.syncStore.edit { it[Keys.LAST_FAIL] = nowMillis }
    }

    suspend fun addKnownKeys(keys: Collection<String>) {
        if (keys.isEmpty()) return
        context.syncStore.edit {
            val current = it[Keys.KNOWN_KEYS]
                .takeIf { s -> !s.isNullOrBlank() }?.split("\n")?.toMutableSet() ?: mutableSetOf()
            current.addAll(keys)
            // Batasi 200 terbaru agar prefs tidak membengkak.
            val trimmed = if (current.size > 200) current.toList().takeLast(200).toSet() else current
            it[Keys.KNOWN_KEYS] = trimmed.joinToString("\n")
        }
    }
}
