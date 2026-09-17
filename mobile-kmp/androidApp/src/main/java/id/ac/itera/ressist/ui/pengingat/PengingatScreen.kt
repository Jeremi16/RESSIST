package id.ac.itera.ressist.ui.pengingat

import android.Manifest
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.domain.time.formatTimeRemainingId
import id.ac.itera.ressist.reminders.NotificationHelper
import id.ac.itera.ressist.ui.common.CoursePill
import id.ac.itera.ressist.ui.common.EmptyState
import id.ac.itera.ressist.ui.common.ErrorBox
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.PrimaryPillButton
import id.ac.itera.ressist.ui.common.RessistCard
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.common.RessistIcons
import id.ac.itera.ressist.ui.common.RessistGreen
import id.ac.itera.ressist.ui.common.RessistRed
import id.ac.itera.ressist.ui.common.formatId
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel
import java.time.LocalDate

private val BULAN = arrayOf(
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
)

/** Opsi jam ala web: 24/12/6/1 + label. */
private val HOUR_OPTIONS = listOf(
    24 to ("Sehari sebelum" to "24 Jam"),
    12 to ("Setengah hari" to "12 Jam"),
    6 to ("Pagi / Sore" to "6 Jam"),
    1 to ("Mendesak" to "1 Jam"),
)

private fun dayLabel(date: LocalDate): String {
    val today = LocalDate.now()
    return when (date) {
        today -> "Hari ini"
        today.plusDays(1) -> "Besok"
        else -> "${date.dayOfMonth} ${BULAN[date.monthValue]} ${date.year}"
    }
}

private fun hasPostPermission(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
    return ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED
}

private fun canExactAlarm(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return am.canScheduleExactAlarms()
}

/**
 * Tab Pengingat: pengaturan lengkap (jam, briefing, uji, status sistem)
 * + jadwal notifikasi lokal. Tanpa redirect ke Profil.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PengingatScreen(
    modifier: Modifier = Modifier,
    viewModel: PengingatViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val appContext = context.applicationContext
    var hasPermission by remember { mutableStateOf(hasPostPermission(context)) }
    var exactAlarm by remember { mutableStateOf(canExactAlarm(context)) }
    val message = state.notice ?: state.error
    LaunchedEffect(message) {
        message?.let {
            snackbar.showSnackbar(it)
            viewModel.consumeMessage()
        }
    }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted -> hasPermission = granted }

    /** Refresh status sistem tiap tampil (pengguna bisa ubah di Setelan lalu kembali). */
    LaunchedEffect(Unit) {
        hasPermission = hasPostPermission(context)
        exactAlarm = canExactAlarm(context)
    }

    Column(modifier.fillMaxSize()) {
        RessistHeader(title = "Pengingat", subtitle = "Notifikasi dari aplikasi")
        when {
            state.isLoading -> LoadingBox(Modifier.fillMaxSize())
            state.error != null && state.items.isEmpty() && state.reminderHours.isEmpty() ->
                ErrorBox(state.error!!, viewModel::load, Modifier.fillMaxSize())
            else -> PullToRefreshBox(
                isRefreshing = false,
                onRefresh = viewModel::load,
                modifier = Modifier.fillMaxSize(),
            ) {
                val grouped = state.items.groupBy {
                    val dt = it.fireAt.toLocalDateTime(TimeZone.currentSystemDefault())
                    LocalDate.of(dt.year, dt.monthNumber, dt.dayOfMonth)
                }.toSortedMap()
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        StatusCard(count = state.items.size, hours = state.reminderHours)
                    }
                    item {
                        HoursCard(
                            draft = state.draftHours,
                            onToggle = viewModel::toggleHour,
                        )
                    }
                    item {
                        BriefingCard(
                            enabled = state.draftBriefing,
                            onToggle = viewModel::setBriefing,
                        )
                    }
                    item {
                        TestCard(
                            enabled = hasPermission,
                            onTest = {
                                NotificationHelper.notify(
                                    appContext,
                                    908_001,
                                    "Uji coba: Deadline PR Matematika",
                                    "Ini contoh notifikasi pengingat Ressist.",
                                )
                                scope.launch {
                                    snackbar.showSnackbar("Notifikasi uji dikirim.")
                                }
                            },
                        )
                    }
                    item {
                        SystemCard(
                            hasPermission = hasPermission,
                            exactAlarm = exactAlarm,
                            onGrantPermission = {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                    permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                }
                            },
                            onOpenExactSettings = {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                    runCatching {
                                        appContext.startActivity(
                                            Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                            },
                                        )
                                    }
                                }
                            },
                            onOpenChannel = {
                                runCatching {
                                    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                        Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS).apply {
                                            putExtra(Settings.EXTRA_APP_PACKAGE, appContext.packageName)
                                            putExtra(Settings.EXTRA_CHANNEL_ID, NotificationHelper.CHANNEL_ID)
                                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                        }
                                    } else {
                                        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                            putExtra(Settings.EXTRA_APP_PACKAGE, appContext.packageName)
                                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                        }
                                    }
                                    appContext.startActivity(intent)
                                }
                            },
                        )
                    }
                    item {
                        if (state.isSaving) {
                            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator()
                            }
                        } else {
                            PrimaryPillButton(
                                if (state.hasChanges) "Simpan Perubahan" else "Tidak Ada Perubahan",
                                viewModel::save,
                                modifier = Modifier.fillMaxWidth(),
                                enabled = state.hasChanges,
                            )
                        }
                    }
                    item {
                        OutlinedButton(
                            onClick = viewModel::rebuildAlarms,
                            enabled = !state.isRebuilding,
                            shape = CircleShape,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(if (state.isRebuilding) "Membangun..." else "Bangun ulang alarm sekarang")
                        }
                    }
                    if (state.items.isEmpty()) {
                        item {
                            EmptyState("Belum ada pengingat. Pengingat dibuat otomatis sebelum deadline tugas mendatang.")
                        }
                    }
                    grouped.forEach { (date, reminders) ->
                        item(key = "h-$date") {
                            Text(
                                dayLabel(date),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                        items(reminders, key = { it.task.id + it.fireAt.toEpochMilliseconds() }) { item ->
                            ReminderCard(item)
                        }
                    }
                    item {
                        Text(
                            "Suara & getar mengikuti setelan channel sistem.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    item { Spacer(Modifier.height(8.dp)) }
                }
                SnackbarHost(snackbar)
            }
        }
    }
}

@Composable
private fun StatusCard(count: Int, hours: List<Int>) {
    RessistCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text("$count pengingat terjadwal", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    if (hours.isEmpty()) "Pengingat mati"
                    else hours.sortedDescending().joinToString(", ", "Bunyi H-") { "$it jam" },
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            Box(
                Modifier.size(48.dp).clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painterResource(RessistIcons.Notifications),
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                )
            }
        }
    }
}

@Composable
private fun HoursCard(draft: List<Int>, onToggle: (Int) -> Unit) {
    RessistCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Waktu Pengingat", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "Pilih kapan aplikasi mengirim peringatan. Boleh lebih dari satu.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                HOUR_OPTIONS.chunked(2).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        row.forEach { (hour, labels) ->
                            val (sub, label) = labels
                            val active = draft.contains(hour)
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                                modifier = Modifier.weight(1f).clickable { onToggle(hour) },
                            ) {
                                Column(Modifier.padding(16.dp)) {
                                    Text(
                                        label,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (active) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                                    )
                                    Text(
                                        sub,
                                        fontSize = 12.sp,
                                        color = if (active) MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.6f)
                                        else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun BriefingCard(enabled: Boolean, onToggle: (Boolean) -> Unit) {
    RessistCard {
        Row(
            modifier = Modifier.fillMaxWidth().clickable { onToggle(!enabled) },
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text("Morning Briefing", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    "Ringkasan harian tiap pagi jam 07:00 WIB via Telegram.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (enabled) {
                    Text(
                        "Aktif",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = RessistGreen,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
            Switch(checked = enabled, onCheckedChange = onToggle)
        }
    }
}

@Composable
private fun TestCard(enabled: Boolean, onTest: () -> Unit) {
    RessistCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Uji Coba Notifikasi", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "Kirim notifikasi contoh untuk memastikan bunyi di perangkat ini.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(
                onClick = onTest,
                enabled = enabled,
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            ) {
                Icon(painterResource(RessistIcons.Notifications), contentDescription = null)
                Spacer(Modifier.padding(4.dp))
                Text("Kirim notifikasi uji", fontSize = 14.sp)
            }
            if (!enabled) {
                Text(
                    "Aktifkan izin notifikasi dulu untuk menguji.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun SystemCard(
    hasPermission: Boolean,
    exactAlarm: Boolean,
    onGrantPermission: () -> Unit,
    onOpenExactSettings: () -> Unit,
    onOpenChannel: () -> Unit,
) {
    RessistCard {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Status Sistem", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            StatusRow(
                label = "Izin notifikasi",
                ok = hasPermission,
                okText = "Aktif",
                badText = "Mati",
                actionText = if (hasPermission) null else "Izinkan",
                onAction = onGrantPermission,
            )
            StatusRow(
                label = "Alarm tepat waktu",
                ok = exactAlarm,
                okText = "Tepat waktu",
                badText = "Hemat baterai",
                actionText = if (exactAlarm || Build.VERSION.SDK_INT < Build.VERSION_CODES.S) null else "Atur",
                onAction = onOpenExactSettings,
            )
            Row(
                modifier = Modifier.fillMaxWidth().clickable { onOpenChannel() }.padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Suara & getar", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    Text(
                        "Diatur lewat setelan channel sistem.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text("Buka →", fontSize = 12.sp, fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
private fun StatusRow(
    label: String,
    ok: Boolean,
    okText: String,
    badText: String,
    actionText: String?,
    onAction: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(
                Modifier.size(8.dp).clip(CircleShape)
                    .background(if (ok) RessistGreen else RessistRed),
            )
            Column {
                Text(label, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                Text(
                    if (ok) okText else badText,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        if (actionText != null) {
            OutlinedButton(onClick = onAction, shape = CircleShape) {
                Text(actionText, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun ReminderCard(item: ReminderItem) {
    RessistCard {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    painterResource(RessistIcons.Notifications),
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(4.dp),
                )
                Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) {
                    Text(
                        "H-${item.hoursBefore}",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    )
                }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(item.task.title, fontSize = 14.sp, fontWeight = FontWeight.Medium, maxLines = 2)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    item.task.course?.let { CoursePill(it) }
                }
                Text(
                    "Bunyi ${item.fireAt.formatId()} (${formatTimeRemainingId(item.fireAt)})",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
