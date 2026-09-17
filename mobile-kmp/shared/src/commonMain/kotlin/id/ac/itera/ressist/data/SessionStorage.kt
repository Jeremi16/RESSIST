package id.ac.itera.ressist.data

/**
 * Token store. Common interface so androidApp can swap the impl:
 * F1/tests use [InMemorySessionStorage], F2 wires DataStore.
 */
interface SessionStorage {
    suspend fun accessToken(): String?
    suspend fun refreshToken(): String?
    suspend fun expiresAt(): String?
    suspend fun save(access: String, refresh: String, expiresAt: String?)
    suspend fun clear()
    suspend fun hasSession(): Boolean = refreshToken() != null
}

class InMemorySessionStorage : SessionStorage {
    private var access: String? = null
    private var refresh: String? = null
    private var expires: String? = null

    override suspend fun accessToken(): String? = access
    override suspend fun refreshToken(): String? = refresh
    override suspend fun expiresAt(): String? = expires

    override suspend fun save(access: String, refresh: String, expiresAt: String?) {
        this.access = access
        this.refresh = refresh
        this.expires = expiresAt
    }

    override suspend fun clear() {
        access = null
        refresh = null
        expires = null
    }
}
