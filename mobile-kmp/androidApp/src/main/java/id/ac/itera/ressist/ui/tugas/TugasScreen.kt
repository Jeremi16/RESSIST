package id.ac.itera.ressist.ui.tugas

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.RadioButton
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.ui.common.CountBadge
import id.ac.itera.ressist.ui.common.EmptyState
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.PrimaryPillButton
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.common.RessistIcons
import id.ac.itera.ressist.ui.common.TaskCardFrontend
import org.koin.androidx.compose.koinViewModel

private data class Segment(val title: String, val icon: Int)

/**
 * Tab Tugas: header judul + ikon search/filter (pola contoh),
 * segmen Terlewat/Mendatang/Selesai + kartu ala frontend.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TugasScreen(modifier: Modifier = Modifier, viewModel: TugasViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val message = state.notice ?: state.error
    var searchOpen by remember { mutableStateOf(false) }
    var filterOpen by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }
    val closeSearch = {
        searchOpen = false
        viewModel.setQuery("")
    }
    // Back sistem saat mode cari → tutup mode cari dulu.
    BackHandler(enabled = searchOpen) { closeSearch() }
    LaunchedEffect(searchOpen) {
        if (searchOpen) focusRequester.requestFocus()
    }
    LaunchedEffect(message) {
        message?.let {
            snackbar.showSnackbar(it)
            viewModel.consumeNotice()
        }
    }
    val filterActive = state.source != TugasSource.ALL || state.sort != TugasSort.DEADLINE_ASC
    Column(modifier.fillMaxSize()) {
        if (searchOpen) {
            // Mode cari MENGGANTIKAN header (pola contoh): ← + field + filter.
            SearchHeader(
                query = state.query,
                onQuery = viewModel::setQuery,
                onClose = closeSearch,
                onFilter = { filterOpen = true },
                filterActive = filterActive,
                focusRequester = focusRequester,
            )
        } else {
            RessistHeader(
                title = "Tugas",
                actions = {
                    IconButton(onClick = { searchOpen = true }) {
                        Icon(painterResource(RessistIcons.Search), contentDescription = "Cari tugas")
                    }
                    IconButton(onClick = { filterOpen = true }) {
                        // Titik penanda saat filter/sort non-default aktif
                        if (filterActive) {
                            Icon(painterResource(RessistIcons.FilterList), contentDescription = "Filter aktif", tint = MaterialTheme.colorScheme.primary)
                        } else {
                            Icon(painterResource(RessistIcons.FilterList), contentDescription = "Filter & urutan")
                        }
                    }
                },
            )
        }
        when {
            state.isLoading -> LoadingBox(Modifier.fillMaxSize())
            state.buckets == null -> ErrorBox(state.error ?: "Gagal memuat", viewModel::load, Modifier.fillMaxSize())
            else -> {
                if (state.isFiltering) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (state.source != TugasSource.ALL) {
                            FilterChip(
                                selected = true,
                                onClick = { viewModel.setSource(TugasSource.ALL) },
                                label = { Text(state.source.label) },
                                trailingIcon = { Icon(painterResource(RessistIcons.Close), contentDescription = null, modifier = Modifier.size(14.dp)) },
                            )
                        }
                        if (state.sort != TugasSort.DEADLINE_ASC) {
                            FilterChip(
                                selected = true,
                                onClick = { viewModel.setSort(TugasSort.DEADLINE_ASC) },
                                label = { Text(state.sort.label) },
                                trailingIcon = { Icon(painterResource(RessistIcons.Close), contentDescription = null, modifier = Modifier.size(14.dp)) },
                            )
                        }
                        Text(
                            "Hapus",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.clickable { viewModel.clearFilter() }.padding(8.dp),
                        )
                    }
                }
                val segments = listOf(
                    Segment("Terlewat", RessistIcons.Warning),
                    Segment("Mendatang", RessistIcons.Schedule),
                    Segment("Selesai", RessistIcons.CheckCircle),
                )
                val counts = listOf(
                    state.buckets!!.overdue.size,
                    state.buckets!!.upcoming.size,
                    state.buckets!!.done.size,
                )
                // Segmen pill ala header kolom frontend
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    segments.forEachIndexed { i, seg ->
                        val selected = state.selectedTab == i
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                            border = if (selected) null else BorderStroke(1.dp, MaterialTheme.colorScheme.onBackground.copy(alpha = 0.1f)),
                            modifier = Modifier.weight(1f).clickable { viewModel.selectTab(i) },
                        ) {
                            Column(
                                modifier = Modifier.padding(vertical = 10.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                if (selected) {
                                    Icon(painterResource(seg.icon), contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onPrimary)
                                    Text(seg.title, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onPrimary)
                                    CountBadge(counts[i])
                                } else {
                                    Icon(painterResource(seg.icon), contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(seg.title, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("${counts[i]}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
                PullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = viewModel::refresh,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    val list = viewModel.visibleTasks()
                    if (list.isEmpty()) {
                        Column(Modifier.fillMaxSize().padding(16.dp)) {
                            EmptyState(
                                if (state.isFiltering) "Tidak cocok dengan pencarian/filter"
                                else "Tidak ada tugas di sini",
                            )
                            Text(
                                "Tarik ke bawah untuk sinkronkan",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.align(Alignment.CenterHorizontally).padding(top = 12.dp),
                            )
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            item { Spacer(Modifier.height(4.dp)) }
                            items(list, key = { it.id }) { task ->
                                TaskCardFrontend(
                                    task = task,
                                    completing = state.completingId == task.id,
                                    onComplete = { viewModel.complete(task) },
                                )
                            }
                            item { Spacer(Modifier.height(16.dp)) }
                        }
                    }
                }
                if (filterOpen) {
                    FilterSheet(
                        sort = state.sort,
                        source = state.source,
                        onSort = viewModel::setSort,
                        onSource = viewModel::setSource,
                        onReset = viewModel::clearFilter,
                        onClose = { filterOpen = false },
                    )
                }
                SnackbarHost(snackbar)
            }
        }
    }
}

/**
 * Header mode cari: menggantikan judul dengan ← + field "Cari..." + filter.
 * Tinggi/padding disamakan dengan [RessistHeader] agar tidak lompat layout.
 */
@Composable
private fun SearchHeader(
    query: String,
    onQuery: (String) -> Unit,
    onClose: () -> Unit,
    onFilter: () -> Unit,
    filterActive: Boolean,
    focusRequester: FocusRequester,
) {
    val keyboard = LocalSoftwareKeyboardController.current
    // Status bar ikut TopAppBar M3 (windowInsets otomatis), tanpa divider ala Mihon.
    Surface(color = Color.Transparent, modifier = Modifier.fillMaxWidth().statusBarsPadding()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp).height(64.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onClose) {
                Icon(painterResource(RessistIcons.ArrowBack), contentDescription = "Tutup pencarian")
            }
            BasicTextField(
                value = query,
                onValueChange = onQuery,
                singleLine = true,
                textStyle = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.Normal,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.onBackground,
                ),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { keyboard?.hide() }),
                modifier = Modifier.weight(1f).focusRequester(focusRequester)
                    .padding(vertical = 12.dp),
                decorationBox = { inner ->
                    if (query.isEmpty()) {
                        Text(
                            "Cari...",
                            style = MaterialTheme.typography.titleLarge,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Normal,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    inner()
                },
            )
            if (query.isNotEmpty()) {
                IconButton(onClick = { onQuery("") }) {
                    Icon(painterResource(RessistIcons.Close), contentDescription = "Hapus")
                }
            }
            IconButton(onClick = onFilter) {
                if (filterActive) {
                    Icon(painterResource(RessistIcons.FilterList), contentDescription = "Filter aktif", tint = MaterialTheme.colorScheme.primary)
                } else {
                    Icon(painterResource(RessistIcons.FilterList), contentDescription = "Filter & urutan")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FilterSheet(
    sort: TugasSort,
    source: TugasSource,
    onSort: (TugasSort) -> Unit,
    onSource: (TugasSource) -> Unit,
    onReset: () -> Unit,
    onClose: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onClose, sheetState = rememberModalBottomSheetState()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Filter & Urutan", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(painterResource(RessistIcons.Refresh), contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "Atur ulang",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.clickable { onReset() }.padding(8.dp),
                    )
                }
            }
            Column {
                Text("Sumber", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                    TugasSource.entries.forEach {
                        FilterChip(
                            selected = source == it,
                            onClick = { onSource(it) },
                            label = { Text(it.label) },
                        )
                    }
                }
            }
            Column {
                Text("Urutan", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                TugasSort.entries.forEach {
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { onSort(it) }.padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(selected = sort == it, onClick = { onSort(it) })
                        Text(it.label, fontSize = 14.sp, modifier = Modifier.padding(start = 8.dp))
                    }
                }
            }
            PrimaryPillButton("Terapkan", onClose, modifier = Modifier.align(Alignment.End))
            Spacer(Modifier.height(24.dp))
        }
    }
}
