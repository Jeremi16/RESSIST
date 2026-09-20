package id.ac.itera.ressist.auth

import android.content.Context
import android.content.Intent
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Scope
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Outcome of parsing the Google sign-in activity result.
 * [statusCode] is the GMS ApiException code when [authCode] is null.
 */
data class SignInResult(
    val authCode: String?,
    val email: String?,
    val name: String?,
    val statusCode: Int?,
)

/**
 * Google sign-in via play-services-auth (server-auth-code flow with
 * grantOfflineAccess=true).
 *
 * NOTE: Credential Manager cannot yield a server_auth_code (ID token only),
 * while our backend endpoint POST /v1/auth/google/native requires the code.
 * If GoogleSignIn is ever removed, either migrate the backend to accept
 * ID tokens or fall back to a Custom-Tabs web OAuth flow.
 */
class GoogleSignInHelper(context: Context, serverClientId: String) {

    private val appContext: Context = context.applicationContext

    /** False bila Web Client ID kosong — auth code tak akan pernah ada. */
    val isConfigured: Boolean = serverClientId.isNotBlank()

    companion object {
        const val SCOPE_CLASSROOM_COURSES = "https://www.googleapis.com/auth/classroom.courses.readonly"
        const val SCOPE_CLASSROOM_COURSEWORK_ME = "https://www.googleapis.com/auth/classroom.coursework.me.readonly"
    }

    private val client: GoogleSignInClient = GoogleSignIn.getClient(
        appContext,
        GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(serverClientId)
            .requestServerAuthCode(serverClientId, true)
            .requestEmail()
            .requestScopes(
                Scope(SCOPE_CLASSROOM_COURSES),
                Scope(SCOPE_CLASSROOM_COURSEWORK_ME),
            )
            .build(),
    )

    val signInIntent: Intent get() = client.signInIntent

    /** Email akun Google yang masih tertaut di perangkat, null bila tidak ada. */
    fun lastSignedInEmail(): String? =
        runCatching { GoogleSignIn.getLastSignedInAccount(appContext)?.email }.getOrNull()

    /**
     * Percobaan login sunyi: tanpa popup bila akun masih tertaut dan grant
     * masih berlaku. Mengembalikan [SignInResult] — penelepon memakai
     * [SignInResult.authCode] bila non-blank, jika tidak fallback ke intent
     * interaktif. Tidak pernah throw (kegagalan = hasil dengan statusCode).
     */
    suspend fun silentSignIn(): SignInResult = suspendCancellableCoroutine { cont ->
        val task = client.silentSignIn()
        task.addOnSuccessListener { account: GoogleSignInAccount ->
            cont.resume(SignInResult(account.serverAuthCode, account.email, account.displayName, null))
        }
        task.addOnFailureListener { e ->
            cont.resume(SignInResult(null, null, null, (e as? ApiException)?.statusCode))
        }
    }

    /**
     * Detailed variant that preserves the GMS status code for error messages:
     * 12501 = user cancelled, 10 = DEVELOPER_ERROR (usually the app's SHA-1
     * fingerprint is not registered in Google Cloud Console), 12500 = generic
     * sign-in failure.
     */
    fun parseResultDetailed(data: Intent?): SignInResult {
        return try {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            val account: GoogleSignInAccount = task.getResult(ApiException::class.java)
            SignInResult(account.serverAuthCode, account.email, account.displayName, null)
        } catch (e: ApiException) {
            SignInResult(null, null, null, e.statusCode)
        } catch (_: Exception) {
            SignInResult(null, null, null, -1)
        }
    }

    fun signOut() {
        runCatching { client.signOut() }
    }
}
