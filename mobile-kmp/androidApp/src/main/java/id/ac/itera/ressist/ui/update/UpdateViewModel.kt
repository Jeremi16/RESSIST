package id.ac.itera.ressist.ui.update

import android.app.DownloadManager
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.BuildConfig
import id.ac.itera.ressist.data.UpdatePrefs
import id.ac.itera.ressist.data.repository.AppRelease
import id.ac.itera.ressist.data.repository.UpdateRepository
import id.ac.itera.ressist.data.repository.UpdateResult
import id.ac.itera.ressist.ui.common.userMessage
import id.ac.itera.ressist.update.AppUpdater
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** State update-checker (tiru Mihon GetApplicationRelease.Result + NewUpdateScreen flow). */
data class UpdateUiState(
    val checking: Boolean = false,
    val release: AppRelease? = null,
    val upToDate: Boolean = false,
    val downloading: Boolean = false,
    val progress: Float = 0f,
    val downloadDone: Boolean = false,
    val error: String? = null,
)

class UpdateViewModel(
    private val repo: UpdateRepository,
    private val prefs: UpdatePrefs,
    private val updater: AppUpdater,
) : ViewModel() {

    private val _state = MutableStateFlow(UpdateUiState())
    val state: StateFlow<UpdateUiState> = _state.asStateFlow()

    private var pollJob: Job? = null

    companion object {
        /** Auto-check maksimal 1x per 24 jam (hemat rate limit GitHub 60 req/jam). */
        const val AUTO_CHECK_INTERVAL_MS = 24L * 60 * 60 * 1000
    }

    fun currentCode(): Int = BuildConfig.VERSION_CODE
    fun currentName(): String = BuildConfig.VERSION_NAME

    /** Cek manual dari tombol di Tentang (selalu hit network). */
    fun checkManual() {
        _state.update { it.copy(checking = true, error = null, upToDate = false) }
        viewModelScope.launch {
            try {
                when (val r = repo.check(BuildConfig.VERSION_CODE, BuildConfig.VERSION_NAME)) {
                    is UpdateResult.Available -> {
                        prefs.setLastCheck(System.currentTimeMillis())
                        prefs.clearSkipped()
                        _state.update { it.copy(checking = false, release = r.release) }
                    }
                    UpdateResult.UpToDate -> {
                        prefs.setLastCheck(System.currentTimeMillis())
                        _state.update { it.copy(checking = false, upToDate = true) }
                    }
                }
            } catch (e: Exception) {
                _state.update { it.copy(checking = false, error = e.userMessage()) }
            }
        }
    }

    /**
     * Auto-check tiap cold start. Return release baru (atau null) agar
     * caller bisa menampilkan notifikasi sistem. Tidak mengganggu user
     * yang menekan "Nanti" dalam 24 jam terakhir.
     */
    suspend fun autoCheck(): AppRelease? {
        val now = System.currentTimeMillis()
        if (now - prefs.lastCheckOnce() < AUTO_CHECK_INTERVAL_MS) return currentReleaseIfFresh()
        return try {
            when (val r = repo.check(BuildConfig.VERSION_CODE, BuildConfig.VERSION_NAME)) {
                is UpdateResult.Available -> {
                    prefs.setLastCheck(now)
                    if (prefs.skippedCodeOnce() == r.release.versionCode) {
                        null
                    } else {
                        _state.update { it.copy(release = r.release) }
                        r.release
                    }
                }
                UpdateResult.UpToDate -> {
                    prefs.setLastCheck(now)
                    null
                }
            }
        } catch (_: Exception) {
            null // auto-check gagal diam-diam (cek manual yang menampilkan error)
        }
    }

    private fun currentReleaseIfFresh(): AppRelease? {
        val r = _state.value.release ?: return null
        return r
    }

    fun skip(release: AppRelease) {
        viewModelScope.launch { prefs.setSkippedCode(release.versionCode) }
        _state.update { it.copy(release = null) }
    }

    fun dismiss() {
        _state.update { it.copy(release = null, upToDate = false, error = null, downloadDone = false) }
    }

    fun dismissError() {
        _state.update { it.copy(error = null) }
    }

    /** Mulai download via DownloadManager + polling progress. */
    fun startDownload(release: AppRelease) {
        if (_state.value.downloading) return
        if (!updater.canRequestInstalls()) {
            updater.openUnknownSourcesSettings()
            return
        }
        _state.update { it.copy(downloading = true, progress = 0f, error = null, downloadDone = false) }
        viewModelScope.launch {
            try {
                val id = updater.startDownload(release.downloadUrl, release.assetName)
                pollJob?.cancel()
                pollJob = launch {
                    while (true) {
                        delay(500)
                        val p = updater.queryProgress(id) ?: break
                        val frac = if (p.total > 0) p.downloaded.toFloat() / p.total else 0f
                        _state.update { it.copy(progress = frac) }
                        when (p.status) {
                            DownloadManager.STATUS_SUCCESSFUL -> {
                                _state.update { it.copy(downloading = false, progress = 1f, downloadDone = true) }
                                updater.promptInstallByDownloadId(id)
                                break
                            }
                            DownloadManager.STATUS_FAILED -> {
                                _state.update {
                                    it.copy(downloading = false, error = "Unduhan gagal. Coba lagi.")
                                }
                                break
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                _state.update { it.copy(downloading = false, error = e.userMessage()) }
            }
        }
    }

    override fun onCleared() {
        pollJob?.cancel()
    }
}
