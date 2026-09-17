package id.ac.itera.ressist.nav

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.kalender.KalenderScreen
import id.ac.itera.ressist.ui.lms.LmsScreen
import id.ac.itera.ressist.ui.login.LoginScreen
import id.ac.itera.ressist.ui.overview.OverviewScreen
import id.ac.itera.ressist.ui.profil.ProfilScreen
import id.ac.itera.ressist.ui.tugas.TugasScreen
import kotlinx.coroutines.flow.collectLatest
import org.koin.compose.koinInject

private data class Tab(val label: String, val icon: ImageVector)

private val TABS = listOf(
    Tab("Beranda", Icons.Filled.Home),
    Tab("Tugas", Icons.Filled.Assignment),
    Tab("Kalender", Icons.Filled.CalendarMonth),
    Tab("LMS", Icons.Filled.School),
    Tab("Profil", Icons.Filled.Person),
)

/** Asks POST_NOTIFICATIONS once on Android 13+ (reminders are local). */
@Composable
private fun RequestNotificationPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { }
    LaunchedEffect(Unit) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}

@Composable
fun AppNav(authManager: AuthManager = koinInject()) {
    val nav = rememberNavController()
    var start by rememberSaveable { mutableStateOf<String?>(null) }
    // Cold start: stored session + valid /v1/auth/me → straight to main.
    LaunchedEffect(Unit) {
        start = if (authManager.hasStoredSession() && authManager.restore() != null) {
            Routes.MAIN
        } else {
            Routes.LOGIN
        }
    }
    LaunchedEffect(Unit) {
        authManager.sessionExpired.collectLatest {
            nav.navigate(Routes.LOGIN) {
                popUpTo(Routes.MAIN) { inclusive = true }
                launchSingleTop = true
            }
        }
    }
    val startRoute = start
    if (startRoute == null) {
        LoadingBox()
        return
    }
    NavHost(navController = nav, startDestination = startRoute) {
        composable(Routes.LOGIN) {
            LoginScreen(onLoggedIn = {
                nav.navigate(Routes.MAIN) {
                    popUpTo(Routes.LOGIN) { inclusive = true }
                    launchSingleTop = true
                }
            })
        }
        composable(Routes.MAIN) { MainScaffold() }
    }
}

@Composable
private fun MainScaffold() {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    RequestNotificationPermission()
    Scaffold(
        bottomBar = {
            NavigationBar {
                TABS.forEachIndexed { i, t ->
                    NavigationBarItem(
                        selected = tab == i,
                        onClick = { tab = i },
                        icon = { Icon(t.icon, contentDescription = t.label) },
                        label = { Text(t.label) },
                    )
                }
            }
        },
    ) { padding ->
        val modifier = Modifier.padding(padding)
        when (tab) {
            0 -> OverviewScreen(modifier)
            1 -> TugasScreen(modifier)
            2 -> KalenderScreen(modifier)
            3 -> LmsScreen(modifier)
            else -> ProfilScreen(modifier)
        }
    }
}
