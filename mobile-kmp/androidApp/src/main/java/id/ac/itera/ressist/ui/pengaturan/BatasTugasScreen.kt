package id.ac.itera.ressist.ui.pengaturan

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.data.ThemePrefs
import id.ac.itera.ressist.ui.common.RessistCard
import id.ac.itera.ressist.ui.common.RessistHeader
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

private val OPTIONS: List<Pair<Int?, String>> = listOf(
    null to "Semua tugas",
    7 to "7 hari ke depan",
    14 to "14 hari ke depan",
    28 to "28 hari ke depan",
    60 to "60 hari ke depan",
)

/** Batas tampilan tugas: sembunyikan tugas mendatang yang deadline-nya masih jauh. */
@Composable
fun BatasTugasScreen(onBack: () -> Unit, modifier: Modifier = Modifier, prefs: ThemePrefs = koinInject()) {
    val scope = rememberCoroutineScope()
    val days by prefs.taskHorizonDays.collectAsStateWithLifecycle(initialValue = null)

    Column(modifier.fillMaxSize()) {
        RessistHeader(
            title = "Batas Tampilan Tugas",
            navigateUp = onBack,
        )
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            RessistCard {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Tampilkan tugas dengan deadline", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        "Tugas dengan deadline lebih jauh disembunyikan dari Tugas & Beranda. " +
                            "Kalender dan pengingat tetap menampilkan semua.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OPTIONS.forEach { (value, label) ->
                        Row(
                            modifier = Modifier.fillMaxWidth()
                                .clickable { scope.launch { prefs.setTaskHorizonDays(value) } }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            RadioButton(
                                selected = days == value,
                                onClick = { scope.launch { prefs.setTaskHorizonDays(value) } },
                            )
                            Text(label, fontSize = 14.sp, modifier = Modifier.padding(start = 8.dp))
                        }
                    }
                }
            }
        }
    }
}
