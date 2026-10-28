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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

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

    /** APK yang sudah lolos verifikasi; tombol "Install" memakai ulang ini tanpa unduh ulang. */
    private var verifiedFile: File? = null

    companion object {
        /** Auto-check maksimal 1x per 24 jam (hemat rate limit GitHub 60 req/jam). */
        const val AUTO_CHECK_INTERVAL_MS = 24L * 60 * 60 * 1000

        /** Setelah cek gagal (offline / rate limit), coba lagi paling cepat 1 jam kemudian. */
        const val FAILED_CHECK_BACKOFF_MS = 60L * 60 * 1000

        /** "Nanti" menunda versi yang sama selama 24 jam. */
        const val SKIP_DURATION_MS = 24L * 60 * 60 * 1000
    }

    fun currentCode(): Int = BuildConfig.VERSION_CODE
    fun currentName(): String = BuildConfig.VERSION_NAME

    /** Cek manual dari tombol di Tentang (selalu hit network). */
    fun checkManual() {
        _state.update { it.copy(checking = true, error = null, upToDate = false) }
        viewModelScope.launch {
            try {
                val now = System.currentTimeMillis()
                when (val r = repo.check(BuildConfig.VERSION_CODE, BuildConfig.VERSION_NAME)) {
                    is UpdateResult.Available -> {
                        prefs.setLastCheck(now)
                        prefs.clearSkipped()
                        prefs.setCachedRelease(r.release)
                        _state.update { it.copy(checking = false, release = r.release) }
                    }
                    UpdateResult.UpToDate -> {
                        prefs.setLastCheck(now)
                        prefs.setCachedRelease(null)
                        _state.update { it.copy(checking = false, upToDate = true) }
                    }
                }
            } catch (e: Exception) {
                _state.update { it.copy(checking = false, error = e.userMessage()) }
            }
        }
    }

    /**
     * Auto-check tiap cold start. Popup muncul dari rilis hasil network atau
     * cache DataStore (di antara dua cek). Return release hanya bila baru
     * ditemukan lewat network, agar caller tidak spam notifikasi sistem.
     * Versi yang ditunda via "Nanti" disembunyikan selama 24 jam.
     */
    suspend fun autoCheck(): AppRelease? {
        val now = System.currentTimeMillis()
        if (now - prefs.lastCheckOnce() < AUTO_CHECK_INTERVAL_MS) {
            prefs.cachedReleaseOnce()?.let { showIfAllowed(it, now) }
            return null
        }
        return try {
            when (val r = repo.check(BuildConfig.VERSION_CODE, BuildConfig.VERSION_NAME)) {
                is UpdateResult.Available -> {
                    prefs.setLastCheck(now)
                    prefs.setCachedRelease(r.release)
                    if (showIfAllowed(r.release, now)) r.release else null
                }
                UpdateResult.UpToDate -> {
                    prefs.setLastCheck(now)
                    prefs.setCachedRelease(null)
                    null
                }
            }
        } catch (_: Exception) {
            // Gagal diam-diam (cek manual yang menampilkan error), tapi catat
            // waktunya agar tiap cold start tidak menghabiskan rate limit GitHub.
            prefs.setLastCheck(now - AUTO_CHECK_INTERVAL_MS + FAILED_CHECK_BACKOFF_MS)
            prefs.cachedReleaseOnce()?.let { showIfAllowed(it, now) }
            null
        }
    }

    private suspend fun showIfAllowed(release: AppRelease, now: Long): Boolean {
        // Cache basi: app sudah diupdate ke versi itu atau lebih baru.
        if (release.versionCode <= BuildConfig.VERSION_CODE) return false
        val skip = prefs.skipOnce()
        if (skip != null && skip.code == release.versionCode && now - skip.at < SKIP_DURATION_MS) return false
        _state.update { if (it.release == null) it.copy(release = release) else it }
        return true
    }

    fun skip(release: AppRelease) {
        viewModelScope.launch { prefs.setSkipped(release.versionCode, System.currentTimeMillis()) }
        _state.update { it.copy(release = null) }
    }

    fun dismiss() {
        _state.update { it.copy(release = null, upToDate = false, error = null, downloadDone = false) }
    }

    fun dismissError() {
        _state.update { it.copy(error = null) }
    }

    /**
     * Mulai download via DownloadManager + polling progress, lalu verifikasi
     * ukuran/SHA-256 sebelum prompt install. Unduhan versi sama yang masih
     * berjalan (mis. setelah app dibuka ulang) dipakai ulang, bukan diulang.
     */
    fun startDownload(release: AppRelease) {
        if (_state.value.downloading) return
        if (!updater.canRequestInstalls()) {
            updater.openUnknownSourcesSettings()
            return
        }
        val ready = verifiedFile
        if (_state.value.downloadDone && ready != null && ready.exists()) {
            viewModelScope.launch { install(ready) }
            return
        }
        _state.update { it.copy(downloading = true, progress = 0f, error = null, downloadDone = false) }
        viewModelScope.launch {
            try {
                val id = resumableDownloadId(release)
                    ?: updater.startDownload(release.downloadUrl, release.assetName).also {
                        prefs.setActiveDownload(UpdatePrefs.ActiveDownload(it, release.versionCode))
                    }
                pollJob?.cancel()
                pollJob = launch { poll(id, release) }
            } catch (e: Exception) {
                _state.update { it.copy(downloading = false, error = e.userMessage()) }
            }
        }
    }

    private suspend fun resumableDownloadId(release: AppRelease): Long? {
        val active = prefs.activeDownloadOnce() ?: return null
        val status = updater.queryProgress(active.id)?.status
        if (active.code == release.versionCode && status != null && status != DownloadManager.STATUS_FAILED) {
            return active.id
        }
        updater.cancelDownload(active.id)
        prefs.setActiveDownload(null)
        return null
    }

    private suspend fun poll(id: Long, release: AppRelease) {
        while (true) {
            val p = updater.queryProgress(id)
            if (p == null) {
                // Dibatalkan dari notifikasi sistem.
                prefs.setActiveDownload(null)
                _state.update { it.copy(downloading = false, progress = 0f) }
                return
            }
            val frac = if (p.total > 0) p.downloaded.toFloat() / p.total else 0f
            _state.update { it.copy(progress = frac) }
            when (p.status) {
                DownloadManager.STATUS_SUCCESSFUL -> {
                    prefs.setActiveDownload(null)
                    try {
                        val file = withContext(Dispatchers.IO) { updater.stageVerified(id, release) }
                        verifiedFile = file
                        _state.update { it.copy(downloading = false, progress = 1f, downloadDone = true) }
                        install(file)
                    } catch (e: Exception) {
                        _state.update { it.copy(downloading = false, progress = 0f, error = e.userMessage()) }
                    }
                    return
                }
                DownloadManager.STATUS_FAILED -> {
                    updater.cancelDownload(id)
                    prefs.setActiveDownload(null)
                    _state.update { it.copy(downloading = false, error = "Unduhan gagal. Coba lagi.") }
                    return
                }
            }
            delay(500)
        }
    }

    private suspend fun install(file: File) {
        try {
            withContext(Dispatchers.IO) { updater.install(file) }
        } catch (e: Exception) {
            _state.update { it.copy(error = e.userMessage()) }
        }
    }

    override fun onCleared() {
        pollJob?.cancel()
    }
}
