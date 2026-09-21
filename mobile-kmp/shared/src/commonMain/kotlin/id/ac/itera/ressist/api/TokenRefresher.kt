package id.ac.itera.ressist.api

import id.ac.itera.ressist.data.SessionStorage
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

/** Skew proaktif: refresh duluan bila access kedaluwarsa dalam 60 detik. */
private const val PROACTIVE_SKEW_SECONDS = 60L

/**
 * True bila access token kedaluwarsa (atau hampir) menurut expires_at.
 * Null/tak-terparse = unknown → false (jangan tebak, biarkan alur 401).
 */
fun isAccessExpired(expiresAt: String?): Boolean {
    if (expiresAt.isNullOrBlank()) return false
    val exp = runCatching { Instant.parse(expiresAt) }.getOrNull() ?: return false
    val now = Clock.System.now()
    return now.epochSeconds + PROACTIVE_SKEW_SECONDS >= exp.epochSeconds
}

/**
 * Silent refresh dengan singleflight: refresh concurrent (UI + SyncWorker +
 * beberapa repository) digabung jadi 1 network call. Tanpa ini, N request
 * paralel menembak backend dengan token lama yang sama → 1 menang, sisanya
 * masuk grace window dengan token basi → lewat grace = reuse → RevokeAll →
 * logout semua device.
 *
 * Fail-open selektif: HANYA 401 (token invalid/expired/reuse) yang menghapus
 * sesi dan melempar [SessionExpiredException]. Error transient (429/5xx/
 * network/timeout) dilempar apa adanya TANPA menghapus storage — UI tampil
 * "coba lagi", sesi tetap utuh.
 */
class TokenRefresher(
    private val authApi: AuthApi,
    private val storage: SessionStorage,
) {
    private val mutex = Mutex()

    /**
     * @param failedAccess access token yang dipakai request yang gagal 401.
     * Bila storage sudah berisi access berbeda (coroutine lain sudah
     * me-refresh duluan), network refresh dilewati — inti singleflight.
     * Null = selalu refresh (dipakai alur proaktif best-effort).
     */
    suspend fun refreshOrThrow(failedAccess: String? = null) {
        mutex.withLock {
            if (failedAccess != null) {
                val current = storage.accessToken()
                if (current != null && current != failedAccess) return
            }
            refreshOrThrowLocked()
        }
    }

    private suspend fun refreshOrThrowLocked() {
        val refresh = storage.refreshToken()
        if (refresh.isNullOrBlank()) {
            storage.clear()
            throw SessionExpiredException()
        }
        try {
            val tokens = authApi.refresh(refresh)
            // Backend rotates mobile refresh tokens; keep the old one only
            // when the response carries no new one (grace-hit fallback).
            storage.save(
                access = tokens.accessToken,
                refresh = tokens.refreshToken ?: refresh,
                expiresAt = tokens.expiresAt,
            )
        } catch (e: UnauthorizedException) {
            // Sesi benar-benar mati — hapus dan arahkan ke Login.
            storage.clear()
            throw SessionExpiredException(e)
        } catch (e: SessionExpiredException) {
            storage.clear()
            throw e
        } catch (e: Exception) {
            // Transient (429/5xx/network/timeout/shape-drift): JANGAN hapus
            // sesi. Penelepon menampilkan error, token di storage tetap valid
            // untuk percobaan berikutnya.
            throw e
        }
    }
}
