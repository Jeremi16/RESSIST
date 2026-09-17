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

enum class TugasSort(val label: String) {
    DEADLINE_ASC("Deadline terdekat"),
    DEADLINE_DESC("Deadline terjauh"),
    COURSE_AZ("Mata kuliah A–Z"),
}

enum class TugasSource(val label: String) {
    ALL("Semua"),
    MOODLE("Moodle"),
    CLASSROOM("Classroom"),
}

/** Filter + sort murni agar mudah diuji dan dipakai ulang oleh UI. */
fun List<Assignment>.applyTugasFilter(query: String, source: TugasSource, sort: TugasSort): List<Assignment> {
    val q = query.trim().lowercase()
    var out = if (q.isEmpty()) {
        this
    } else {
        filter {
            it.title.lowercase().contains(q) || (it.course?.lowercase()?.contains(q) == true)
        }
    }
    out = when (source) {
        TugasSource.ALL -> out
        TugasSource.CLASSROOM -> out.filter { it.isReadOnly }
        TugasSource.MOODLE -> out.filter { !it.isReadOnly }
    }
    return when (sort) {
        TugasSort.DEADLINE_ASC -> out.sortedBy { it.deadline }
        TugasSort.DEADLINE_DESC -> out.sortedByDescending { it.deadline }
        TugasSort.COURSE_AZ -> out.sortedWith(compareBy({ it.course ?: "~~~" }, { it.deadline }))
    }
}

data class TugasUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val buckets: TaskBuckets? = null,
    val selectedTab: Int = 1, // default Mendatang
    val completingId: String? = null,
    val notice: String? = null,
    val error: String? = null,
    val query: String = "",
    val sort: TugasSort = TugasSort.DEADLINE_ASC,
    val source: TugasSource = TugasSource.ALL,
) {
    val isFiltering: Boolean get() = query.isNotBlank() || source != TugasSource.ALL
}

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

    fun setQuery(query: String) {
        _state.update { it.copy(query = query) }
    }

    fun setSort(sort: TugasSort) {
        _state.update { it.copy(sort = sort) }
    }

    fun setSource(source: TugasSource) {
        _state.update { it.copy(source = source) }
    }

    fun clearFilter() {
        _state.update { it.copy(query = "", source = TugasSource.ALL, sort = TugasSort.DEADLINE_ASC) }
    }

    /** Daftar tugas tab saat ini setelah search/filter/sort diterapkan. */
    fun visibleTasks(): List<Assignment> {
        val s = _state.value
        val buckets = s.buckets ?: return emptyList()
        val raw = when (s.selectedTab) {
            0 -> buckets.overdue
            1 -> buckets.upcoming
            else -> buckets.done
        }
        return raw.applyTugasFilter(s.query, s.source, s.sort)
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
