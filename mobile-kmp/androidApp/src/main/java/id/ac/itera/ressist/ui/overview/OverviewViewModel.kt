package id.ac.itera.ressist.ui.overview

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.CalendarApi
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.data.SyncPrefs
import id.ac.itera.ressist.data.ThemePrefs
import id.ac.itera.ressist.data.repository.AssignmentRepository
import id.ac.itera.ressist.data.repository.UserRepository
import id.ac.itera.ressist.domain.model.AuthAccount
import id.ac.itera.ressist.domain.model.TaskBuckets
import id.ac.itera.ressist.domain.model.limitUpcoming
import id.ac.itera.ressist.domain.model.User
import id.ac.itera.ressist.domain.time.isStale
import id.ac.itera.ressist.reminders.SyncManager
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
    /** Jumlah tugas mendatang yang disembunyikan oleh batas tampilan. */
    val hiddenCount: Int = 0,
    val horizonDays: Int? = null,
    val user: User? = null,
    val stale: Boolean = false,
    val error: String? = null,
    val lastSuccess: Long = 0L,
)

class OverviewViewModel(
    private val assignments: AssignmentRepository,
    private val users: UserRepository,
    private val calendar: CalendarApi,
    private val authManager: AuthManager,
    private val syncPrefs: SyncPrefs,
    private val syncManager: SyncManager,
    private val themePrefs: ThemePrefs,
) : ViewModel() {

    private val _state = MutableStateFlow(OverviewUiState())
    val state: StateFlow<OverviewUiState> = _state.asStateFlow()

    // Buckets mentah dari server; state.buckets = hasil batas tampilan tugas.
    private var rawBuckets: TaskBuckets? = null
    private var horizonDays: Int? = null

    private fun limited(raw: TaskBuckets): TaskBuckets {
        rawBuckets = raw
        return raw.limitUpcoming(horizonDays, Clock.System.now())
    }

    private fun hiddenOf(shown: TaskBuckets): Int =
        (rawBuckets?.upcoming?.size ?: 0) - shown.upcoming.size

    private fun observeHorizon() {
        viewModelScope.launch {
            themePrefs.taskHorizonDays.collect { days ->
                horizonDays = days
                val raw = rawBuckets
                if (raw == null) {
                    _state.update { it.copy(horizonDays = days) }
                } else {
                    val shown = limited(raw)
                    _state.update { it.copy(buckets = shown, hiddenCount = hiddenOf(shown), horizonDays = days) }
                }
            }
        }
    }

    init {
        observeHorizon()
        load()
    }

    fun load() {
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val account = authManager.account.value ?: authManager.restore()
                val bucketsDeferred = async { assignments.buckets() }
                val userDeferred = async { users.get() }
                val buckets = limited(bucketsDeferred.await())
                val user = userDeferred.await()
                val lastSuccess = runCatching { syncPrefs.lastSuccessOnce() }.getOrDefault(0L)
                _state.update {
                    it.copy(
                        isLoading = false,
                        account = account,
                        buckets = buckets,
                        hiddenCount = hiddenOf(buckets),
                        user = user,
                        stale = isStale(user.lmsLastSyncedAt, Clock.System.now()),
                        lastSuccess = lastSuccess,
                    )
                }
                // Foreground fast-path: bila auto-sync aktif dan data terakhir
                // lebih tua dari interval, picu one-shot background (silent).
                runCatching {
                    val interval = syncPrefs.intervalOnce()
                    if (interval != SyncPrefs.MANUAL) {
                        val now = System.currentTimeMillis()
                        if (lastSuccess == 0L || now - lastSuccess > interval * 60_000L) {
                            syncManager.syncNow(notify = false)
                        }
                    }
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
            val now = System.currentTimeMillis()
            try {
                runCatching { calendar.preview(force = true) }.getOrThrow()
                runCatching { syncPrefs.setLastSuccess(now) }
                load()
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                runCatching { syncPrefs.setLastFail(now) }
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
