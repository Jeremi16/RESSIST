package id.ac.itera.ressist.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import id.ac.itera.ressist.data.OfflineCache
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import org.koin.compose.koinInject

/** Strip tipis saat data yang tampil berasal dari cache offline. */
@Composable
fun OfflineBanner(cache: OfflineCache = koinInject()) {
    val since by cache.offlineSince.collectAsState()
    val at = since ?: return
    val t = at.toLocalDateTime(TimeZone.currentSystemDefault())
    val stamp = "%02d/%02d %02d:%02d".format(t.dayOfMonth, t.monthNumber, t.hour, t.minute)
    Text(
        text = "Offline — menampilkan data tersimpan ($stamp)",
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onErrorContainer,
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.errorContainer)
            .padding(horizontal = 16.dp, vertical = 6.dp),
    )
}
