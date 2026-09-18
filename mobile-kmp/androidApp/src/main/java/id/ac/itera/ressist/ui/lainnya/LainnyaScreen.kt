package id.ac.itera.ressist.ui.lainnya

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.ac.itera.ressist.ui.common.IconBox
import id.ac.itera.ressist.ui.common.RessistIcons

private data class MenuItem(
    val icon: Int,
    val title: String,
    val subtitle: String,
    val onClick: () -> Unit,
)

/**
 * Tab "Lainnya" ala Mihon: tanpa header, logo di atas,
 * lalu menu pilihan (Kelas / Profil / Tampilan / Tentang).
 */
@Composable
fun LainnyaScreen(
    onOpenMatkul: () -> Unit,
    onOpenFilter: () -> Unit,
    onOpenProfil: () -> Unit,
    onOpenTampilan: () -> Unit,
    onOpenTentang: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize().statusBarsPadding()
                .verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 8.dp),
            ) {
                Image(
                    painterResource(RessistIcons.LogoMark),
                    contentDescription = "Logo Ressist",
                    modifier = Modifier.size(80.dp),
                )
            }
            MenuGroup(
                title = "Kelola",
                items = listOf(
                    MenuItem(
                        RessistIcons.Person, "Profil",
                        "Akun saya", onOpenProfil,
                    ),
                    MenuItem(
                        RessistIcons.Book, "Mata Kuliah",
                        "Alias & mute notifikasi", onOpenMatkul,
                    ),
                    MenuItem(
                        RessistIcons.FilterList, "Filter Kelas",
                        "Filter tugas per kelas", onOpenFilter,
                    ),
                ),
            )
            MenuGroup(
                title = "Pengaturan",
                items = listOf(
                    MenuItem(
                        RessistIcons.Palette, "Tampilan",
                        "Mode gelap/terang & ukuran teks", onOpenTampilan,
                    ),
                ),
            )
            MenuGroup(
                title = "Info",
                items = listOf(
                    MenuItem(
                        RessistIcons.Info, "Tentang",
                        "Versi aplikasi & info", onOpenTentang,
                    ),
                ),
            )
        }
    }
}

@Composable
private fun MenuGroup(title: String, items: List<MenuItem>) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            title,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 4.dp),
        )
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = androidx.compose.foundation.BorderStroke(
                1.dp, MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f),
            ),
        ) {
            Column {
                items.forEachIndexed { i, item ->
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { item.onClick() }
                            .padding(horizontal = 20.dp, vertical = 16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        IconBox(item.icon, item.title)
                        Column(Modifier.weight(1f)) {
                            Text(item.title, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                            Text(
                                item.subtitle,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Icon(
                            painterResource(RessistIcons.ChevronRight),
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        )
                    }
                    if (i < items.lastIndex) {
                        androidx.compose.material3.HorizontalDivider(
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.06f),
                        )
                    }
                }
            }
        }
    }
}
