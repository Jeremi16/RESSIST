package id.ac.itera.ressist.ui.lms

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.domain.model.User
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.SectionTitle
import org.koin.androidx.compose.koinViewModel

@Composable
fun LmsScreen(modifier: Modifier = Modifier, viewModel: LmsViewModel = koinViewModel()) {
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
            MoodleCard(
                user = user,
                url = state.moodleUrl,
                saving = state.isSaving,
                testing = state.isTesting,
                onUrlChange = viewModel::setMoodleUrl,
                onToggle = viewModel::setMoodleEnabled,
                onSaveUrl = viewModel::saveMoodleUrl,
                onTest = viewModel::testMoodle,
            )
            state.testResult?.let { preview ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)) {
                    Text(
                        "Tes Moodle: ${preview.total} event ditemukan",
                        modifier = Modifier.padding(12.dp),
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            ClassroomCard(
                user = user,
                saving = state.isSaving,
                onToggle = viewModel::setClassroomEnabled,
                onDisconnect = viewModel::disconnectGoogle,
            )
            ClassCard(
                user = user,
                courses = state.courses,
                saving = state.isSaving,
                onPickCode = viewModel::setClassCode,
                onToggleMute = viewModel::toggleMute,
            )
            SnackbarHost(snackbar)
        }
    }
}

@Composable
private fun MoodleCard(
    user: User,
    url: String,
    saving: Boolean,
    testing: Boolean,
    onUrlChange: (String) -> Unit,
    onToggle: (Boolean) -> Unit,
    onSaveUrl: () -> Unit,
    onTest: () -> Unit,
) {
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically) {
                Text("Moodle (URL ICS)", fontWeight = FontWeight.Bold)
                Switch(checked = user.moodleEnabled, onCheckedChange = onToggle, enabled = !saving)
            }
            OutlinedTextField(
                value = url,
                onValueChange = onUrlChange,
                label = { Text("URL kalender Moodle") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = onSaveUrl, enabled = !saving) { Text("Simpan") }
                OutlinedButton(onClick = onTest, enabled = !testing && !saving) { Text("Tes koneksi") }
            }
            if (testing || saving) CircularProgressIndicator()
        }
    }
}

@Composable
private fun ClassroomCard(
    user: User,
    saving: Boolean,
    onToggle: (Boolean) -> Unit,
    onDisconnect: () -> Unit,
) {
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically) {
                Text("Google Classroom", fontWeight = FontWeight.Bold)
                Switch(checked = user.googleClassroomEnabled, onCheckedChange = onToggle, enabled = !saving)
            }
            Text(
                if (user.googleConnected) "Akun Google terhubung" else "Akun Google belum terhubung",
                style = MaterialTheme.typography.bodySmall,
            )
            if (user.googleConnected) {
                OutlinedButton(onClick = onDisconnect, enabled = !saving) { Text("Putuskan Google") }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ClassCard(
    user: User,
    courses: List<String>,
    saving: Boolean,
    onPickCode: (String) -> Unit,
    onToggleMute: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Kelas", fontWeight = FontWeight.Bold)
            if (user.availableClassCodes.isNotEmpty()) {
                ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                    OutlinedTextField(
                        value = user.classCode ?: "-",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Kode kelas") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                    )
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        user.availableClassCodes.forEach { code ->
                            DropdownMenuItem(
                                text = { Text(code) },
                                onClick = {
                                    expanded = false
                                    if (code != user.classCode) onPickCode(code)
                                },
                            )
                        }
                    }
                }
            } else {
                Text("Kode kelas: ${user.classCode ?: "-"}", style = MaterialTheme.typography.bodySmall)
            }
            SectionTitle("Bisukan mata kuliah")
            if (courses.isEmpty()) {
                Text("Belum ada daftar matkul — sinkronkan dulu.", style = MaterialTheme.typography.bodySmall)
            } else {
                @OptIn(ExperimentalMaterial3Api::class)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    courses.forEach { course ->
                        val muted = user.mutedCourses.contains(course)
                        AssistChip(
                            onClick = { if (!saving) onToggleMute(course) },
                            label = { Text(if (muted) "$course (dibisukan)" else course) },
                        )
                    }
                }
            }
        }
    }
}
