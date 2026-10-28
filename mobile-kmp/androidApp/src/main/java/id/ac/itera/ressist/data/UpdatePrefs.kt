package id.ac.itera.ressist.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import id.ac.itera.ressist.api.RessistJson
import id.ac.itera.ressist.data.repository.AppRelease
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.updateStore by preferencesDataStore("ressist_updates")

/**
 * Status cek pembaruan (DataStore terpisah agar logout tidak menghapus).
 * lastCheck: epoch millis cek terakhir (berhasil atau gagal, untuk backoff).
 * skippedCode + skippedAt: versionCode yang ditunda via "Nanti" dan kapan.
 * cachedRelease: rilis terakhir yang ditemukan, agar popup tetap muncul saat
 * cold start di antara dua cek network. download*: unduhan yang sedang jalan.
 */
class UpdatePrefs(private val context: Context) {
    private object Keys {
        val LAST_CHECK = longPreferencesKey("update_last_check")
        val SKIPPED_CODE = intPreferencesKey("update_skipped_code")
        val SKIPPED_AT = longPreferencesKey("update_skipped_at")
        val CACHED_RELEASE = stringPreferencesKey("update_cached_release")
        val DOWNLOAD_ID = longPreferencesKey("update_download_id")
        val DOWNLOAD_CODE = intPreferencesKey("update_download_code")
    }

    data class Skip(val code: Int, val at: Long)
    data class ActiveDownload(val id: Long, val code: Int)

    val lastCheck: Flow<Long> = context.updateStore.data.map { it[Keys.LAST_CHECK] ?: 0L }

    suspend fun lastCheckOnce(): Long = lastCheck.first()

    suspend fun skipOnce(): Skip? = context.updateStore.data.first().let { p ->
        p[Keys.SKIPPED_CODE]?.let { Skip(it, p[Keys.SKIPPED_AT] ?: 0L) }
    }

    suspend fun setLastCheck(now: Long) {
        context.updateStore.edit { it[Keys.LAST_CHECK] = now }
    }

    suspend fun setSkipped(code: Int, now: Long) {
        context.updateStore.edit {
            it[Keys.SKIPPED_CODE] = code
            it[Keys.SKIPPED_AT] = now
        }
    }

    suspend fun clearSkipped() {
        context.updateStore.edit {
            it.remove(Keys.SKIPPED_CODE)
            it.remove(Keys.SKIPPED_AT)
        }
    }

    suspend fun cachedReleaseOnce(): AppRelease? =
        context.updateStore.data.first()[Keys.CACHED_RELEASE]?.let {
            runCatching { RessistJson.decodeFromString(AppRelease.serializer(), it) }.getOrNull()
        }

    suspend fun setCachedRelease(release: AppRelease?) {
        context.updateStore.edit {
            if (release == null) it.remove(Keys.CACHED_RELEASE)
            else it[Keys.CACHED_RELEASE] = RessistJson.encodeToString(AppRelease.serializer(), release)
        }
    }

    suspend fun activeDownloadOnce(): ActiveDownload? = context.updateStore.data.first().let { p ->
        val id = p[Keys.DOWNLOAD_ID] ?: return@let null
        ActiveDownload(id, p[Keys.DOWNLOAD_CODE] ?: 0)
    }

    suspend fun setActiveDownload(download: ActiveDownload?) {
        context.updateStore.edit {
            if (download == null) {
                it.remove(Keys.DOWNLOAD_ID)
                it.remove(Keys.DOWNLOAD_CODE)
            } else {
                it[Keys.DOWNLOAD_ID] = download.id
                it[Keys.DOWNLOAD_CODE] = download.code
            }
        }
    }
}
