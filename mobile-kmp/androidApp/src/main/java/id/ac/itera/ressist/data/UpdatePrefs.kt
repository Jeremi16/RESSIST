package id.ac.itera.ressist.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.updateStore by preferencesDataStore("ressist_updates")

/**
 * Status cek pembaruan (DataStore terpisah agar logout tidak menghapus).
 * lastCheck: epoch millis cek terakhir. skippedCode: versionCode yang
 * ditunda user via tombol "Nanti" (jangan ganggu lagi 24 jam).
 */
class UpdatePrefs(private val context: Context) {
    private object Keys {
        val LAST_CHECK = longPreferencesKey("update_last_check")
        val SKIPPED_CODE = intPreferencesKey("update_skipped_code")
    }

    val lastCheck: Flow<Long> = context.updateStore.data.map { it[Keys.LAST_CHECK] ?: 0L }
    val skippedCode: Flow<Int> = context.updateStore.data.map { it[Keys.SKIPPED_CODE] ?: 0 }

    suspend fun lastCheckOnce(): Long = lastCheck.first()
    suspend fun skippedCodeOnce(): Int = skippedCode.first()

    suspend fun setLastCheck(now: Long) {
        context.updateStore.edit { it[Keys.LAST_CHECK] = now }
    }

    suspend fun setSkippedCode(code: Int) {
        context.updateStore.edit { it[Keys.SKIPPED_CODE] = code }
    }

    suspend fun clearSkipped() {
        context.updateStore.edit { it.remove(Keys.SKIPPED_CODE) }
    }
}
