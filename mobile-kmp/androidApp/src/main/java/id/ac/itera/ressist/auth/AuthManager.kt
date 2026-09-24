package id.ac.itera.ressist.auth

import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.api.UnauthorizedException
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
    suspend fun restore(): AuthAccount? = (restoreSession() as? RestoreResult.Ok)?.account

    /** Like [restore], but distinguishes a dead session from a transient failure. */
    suspend fun restoreSession(): RestoreResult {
        return try {
            RestoreResult.Ok(authRepository.me().also { _account.value = it })
        } catch (e: SessionExpiredException) {
            // Sesi benar-benar mati — bersihkan agar tidak dipakai lagi.
            runCatching { authRepository.logout() }
            _account.value = null
            RestoreResult.Expired
        } catch (e: UnauthorizedException) {
            runCatching { authRepository.logout() }
            _account.value = null
            RestoreResult.Expired
        } catch (e: Exception) {
            // Transient (offline/429/5xx): PERTAHANKAN storage. AppNav tetap
            // masuk MAIN; layar menampilkan error + retry sampai online lagi.
            _account.value = null
            RestoreResult.Transient
        }
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

sealed interface RestoreResult {
    data class Ok(val account: AuthAccount) : RestoreResult
    data object Expired : RestoreResult
    data object Transient : RestoreResult
}
