package id.ac.itera.ressist.nav

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import id.ac.itera.ressist.auth.AuthManager
import id.ac.itera.ressist.ui.common.LoadingBox
import id.ac.itera.ressist.ui.common.RessistBottomBar
import id.ac.itera.ressist.ui.common.RessistIcons
import id.ac.itera.ressist.ui.common.RessistTab
import id.ac.itera.ressist.ui.kalender.KalenderScreen
import id.ac.itera.ressist.ui.kelas.KelasScreen
import id.ac.itera.ressist.ui.lainnya.LainnyaScreen
import id.ac.itera.ressist.ui.lms.LmsScreen
import id.ac.itera.ressist.ui.login.LoginScreen
import id.ac.itera.ressist.ui.overview.OverviewScreen
import id.ac.itera.ressist.ui.pengaturan.TampilanScreen
import id.ac.itera.ressist.ui.pengingat.PengingatScreen
import id.ac.itera.ressist.ui.profil.ProfilScreen
import id.ac.itera.ressist.ui.tugas.TugasScreen
import kotlinx.coroutines.flow.collectLatest
import org.koin.compose.koinInject

/** Bottom nav: 4 primer + Lainnya (Profil pindah ke Lainnya). */
private val TABS = listOf(
    RessistTab("Ringkasan", RessistIcons.Home),
    RessistTab("Tugas", RessistIcons.Assignment),
    RessistTab("LMS", RessistIcons.School),
    RessistTab("Pengingat", RessistIcons.Notifications),
    RessistTab("Lainnya", RessistIcons.MoreHoriz),
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
    // Sub-navigasi internal:
    // - Tampilan penuh kalender dibuka dari kartu Overview.
    // - Detail Tampilan/Kelas/Profil dibuka dari tab Lainnya.
    var showCalendar by rememberSaveable { mutableStateOf(false) }
    var lainnyaDetail by rememberSaveable { mutableStateOf<String?>(null) }
    RequestNotificationPermission()
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            RessistBottomBar(
                tabs = TABS,
                selected = tab,
                onSelect = {
                    tab = it
                    showCalendar = false
                    lainnyaDetail = null
                },
            )
        },
    ) { padding ->
        val modifier = Modifier.padding(padding)
        when (tab) {
            0 -> if (showCalendar) {
                KalenderScreen(modifier, onBack = { showCalendar = false })
            } else {
                OverviewScreen(
                    modifier,
                    onOpenLms = { tab = 2 },
                    onOpenCalendar = { showCalendar = true },
                )
            }
            1 -> TugasScreen(modifier)
            2 -> LmsScreen(modifier)
            3 -> PengingatScreen(modifier = modifier)
            else -> when (lainnyaDetail) {
                "tampilan" -> TampilanScreen(onBack = { lainnyaDetail = null }, modifier = modifier)
                "kelas" -> KelasScreen(onBack = { lainnyaDetail = null }, modifier = modifier)
                "profil" -> ProfilScreen(onBack = { lainnyaDetail = null }, modifier = modifier)
                else -> LainnyaScreen(
                    onOpenKelas = { lainnyaDetail = "kelas" },
                    onOpenProfil = { lainnyaDetail = "profil" },
                    onOpenTampilan = { lainnyaDetail = "tampilan" },
                    modifier = modifier,
                )
            }
        }
    }
}
