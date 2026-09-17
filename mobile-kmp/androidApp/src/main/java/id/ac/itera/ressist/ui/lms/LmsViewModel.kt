package id.ac.itera.ressist.ui.lms

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.api.UserUpdate
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.data.repository.CalendarRepository
import id.ac.itera.ressist.data.repository.UserRepository
import id.ac.itera.ressist.domain.model.CalendarPreview
import id.ac.itera.ressist.domain.model.User
import id.ac.itera.ressist.ui.common.userMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LmsUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val isTesting: Boolean = false,
    val user: User? = null,
    val moodleUrl: String = "",
    val testResult: CalendarPreview? = null,
    val notice: String? = null,
    val error: String? = null,
)

class LmsViewModel(
    private val users: UserRepository,
    private val calendar: CalendarRepository,
    private val authManager: AuthManager,
) : ViewModel() {

    private val _state = MutableStateFlow(LmsUiState())
    val state: StateFlow<LmsUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(isLoading = true, error = null, testResult = null) }
        viewModelScope.launch {
            try {
                val user = users.get()
                _state.update {
                    it.copy(
                        isLoading = false,
                        user = user,
                        moodleUrl = user.moodleCalendarUrl.orEmpty(),
                    )
                }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.userMessage()) }
            }
        }
    }

    fun setMoodleUrl(url: String) {
        _state.update { it.copy(moodleUrl = url, testResult = null) }
    }

    private fun save(update: UserUpdate, success: String) {
        _state.update { it.copy(isSaving = true, error = null, notice = null) }
        viewModelScope.launch {
            try {
                val user = users.update(update)
                _state.update {
                    it.copy(
                        isSaving = false, user = user,
                        moodleUrl = user.moodleCalendarUrl.orEmpty(), notice = success,
                    )
                }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isSaving = false, error = e.userMessage()) }
            }
        }
    }

    fun setMoodleEnabled(enabled: Boolean) =
        save(UserUpdate(moodleEnabled = enabled), "Moodle ${if (enabled) "diaktifkan" else "dimatikan"}")

    fun saveMoodleUrl() =
        save(UserUpdate(moodleCalendarUrl = _state.value.moodleUrl.ifBlank { null }), "URL Moodle disimpan")

    fun setClassroomEnabled(enabled: Boolean) =
        save(
            UserUpdate(googleClassroomEnabled = enabled),
            "Google Classroom ${if (enabled) "diaktifkan" else "dimatikan"}",
        )

    fun disconnectGoogle() {
        _state.update { it.copy(isSaving = true, error = null) }
        viewModelScope.launch {
            try {
                val user = users.disconnectGoogle()
                _state.update { it.copy(isSaving = false, user = user, notice = "Google diputus") }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isSaving = false, error = e.userMessage()) }
            }
        }
    }

    fun testMoodle() {
        val url = _state.value.moodleUrl
        if (url.isBlank()) {
            _state.update { it.copy(error = "Isi URL kalender Moodle dulu") }
            return
        }
        _state.update { it.copy(isTesting = true, error = null, testResult = null) }
        viewModelScope.launch {
            try {
                val preview = calendar.testConnection(url, testMoodle = true)
                _state.update { it.copy(isTesting = false, testResult = preview) }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isTesting = false, error = e.userMessage()) }
            }
        }
    }

    fun consumeMessage() {
        _state.update { it.copy(notice = null, error = null) }
    }
}
