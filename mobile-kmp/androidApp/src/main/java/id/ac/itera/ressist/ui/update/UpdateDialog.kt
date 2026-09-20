package id.ac.itera.ressist.ui.update

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.net.toUri
import id.ac.itera.ressist.data.repository.AppRelease

/**
 * Dialog versi baru (tiru Mihon NewUpdateScreen): changelog + aksi.
 * Update Sekarang = DownloadManager → prompt install.
 * Buka di Browser = halaman release RESSIST-MOBILE.
 */
@Composable
fun UpdateDialog(
    release: AppRelease,
    downloading: Boolean,
    progress: Float,
    downloadDone: Boolean,
    onUpdate: () -> Unit,
    onLater: () -> Unit,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = { if (!downloading) onDismiss() },
        title = {
            Text(
                "Versi baru tersedia (${release.versionTag})",
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
            )
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (release.changelog.isNotBlank()) {
                    Text(
                        release.changelog.take(1200),
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    Text(
                        "Ada versi baru aplikasi Ressist. Update langsung timpa versi lama.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (downloading || downloadDone) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        LinearProgressIndicator(
                            progress = { progress },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Text(
                            if (downloadDone) "Unduhan selesai — lanjutkan di prompt install."
                            else "Mengunduh ${(progress * 100).toInt()}%…",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                TextButton(
                    onClick = {
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, release.releaseLink.toUri())
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                        )
                    },
                    modifier = Modifier.padding(0.dp),
                ) {
                    Text("Buka di browser")
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onUpdate, enabled = !downloading) {
                Text(if (downloadDone) "Install" else "Update Sekarang")
            }
        },
        dismissButton = {
            TextButton(onClick = onLater, enabled = !downloading) { Text("Nanti") }
        },
    )
}
