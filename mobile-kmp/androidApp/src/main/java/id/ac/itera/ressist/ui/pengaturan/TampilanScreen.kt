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
import androidx.compose.material3.Switch
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
import id.ac.itera.ressist.data.TextSize
import id.ac.itera.ressist.data.ThemeMode
import id.ac.itera.ressist.data.ThemePrefs
import id.ac.itera.ressist.ui.common.RessistCard
import id.ac.itera.ressist.ui.common.RessistHeader
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

/** Pengaturan tampilan: mode gelap/terang, hitam pekat, ukuran teks. */
@Composable
fun TampilanScreen(onBack: () -> Unit, modifier: Modifier = Modifier, prefs: ThemePrefs = koinInject()) {
    val scope = rememberCoroutineScope()
    val mode by prefs.mode.collectAsStateWithLifecycle(initialValue = ThemeMode.SYSTEM)
    val pureBlack by prefs.pureBlack.collectAsStateWithLifecycle(initialValue = false)
    val textSize by prefs.textSize.collectAsStateWithLifecycle(initialValue = TextSize.NORMAL)

    Column(modifier.fillMaxSize()) {
        RessistHeader(
            title = "Tampilan",
            navigateUp = onBack,
        )
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            RessistCard {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Mode tampilan", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        "Ikuti sistem atau paksa terang/gelap",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    listOf(
                        ThemeMode.SYSTEM to "Sistem",
                        ThemeMode.LIGHT to "Terang",
                        ThemeMode.DARK to "Gelap",
                    ).forEach { (value, label) ->
                        Row(
                            modifier = Modifier.fillMaxWidth()
                                .clickable { scope.launch { prefs.setMode(value) } }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            RadioButton(selected = mode == value, onClick = { scope.launch { prefs.setMode(value) } })
                            Text(label, fontSize = 14.sp, modifier = Modifier.padding(start = 8.dp))
                        }
                    }
                }
            }
            RessistCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text("Hitam pekat", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Text(
                            "Hemat baterai layar OLED (mode gelap)",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(
                        checked = pureBlack,
                        onCheckedChange = { scope.launch { prefs.setPureBlack(it) } },
                    )
                }
            }
            RessistCard {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Ukuran teks", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    listOf(
                        TextSize.NORMAL to "Normal",
                        TextSize.LARGE to "Besar",
                    ).forEach { (value, label) ->
                        Row(
                            modifier = Modifier.fillMaxWidth()
                                .clickable { scope.launch { prefs.setTextSize(value) } }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            RadioButton(selected = textSize == value, onClick = { scope.launch { prefs.setTextSize(value) } })
                            Text(label, fontSize = 14.sp, modifier = Modifier.padding(start = 8.dp))
                        }
                    }
                }
            }
        }
    }
}
