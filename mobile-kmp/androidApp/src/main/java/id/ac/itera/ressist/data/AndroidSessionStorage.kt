package id.ac.itera.ressist.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import id.ac.itera.ressist.data.SessionStorage
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.sessionStore: DataStore<Preferences> by preferencesDataStore("ressist_session")

/** Durable token store (F2). F4 may migrate to EncryptedFile; API stays. */
class AndroidSessionStorage(private val context: Context) : SessionStorage {
    private object Keys {
        val ACCESS = stringPreferencesKey("access_token")
        val REFRESH = stringPreferencesKey("refresh_token")
        val EXPIRES = stringPreferencesKey("expires_at")
    }

    override suspend fun accessToken(): String? =
        context.sessionStore.data.map { it[Keys.ACCESS] }.first()

    override suspend fun refreshToken(): String? =
        context.sessionStore.data.map { it[Keys.REFRESH] }.first()

    override suspend fun expiresAt(): String? =
        context.sessionStore.data.map { it[Keys.EXPIRES] }.first()

    override suspend fun save(access: String, refresh: String, expiresAt: String?) {
        context.sessionStore.edit {
            it[Keys.ACCESS] = access
            it[Keys.REFRESH] = refresh
            if (expiresAt != null) it[Keys.EXPIRES] = expiresAt else it.remove(Keys.EXPIRES)
        }
    }

    override suspend fun clear() {
        context.sessionStore.edit { it.clear() }
    }
}
