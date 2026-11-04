package id.ac.itera.ressist.ui.statistik

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.data.repository.AssignmentRepository
import id.ac.itera.ressist.domain.model.TaskStats
import id.ac.itera.ressist.domain.model.toTaskStats
import id.ac.itera.ressist.ui.common.userMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock

data class StatistikUiState(
    val isLoading: Boolean = true,
    val stats: TaskStats? = null,
    val error: String? = null,
)

class StatistikViewModel(
    private val assignments: AssignmentRepository,
    private val authManager: AuthManager,
) : ViewModel() {

    private val _state = MutableStateFlow(StatistikUiState())
    val state: StateFlow<StatistikUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val stats = assignments.list().toTaskStats(Clock.System.now())
                _state.update { it.copy(isLoading = false, stats = stats) }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.userMessage()) }
            }
        }
    }
}
