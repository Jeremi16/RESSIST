package id.ac.itera.ressist.auth

import android.content.Context
import android.content.Intent
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Scope

/**
 * Google sign-in via play-services-auth (same server-auth-code flow the
 * Capacitor plugin used with grantOfflineAccess=true).
 *
 * NOTE: Credential Manager cannot yield a server_auth_code (ID token only),
 * while our backend endpoint POST /v1/auth/google/native requires the code.
 * If GoogleSignIn is ever removed, either migrate the backend to accept
 * ID tokens or fall back to a Custom-Tabs web OAuth flow.
 */
class GoogleSignInHelper(context: Context, serverClientId: String) {

    companion object {
        const val SCOPE_CLASSROOM_COURSES = "https://www.googleapis.com/auth/classroom.courses.readonly"
        const val SCOPE_CLASSROOM_COURSEWORK_ME = "https://www.googleapis.com/auth/classroom.coursework.me.readonly"
    }

    private val client: GoogleSignInClient = GoogleSignIn.getClient(
        context,
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

    /** Returns Triple(serverAuthCode, email, displayName). Null code = failure. */
    fun parseResult(data: Intent?): Triple<String?, String?, String?> {
        return try {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            val account: GoogleSignInAccount = task.getResult(ApiException::class.java)
            Triple(account.serverAuthCode, account.email, account.displayName)
        } catch (_: Exception) {
            Triple(null, null, null)
        }
    }

    fun signOut() {
        runCatching { client.signOut() }
    }
}
