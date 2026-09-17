package id.ac.itera.ressist.ui.overview

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.CalendarApi
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.data.repository.AssignmentRepository
import id.ac.itera.ressist.data.repository.UserRepository
import id.ac.itera.ressist.domain.model.AuthAccount
import id.ac.itera.ressist.domain.model.TaskBuckets
import id.ac.itera.ressist.domain.model.User
import id.ac.itera.ressist.domain.time.isStale
import id.ac.itera.ressist.ui.common.userMessage
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock

data class OverviewUiState(
    val isLoading: Boolean = true,
    val isSyncing: Boolean = false,
    val account: AuthAccount? = null,
    val buckets: TaskBuckets? = null,
    val user: User? = null,
    val stale: Boolean = false,
    val error: String? = null,
)

class OverviewViewModel(
    private val assignments: AssignmentRepository,
    private val users: UserRepository,
    private val calendar: CalendarApi,
    private val authManager: AuthManager,
) : ViewModel() {

    private val _state = MutableStateFlow(OverviewUiState())
    val state: StateFlow<OverviewUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val account = authManager.account.value ?: authManager.restore()
                val bucketsDeferred = async { assignments.buckets() }
                val userDeferred = async { users.get() }
                val buckets = bucketsDeferred.await()
                val user = userDeferred.await()
                _state.update {
                    it.copy(
                        isLoading = false,
                        account = account,
                        buckets = buckets,
                        user = user,
                        stale = isStale(user.lmsLastSyncedAt, Clock.System.now()),
                    )
                }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.userMessage()) }
            }
        }
    }

    /** Force-sync LMS (mirrors web "Sinkronkan") then reload. */
    fun sync() {
        _state.update { it.copy(isSyncing = true) }
        viewModelScope.launch {
            try {
                runCatching { calendar.preview(force = true) }
                load()
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isSyncing = false, error = e.userMessage()) }
            } finally {
                _state.update { it.copy(isSyncing = false) }
            }
        }
    }

    fun dismissError() {
        _state.update { it.copy(error = null) }
    }
}
