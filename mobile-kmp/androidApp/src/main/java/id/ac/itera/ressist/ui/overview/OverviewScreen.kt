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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.domain.model.TaskBuckets
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.SectionTitle
import org.koin.androidx.compose.koinViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OverviewScreen(modifier: Modifier = Modifier, viewModel: OverviewViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    when {
        state.isLoading -> id.ac.itera.ressist.ui.common.LoadingBox(modifier)
        state.error != null && state.buckets == null ->
            ErrorBox(state.error!!, viewModel::load, modifier)
        else -> PullToRefreshBox(
            isRefreshing = state.isSyncing,
            onRefresh = viewModel::sync,
            modifier = modifier.fillMaxSize(),
        ) {
            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    "Halo, ${state.account?.name ?: state.user?.name ?: "Mahasiswa"}",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                )
                state.buckets?.let { StatsRow(it) }
                ConnectionRow(
                    moodle = state.user?.moodleEnabled == true,
                    classroom = state.user?.googleClassroomEnabled == true,
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

@Composable
private fun StatsRow(buckets: TaskBuckets) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        StatCard("Terlewat", buckets.overdue.size, Modifier.weight(1f))
        StatCard("Mendatang", buckets.upcoming.size, Modifier.weight(1f))
        StatCard("Selesai", buckets.done.size, Modifier.weight(1f))
        StatCard("Total", buckets.total, Modifier.weight(1f))
    }
}

@Composable
private fun StatCard(label: String, value: Int, modifier: Modifier = Modifier) {
    Card(modifier, elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("$value", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun ConnectionRow(moodle: Boolean, classroom: Boolean) {
    SectionTitle("Koneksi")
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        AssistChip(onClick = {}, label = { Text(if (moodle) "Moodle: Aktif" else "Moodle: Mati") })
        AssistChip(onClick = {}, label = { Text(if (classroom) "Classroom: Aktif" else "Classroom: Mati") })
    }
}

@Composable
private fun StaleCard(onSync: () -> Unit, syncing: Boolean) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Filled.Warning, contentDescription = null)
                Text("Data lebih dari 6 jam", fontWeight = FontWeight.Bold)
            }
            Text("Sinkronkan ulang agar pengingat akurat.", style = MaterialTheme.typography.bodySmall)
            if (syncing) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally))
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = onSync) {
                        Icon(Icons.Filled.Refresh, contentDescription = null)
                        Spacer(Modifier.height(0.dp))
                        Text("Sinkronkan")
                    }
                    OutlinedButton(onClick = onSync) { Text("Nanti") }
                }
            }
        }
    }
}
