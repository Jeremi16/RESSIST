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

/** Cream khas frontend/web (#F5F0EB). */
val RessistCream = Color(0xFFF5F0EB)
val RessistCreamDark = Color(0xFFEAE3D8)

private fun lightScheme() = lightColorScheme(
    primary = Color.Black,
    onPrimary = Color.White,
    secondary = Color(0xFF1A1A1A),
    onSecondary = Color.White,
    background = RessistCream,
    onBackground = Color.Black,
    surface = Color.White,
    onSurface = Color.Black,
    surfaceVariant = RessistCream,
    onSurfaceVariant = Color(0x99000000), // black 60% — teks sekunder ala frontend
    outline = Color(0x0D000000), // black 5% — border kartu ala frontend
    outlineVariant = Color(0x14000000),
    error = Color(0xFFDC2626),
    errorContainer = Color(0xFFFEF2F2),
    onErrorContainer = Color(0xFF991B1B),
    tertiary = Color(0xFF047857), // hijau Classroom/sukses
    tertiaryContainer = Color(0xFFECFDF5),
)

private fun darkScheme(pureBlack: Boolean) = darkColorScheme(
    primary = Color.White,
    onPrimary = Color.Black,
    secondary = Color(0xFFE5E5E5),
    onSecondary = Color.Black,
    background = if (pureBlack) Color.Black else Color(0xFF121212),
    onBackground = Color(0xFFF5F5F5),
    surface = if (pureBlack) Color(0xFF0A0A0A) else Color(0xFF1E1E1E),
    onSurface = Color(0xFFF5F5F5),
    surfaceVariant = if (pureBlack) Color(0xFF1A1A1A) else Color(0xFF2A2A2A),
    onSurfaceVariant = Color(0x99FFFFFF),
    outline = Color(0x1AFFFFFF),
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
 * Tema aplikasi — menyamakan bahasa visual frontend:
 * background cream, kartu putih rounded-2xl, aksen hitam pill.
 * Mode dibaca dari [ThemePrefs] (Sistem/Terang/Gelap).
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
