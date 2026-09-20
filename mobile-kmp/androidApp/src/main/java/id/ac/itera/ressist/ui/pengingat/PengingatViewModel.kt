package id.ac.itera.ressist.ui.pengingat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.CalendarApi
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.api.UserUpdate
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.data.SyncPrefs
import id.ac.itera.ressist.data.repository.AssignmentRepository
import id.ac.itera.ressist.data.repository.AuthRepository
import id.ac.itera.ressist.data.repository.UserRepository
import id.ac.itera.ressist.domain.model.Assignment
import id.ac.itera.ressist.domain.time.reminderInstants
import id.ac.itera.ressist.reminders.ReminderScheduler
import id.ac.itera.ressist.reminders.SyncManager
import id.ac.itera.ressist.ui.common.userMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

/** Satu notifikasi terjadwal: mencerminkan alarm yang dipasang [ReminderScheduler]. */
data class ReminderItem(
    val fireAt: Instant,
    val task: Assignment,
    val hoursBefore: Int,
)

data class PengingatUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val isRebuilding: Boolean = false,
    val items: List<ReminderItem> = emptyList(),
    val reminderHours: List<Int> = emptyList(),
    val morningBriefing: Boolean = false,
    /** Draft editor (diinisialisasi dari server). */
    val draftHours: List<Int> = emptyList(),
    val draftBriefing: Boolean = false,
    val notice: String? = null,
    val error: String? = null,
    // Sinkronisasi otomatis (SyncPrefs, interval minimal 1 jam).
    val syncInterval: Int = SyncPrefs.DEFAULT_INTERVAL_MINUTES,
    val syncWifiOnly: Boolean = false,
    val lastSuccess: Long = 0L,
    val lastFail: Long = 0L,
    val isSyncing: Boolean = false,
) {
    /** Ala web: tombol simpan aktif hanya bila ada perubahan. */
    val hasChanges: Boolean
        get() = draftHours.sorted() != reminderHours.sorted() || draftBriefing != morningBriefing
}

class PengingatViewModel(
    private val assignments: AssignmentRepository,
    private val users: UserRepository,
    private val scheduler: ReminderScheduler,
    private val authManager: AuthManager,
    private val syncPrefs: SyncPrefs,
    private val syncManager: SyncManager,
    private val authRepository: AuthRepository,
    private val calendar: CalendarApi,
) : ViewModel() {

    private val _state = MutableStateFlow(PengingatUiState())
    val state: StateFlow<PengingatUiState> = _state.asStateFlow()

    init {
        load()
    }

    /** Toggle jam ala web: minimal 1 harus aktif. */
    fun toggleHour(hour: Int) {
        val current = _state.value.draftHours
        val next = if (current.contains(hour)) {
            if (current.size <= 1) return
            current - hour
        } else {
            (current + hour).sortedDescending()
        }
        _state.update { it.copy(draftHours = next, notice = null) }
    }

    fun setBriefing(enabled: Boolean) {
        _state.update { it.copy(draftBriefing = enabled, notice = null) }
    }

    /** Simpan jam + briefing ke server lalu bangun ulang alarm lokal. */
    fun save() {
        val s = _state.value
        if (s.isSaving || !s.hasChanges) return
        _state.update { it.copy(isSaving = true, notice = null, error = null) }
        viewModelScope.launch {
            try {
                val user = users.update(
                    UserUpdate(
                        reminderHours = s.draftHours,
                        morningBriefing = s.draftBriefing,
                    ),
                )
                runCatching { scheduler.rescheduleAll() }
                load()
                _state.update { it.copy(isSaving = false, notice = "Pengaturan pengingat disimpan.") }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isSaving = false, error = e.userMessage()) }
            }
        }
    }

    /** Bangun ulang alarm lokal dari data terakhir tanpa mengubah server. */
    fun rebuildAlarms() {
        if (_state.value.isRebuilding) return
        _state.update { it.copy(isRebuilding = true, notice = null, error = null) }
        viewModelScope.launch {
            try {
                scheduler.rescheduleAll()
                load()
                _state.update { it.copy(isRebuilding = false, notice = "Alarm pengingat dibangun ulang.") }
            } catch (e: Exception) {
                _state.update { it.copy(isRebuilding = false, error = e.userMessage()) }
            }
        }
    }

    /** Ganti interval auto-sync (minimal 1 jam, 0 = Manual) lalu reschedule. */
    fun setSyncInterval(minutes: Int) {
        viewModelScope.launch {
            try {
                syncPrefs.setInterval(minutes)
                syncManager.reschedule()
                _state.update {
                    it.copy(
                        syncInterval = SyncPrefs.sanitizeInterval(minutes),
                        notice = "Jadwal sinkronisasi: ${SyncPrefs.labelFor(SyncPrefs.sanitizeInterval(minutes))}.",
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(error = e.userMessage()) }
            }
        }
    }

    fun setSyncWifiOnly(enabled: Boolean) {
        viewModelScope.launch {
            try {
                syncPrefs.setWifiOnly(enabled)
                syncManager.reschedule()
                _state.update {
                    it.copy(
                        syncWifiOnly = enabled,
                        notice = if (enabled) "Sync otomatis hanya via WiFi." else "Sync otomatis boleh pakai data seluler.",
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(error = e.userMessage()) }
            }
        }
    }

    /** Force-sync LMS sekarang (selalu force) + rebuild alarm + catat timestamp. */
    fun syncNow() {
        if (_state.value.isSyncing) return
        _state.update { it.copy(isSyncing = true, notice = null, error = null) }
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            try {
                // Selalu force LMS: sync utama, fallback preview force bila gagal.
                val syncItems = runCatching { authRepository.sync() }.getOrNull()
                if (syncItems == null) {
                    runCatching { calendar.preview(force = true) }.getOrThrow()
                }
                runCatching { scheduler.rescheduleAll() }
                runCatching { syncPrefs.setLastSuccess(now) }
                load()
                val n = syncItems?.newAssignments?.size ?: 0
                _state.update {
                    it.copy(
                        isSyncing = false,
                        notice = if (n > 0) "Sinkron selesai — $n tugas baru." else "Sinkron selesai, data terbaru.",
                    )
                }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                runCatching { syncPrefs.setLastFail(now) }
                load()
                _state.update { it.copy(isSyncing = false, error = e.userMessage()) }
            }
        }
    }

    fun consumeMessage() {
        _state.update { it.copy(notice = null, error = null) }
    }

    fun load() {
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val now = Clock.System.now()
                val user = users.get()
                val buckets = assignments.buckets(now)
                // Cerminkan ReminderScheduler.rescheduleAll (read-only):
                // tugas mendatang x reminder_hours, hanya yang > sekarang.
                val items = buckets.upcoming
                    .filter { it.deadline != Instant.DISTANT_FUTURE && it.deadline != Instant.DISTANT_PAST }
                    .flatMap { task ->
                        reminderInstants(task.deadline, user.reminderHours)
                            .filter { it > now }
                            .map { fireAt ->
                                ReminderItem(
                                    fireAt = fireAt,
                                    task = task,
                                    hoursBefore = (task.deadline - fireAt).inWholeHours.toInt(),
                                )
                            }
                    }
                    .sortedBy { it.fireAt }
                    .take(100)
                val interval = runCatching { syncPrefs.intervalOnce() }.getOrDefault(SyncPrefs.DEFAULT_INTERVAL_MINUTES)
                val wifiOnly = runCatching { syncPrefs.wifiOnlyOnce() }.getOrDefault(false)
                val lastSuccess = runCatching { syncPrefs.lastSuccessOnce() }.getOrDefault(0L)
                val lastFail = runCatching { syncPrefs.lastFailOnce() }.getOrDefault(0L)
                _state.update {
                    it.copy(
                        isLoading = false,
                        items = items,
                        reminderHours = user.reminderHours,
                        morningBriefing = user.morningBriefing,
                        draftHours = user.reminderHours,
                        draftBriefing = user.morningBriefing,
                        syncInterval = interval,
                        syncWifiOnly = wifiOnly,
                        lastSuccess = lastSuccess,
                        lastFail = lastFail,
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
