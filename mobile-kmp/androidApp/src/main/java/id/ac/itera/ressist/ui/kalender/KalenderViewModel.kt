package id.ac.itera.ressist.ui.kalender

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.data.repository.CalendarRepository
import id.ac.itera.ressist.domain.model.CalendarEvent
import id.ac.itera.ressist.ui.common.userMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class KalenderUiState(
    val isLoading: Boolean = true,
    val events: List<CalendarEvent> = emptyList(),
    val fromCache: Boolean = false,
    val error: String? = null,
)

class KalenderViewModel(
    private val calendar: CalendarRepository,
    private val authManager: AuthManager,
) : ViewModel() {

    private val _state = MutableStateFlow(KalenderUiState())
    val state: StateFlow<KalenderUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val preview = calendar.preview()
                _state.update {
                    it.copy(
                        isLoading = false,
                        events = preview.events.sortedBy { e -> e.deadline },
                        fromCache = preview.fromCache,
                    )
                }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.userMessage()) }
            }
        }
    }
}
