package id.ac.itera.ressist.ui.tugas

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.domain.model.Assignment
import id.ac.itera.ressist.domain.time.formatTimeRemainingId
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.formatId
import kotlinx.datetime.Clock
import org.koin.androidx.compose.koinViewModel

private val TAB_TITLES = listOf("Terlewat", "Mendatang", "Selesai")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TugasScreen(modifier: Modifier = Modifier, viewModel: TugasViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val message = state.notice ?: state.error
    LaunchedEffect(message) {
        message?.let {
            snackbar.showSnackbar(it)
            viewModel.consumeNotice()
        }
    }
    when {
        state.isLoading -> LoadingBox(modifier)
        state.buckets == null -> ErrorBox(state.error ?: "Gagal memuat", viewModel::load, modifier)
        else -> Column(modifier.fillMaxSize()) {
            TabRow(selectedTabIndex = state.selectedTab) {
                TAB_TITLES.forEachIndexed { i, title ->
                    val count = when (i) {
                        0 -> state.buckets!!.overdue.size
                        1 -> state.buckets!!.upcoming.size
                        else -> state.buckets!!.done.size
                    }
                    Tab(
                        selected = state.selectedTab == i,
                        onClick = { viewModel.selectTab(i) },
                        text = { Text("$title ($count)") },
                    )
                }
            }
            PullToRefreshBox(
                isRefreshing = state.isRefreshing,
                onRefresh = viewModel::refresh,
                modifier = Modifier.fillMaxSize(),
            ) {
                val list = when (state.selectedTab) {
                    0 -> state.buckets!!.overdue
                    1 -> state.buckets!!.upcoming
                    else -> state.buckets!!.done
                }
                if (list.isEmpty()) {
                    Column(
                        Modifier.fillMaxSize().padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text("Tidak ada tugas di sini", style = MaterialTheme.typography.bodyLarge)
                        Text(
                            "Tarik ke bawah untuk sinkronkan",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(list, key = { it.id }) { task ->
                            TaskCard(
                                task = task,
                                completing = state.completingId == task.id,
                                onComplete = { viewModel.complete(task) },
                            )
                        }
                    }
                }
            }
            SnackbarHost(snackbar)
        }
    }
}

@Composable
private fun TaskCard(task: Assignment, completing: Boolean, onComplete: () -> Unit) {
    val now = Clock.System.now()
    Card(elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                task.title,
                fontWeight = FontWeight.Bold,
                textDecoration = if (task.completed) TextDecoration.LineThrough else null,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                task.course?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                task.source?.let { Text("• $it", style = MaterialTheme.typography.bodySmall) }
            }
            Text(
                "${task.deadline.formatId()} (${formatTimeRemainingId(task.deadline, now)})",
                style = MaterialTheme.typography.bodySmall,
                color = if (!task.completed && task.deadline < now) {
                    MaterialTheme.colorScheme.error
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
            )
            when {
                task.completed -> Text("Selesai", style = MaterialTheme.typography.bodySmall)
                task.isReadOnly -> Text(
                    "Tugas Classroom hanya bisa dibaca",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                completing -> CircularProgressIndicator(modifier = Modifier.padding(top = 4.dp))
                else -> OutlinedButton(onClick = onComplete, modifier = Modifier.padding(top = 4.dp)) {
                    Text("Tandai selesai")
                }
            }
        }
    }
}
