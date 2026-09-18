package id.ac.itera.ressist.ui.lms

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.domain.model.User
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.PrimaryPillButton
import id.ac.itera.ressist.ui.common.RessistCard
import id.ac.itera.ressist.ui.common.RessistHeader
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
    Column(modifier.fillMaxSize()) {
        RessistHeader(title = "LMS")
        when {
            state.isLoading -> LoadingBox(Modifier.fillMaxSize())
            state.user == null -> ErrorBox(state.error ?: "Gagal memuat", viewModel::load, Modifier.fillMaxSize())
            else -> Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
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
                    RessistCard {
                        Text(
                            "Tes Moodle: ${preview.total} event ditemukan",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        )
                    }
                }
                ClassroomCard(
                    user = user,
                    saving = state.isSaving,
                    onToggle = viewModel::setClassroomEnabled,
                    onDisconnect = viewModel::disconnectGoogle,
                )
                SnackbarHost(snackbar)
            }
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
    RessistCard {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Moodle (URL ICS)", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Switch(checked = user.moodleEnabled, onCheckedChange = onToggle, enabled = !saving)
            }
            OutlinedTextField(
                value = url,
                onValueChange = onUrlChange,
                label = { Text("URL kalender Moodle") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PrimaryPillButton("Simpan", onSaveUrl, modifier = Modifier.weight(1f), enabled = !saving)
                OutlinedButton(
                    onClick = onTest,
                    enabled = !testing && !saving,
                    modifier = Modifier.weight(1f).height(36.dp),
                    shape = CircleShape,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.onBackground.copy(alpha = 0.15f)),
                ) { Text("Tes koneksi", fontSize = 14.sp) }
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
    RessistCard {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Google Classroom", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Switch(checked = user.googleClassroomEnabled, onCheckedChange = onToggle, enabled = !saving)
            }
            Text(
                if (user.googleConnected) "Akun Google terhubung" else "Akun Google belum terhubung",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (user.googleConnected) {
                OutlinedButton(
                    onClick = onDisconnect,
                    enabled = !saving,
                    shape = CircleShape,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.onBackground.copy(alpha = 0.15f)),
                ) { Text("Putuskan Google") }
            }
        }
    }
}
