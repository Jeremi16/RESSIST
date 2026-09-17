package id.ac.itera.ressist.ui.tugas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.CalendarApi
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.data.repository.AssignmentRepository
import id.ac.itera.ressist.domain.model.Assignment
import id.ac.itera.ressist.domain.model.TaskBuckets
import id.ac.itera.ressist.ui.common.userMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class TugasUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val buckets: TaskBuckets? = null,
    val selectedTab: Int = 1, // default Mendatang
    val completingId: String? = null,
    val notice: String? = null,
    val error: String? = null,
)

class TugasViewModel(
    private val assignments: AssignmentRepository,
    private val calendar: CalendarApi,
    private val authManager: AuthManager,
) : ViewModel() {

    private val _state = MutableStateFlow(TugasUiState())
    val state: StateFlow<TugasUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun selectTab(index: Int) {
        _state.update { it.copy(selectedTab = index) }
    }

    fun load() {
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val buckets = assignments.buckets()
                _state.update { it.copy(isLoading = false, buckets = buckets) }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.userMessage()) }
            }
        }
    }

    /** Pull-to-refresh: force LMS sync first (mirrors web "Sinkronkan"). */
    fun refresh() {
        _state.update { it.copy(isRefreshing = true, error = null) }
        viewModelScope.launch {
            try {
                runCatching { calendar.preview(force = true) }
                val buckets = assignments.buckets()
                _state.update { it.copy(isRefreshing = false, buckets = buckets) }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isRefreshing = false, error = e.userMessage()) }
            }
        }
    }

    fun complete(task: Assignment) {
        if (task.completed || task.isReadOnly) return
        _state.update { it.copy(completingId = task.id) }
        viewModelScope.launch {
            try {
                assignments.complete(task)
                val buckets = assignments.buckets()
                _state.update {
                    it.copy(completingId = null, buckets = buckets, notice = "Tugas ditandai selesai")
                }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(completingId = null, error = e.userMessage()) }
            }
        }
    }

    fun consumeNotice() {
        _state.update { it.copy(notice = null, error = null) }
    }
}
