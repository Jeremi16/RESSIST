package id.ac.itera.ressist.ui.kalender

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.MonthCalendarGrid
import id.ac.itera.ressist.ui.common.RessistCard
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.common.RessistIcons
import id.ac.itera.ressist.ui.common.toCalItem
import org.koin.androidx.compose.koinViewModel

/** Kalender grid bulanan ala CalendarView frontend (hanya pending yang tampil). */
@Composable
fun KalenderScreen(
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
    viewModel: KalenderViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Column(modifier.fillMaxSize()) {
        RessistHeader(
            title = "Kalender",
            subtitle = "Deadline tugas per bulan",
            actions = {
                if (onBack != null) {
                    IconButton(onClick = onBack) {
                        Icon(painterResource(RessistIcons.ArrowBack), contentDescription = "Kembali")
                    }
                }
            },
        )
        when {
            state.isLoading -> LoadingBox(Modifier.fillMaxSize())
            state.error != null && state.events.isEmpty() ->
                ErrorBox(state.error!!, viewModel::load, Modifier.fillMaxSize())
            state.events.isEmpty() -> Column(Modifier.fillMaxSize().padding(24.dp)) {
                RessistCard {
                    Text("Belum ada event. Atur sumber LMS dulu di tab LMS.")
                }
            }
            else -> Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (state.fromCache) {
                    Text(
                        "Menampilkan data cache — tarik Tugas untuk sinkronkan",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                RessistCard {
                    // Hanya pending (selesai disembunyikan) seperti web.
                    MonthCalendarGrid(state.events.filter { !it.completed }.mapNotNull { it.toCalItem() })
                }
            }
        }
    }
}
