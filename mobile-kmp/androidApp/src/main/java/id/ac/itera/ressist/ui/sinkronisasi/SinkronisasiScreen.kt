package id.ac.itera.ressist.ui.sinkronisasi

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.data.SyncPrefs
import id.ac.itera.ressist.domain.time.formatLastSyncId
import id.ac.itera.ressist.ui.common.RessistCard
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.pengingat.PengingatViewModel
import org.koin.androidx.compose.koinViewModel

/**
 * Layar Sinkronisasi (Lainnya → Sinkronisasi): jadwal sync otomatis,
 * mode WiFi-only, status terakhir, dan tombol sync manual.
 * State + logika dipakai ulang dari [PengingatViewModel] agar satu sumber.
 */
@Composable
fun SinkronisasiScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PengingatViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val message = state.notice ?: state.error
    LaunchedEffect(message) {
        message?.let {
            snackbar.showSnackbar(it)
            viewModel.consumeMessage()
        }
    }

    Column(modifier.fillMaxSize()) {
        RessistHeader(
            title = "Sinkronisasi",
            navigateUp = onBack,
        )
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SyncCard(
                interval = state.syncInterval,
                wifiOnly = state.syncWifiOnly,
                lastSuccess = state.lastSuccess,
                isSyncing = state.isSyncing,
                onInterval = viewModel::setSyncInterval,
                onWifiOnly = viewModel::setSyncWifiOnly,
                onSyncNow = viewModel::syncNow,
            )
            Text(
                "Sync otomatis menarik data terbaru dari Moodle & Classroom, membangun ulang alarm pengingat, dan memberi tahu bila ada tugas baru.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(8.dp))
        }
        SnackbarHost(snackbar)
    }
}

@Composable
private fun SyncCard(
    interval: Int,
    wifiOnly: Boolean,
    lastSuccess: Long,
    isSyncing: Boolean,
    onInterval: (Int) -> Unit,
    onWifiOnly: (Boolean) -> Unit,
    onSyncNow: () -> Unit,
) {
    RessistCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Sinkronisasi Otomatis", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "Tarik data terbaru dari Moodle & Classroom tiap beberapa waktu (selalu force). Maksimal 1 jam sekali.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SyncPrefs.OPTIONS_MINUTES.chunked(2).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        if (row.size == 1) {
                            // Opsi ganjil (Manual): full-width selebar 2 tombol.
                            val minutes = row.single()
                            val active = interval == minutes
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                modifier = Modifier.weight(1f).clickable { onInterval(minutes) },
                            ) {
                                Text(
                                    SyncPrefs.labelFor(minutes),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    color = if (active) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.padding(14.dp).fillMaxWidth(),
                                )
                            }
                        } else {
                            row.forEach { minutes ->
                                val active = interval == minutes
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                    modifier = Modifier.weight(1f).clickable { onInterval(minutes) },
                                ) {
                                    Text(
                                        SyncPrefs.labelFor(minutes),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (active) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                                        modifier = Modifier.padding(14.dp),
                                    )
                                }
                            }
                        }
                    }
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth().clickable { onWifiOnly(!wifiOnly) },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Hanya via WiFi", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    Text(
                        "Hemat kuota saat sync otomatis.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(checked = wifiOnly, onCheckedChange = onWifiOnly)
            }
            Text(
                "Terakhir sync: ${formatLastSyncId(lastSuccess)}",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(
                onClick = onSyncNow,
                enabled = !isSyncing,
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (isSyncing) "Menyinkronkan..." else "Sinkronkan sekarang", fontSize = 14.sp)
            }
        }
    }
}
