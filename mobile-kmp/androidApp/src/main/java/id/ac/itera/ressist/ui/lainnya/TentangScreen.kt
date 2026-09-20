package id.ac.itera.ressist.ui.lainnya

import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.net.toUri
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.BuildConfig
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.common.RessistIcons
import id.ac.itera.ressist.ui.update.UpdateDialog
import id.ac.itera.ressist.ui.update.UpdateViewModel
import org.koin.androidx.compose.koinViewModel

private const val WEB_CHANGELOG_URL = "https://ressist.web.id/change-log"

/**
 * Halaman Tentang ala Mihon About: logo tengah, lalu daftar baris teks
 * (Versi / Cek Pembaruan / Yang Baru). Logika update-checker tetap sama
 * ([UpdateViewModel] + [UpdateDialog]), hanya tampilannya yang berubah.
 */
@Composable
fun TentangScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    updateViewModel: UpdateViewModel = koinViewModel(),
) {
    val updateState by updateViewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current
    LaunchedEffect(updateState.error, updateState.upToDate) {
        updateState.error?.let { snackbar.showSnackbar(it); updateViewModel.dismissError() }
        if (updateState.upToDate) snackbar.showSnackbar("Sudah versi terbaru.")
    }
    Column(modifier.fillMaxSize()) {
        RessistHeader(title = "Tentang", navigateUp = onBack)
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
        ) {
            Image(
                painterResource(RessistIcons.LogoMark),
                contentDescription = "Logo Ressist",
                modifier = Modifier.align(Alignment.CenterHorizontally)
                    .padding(vertical = 48.dp).size(96.dp),
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.12f))
            TextRow(
                title = "Versi",
                subtitle = "Stabil ${BuildConfig.VERSION_NAME} (code ${updateViewModel.currentCode()})",
                onClick = null,
            )
            TextRow(
                title = "Cek Pembaruan",
                subtitle = null,
                onClick = updateViewModel::checkManual,
                enabled = !updateState.checking && !updateState.downloading,
                trailing = {
                    if (updateState.checking) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(28.dp),
                            strokeWidth = 3.dp,
                        )
                    }
                },
            )
            TextRow(
                title = "Yang Baru",
                subtitle = null,
                onClick = {
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW, WEB_CHANGELOG_URL.toUri())
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                    )
                },
            )
            Text(
                "© 2026 Ressist",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(vertical = 24.dp),
            )
            SnackbarHost(snackbar)
        }
    }
    updateState.release?.let { release ->
        UpdateDialog(
            release = release,
            downloading = updateState.downloading,
            progress = updateState.progress,
            downloadDone = updateState.downloadDone,
            onUpdate = { updateViewModel.startDownload(release) },
            onLater = { updateViewModel.skip(release) },
            onDismiss = updateViewModel::dismiss,
        )
    }
}

/** Baris teks polos ala Mihon (tanpa card/ikon). */
@Composable
private fun TextRow(
    title: String,
    subtitle: String?,
    onClick: (() -> Unit)?,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    trailing: @Composable (() -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth()
            .then(
                if (onClick != null && enabled) {
                    Modifier.clickable(onClick = onClick)
                } else {
                    Modifier
                },
            )
            .padding(horizontal = 24.dp, vertical = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, fontSize = 16.sp)
            if (subtitle != null) {
                Text(
                    subtitle,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        trailing?.invoke()
    }
}
