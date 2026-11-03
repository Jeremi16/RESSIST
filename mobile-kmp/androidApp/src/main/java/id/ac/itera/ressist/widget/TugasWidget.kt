package id.ac.itera.ressist.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import id.ac.itera.ressist.MainActivity
import id.ac.itera.ressist.data.repository.AssignmentRepository
import id.ac.itera.ressist.domain.model.Assignment
import id.ac.itera.ressist.reminders.ReminderScheduler
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

/**
 * Widget home screen: tugas mendatang terdekat. Data dari
 * [AssignmentRepository] (fallback ke cache offline bila tak ada jaringan).
 * Disegarkan oleh SyncWorker via [refresh] dan updatePeriodMillis.
 */
class TugasWidget : GlanceAppWidget(), KoinComponent {

    companion object {
        private const val MAX_ITEMS = 5

        suspend fun refresh(context: Context) {
            runCatching { TugasWidget().updateAll(context) }
        }
    }

    private val assignments: AssignmentRepository by inject()
    private val scheduler: ReminderScheduler by inject()

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val now = Clock.System.now()
        val tasks = runCatching { assignments.buckets(now).upcoming }
            .getOrNull()
            ?.filter { it.deadline != Instant.DISTANT_FUTURE }
            ?.take(MAX_ITEMS)
        provideContent { GlanceTheme { Content(tasks, now) } }
    }

    @Composable
    private fun Content(tasks: List<Assignment>?, now: Instant) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(GlanceTheme.colors.widgetBackground)
                .cornerRadius(16.dp)
                .padding(12.dp)
                .clickable(actionStartActivity<MainActivity>()),
        ) {
            Text(
                "Tugas terdekat",
                style = TextStyle(
                    color = GlanceTheme.colors.onSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                ),
            )
            Spacer(GlanceModifier.height(8.dp))
            when {
                tasks == null -> Hint("Buka Ressist untuk memuat tugas")
                tasks.isEmpty() -> Hint("Tidak ada tugas mendatang 🎉")
                else -> LazyColumn {
                    items(tasks, itemId = { it.id.hashCode().toLong() }) { TaskRow(it, now) }
                }
            }
        }
    }

    @Composable
    private fun TaskRow(task: Assignment, now: Instant) {
        Column(modifier = GlanceModifier.fillMaxWidth().padding(vertical = 4.dp)) {
            Text(
                task.title,
                maxLines = 1,
                style = TextStyle(color = GlanceTheme.colors.onSurface, fontSize = 13.sp),
            )
            Text(
                "${task.course ?: "Tugas"} • ${scheduler.formatCountdown(task.deadline, now)}",
                maxLines = 1,
                style = TextStyle(color = GlanceTheme.colors.onSurfaceVariant, fontSize = 11.sp),
            )
        }
    }

    @Composable
    private fun Hint(text: String) {
        Text(text, style = TextStyle(color = GlanceTheme.colors.onSurfaceVariant, fontSize = 12.sp))
    }
}

class TugasWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TugasWidget()
}
