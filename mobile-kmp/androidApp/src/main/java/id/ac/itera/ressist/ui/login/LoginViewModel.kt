package id.ac.itera.ressist.ui.login

import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.auth.GoogleSignInHelper
import id.ac.itera.ressist.data.repository.AuthRepository
import id.ac.itera.ressist.domain.model.AuthAccount
import id.ac.itera.ressist.ui.common.userMessage
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
)

class LoginViewModel(
    private val authRepository: AuthRepository,
    private val google: GoogleSignInHelper,
    private val authManager: AuthManager,
) : ViewModel() {

    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    private val _loggedIn = MutableSharedFlow<Pair<AuthAccount, Int>>(extraBufferCapacity = 1)
    /** (account, newAssignmentsCount) — consumed once by LoginScreen. */
    val loggedIn: SharedFlow<Pair<AuthAccount, Int>> = _loggedIn.asSharedFlow()

    fun handleSignInResult(data: Intent?) {
        val (code, _, _) = google.parseResult(data)
        if (code.isNullOrBlank()) {
            _state.update { it.copy(isLoading = false, error = "Login Google dibatalkan atau gagal") }
            return
        }
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val account = authRepository.loginNative(code)
                // Post-login LMS sync drives the "N tugas baru" notice (best effort).
                val newCount = runCatching { authRepository.sync().newAssignments.size }.getOrDefault(0)
                authManager.setAccount(account)
                _state.update { it.copy(isLoading = false) }
                _loggedIn.emit(account to newCount)
            } catch (e: SessionExpiredException) {
                google.signOut()
                _state.update { it.copy(isLoading = false, error = e.userMessage()) }
            } catch (e: Exception) {
                // Domain rejection / conflict: sign out of Google so the user
                // can retry with a different account.
                google.signOut()
                _state.update { it.copy(isLoading = false, error = e.userMessage()) }
            }
        }
    }

    fun dismissError() {
        _state.update { it.copy(error = null) }
    }
}
