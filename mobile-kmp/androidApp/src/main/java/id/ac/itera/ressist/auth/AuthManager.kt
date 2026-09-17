package id.ac.itera.ressist.auth

import id.ac.itera.ressist.data.repository.AuthRepository
import id.ac.itera.ressist.domain.model.AuthAccount
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * App-wide session holder. Any ViewModel that catches SessionExpiredException
 * calls [onSessionExpired]; AppNav collects [sessionExpired] and routes to Login.
 */
class AuthManager(private val authRepository: AuthRepository) {
    private val _account = MutableStateFlow<AuthAccount?>(null)
    val account: StateFlow<AuthAccount?> = _account.asStateFlow()

    private val _sessionExpired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpired: SharedFlow<Unit> = _sessionExpired.asSharedFlow()

    /** Cold-start check: true when a refresh token exists (validity unknown). */
    suspend fun hasStoredSession(): Boolean = authRepository.hasSession()

    /** Validate stored session against GET /v1/auth/me; null on any failure. */
    suspend fun restore(): AuthAccount? {
        val me = runCatching { authRepository.me() }.getOrNull()
        _account.value = me
        return me
    }

    fun setAccount(account: AuthAccount) {
        _account.value = account
    }

    suspend fun logout() {
        runCatching { authRepository.logout() }
        _account.value = null
    }

    suspend fun onSessionExpired() {
        runCatching { authRepository.logout() }
        _account.value = null
        _sessionExpired.emit(Unit)
    }
}
