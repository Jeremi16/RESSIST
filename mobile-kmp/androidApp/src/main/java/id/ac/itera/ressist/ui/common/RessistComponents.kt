package id.ac.itera.ressist.ui.common

import androidx.annotation.DrawableRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.ac.itera.ressist.domain.model.Assignment
import id.ac.itera.ressist.domain.model.CalendarEvent
import id.ac.itera.ressist.domain.time.formatTimeRemainingId
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import java.time.LocalDate
import java.time.YearMonth

private val BULAN_PANJANG = arrayOf(
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
)
private val HARI_MINGGU_PERTAMA = arrayOf("Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab")

/** Warna dot status koneksi ala kartu hitam frontend. */
val RessistGreen = Color(0xFF10B981)
val RessistRed = Color(0xFFEF4444)

/* ---------- Header ala Mihon ---------- */

/**
 * Judul besar + aksi kanan di atas M3 TopAppBar transparan
 * (pola AppBar Mihon): tanpa subtitle, tanpa divider.
 * Inset status bar ditangani M3 secara otomatis.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RessistHeader(
    title: String,
    modifier: Modifier = Modifier,
    navigateUp: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
) {
    TopAppBar(
        modifier = modifier,
        navigationIcon = {
            if (navigateUp != null) {
                IconButton(onClick = navigateUp) {
                    Icon(
                        painterResource(RessistIcons.ArrowBack),
                        contentDescription = "Kembali",
                    )
                }
            }
        },
        title = {
            Text(
                title,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                fontSize = 22.sp,
                fontWeight = FontWeight.Normal,
            )
        },
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = Color.Transparent,
            scrolledContainerColor = MaterialTheme.colorScheme.surface,
        ),
    )
}

/* ---------- Bottom bar ala frontend ---------- */

data class RessistTab(val label: String, @DrawableRes val icon: Int)

@Composable
fun RessistBottomBar(
    tabs: List<RessistTab>,
    selected: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth().navigationBarsPadding(),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f)),
    ) {
        // Tinggi total 80dp mengikuti M3 NavigationBar ala Mihon.
        Row(
            modifier = Modifier.fillMaxWidth().height(80.dp).padding(horizontal = 4.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            tabs.forEachIndexed { i, tab ->
                val active = i == selected
                Column(
                    modifier = Modifier.weight(1f).clip(RoundedCornerShape(12.dp))
                        .clickable { onSelect(i) }.padding(vertical = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Box(
                        modifier = Modifier.size(32.dp).clip(RoundedCornerShape(10.dp))
                            .background(
                                if (active) MaterialTheme.colorScheme.primary
                                else Color.Transparent,
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            painterResource(tab.icon),
                            contentDescription = tab.label,
                            modifier = Modifier.size(24.dp),
                            tint = if (active) MaterialTheme.colorScheme.onPrimary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        tab.label,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        color = if (active) MaterialTheme.colorScheme.onBackground
                        else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

/* ---------- Kartu & tombol ala frontend ---------- */

/** Kartu putih rounded-2xl border hitam 5% (pengganti Card elevation default). */
@Composable
fun RessistCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Box(Modifier.padding(16.dp)) { content() }
    }
}

/** Tombol pill hitam (h-9) ala frontend. */
@Composable
fun PrimaryPillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    @DrawableRes icon: Int? = null,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(36.dp),
        shape = CircleShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp, vertical = 0.dp),
    ) {
        if (icon != null) {
            Icon(painterResource(icon), contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(text, fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun SecondaryPillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(36.dp),
        shape = CircleShape,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.onBackground.copy(alpha = 0.15f)),
    ) {
        Text(text, fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}

/** Kotak ikon hitam 32dp rounded (ikon statistik frontend). */
@Composable
fun IconBox(@DrawableRes icon: Int, contentDescription: String?, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.size(32.dp).clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.primary),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painterResource(icon),
            contentDescription = contentDescription,
            tint = MaterialTheme.colorScheme.onPrimary,
            modifier = Modifier.size(16.dp),
        )
    }
}

/** Badge jumlah pill hitam ala frontend. */
@Composable
fun CountBadge(count: Int, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = CircleShape,
        color = MaterialTheme.colorScheme.primary,
    ) {
        Text(
            "$count",
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onPrimary,
        )
    }
}

/** Pill nama mata kuliah (bg cream) ala TaskCard frontend. */
@Composable
fun CoursePill(text: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Text(
            text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

/** Pill status uppercase 10px (Terlewat merah / Classroom hijau). */
@Composable
fun StatusPill(text: String, container: Color, content: Color, modifier: Modifier = Modifier) {
    Surface(modifier = modifier, shape = CircleShape, color = container) {
        Text(
            text.uppercase(),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
            color = content,
        )
    }
}

@Composable
fun EmptyState(message: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.onBackground.copy(alpha = 0.1f), RoundedCornerShape(16.dp))
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            message,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/* ---------- Kartu tugas ala frontend ---------- */

@Composable
fun TaskCardFrontend(
    task: Assignment,
    completing: Boolean,
    onComplete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val now = Clock.System.now()
    val overdue = !task.completed && task.deadline < now
    val uriHandler = LocalUriHandler.current
    RessistCard(modifier) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        task.title,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = (-0.25).sp,
                        lineHeight = 20.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        color = if (task.completed) {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        } else {
                            MaterialTheme.colorScheme.onSurface
                        },
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        task.course?.let { CoursePill(it) }
                        if (!task.completed && overdue) {
                            StatusPill("Terlewat", RessistRed.copy(alpha = 0.12f), RessistRed)
                        }
                        if (task.isReadOnly) {
                            StatusPill(
                                "Classroom",
                                RessistGreen.copy(alpha = 0.14f),
                                Color(0xFF047857),
                            )
                        }
                    }
                }
                when {
                    task.completed -> Box(
                        modifier = Modifier.size(32.dp).clip(CircleShape)
                            .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            painterResource(RessistIcons.Check),
                            contentDescription = "Selesai",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    task.isReadOnly -> Unit // Classroom read-only: tanpa tombol (ala web)
                    completing -> CircularProgressIndicator(modifier = Modifier.size(32.dp))
                    else -> Box(
                        modifier = Modifier.size(32.dp).clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary)
                            .clickable { onComplete() },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            painterResource(RessistIcons.Check),
                            contentDescription = "Tandai selesai",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onPrimary,
                        )
                    }
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(
                        painterResource(RessistIcons.Schedule),
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = if (overdue) RessistRed else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        "${task.deadline.formatId()} (${formatTimeRemainingId(task.deadline, now)})",
                        fontSize = 12.sp,
                        fontWeight = if (overdue) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (overdue) RessistRed else MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                }
                task.url?.let { url ->
                    Text(
                        "Link →",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.clickable { runCatching { uriHandler.openUri(url) } },
                    )
                }
            }
        }
    }
}

/* ---------- Kartu statistik gaya Mihon ---------- */

/**
 * Kartu statistik 2-kolom ala Mihon: fill tonal tanpa border,
 * ikon solid di atas, label abu, angka besar tebal, deskripsi,
 * dan progress bar tipis opsional (kartu "Selesai").
 */
@Composable
fun StatCardFrontend(
    label: String,
    value: Int,
    desc: String,
    @DrawableRes icon: Int,
    modifier: Modifier = Modifier,
    progress: Float? = null,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            modifier = Modifier.padding(16.dp).heightIn(min = 124.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Box(
                modifier = Modifier.size(36.dp).clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painterResource(icon),
                    contentDescription = label,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(18.dp),
                )
            }
            Spacer(Modifier.height(10.dp))
            Text(
                label,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                "$value",
                fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = (-0.5).sp,
                color = MaterialTheme.colorScheme.onSurface,
            )
            if (desc.isNotEmpty()) {
                Text(
                    desc,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (progress != null) {
                Spacer(Modifier.height(8.dp))
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth().height(4.dp).clip(CircleShape),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f),
                )
            } else {
                // Slot kosong setinggi progress bar agar semua kartu sama tinggi.
                Spacer(Modifier.height(12.dp))
            }
        }
    }
}

/* ---------- Kalender grid bulanan ala CalendarView.tsx ---------- */

data class CalItem(val id: String, val title: String, val date: LocalDate)

private fun Instant.toLocalDateOrNull(): LocalDate? = runCatching {
    if (this == Instant.DISTANT_FUTURE || this == Instant.DISTANT_PAST) return null
    val dt = toLocalDateTime(TimeZone.currentSystemDefault())
    LocalDate.of(dt.year, dt.monthNumber, dt.dayOfMonth)
}.getOrNull()

fun Assignment.toCalItem(): CalItem? {
    val date = deadline.toLocalDateOrNull() ?: return null
    return CalItem(id, title, date)
}

fun CalendarEvent.toCalItem(): CalItem? {
    val date = deadline.toLocalDateOrNull() ?: return null
    return CalItem(id, title, date)
}

@Composable
fun MonthCalendarGrid(items: List<CalItem>, modifier: Modifier = Modifier) {
    var month by remember { mutableStateOf(YearMonth.now()) }
    val today = remember { LocalDate.now() }
    val grouped = remember(items) { items.groupBy { it.date } }

    Column(modifier.fillMaxWidth()) {
        // Header bulan + Today + prev/next (ala CalendarView.tsx:28-37)
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "${BULAN_PANJANG[month.monthValue]} ${month.year}",
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f)),
                ) {
                    Text(
                        "Today",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.clickable { month = YearMonth.now() }
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                    )
                }
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f)),
                ) {
                    Row {
                        IconButton(onClick = { month = month.minusMonths(1) }, modifier = Modifier.size(28.dp)) {
                            Icon(painterResource(RessistIcons.ChevronLeft), contentDescription = "Bulan lalu", modifier = Modifier.size(16.dp))
                        }
                        IconButton(onClick = { month = month.plusMonths(1) }, modifier = Modifier.size(28.dp)) {
                            Icon(painterResource(RessistIcons.ChevronRight), contentDescription = "Bulan depan", modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
        // Nama hari
        Row(Modifier.fillMaxWidth()) {
            HARI_MINGGU_PERTAMA.forEach {
                Box(Modifier.weight(1f).padding(vertical = 8.dp), contentAlignment = Alignment.Center) {
                    Text(it, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        // Grid tanggal
        val first = month.atDay(1)
        val offset = first.dayOfWeek.value % 7 // Minggu = 0
        val total = ((offset + month.lengthOfMonth() + 6) / 7) * 7
        val primary = MaterialTheme.colorScheme.primary
        val onPrimary = MaterialTheme.colorScheme.onPrimary
        Column {
            for (week in 0 until total / 7) {
                Row(Modifier.fillMaxWidth()) {
                    for (d in 0 until 7) {
                        val dayNum = week * 7 + d - offset + 1
                        val inMonth = dayNum in 1..month.lengthOfMonth()
                        val date = if (inMonth) month.atDay(dayNum) else null
                        val dayItems = date?.let { grouped[it].orEmpty() }.orEmpty()
                        Column(
                            Modifier.weight(1f)
                                .border(0.5.dp, MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f))
                                .padding(6.dp)
                                .height(56.dp),
                        ) {
                            if (date != null) {
                                val isToday = date == today
                                Box(
                                    modifier = Modifier.size(24.dp).clip(CircleShape)
                                        .background(if (isToday) primary else Color.Transparent),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        "$dayNum",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = if (isToday) onPrimary else MaterialTheme.colorScheme.onSurface,
                                    )
                                }
                                Spacer(Modifier.height(4.dp))
                                dayItems.take(2).forEach { item ->
                                    Box(
                                        Modifier.fillMaxWidth().clip(CircleShape)
                                            .background(primary).padding(horizontal = 6.dp, vertical = 2.dp),
                                    ) {
                                        Text(
                                            item.title,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = onPrimary,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                    }
                                    Spacer(Modifier.height(2.dp))
                                }
                                if (dayItems.size > 2) {
                                    Text(
                                        "+${dayItems.size - 2}",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
