package id.ac.itera.ressist.ui.tugas

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Badge
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
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
import id.ac.itera.ressist.ui.common.EmptyState
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.PrimaryPillButton
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.common.RessistIcons
import id.ac.itera.ressist.ui.common.TaskCardFrontend
import org.koin.androidx.compose.koinViewModel

/**
 * Tab Tugas: header judul + ikon search/filter (pola contoh),
 * tab Terlewat/Mendatang/Selesai ala Mihon + kartu ala frontend.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TugasScreen(modifier: Modifier = Modifier, viewModel: TugasViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val message = state.notice ?: state.error
    var searchOpen by remember { mutableStateOf(false) }
    var filterOpen by remember { mutableStateOf(false) }
    // true saat refresh dipicu tombol header (bukan tarik-untuk-refresh):
    // indikator pull disembunyikan agar hanya spinner header yang tampil.
    var headerSync by remember { mutableStateOf(false) }
    val pullState = rememberPullToRefreshState()
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
    LaunchedEffect(state.isRefreshing) {
        if (!state.isRefreshing) headerSync = false
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
                    IconButton(onClick = { headerSync = true; viewModel.refresh() }, enabled = !state.isRefreshing) {
                        if (state.isRefreshing && headerSync) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        } else {
                            Icon(painterResource(RessistIcons.Refresh), contentDescription = "Sinkronkan tugas")
                        }
                    }
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
                if (state.selectedTab == 1 && state.hiddenCount > 0) {
                    Text(
                        "${state.hiddenCount} tugas disembunyikan (deadline > ${state.horizonDays} hari)",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                    )
                }
                // Tab ala Mihon: baris tab + garis indikator animasi + badge angka (sembunyi saat 0).
                // Posisi garis dihitung manual (lebar tab sama rata) agar tepat di bawah tab aktif.
                val tabTitles = listOf("Terlewat", "Mendatang", "Selesai")
                val counts = listOf(
                    state.buckets!!.overdue.size,
                    state.buckets!!.upcoming.size,
                    state.buckets!!.done.size,
                )
                BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                    val tabWidth = maxWidth / 3
                    val indicatorX by animateDpAsState(
                        targetValue = tabWidth * state.selectedTab,
                        label = "tabIndicator",
                    )
                    Column {
                        Row(modifier = Modifier.fillMaxWidth()) {
                            tabTitles.forEachIndexed { i, title ->
                                val selected = state.selectedTab == i
                                Row(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { viewModel.selectTab(i) }
                                        .padding(vertical = 12.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        title,
                                        fontSize = 14.sp,
                                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                        color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    if (counts[i] > 0) {
                                        Spacer(Modifier.width(6.dp))
                                        Badge(
                                            containerColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary,
                                            contentColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onPrimary,
                                        ) { Text("${counts[i]}") }
                                    }
                                }
                            }
                        }
                        Box(modifier = Modifier.fillMaxWidth().height(3.dp)) {
                            Box(
                                modifier = Modifier
                                    .offset(x = indicatorX)
                                    .width(tabWidth)
                                    .fillMaxHeight()
                                    .background(MaterialTheme.colorScheme.primary, CircleShape),
                            )
                        }
                    }
                }
                PullToRefreshBox(
                    isRefreshing = state.isRefreshing,
                    onRefresh = viewModel::refresh,
                    modifier = Modifier.fillMaxSize(),
                    state = pullState,
                    indicator = {
                        // Sync via tombol header: cukup spinner header, tanpa indikator tengah.
                        if (!headerSync) {
                            PullToRefreshDefaults.Indicator(
                                modifier = Modifier.align(Alignment.TopCenter),
                                isRefreshing = state.isRefreshing,
                                state = pullState,
                            )
                        }
                    },
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
