package id.ac.itera.ressist.ui.kelas

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.domain.model.Course
import id.ac.itera.ressist.ui.common.EmptyState
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.PrimaryPillButton
import id.ac.itera.ressist.ui.common.RessistCard
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.common.RessistIcons
import id.ac.itera.ressist.ui.common.StatCardFrontend
import org.koin.androidx.compose.koinViewModel

/**
 * Pengaturan Kelas ala ClassSettings web: banner beta, statistik,
 * lalu Tab "Mata Kuliah" (alias+mute) dan "Filter Kelas" (filter+kelola kode).
 */
@Composable
fun KelasScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    initialTab: Int = 0,
    viewModel: KelasViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val message = state.notice ?: state.error
    var tab by rememberSaveable(initialTab) { mutableIntStateOf(initialTab) }
    LaunchedEffect(message) {
        message?.let {
            snackbar.showSnackbar(it)
            viewModel.consumeMessage()
        }
    }
    Column(modifier.fillMaxSize()) {
        RessistHeader(
            title = "Kelas",
            navigateUp = onBack,
        )
        when {
            state.isLoading -> LoadingBox(Modifier.fillMaxSize())
            state.user == null -> ErrorBox(state.error ?: "Gagal memuat", viewModel::load, Modifier.fillMaxSize())
            else -> Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                BetaCard()
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    StatCardFrontend("Kelas Tersedia", state.allClassCodes.size, "", RessistIcons.School, Modifier.weight(1f))
                    StatCardFrontend("Matkul Difilter", state.filteredCount, "", RessistIcons.Person, Modifier.weight(1f))
                    StatCardFrontend("Mata Kuliah Aktif", state.activeCount, "", RessistIcons.Book, Modifier.weight(1f))
                }
                TabRow(selectedTabIndex = tab) {
                    Tab(
                        selected = tab == 0,
                        onClick = { tab = 0 },
                        text = { Text("Mata Kuliah") },
                    )
                    Tab(
                        selected = tab == 1,
                        onClick = { tab = 1 },
                        text = { Text("Filter Kelas") },
                    )
                }
                if (tab == 0) {
                    CourseSection(state, viewModel)
                } else {
                    FilterSection(state, viewModel)
                    CodeSection(state, viewModel)
                }
                PrimaryPillButton(
                    if (state.isSaving) "Menyimpan..." else "Simpan Semua Pengaturan",
                    viewModel::saveAll,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !state.isSaving,
                )
                SnackbarHost(snackbar)
            }
        }
    }
    state.confirmMuteCourse?.let { name ->
        AlertDialog(
            onDismissRequest = viewModel::cancelMute,
            icon = {
                Box(
                    Modifier.size(40.dp).clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.errorContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(painterResource(RessistIcons.Warning), contentDescription = null, tint = MaterialTheme.colorScheme.error)
                }
            },
            title = { Text("Yakin mute mata kuliah ini?", fontSize = 14.sp, fontWeight = FontWeight.SemiBold) },
            text = {
                Text(
                    "Tugas dari $name tidak akan muncul di timeline dan notifikasinya dimatikan. Bisa diaktifkan lagi kapan saja.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            confirmButton = {
                TextButton(onClick = viewModel::confirmMute) { Text("Ya, Mute") }
            },
            dismissButton = {
                TextButton(onClick = viewModel::cancelMute) { Text("Batal") }
            },
        )
    }
}

@Composable
private fun BetaCard() {
    RessistCard {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                Modifier.size(32.dp).clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center,
            ) {
                Text("!", fontWeight = FontWeight.Medium, fontSize = 12.sp, color = MaterialTheme.colorScheme.onPrimary)
            }
            Column(Modifier.weight(1f)) {
                Text("Fitur Dalam Pengembangan", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    "Filter Kelas dan Alias Mata Kuliah masih beta. Beberapa fungsi mungkin berubah di versi mendatang.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) {
                        Text("Beta", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                    }
                    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) {
                        Text("v0.5.1", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String, subtitle: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            Modifier.size(32.dp).clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center,
        ) {
            Icon(painterResource(RessistIcons.Book), contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(16.dp))
        }
        Column {
            Text(title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun CourseSection(state: KelasUiState, viewModel: KelasViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionHeader("Pengaturan Mata Kuliah", "Ubah alias tampilan dan mute notifikasi per mata kuliah")
        if (state.courses.isEmpty()) {
            EmptyState("Belum ada mata kuliah. Sinkronkan Moodle dulu.")
        } else {
            state.courses.forEach { course -> CourseRow(course, state, viewModel) }
        }
    }
}

@Composable
private fun CourseRow(course: Course, state: KelasUiState, viewModel: KelasViewModel) {
    val muted = state.muted.contains(course.name)
    val isEditing = state.editingCourseId == course.id
    val display = state.displayName(course)
    RessistCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                Modifier.size(32.dp).clip(RoundedCornerShape(10.dp))
                    .background(
                        if (muted) MaterialTheme.colorScheme.onBackground.copy(alpha = 0.08f)
                        else MaterialTheme.colorScheme.primary,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    display.firstOrNull()?.uppercase() ?: "?",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (muted) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onPrimary,
                )
            }
            Column(Modifier.weight(1f)) {
                if (isEditing) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = state.tempAlias,
                            onValueChange = viewModel::setTempAlias,
                            placeholder = { Text("Alias baru...") },
                            singleLine = true,
                            shape = CircleShape,
                            modifier = Modifier.weight(1f),
                        )
                        IconButton(onClick = { viewModel.saveAlias(course.name) }, modifier = Modifier.size(32.dp)) {
                            Box(Modifier.size(32.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                                Icon(painterResource(RessistIcons.Check), contentDescription = "Simpan alias", tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(14.dp))
                            }
                        }
                        IconButton(onClick = viewModel::cancelEdit, modifier = Modifier.size(32.dp)) {
                            Icon(painterResource(RessistIcons.Close), contentDescription = "Batal", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                display,
                                fontSize = 14.sp,
                                maxLines = 1,
                                color = if (muted) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                            )
                            if (state.aliases.containsKey(course.name)) {
                                Text("Asli: ${course.name}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                            }
                        }
                        IconButton(onClick = { viewModel.startEdit(course.id, course.name) }, modifier = Modifier.size(24.dp)) {
                            Icon(painterResource(RessistIcons.Edit), contentDescription = "Ubah alias", modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
            Surface(
                shape = CircleShape,
                color = if (muted) MaterialTheme.colorScheme.onBackground.copy(alpha = 0.08f) else MaterialTheme.colorScheme.primary,
                modifier = Modifier.clickable { viewModel.requestMute(course.name) },
            ) {
                Text(
                    if (muted) "Muted" else "Aktif",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (muted) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                )
            }
        }
    }
}

@Composable
private fun FilterSection(state: KelasUiState, viewModel: KelasViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionHeader("Filter Kelas", "Pilih kelas per matkul — hanya tugas kelas itu + umum yang tampil")
        Text(
            "Pilih manual per mata kuliah. Deteksi [RA]/(RA) di judul tetap jalan; tugas tanpa kode dianggap umum dan tetap tampil. Kosong = tidak difilter.",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        if (state.courses.isEmpty()) {
            EmptyState("Belum ada mata kuliah. Sinkronkan Moodle dulu.")
        } else {
            state.courses.forEach { course ->
                val selected = state.perCourse[course.name].orEmpty()
                RessistCard {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(state.displayName(course), fontSize = 14.sp, fontWeight = FontWeight.Medium, maxLines = 1)
                        if (selected.isEmpty()) {
                            Text("Tidak difilter — semua tugas tampil", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        } else {
                            Text("Filter: $selected + umum", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            state.allClassCodes.forEach { code ->
                                FilterChip(
                                    selected = selected == code,
                                    onClick = { viewModel.togglePerCourse(course.name, code) },
                                    label = { Text(code, fontSize = 12.sp) },
                                )
                            }
                            if (selected.isNotEmpty()) {
                                FilterChip(
                                    selected = false,
                                    onClick = { viewModel.clearPerCourse(course.name) },
                                    label = { Text("Hapus", fontSize = 12.sp) },
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CodeSection(state: KelasUiState, viewModel: KelasViewModel) {
    var showAdd by remember { mutableStateOf(false) }
    var newCode by remember { mutableStateOf("") }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Kelola kode kelas tersedia:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            state.allClassCodes.forEach { code ->
                val custom = state.customCodes.contains(code)
                Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp)) {
                        Text(code, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (custom) {
                            Icon(
                                painterResource(RessistIcons.Close),
                                contentDescription = "Hapus $code",
                                modifier = Modifier.size(14.dp).clickable { viewModel.removeCustomCode(code) },
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
        if (showAdd) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = newCode,
                    onValueChange = { newCode = it.uppercase() },
                    placeholder = { Text("Kode") },
                    singleLine = true,
                    shape = CircleShape,
                    modifier = Modifier.weight(1f),
                )
                IconButton(
                    onClick = {
                        viewModel.addCustomCode(newCode)
                        newCode = ""
                        showAdd = false
                    },
                    enabled = newCode.isNotBlank(),
                    modifier = Modifier.size(36.dp),
                ) {
                    Box(Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                        Icon(painterResource(RessistIcons.Add), contentDescription = "Tambah", tint = MaterialTheme.colorScheme.onPrimary)
                    }
                }
            }
        } else {
            Text(
                "+ Tambah Kelas",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.clickable { showAdd = true }.padding(vertical = 8.dp),
            )
        }
        Spacer(Modifier.height(4.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f))
    }
}
