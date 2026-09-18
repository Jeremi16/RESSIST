package id.ac.itera.ressist.ui.overview

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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.domain.model.TaskBuckets
import id.ac.itera.ressist.ui.common.ConnectionStatusCard
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.MonthCalendarGrid
import id.ac.itera.ressist.ui.common.RessistCard
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.common.RessistIcons
import id.ac.itera.ressist.ui.common.StatCardFrontend
import id.ac.itera.ressist.ui.common.toCalItem
import org.koin.androidx.compose.koinViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OverviewScreen(
    modifier: Modifier = Modifier,
    onOpenLms: () -> Unit = {},
    onOpenCalendar: () -> Unit = {},
    viewModel: OverviewViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Column(modifier.fillMaxSize()) {
        RessistHeader(title = "Ringkasan")
        when {
            state.isLoading -> id.ac.itera.ressist.ui.common.LoadingBox(Modifier.fillMaxSize())
            state.error != null && state.buckets == null ->
                ErrorBox(state.error!!, viewModel::load, Modifier.fillMaxSize())
            else -> PullToRefreshBox(
                isRefreshing = state.isSyncing,
                onRefresh = viewModel::sync,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(
                    modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Text(
                        "Halo, ${state.account?.name?.split(" ")?.firstOrNull() ?: state.user?.name?.split(" ")?.firstOrNull() ?: "Mahasiswa"}",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = (-0.5).sp,
                    )
                    state.buckets?.let { StatsGrid(it) }
                    // Kalender mini (pending saja, ala web) + tombol buka penuh
                    state.buckets?.let { buckets ->
                        RessistCard {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text("Kalender", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        "Lihat penuh →",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(4.dp),
                                    )
                                }
                                val pending = (buckets.overdue + buckets.upcoming)
                                    .mapNotNull { it.toCalItem() }
                                if (pending.isEmpty()) {
                                    Text(
                                        "Belum ada deadline mendatang",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                } else {
                                    MonthCalendarGrid(pending)
                                }
                                OutlinedButton(
                                    onClick = onOpenCalendar,
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = CircleShape,
                                ) { Text("Buka Kalender", fontSize = 14.sp) }
                            }
                        }
                    }
                    ConnectionStatusCard(
                        moodle = state.user?.moodleEnabled == true,
                        classroom = state.user?.googleClassroomEnabled == true,
                        bot = state.user?.telegramEnabled == true,
                        onManage = onOpenLms,
                    )
                    if (state.stale) {
                        StaleCard(onSync = viewModel::sync, syncing = state.isSyncing)
                    }
                    state.error?.let {
                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

/** Grid 2 kolom ala TaskStats.tsx (bukan 4 kartu sempit). */
@Composable
private fun StatsGrid(buckets: TaskBuckets) {
    val completionRate = if (buckets.total > 0) buckets.done.size * 100 / buckets.total else 0
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            StatCardFrontend(
                "Terlewat", buckets.overdue.size,
                if (buckets.overdue.isNotEmpty()) "Perlu perhatian" else "Semua aman",
                RessistIcons.Warning, Modifier.weight(1f),
            )
            StatCardFrontend(
                "Akan Datang", buckets.upcoming.size,
                if (buckets.upcoming.isNotEmpty()) "Siap dikerjakan" else "Tidak ada tugas",
                RessistIcons.CalendarMonth, Modifier.weight(1f),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            StatCardFrontend(
                "Selesai", buckets.done.size, "$completionRate% selesai",
                RessistIcons.CheckCircle, Modifier.weight(1f),
                progress = if (buckets.total > 0) buckets.done.size.toFloat() / buckets.total else null,
            )
            StatCardFrontend(
                "Total Tugas", buckets.total, "Semua sumber",
                RessistIcons.Assignment, Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun StaleCard(onSync: () -> Unit, syncing: Boolean) {
    RessistCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(painterResource(RessistIcons.Warning), contentDescription = null, tint = MaterialTheme.colorScheme.error)
                Text("Data lebih dari 6 jam", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
            Text(
                "Sinkronkan ulang agar pengingat akurat.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (syncing) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = onSync,
                        shape = CircleShape,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary,
                        ),
                    ) {
                        Icon(painterResource(RessistIcons.Refresh), contentDescription = null)
                        Spacer(Modifier.padding(2.dp))
                        Text("Sinkronkan")
                    }
                }
            }
        }
    }
}
