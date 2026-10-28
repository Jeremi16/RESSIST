package id.ac.itera.ressist.ui.tugas

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.domain.model.Assignment
import id.ac.itera.ressist.domain.time.formatTimeRemainingId
import id.ac.itera.ressist.ui.common.CoursePill
import id.ac.itera.ressist.ui.common.EmptyState
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.PrimaryPillButton
import id.ac.itera.ressist.ui.common.RessistCard
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.common.RessistIcons
import id.ac.itera.ressist.ui.common.RessistRed
import id.ac.itera.ressist.ui.common.SecondaryPillButton
import id.ac.itera.ressist.ui.common.StatusPill
import id.ac.itera.ressist.ui.common.formatId
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import org.koin.androidx.compose.koinViewModel

@Composable
fun TaskDetailScreen(
    taskId: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TaskDetailViewModel = koinViewModel(key = "task-$taskId"),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(taskId) { viewModel.load(taskId) }
    LaunchedEffect(state.notice) {
        state.notice?.let {
            snackbar.showSnackbar(it)
            viewModel.consumeNotice()
        }
    }
    Column(modifier.fillMaxSize()) {
        RessistHeader(title = "Detail Tugas", navigateUp = onBack)
        val task = state.task
        when {
            state.isLoading -> LoadingBox(Modifier.fillMaxSize())
            state.error != null -> ErrorBox(state.error!!, viewModel::retry, Modifier.fillMaxSize())
            task == null -> EmptyState(
                "Tugas tidak ditemukan atau sudah dihapus",
                Modifier.padding(16.dp),
            )
            else -> Box(Modifier.fillMaxSize()) {
                TaskDetailContent(task, state.completing, viewModel::complete)
                SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter))
            }
        }
    }
}

@Composable
private fun TaskDetailContent(task: Assignment, completing: Boolean, onComplete: () -> Unit) {
    val now = Clock.System.now()
    val noDeadline = task.deadline == Instant.DISTANT_FUTURE || task.deadline == Instant.DISTANT_PAST
    val overdue = !task.completed && !noDeadline && task.deadline < now
    val uriHandler = LocalUriHandler.current
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            task.title,
            fontSize = 22.sp,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 28.sp,
            letterSpacing = (-0.25).sp,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            task.course?.let { CoursePill(it) }
            when {
                task.completed -> StatusPill(
                    "Selesai",
                    MaterialTheme.colorScheme.surfaceVariant,
                    MaterialTheme.colorScheme.onSurfaceVariant,
                )
                overdue -> StatusPill("Terlewat", RessistRed.copy(alpha = 0.12f), RessistRed)
            }
        }
        RessistCard {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                DetailRow(
                    label = "Deadline",
                    value = if (noDeadline) "Tanpa deadline"
                    else "${task.deadline.formatId()} (${formatTimeRemainingId(task.deadline, now)})",
                    highlight = overdue,
                )
                task.classCode?.let {
                    HorizontalDivider(color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f))
                    DetailRow("Kelas", it)
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f))
                DetailRow("Sumber", if (task.isReadOnly) "Google Classroom" else (task.source ?: "LMS"))
                task.completedAt?.let {
                    HorizontalDivider(color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f))
                    DetailRow("Diselesaikan", it.formatId())
                }
            }
        }
        if (!task.description.isNullOrBlank()) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "Deskripsi",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                SelectionContainer {
                    Text(task.description!!, fontSize = 14.sp, lineHeight = 20.sp)
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (!task.completed && !task.isReadOnly) {
                PrimaryPillButton(
                    text = if (completing) "Menyimpan…" else "Tandai selesai",
                    onClick = onComplete,
                    enabled = !completing,
                    icon = RessistIcons.Check,
                )
            }
            task.url?.let { url ->
                SecondaryPillButton(
                    text = if (task.isReadOnly) "Buka di Classroom" else "Buka di LMS",
                    onClick = { runCatching { uriHandler.openUri(url) } },
                )
            }
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun DetailRow(label: String, value: String, highlight: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        if (label == "Deadline") {
            Icon(
                painterResource(RessistIcons.Schedule),
                contentDescription = null,
                modifier = Modifier.size(16.dp).padding(top = 2.dp),
                tint = if (highlight) RessistRed else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            label,
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(0.35f),
        )
        Text(
            value,
            fontSize = 13.sp,
            fontWeight = if (highlight) FontWeight.SemiBold else FontWeight.Medium,
            color = if (highlight) RessistRed else MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(0.65f),
        )
    }
}
