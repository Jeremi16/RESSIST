package id.ac.itera.ressist.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsStore by preferencesDataStore("ressist_settings")

/** Mode tampilan yang bisa dipilih pengguna di tab Lainnya → Tampilan. */
enum class ThemeMode { SYSTEM, LIGHT, DARK }

/** Ukuran teks aplikasi. */
enum class TextSize { NORMAL, LARGE }

/**
 * Preferensi tampilan (DataStore). Terpisah dari [AndroidSessionStorage]
 * agar logout tidak menghapus pilihan tema pengguna.
 */
class ThemePrefs(private val context: Context) {
    private object Keys {
        val MODE = stringPreferencesKey("tampilan_mode")
        val PURE_BLACK = booleanPreferencesKey("tampilan_pure_black")
        val TEXT_SIZE = stringPreferencesKey("tampilan_text_size")
    }

    val mode: Flow<ThemeMode> = context.settingsStore.data.map {
        runCatching { ThemeMode.valueOf(it[Keys.MODE] ?: ThemeMode.SYSTEM.name) }
            .getOrDefault(ThemeMode.SYSTEM)
    }

    val pureBlack: Flow<Boolean> = context.settingsStore.data.map { it[Keys.PURE_BLACK] ?: false }

    val textSize: Flow<TextSize> = context.settingsStore.data.map {
        runCatching { TextSize.valueOf(it[Keys.TEXT_SIZE] ?: TextSize.NORMAL.name) }
            .getOrDefault(TextSize.NORMAL)
    }

    suspend fun setMode(mode: ThemeMode) {
        context.settingsStore.edit { it[Keys.MODE] = mode.name }
    }

    suspend fun setPureBlack(enabled: Boolean) {
        context.settingsStore.edit { it[Keys.PURE_BLACK] = enabled }
    }

    suspend fun setTextSize(size: TextSize) {
        context.settingsStore.edit { it[Keys.TEXT_SIZE] = size.name }
    }
}
