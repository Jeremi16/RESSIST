package id.ac.itera.ressist.ui.common

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.api.ServerState
import id.ac.itera.ressist.api.ServerStatusMonitor
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

private const val RECHECK_MS = 30_000L

private fun Context.hasInternet(): Boolean {
    val cm = getSystemService(ConnectivityManager::class.java) ?: return true
    val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
    return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
}

/**
 * Menampilkan [content] seperti biasa, tetapi menutupnya dengan layar penuh
 * "server down / maintenance / tidak ada internet" saat backend tidak
 * terjangkau. Cek ulang otomatis tiap 30 detik; "Pakai data offline"
 * menutup layar (banner offline di tiap tab tetap tampil).
 */
@Composable
fun ServerStatusGate(
    monitor: ServerStatusMonitor = koinInject(),
    content: @Composable () -> Unit,
) {
    val state by monitor.state.collectAsStateWithLifecycle()
    var dismissed by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { monitor.check() }
    LaunchedEffect(state == ServerState.Up) {
        if (state == ServerState.Up) {
            dismissed = false
            return@LaunchedEffect
        }
        // Langsung cek /healthz (membedakan maintenance), lalu tiap 30 detik.
        while (true) {
            monitor.check()
            delay(RECHECK_MS)
        }
    }
    Box(Modifier.fillMaxSize()) {
        content()
        if (state != ServerState.Up && !dismissed) {
            ServerDownScreen(state, monitor, onUseOffline = { dismissed = true })
        }
    }
}

@Composable
private fun ServerDownScreen(
    state: ServerState,
    monitor: ServerStatusMonitor,
    onUseOffline: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var checking by remember { mutableStateOf(false) }
    val online = remember(state, checking) { context.hasInternet() }
    val (title, body) = when {
        state is ServerState.Maintenance -> "Sedang maintenance" to
            (state.message ?: "RESSIST sedang dalam pemeliharaan. Silakan coba lagi beberapa saat lagi.")
        !online -> "Tidak ada koneksi internet" to
            "Periksa Wi-Fi atau data seluler kamu, lalu coba lagi."
        else -> "Server sedang tidak bisa dihubungi" to
            "Server RESSIST sedang down atau bermasalah. Kami sedang memperbaikinya, coba lagi beberapa saat lagi."
    }
    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier.fillMaxSize().safeDrawingPadding().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        ) {
            Box(
                Modifier.size(88.dp).background(RessistRed.copy(alpha = 0.12f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painterResource(if (state is ServerState.Maintenance) RessistIcons.Schedule else RessistIcons.Warning),
                    contentDescription = null,
                    tint = RessistRed,
                    modifier = Modifier.size(40.dp),
                )
            }
            Text(title, fontSize = 22.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
            Text(
                body,
                fontSize = 14.sp,
                lineHeight = 20.sp,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            PrimaryPillButton(
                text = if (checking) "Memeriksa…" else "Coba lagi",
                onClick = {
                    scope.launch {
                        checking = true
                        monitor.check()
                        checking = false
                    }
                },
                enabled = !checking,
                icon = RessistIcons.Refresh,
            )
            SecondaryPillButton(text = "Pakai data offline", onClick = onUseOffline)
            Text(
                "Dicek ulang otomatis tiap 30 detik",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
