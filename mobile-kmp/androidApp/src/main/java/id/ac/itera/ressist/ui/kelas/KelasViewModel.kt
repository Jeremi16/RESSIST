package id.ac.itera.ressist.ui.kelas

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.api.UserUpdate
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.data.repository.CourseRepository
import id.ac.itera.ressist.data.repository.UserRepository
import id.ac.itera.ressist.domain.model.Course
import id.ac.itera.ressist.domain.model.User
import id.ac.itera.ressist.ui.common.userMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json

val DEFAULT_CLASS_CODES = listOf("RA", "RB", "RC", "RD", "RE")

/** Parse global class_code web (string array-JSON '["RA"]' atau tunggal legacy). */
fun parseSelectedClassCodes(raw: String?): List<String> {
    if (raw.isNullOrBlank()) return emptyList()
    runCatching {
        val parsed = Json.decodeFromString(ListSerializer(String.serializer()), raw.trim())
        if (parsed.isNotEmpty()) return parsed
    }
    // Fallback: koma-dipisah atau satu kode.
    return raw.split(",").map { it.trim().uppercase() }.filter { it.isNotEmpty() }
}

private val CODE_RE = Regex("^[A-Za-z0-9_-]{1,8}$")

data class KelasUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val user: User? = null,
    val courses: List<Course> = emptyList(),
    /** Global (hidden seperti web, tetap ikut tersimpan). */
    val selectedClassCodes: List<String> = emptyList(),
    val muted: List<String> = emptyList(),
    val aliases: Map<String, String> = emptyMap(),
    val perCourse: Map<String, String> = emptyMap(),
    val customCodes: List<String> = emptyList(),
    val editingCourseId: String? = null,
    val tempAlias: String = "",
    val confirmMuteCourse: String? = null,
    val notice: String? = null,
    val error: String? = null,
) {
    /** Default + tersedia + custom, dedup + urut — ala web. */
    val allClassCodes: List<String> =
        (DEFAULT_CLASS_CODES + (user?.availableClassCodes.orEmpty()) + customCodes)
            .map { it.trim().uppercase() }.filter { it.isNotEmpty() }
            .toSortedSet().toList()

    val filteredCount: Int get() = perCourse.values.count { it.isNotBlank() }
    val activeCount: Int get() = courses.count { !muted.contains(it.name) }

    fun displayName(course: Course): String {
        val alias = aliases[course.name]?.trim()
        return if (!alias.isNullOrEmpty()) alias else course.name
    }
}

/**
 * Batch-edit akademik ala ClassSettings web: alias + mute + filter per-matkul
 * + kelola kode, disimpan sekaligus dalam satu PUT.
 */
class KelasViewModel(
    private val users: UserRepository,
    private val courses: CourseRepository,
    private val authManager: AuthManager,
) : ViewModel() {

    private val _state = MutableStateFlow(KelasUiState())
    val state: StateFlow<KelasUiState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                val user = users.get()
                val courseList = runCatching { courses.list() }.getOrDefault(emptyList())
                _state.update {
                    it.copy(
                        isLoading = false,
                        user = user,
                        courses = courseList,
                        selectedClassCodes = parseSelectedClassCodes(user.classCode),
                        muted = user.mutedCourses,
                        aliases = user.courseAliases,
                        perCourse = user.courseClassFilters,
                    )
                }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, error = e.userMessage()) }
            }
        }
    }

    // ---- Mute (dialog konfirmasi seperti web; unmute langsung) ----
    fun requestMute(courseName: String) {
        if (_state.value.muted.contains(courseName)) {
            _state.update { it.copy(muted = it.muted - courseName) }
        } else {
            _state.update { it.copy(confirmMuteCourse = courseName) }
        }
    }

    fun confirmMute() {
        val name = _state.value.confirmMuteCourse ?: return
        _state.update { it.copy(muted = it.muted + name, confirmMuteCourse = null) }
    }

    fun cancelMute() {
        _state.update { it.copy(confirmMuteCourse = null) }
    }

    // ---- Alias ----
    fun startEdit(courseId: String, currentName: String) {
        _state.update {
            it.copy(
                editingCourseId = courseId,
                tempAlias = it.aliases[currentName].orEmpty(),
            )
        }
    }

    fun setTempAlias(value: String) {
        _state.update { it.copy(tempAlias = value) }
    }

    fun cancelEdit() {
        _state.update { it.copy(editingCourseId = null, tempAlias = "") }
    }

    fun saveAlias(courseName: String) {
        val alias = _state.value.tempAlias.trim()
        _state.update {
            val next = it.aliases.toMutableMap()
            if (alias.isEmpty()) next.remove(courseName) else next[courseName] = alias
            it.copy(aliases = next, editingCourseId = null, tempAlias = "")
        }
    }

    // ---- Filter per-matkul ----
    fun togglePerCourse(courseName: String, code: String) {
        _state.update {
            val next = it.perCourse.toMutableMap()
            if (next[courseName] == code) next.remove(courseName) else next[courseName] = code
            it.copy(perCourse = next)
        }
    }

    fun clearPerCourse(courseName: String) {
        _state.update {
            val next = it.perCourse.toMutableMap()
            next.remove(courseName)
            it.copy(perCourse = next)
        }
    }

    // ---- Kelola kode kelas ----
    fun addCustomCode(raw: String) {
        val code = raw.trim().uppercase()
        if (code.isEmpty()) return
        if (!CODE_RE.matches(code)) {
            _state.update { it.copy(error = "Kode \"$code\" tidak valid (1–8 karakter, huruf/angka/-/_)") }
            return
        }
        if (_state.value.allClassCodes.contains(code)) {
            _state.update { it.copy(error = "Kode $code sudah ada") }
            return
        }
        _state.update { it.copy(customCodes = it.customCodes + code, error = null) }
    }

    fun removeCustomCode(code: String) {
        _state.update {
            val perCourse = it.perCourse.toMutableMap()
            perCourse.entries.removeAll { e -> e.value == code }
            it.copy(
                customCodes = it.customCodes - code,
                selectedClassCodes = it.selectedClassCodes - code,
                perCourse = perCourse,
            )
        }
    }

    // ---- Simpan semua (5 field sekaligus seperti web) ----
    fun saveAll() {
        val s = _state.value
        if (s.isSaving) return
        _state.update { it.copy(isSaving = true, error = null, notice = null) }
        viewModelScope.launch {
            try {
                val user = users.update(
                    UserUpdate(
                        classCode = Json.encodeToString(
                            ListSerializer(String.serializer()),
                            s.selectedClassCodes,
                        ),
                        mutedCourses = s.muted,
                        availableClassCodes = s.allClassCodes,
                        courseAliases = s.aliases,
                        courseClassFilters = s.perCourse,
                    ),
                )
                _state.update {
                    it.copy(
                        isSaving = false,
                        user = user,
                        muted = user.mutedCourses,
                        aliases = user.courseAliases,
                        perCourse = user.courseClassFilters,
                        selectedClassCodes = parseSelectedClassCodes(user.classCode),
                        notice = "Pengaturan akademik disimpan.",
                    )
                }
            } catch (e: SessionExpiredException) {
                authManager.onSessionExpired()
            } catch (e: Exception) {
                _state.update { it.copy(isSaving = false, error = e.userMessage()) }
            }
        }
    }

    fun consumeMessage() {
        _state.update { it.copy(notice = null, error = null) }
    }
}
