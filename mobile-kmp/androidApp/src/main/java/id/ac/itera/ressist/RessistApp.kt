package id.ac.itera.ressist

import android.app.Application
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import id.ac.itera.ressist.di.androidModule
import id.ac.itera.ressist.di.sharedModule
import id.ac.itera.ressist.reminders.SyncManager
import id.ac.itera.ressist.reminders.SyncWorker
import io.ktor.client.engine.okhttp.OkHttp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.GlobalContext
import org.koin.core.context.startKoin
import java.util.concurrent.TimeUnit

class RessistApp : Application() {
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@RessistApp)
            modules(
                sharedModule(
                    engine = OkHttp.create(),
                    baseUrl = BuildConfig.API_BASE_URL,
                    enableLogging = BuildConfig.DEBUG,
                ),
                androidModule,
            )
        }
        // Default cepat 3 jam agar alarm langsung terjadwal; lalu selaraskan
        // dengan interval pilihan user (1h/3h/6h/12h/Manual) via SyncManager.
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            SyncWorker.PERIODIC,
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<SyncWorker>(3, TimeUnit.HOURS)
                .setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
                .build(),
        )
        appScope.launch {
            runCatching { GlobalContext.get().get<SyncManager>().reschedule() }
        }
    }
}
