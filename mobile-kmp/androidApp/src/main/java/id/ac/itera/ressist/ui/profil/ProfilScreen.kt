package id.ac.itera.ressist.ui.profil

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.PrimaryPillButton
import id.ac.itera.ressist.ui.common.RessistCard
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.common.RessistIcons
import org.koin.androidx.compose.koinViewModel

@Composable
fun ProfilScreen(
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
    viewModel: ProfilViewModel = koinViewModel(),
) {
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
        RessistHeader(
            title = "Profil",
            subtitle = "Kelola akun",
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
            state.user == null -> ErrorBox(state.error ?: "Gagal memuat", viewModel::load, Modifier.fillMaxSize())
            else -> Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                val user = state.user!!
                RessistCard {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier.size(56.dp).clip(RoundedCornerShape(16.dp))
                                .background(MaterialTheme.colorScheme.primary),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                (user.name.firstOrNull() ?: "?").toString().uppercase(),
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        }
                        Column(Modifier.weight(1f)) {
                            Text(user.name, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                            Text(
                                user.email,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                "Itera Students",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                    }
                }
                RessistCard {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Profil", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        OutlinedTextField(
                            value = state.name,
                            onValueChange = viewModel::setName,
                            label = { Text("Nama") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                        )
                        if (state.isSaving) {
                            CircularProgressIndicator()
                        } else {
                            PrimaryPillButton("Simpan", viewModel::save, modifier = Modifier.fillMaxWidth())
                        }
                    }
                }
                OutlinedButton(
                    onClick = viewModel::logout,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !state.isLoggingOut,
                    shape = CircleShape,
                ) {
                    Text(if (state.isLoggingOut) "Keluar..." else "Keluar")
                }
                Text(
                    "Ressist KMP 0.3.0",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
                SnackbarHost(snackbar)
            }
        }
    }
}
