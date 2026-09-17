package id.ac.itera.ressist.ui.login

import android.content.Intent
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import id.ac.itera.ressist.api.DomainNotAllowedException
import id.ac.itera.ressist.api.IdentityConflictException
import id.ac.itera.ressist.api.NetworkException
import id.ac.itera.ressist.api.RessistApiException
import id.ac.itera.ressist.api.SessionExpiredException
import id.ac.itera.ressist.api.UnauthorizedException
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.auth.GoogleSignInHelper
import id.ac.itera.ressist.data.repository.AuthRepository
import id.ac.itera.ressist.domain.model.AuthAccount
import id.ac.itera.ressist.ui.common.userMessage
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val TAG = "RessistAuth"

/**
 * Kode error backend → pesan Indonesia (port mapErrorToMessage web).
 * Kunci di sini adalah [RessistApiException.code], bukan teks mentah.
 */
private fun backendCodeToMessage(code: String): String? = when (code) {
    "oauth_denied", "oauth_error: access_denied" ->
        "Login dibatalkan. Silakan coba lagi."
    "exchange_failed" ->
        "Gagal menghubungkan ke Google. Jika terus terjadi, sidik jari " +
            "(SHA-1) aplikasi ini mungkin belum didaftarkan. Hubungi admin."
    "userinfo_failed", "google_userinfo_invalid" ->
        "Gagal mengambil data pengguna Google. Coba akun lain."
    "user_upsert_failed", "token_upsert_failed", "refresh_create_failed" ->
        "Gagal menyimpan sesi login. Coba lagi."
    else -> if (code.startsWith("oauth_error:")) {
        "Terjadi kesalahan saat login dengan Google. Silakan coba lagi."
    } else {
        null
    }
}

/**
 * Hanya kegagalan fatal-auth yang boleh membersihkan sesi Google.
 * Gangguan network/server dibiarkan agar retry berikutnya instan
 * (tanpa consent ulang) — ini pemutus loop consent.
 */
private fun Throwable.isAuthFatal(): Boolean = when (this) {
    is DomainNotAllowedException,
    is IdentityConflictException,
    is UnauthorizedException,
    is SessionExpiredException,
    -> true
    is NetworkException -> false
    is RessistApiException -> status == 401 || status == 403 || status == 409
    else -> false
}

data class LoginUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
)

class LoginViewModel(
    private val authRepository: AuthRepository,
    private val google: GoogleSignInHelper,
    private val authManager: AuthManager,
) : ViewModel() {

    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    private val _loggedIn = MutableSharedFlow<Pair<AuthAccount, Int>>(extraBufferCapacity = 1)
    /** (account, newAssignmentsCount) — consumed once by LoginScreen. */
    val loggedIn: SharedFlow<Pair<AuthAccount, Int>> = _loggedIn.asSharedFlow()

    fun handleSignInResult(data: Intent?) {
        val result = google.parseResultDetailed(data)
        val code = result.authCode
        if (code.isNullOrBlank()) {
            // Sukses tanpa code = sesi Google basi (cache). Bersihkan agar
            // percobaan berikutnya mendapat code sekali-pakai yang segar.
            Log.w(TAG, "sign-in OK but serverAuthCode missing (status=${result.statusCode})")
            google.signOut()
            _state.update { it.copy(isLoading = false, error = signInError(result.statusCode)) }
            return
        }
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            doExchange(code)
        }
    }

    /**
     * Klik tombol Google: coba silent sign-in dulu agar login ulang tidak
     * memunculkan popup. Hanya bila silent gagal (tidak ada sesi Google di
     * perangkat / grant kedaluwarsa) panggil [launchInteractive].
     */
    fun onGoogleButtonClick(launchInteractive: () -> Unit) {
        if (_state.value.isLoading) return
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            val silent = runCatching { google.silentSignIn() }.getOrNull()
            val code = silent?.authCode
            if (!code.isNullOrBlank()) {
                Log.i(TAG, "silent sign-in hit, exchanging without popup")
                doExchange(code)
            } else {
                Log.i(TAG, "silent sign-in miss (status=${silent?.statusCode}), falling back to interactive")
                _state.update { it.copy(isLoading = false) }
                launchInteractive()
            }
        }
    }

    /** Tukar server_auth_code → token Ressist. Dipakai silent & interaktif. */
    private suspend fun doExchange(code: String) {
        try {
            val account = authRepository.loginNative(code)
            // Post-login LMS sync drives the "N tugas baru" notice (best effort).
            val newCount = runCatching { authRepository.sync().newAssignments.size }.getOrDefault(0)
            authManager.setAccount(account)
            _state.update { it.copy(isLoading = false) }
            _loggedIn.emit(account to newCount)
        } catch (e: SessionExpiredException) {
            Log.w(TAG, "native login session expired", e)
            google.signOut()
            _state.update { it.copy(isLoading = false, error = e.userMessage()) }
        } catch (e: Exception) {
            Log.w(TAG, "native login failed: ${e.message}", e)
            if (e.isAuthFatal()) {
                // Domain ditolak / code tak valid / konflik: sesi ini tak bisa
                // dipakai lagi — sign out agar user bisa pilih akun lain.
                google.signOut()
            }
            val mapped = (e as? RessistApiException)?.code?.let(::backendCodeToMessage)
            _state.update { it.copy(isLoading = false, error = mapped ?: e.userMessage()) }
        }
    }

    fun showNotConfiguredError() {
        Log.e(TAG, "GOOGLE_WEB_CLIENT_ID empty in this build")
        _state.update {
            it.copy(
                error = "Login Google belum dikonfigurasi di build ini " +
                    "(Web Client ID kosong). Hubungi admin.",
            )
        }
    }

    fun dismissError() {
        _state.update { it.copy(error = null) }
    }

    private fun signInError(statusCode: Int?): String = when (statusCode) {
        12501 -> "Login Google dibatalkan"
        10 -> "Google menolak app ini (kode 10). " +
            "Fingerprint HP/build ini belum didaftarkan di Google Cloud Console " +
            "→ tambah Android OAuth client (package id.ac.itera.ressist + SHA-1 build ini)"
        12500 -> "Login Google gagal (kode 12500). Coba lagi atau pakai akun lain"
        null -> "Sesi Google kedaluwarsa tanpa kode baru. Sesi lama sudah " +
            "dibersihkan — coba sekali lagi."
        else -> "Login Google dibatalkan atau gagal (kode $statusCode)"
    }
}
