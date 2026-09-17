package id.ac.itera.ressist.ui.profil

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.SectionTitle
import org.koin.androidx.compose.koinViewModel

@Composable
fun ProfilScreen(modifier: Modifier = Modifier, viewModel: ProfilViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val message = state.notice ?: state.error
    LaunchedEffect(message) {
        message?.let {
            snackbar.showSnackbar(it)
            viewModel.consumeMessage()
        }
    }
    when {
        state.isLoading -> LoadingBox(modifier)
        state.user == null -> ErrorBox(state.error ?: "Gagal memuat", viewModel::load, modifier)
        else -> Column(
            modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val user = state.user!!
            Card {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.primaryContainer,
                        modifier = Modifier.size(56.dp),
                    ) {
                        androidx.compose.foundation.layout.Box(contentAlignment = Alignment.Center) {
                            Text(
                                (user.name.firstOrNull() ?: "?").toString(),
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                    Column {
                        Text(user.name, fontWeight = FontWeight.Bold)
                        Text(user.email, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SectionTitle("Profil")
                    OutlinedTextField(
                        value = state.name,
                        onValueChange = viewModel::setName,
                        label = { Text("Nama") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                }
            }
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SectionTitle("Pengingat (jam sebelum deadline)")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        REMINDER_OPTIONS.forEach { hour ->
                            FilterChip(
                                selected = state.reminderHours.contains(hour),
                                onClick = { viewModel.toggleReminderHour(hour) },
                                label = { Text("H-$hour") },
                            )
                        }
                    }
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Briefing pagi")
                        Switch(
                            checked = state.morningBriefing,
                            onCheckedChange = viewModel::setMorningBriefing,
                        )
                    }
                    if (state.isSaving) {
                        CircularProgressIndicator()
                    } else {
                        Button(onClick = viewModel::save, modifier = Modifier.fillMaxWidth()) {
                            Text("Simpan")
                        }
                    }
                }
            }
            OutlinedButton(
                onClick = viewModel::logout,
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.isLoggingOut,
            ) {
                Text(if (state.isLoggingOut) "Keluar..." else "Keluar")
            }
            Text(
                "Ressist KMP 0.2.0",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
            SnackbarHost(snackbar)
        }
    }
}
