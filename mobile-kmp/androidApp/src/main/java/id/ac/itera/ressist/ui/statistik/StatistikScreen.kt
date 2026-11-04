package id.ac.itera.ressist.ui.statistik

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.domain.model.CourseStats
import id.ac.itera.ressist.domain.model.TaskStats
import id.ac.itera.ressist.ui.common.EmptyState
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.RessistCard
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.common.RessistIcons
import id.ac.itera.ressist.ui.common.SectionTitle
import id.ac.itera.ressist.ui.common.StatCardFrontend
import org.koin.androidx.compose.koinViewModel
import kotlin.math.roundToInt

/** Progres tugas: penyelesaian, ketepatan waktu, dan rincian per mata kuliah. */
@Composable
fun StatistikScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: StatistikViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val stats = state.stats

    Column(modifier.fillMaxSize()) {
        RessistHeader(title = "Statistik", navigateUp = onBack)
        when {
            state.isLoading -> LoadingBox(Modifier.fillMaxSize())
            state.error != null -> ErrorBox(state.error!!, viewModel::load, Modifier.fillMaxSize())
            stats == null || stats.total == 0 -> EmptyState("Belum ada tugas untuk dihitung")
            else -> StatistikContent(stats)
        }
    }
}

@Composable
private fun StatistikContent(stats: TaskStats) {
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            StatCardFrontend(
                "Selesai", stats.done, "${stats.completionRate.percent()}% dari ${stats.total} tugas",
                RessistIcons.CheckCircle, Modifier.weight(1f),
                progress = stats.completionRate,
            )
            StatCardFrontend(
                "Tepat Waktu", stats.doneOnTime,
                if (stats.onTimeKnown > 0) "${stats.onTimeRate.percent()}% dari ${stats.onTimeKnown} tugas" else "Belum ada data",
                RessistIcons.Schedule, Modifier.weight(1f),
                progress = if (stats.onTimeKnown > 0) stats.onTimeRate else null,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            StatCardFrontend(
                "Terlewat", stats.overdue,
                if (stats.overdue > 0) "Belum dikerjakan" else "Semua aman",
                RessistIcons.Warning, Modifier.weight(1f),
            )
            StatCardFrontend(
                "7 Hari ke Depan", stats.dueThisWeek,
                "Dari ${stats.upcoming} tugas mendatang",
                RessistIcons.CalendarMonth, Modifier.weight(1f),
            )
        }
        SectionTitle("Per mata kuliah")
        stats.courses.forEach { CourseRow(it) }
    }
}

@Composable
private fun CourseRow(course: CourseStats) {
    RessistCard {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                Text(
                    course.course ?: "Tanpa mata kuliah",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                Text("${course.done}/${course.total}", fontSize = 13.sp, fontWeight = FontWeight.Medium)
            }
            LinearProgressIndicator(
                progress = { course.completionRate },
                modifier = Modifier.fillMaxWidth().height(4.dp).clip(CircleShape),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f),
            )
            Text(
                "${course.upcoming} mendatang • ${course.overdue} terlewat",
                fontSize = 12.sp,
                color = if (course.overdue > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private fun Float.percent(): Int = (this * 100).roundToInt()
