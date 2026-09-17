package id.ac.itera.ressist.ui.kalender

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.domain.model.CalendarEvent
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.formatId
import id.ac.itera.ressist.ui.common.dayKey
import org.koin.androidx.compose.koinViewModel

@Composable
fun KalenderScreen(modifier: Modifier = Modifier, viewModel: KalenderViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    when {
        state.isLoading -> LoadingBox(modifier)
        state.error != null && state.events.isEmpty() ->
            ErrorBox(state.error!!, viewModel::load, modifier)
        state.events.isEmpty() -> Column(
            modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Belum ada event. Atur sumber LMS dulu di tab LMS.")
        }
        else -> LazyColumn(
            modifier = modifier.fillMaxSize().padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (state.fromCache) {
                item {
                    Text(
                        "Menampilkan data cache — tarik Tugas untuk sinkronkan",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            // Group by day with sticky-ish headers (simple headers, no sticky lib).
            val grouped = state.events.groupBy { it.deadline.dayKey() }
            grouped.forEach { (day, events) ->
                item(key = "h-$day") {
                    Text(day, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                }
                items(events, key = { it.id }) { event -> EventCard(event) }
            }
        }
    }
}

@Composable
private fun EventCard(event: CalendarEvent) {
    Card(elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                event.title,
                fontWeight = FontWeight.Bold,
                textDecoration = if (event.completed) TextDecoration.LineThrough else null,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                event.course?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                event.source?.let { Text("• $it", style = MaterialTheme.typography.bodySmall) }
            }
            Text(event.deadline.formatId(), style = MaterialTheme.typography.bodySmall)
        }
    }
}
