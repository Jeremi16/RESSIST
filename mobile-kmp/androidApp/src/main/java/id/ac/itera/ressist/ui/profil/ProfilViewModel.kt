package id.ac.itera.ressist.ui.profil

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.api.UserUpdate
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.data.repository.UserRepository
import id.ac.itera.ressist.domain.model.User
import id.ac.itera.ressist.reminders.ReminderScheduler
import id.ac.itera.ressist.ui.common.userMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProfilUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val isLoggingOut: Boolean = false,
    val user: User? = null,
    val name: String = "",
    val notice: String? = null,
    val error: String? = null,
)

class ProfilViewModel(
    private val users: UserRepository,
    private val authManager: AuthManager,
    private val googleSignOut: () -> Unit,
    private val scheduler: ReminderScheduler,
) : ViewModel() {

    private val _state = MutableStateFlow(ProfilUiState())
    val state: StateFlow<ProfilUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val user = users.get()
                _state.update {
                    it.copy(isLoading = false, user = user, name = user.name)
                }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.userMessage()) }
            }
        }
    }

    fun setName(name: String) {
        _state.update { it.copy(name = name) }
    }

    /** Nama saja — pengaturan pengingat pindah ke tab Pengingat. */
    fun save() {
        val s = _state.value
        if (s.name.isBlank()) {
            _state.update { it.copy(error = "Nama tidak boleh kosong") }
            return
        }
        _state.update { it.copy(isSaving = true, error = null, notice = null) }
        viewModelScope.launch {
            try {
                val user = users.update(UserUpdate(name = s.name))
                _state.update {
                    it.copy(isSaving = false, user = user, name = user.name, notice = "Profil disimpan")
                }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isSaving = false, error = e.userMessage()) }
            }
        }
    }

    fun logout() {
        _state.update { it.copy(isLoggingOut = true) }
        viewModelScope.launch {
            runCatching { scheduler.cancelAll() }
            authManager.logout()
            runCatching { googleSignOut() }
            _state.update { it.copy(isLoggingOut = false) }
        }
    }

    fun consumeMessage() {
        _state.update { it.copy(notice = null, error = null) }
    }
}
