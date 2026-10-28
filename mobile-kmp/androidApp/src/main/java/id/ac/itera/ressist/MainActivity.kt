package id.ac.itera.ressist

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.luminance
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import id.ac.itera.ressist.data.ThemeMode
import id.ac.itera.ressist.data.ThemePrefs
import id.ac.itera.ressist.nav.AppNav
import id.ac.itera.ressist.reminders.NotificationHelper
import id.ac.itera.ressist.ui.theme.RessistTheme
import kotlinx.coroutines.flow.MutableStateFlow
import org.koin.compose.koinInject

class MainActivity : ComponentActivity() {
    // ID tugas dari tap notifikasi pengingat; dikosongkan setelah detail dibuka.
    private val openTaskId = MutableStateFlow<String?>(null)

    private fun consumeIntent(intent: Intent?) {
        intent?.getStringExtra(NotificationHelper.EXTRA_OPEN_TASK)?.let { openTaskId.value = it }
        intent?.removeExtra(NotificationHelper.EXTRA_OPEN_TASK)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        consumeIntent(intent)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Jangan buka ulang detail saat activity dibuat ulang (rotasi dll).
        if (savedInstanceState == null) consumeIntent(intent)
        setContent {
            RessistTheme {
                // Edge-to-edge ala Mihon: bar transparan, gaya ikon dari
                // luminance background agar terbaca di terang + gelap.
                val prefs: ThemePrefs = koinInject()
                val mode by prefs.mode.collectAsStateWithLifecycle(initialValue = ThemeMode.SYSTEM)
                val systemDark = isSystemInDarkTheme()
                val dark = when (mode) {
                    ThemeMode.LIGHT -> false
                    ThemeMode.DARK -> true
                    ThemeMode.SYSTEM -> systemDark
                }
                val background = MaterialTheme.colorScheme.background
                LaunchedEffect(dark, background) {
                    val lightStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.BLACK)
                    val darkStyle = SystemBarStyle.dark(Color.TRANSPARENT)
                    val style = if (background.luminance() > 0.5f) lightStyle else darkStyle
                    enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
                }
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    val taskId by openTaskId.collectAsStateWithLifecycle()
                    AppNav(openTaskId = taskId, onTaskOpened = { openTaskId.value = null })
                }
            }
        }
    }
}
