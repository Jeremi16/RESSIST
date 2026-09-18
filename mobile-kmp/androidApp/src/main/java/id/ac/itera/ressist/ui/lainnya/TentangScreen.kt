package id.ac.itera.ressist.ui.lainnya

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.ac.itera.ressist.BuildConfig
import id.ac.itera.ressist.ui.common.RessistHeader
import id.ac.itera.ressist.ui.common.RessistIcons

/**
 * Halaman Tentang: identitas aplikasi + versi. Dibuka dari tab Lainnya.
 */
@Composable
fun TentangScreen(onBack: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize()) {
        RessistHeader(title = "Tentang", navigateUp = onBack)
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterVertically),
        ) {
            Image(
                painterResource(RessistIcons.LogoMark),
                contentDescription = "Logo Ressist",
                modifier = Modifier.size(96.dp),
            )
            Text("Ressist", fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "Versi ${BuildConfig.VERSION_NAME}",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                "Pengingat tugas Moodle & Google Classroom untuk mahasiswa ITERA.",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp),
            )
            Text(
                "© 2026 Ressist",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 16.dp),
            )
        }
    }
}
