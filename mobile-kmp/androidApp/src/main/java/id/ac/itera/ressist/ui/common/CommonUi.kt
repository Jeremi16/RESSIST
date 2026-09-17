package id.ac.itera.ressist.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
fun ErrorBox(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Gagal memuat", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(message, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 8.dp))
        Button(onClick = onRetry, modifier = Modifier.padding(top = 16.dp)) { Text("Coba lagi") }
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.Bold,
        modifier = modifier.fillMaxWidth().padding(vertical = 8.dp),
    )
}

private val BULAN = arrayOf(
    "", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
)

/** "20 Sep 2026 • 23:59" in device timezone. Never throws: backend rows with a
 * missing deadline map to Instant.DISTANT_FUTURE, which toLocalDateTime()
 * cannot represent (IllegalArgumentException → force close in composition). */
fun Instant.formatId(): String {
    if (this == Instant.DISTANT_FUTURE || this == Instant.DISTANT_PAST) return "Tanpa deadline"
    return runCatching {
        val dt = toLocalDateTime(TimeZone.currentSystemDefault())
        val hh = dt.hour.toString().padStart(2, '0')
        val mm = dt.minute.toString().padStart(2, '0')
        "${dt.dayOfMonth} ${BULAN[dt.monthNumber]} ${dt.year} • $hh:$mm"
    }.getOrElse { "Tanpa deadline" }
}

/** "2026-09-20" key for grouping. Never throws (see [formatId]). */
fun Instant.dayKey(): String {
    if (this == Instant.DISTANT_FUTURE) return "9999-Tanpa-deadline"
    if (this == Instant.DISTANT_PAST) return "0000-Tanpa-deadline"
    return runCatching {
        val dt = toLocalDateTime(TimeZone.currentSystemDefault())
        "%04d-%02d-%02d".format(dt.year, dt.monthNumber, dt.dayOfMonth)
    }.getOrElse { "9999-Tanpa-deadline" }
}
