package id.ac.itera.ressist.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.data.TextSize
import id.ac.itera.ressist.data.ThemeMode
import id.ac.itera.ressist.data.ThemePrefs
import org.koin.compose.koinInject

/**
 * Palet brand Ressist — satu identitas dengan logo:
 * Putih #FFFFFF (60% background) · Biru Tua #0059D0 (30% primer) ·
 * Biru Muda #60A8F8 (10% aksen). Hijau/merah fungsional dipertahankan.
 */
val BrandBlue = Color(0xFF0059D0)
val BrandBlueDark = Color(0xFF0043A5)
val BrandSky = Color(0xFF60A8F8)
val BrandTintLight = Color(0xFFEAF2FE) // sky ±12% di atas putih — pill/kalender
val BrandContainerLight = Color(0xFFDCE9FD) // sky ±20% — container aksen
val BrandOnDark = Color(0xFF062B5B) // teks gelap di atas tombol sky (dark mode)

private fun lightScheme() = lightColorScheme(
    primary = BrandBlue,
    onPrimary = Color.White,
    primaryContainer = BrandContainerLight,
    onPrimaryContainer = BrandBlueDark,
    secondary = BrandBlueDark,
    onSecondary = Color.White,
    background = Color.White,
    onBackground = Color.Black,
    surface = Color.White,
    onSurface = Color.Black,
    surfaceVariant = BrandTintLight,
    onSurfaceVariant = Color(0x99000000), // black 60% — teks sekunder
    outline = Color(0x1F0059D0), // brand 12% — border kartu
    outlineVariant = Color(0x14000000),
    error = Color(0xFFDC2626),
    errorContainer = Color(0xFFFEF2F2),
    onErrorContainer = Color(0xFF991B1B),
    tertiary = Color(0xFF047857), // hijau Classroom/sukses
    tertiaryContainer = Color(0xFFECFDF5),
)

private fun darkScheme(pureBlack: Boolean) = darkColorScheme(
    primary = BrandSky,
    onPrimary = BrandOnDark,
    primaryContainer = BrandBlueDark,
    onPrimaryContainer = BrandContainerLight,
    secondary = BrandSky,
    onSecondary = BrandOnDark,
    background = if (pureBlack) Color.Black else Color(0xFF121212),
    onBackground = Color(0xFFF5F5F5),
    surface = if (pureBlack) Color(0xFF0A0A0A) else Color(0xFF1E1E1E),
    onSurface = Color(0xFFF5F5F5),
    surfaceVariant = if (pureBlack) Color(0xFF1A2A44) else Color(0xFF1E2A3F),
    onSurfaceVariant = Color(0x99FFFFFF),
    outline = Color(0x3360A8F8), // sky 20% — border kartu
    outlineVariant = Color(0x29FFFFFF),
    error = Color(0xFFF87171),
    errorContainer = Color(0xFF3B1212),
    onErrorContainer = Color(0xFFFECACA),
    tertiary = Color(0xFF34D399),
    tertiaryContainer = Color(0xFF064E3B),
)

val RessistShapes = Shapes(
    small = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
    extraLarge = androidx.compose.foundation.shape.RoundedCornerShape(24.dp),
)

/**
 * Tema aplikasi — bahasa visual brand Ressist:
 * background putih, kartu putih rounded-2xl, primer biru tua #0059D0,
 * aksen biru muda #60A8F8. Mode dibaca dari [ThemePrefs] (Sistem/Terang/Gelap).
 */
@Composable
fun RessistTheme(content: @Composable () -> Unit) {
    val prefs: ThemePrefs = koinInject()
    val mode by prefs.mode.collectAsStateWithLifecycle(initialValue = ThemeMode.SYSTEM)
    val pureBlack by prefs.pureBlack.collectAsStateWithLifecycle(initialValue = false)
    val textSize by prefs.textSize.collectAsStateWithLifecycle(initialValue = TextSize.NORMAL)

    val dark = when (mode) {
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
    }
    val scheme = if (dark) darkScheme(pureBlack) else lightScheme()

    // Ukuran teks Besar → skala font 1.15x.
    val density = LocalDensity.current
    val scaled = if (textSize == TextSize.LARGE) {
        Density(density.density, density.fontScale * 1.15f)
    } else {
        density
    }

    CompositionLocalProvider(LocalDensity provides scaled) {
        MaterialTheme(
            colorScheme = scheme,
            shapes = RessistShapes,
            content = content,
        )
    }
}
