package id.ac.itera.ressist.ui.login

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.auth.GoogleSignInHelper
import id.ac.itera.ressist.reminders.SyncManager
import id.ac.itera.ressist.ui.common.RessistIcons
import kotlinx.coroutines.flow.collectLatest
import org.koin.androidx.compose.koinViewModel
import org.koin.compose.koinInject

/** Login ala onboarding: kolase ikon miring, judul tebal, tombol pill hitam. */
@Composable
fun LoginScreen(
    onLoggedIn: (newAssignments: Int) -> Unit,
    viewModel: LoginViewModel = koinViewModel(),
    google: GoogleSignInHelper = koinInject(),
    syncManager: SyncManager = koinInject(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result -> viewModel.handleSignInResult(result.data) }

    LaunchedEffect(Unit) {
        viewModel.loggedIn.collectLatest { (_, newCount) ->
            // Aktifkan kembali periodic sesuai prefs + bangun alarm lokal.
            runCatching { syncManager.reschedule() }
            syncManager.syncNow(notify = false)
            onLoggedIn(newCount)
        }
    }
    LaunchedEffect(state.error) {
        state.error?.let {
            snackbar.showSnackbar(it)
            viewModel.dismissError()
        }
    }

    Box(
        Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            LoginHeroCollage(Modifier.fillMaxWidth().weight(1f))

            Column(
                modifier = Modifier.widthIn(max = 480.dp).fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .navigationBarsPadding()
                    .padding(bottom = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    "Selamat Datang\ndi Ressist",
                    fontSize = 32.sp,
                    lineHeight = 38.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = (-0.8).sp,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                Text(
                    "Asisten tugas & jadwal kuliah mahasiswa ITERA — masuk dengan akun @student.itera.ac.id",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 12.dp, start = 8.dp, end = 8.dp),
                )
                Spacer(Modifier.height(32.dp))
                Button(
                    onClick = {
                        if (!google.isConfigured) viewModel.showNotConfiguredError()
                        else viewModel.onGoogleButtonClick {
                            launcher.launch(google.signInIntent)
                        }
                    },
                    enabled = !state.isLoading,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = CircleShape,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                        disabledContainerColor = MaterialTheme.colorScheme.primary,
                        disabledContentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary,
                        )
                    } else {
                        Text("G", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                        Spacer(Modifier.size(12.dp))
                        Text("Lanjutkan dengan Google", fontSize = 15.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
        SnackbarHost(snackbar, modifier = Modifier.align(Alignment.BottomCenter))
    }
}

/** null = ubin logo; accent = ubin hitam (primary). */
private data class HeroTile(@DrawableRes val icon: Int?, val accent: Boolean = false)

private val HERO_ROWS = listOf(
    listOf(HeroTile(RessistIcons.Book), HeroTile(RessistIcons.Schedule, accent = true), HeroTile(RessistIcons.School)),
    listOf(HeroTile(RessistIcons.Notifications), HeroTile(null), HeroTile(RessistIcons.CalendarMonth)),
    listOf(HeroTile(RessistIcons.CheckCircle, accent = true), HeroTile(RessistIcons.Assignment), HeroTile(RessistIcons.Book, accent = true)),
)

/** Grid ubin rounded yang dimiringkan dan melewati tepi, memudar ke latar. */
@Composable
private fun LoginHeroCollage(modifier: Modifier = Modifier) {
    val bg = MaterialTheme.colorScheme.background
    Box(modifier.clipToBounds(), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier.wrapContentSize(unbounded = true).rotate(-12f),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            HERO_ROWS.forEachIndexed { i, row ->
                Row(
                    // Baris tengah digeser agar terlihat seperti mosaik.
                    modifier = Modifier.padding(start = if (i == 1) 0.dp else 60.dp, end = if (i == 1) 60.dp else 0.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    row.forEach { HeroTileView(it) }
                }
            }
        }
        // Pudar ke latar di bawah (area judul) dan tipis di atas (status bar).
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(
                    0f to bg.copy(alpha = 0.6f),
                    0.18f to Color.Transparent,
                    0.7f to Color.Transparent,
                    1f to bg,
                ),
            ),
        )
    }
}

@Composable
private fun HeroTileView(tile: HeroTile) {
    val scheme = MaterialTheme.colorScheme
    val container = if (tile.accent) scheme.primary else scheme.surfaceVariant
    Box(
        Modifier.requiredSize(150.dp).clip(RoundedCornerShape(32.dp)).background(container),
        contentAlignment = Alignment.Center,
    ) {
        if (tile.icon == null) {
            Image(
                painter = painterResource(RessistIcons.LogoMark),
                contentDescription = "Logo Ressist",
                modifier = Modifier.size(96.dp).rotate(12f).clip(RoundedCornerShape(20.dp)),
            )
        } else {
            Icon(
                painterResource(tile.icon),
                contentDescription = null,
                tint = if (tile.accent) scheme.onPrimary else scheme.onSurfaceVariant.copy(alpha = 0.7f),
                modifier = Modifier.size(56.dp).rotate(12f),
            )
        }
    }
}
