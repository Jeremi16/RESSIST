package id.ac.itera.ressist.ui.tugas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.data.repository.AssignmentRepository
import id.ac.itera.ressist.domain.model.Assignment
import id.ac.itera.ressist.ui.common.userMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class TaskDetailUiState(
    val isLoading: Boolean = true,
    val task: Assignment? = null,
    /** true bila daftar termuat tapi ID tidak ada (dihapus/selesai di server). */
    val notFound: Boolean = false,
    val completing: Boolean = false,
    val notice: String? = null,
    val error: String? = null,
)

/** Detail satu tugas; dibuka dari kartu Tugas atau tap notifikasi pengingat. */
class TaskDetailViewModel(
    private val assignments: AssignmentRepository,
    private val authManager: AuthManager,
) : ViewModel() {

    private val _state = MutableStateFlow(TaskDetailUiState())
    val state: StateFlow<TaskDetailUiState> = _state.asStateFlow()

    private var taskId: String? = null

    fun load(id: String) {
        taskId = id
        _state.update { it.copy(isLoading = true, error = null, notFound = false) }
        viewModelScope.launch {
            try {
                val task = assignments.list().firstOrNull { it.id == id }
                _state.update { it.copy(isLoading = false, task = task, notFound = task == null) }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.userMessage()) }
            }
        }
    }

    fun retry() {
        taskId?.let(::load)
    }

    fun complete() {
        val task = _state.value.task ?: return
        if (task.completed || task.isReadOnly) return
        _state.update { it.copy(completing = true) }
        viewModelScope.launch {
            try {
                val at = assignments.complete(task)
                _state.update {
                    it.copy(
                        completing = false,
                        task = task.copy(completed = true, completedAt = at),
                        notice = "Tugas ditandai selesai",
                    )
                }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(completing = false, notice = e.userMessage()) }
            }
        }
    }

    fun consumeNotice() {
        _state.update { it.copy(notice = null) }
    }
}
