package id.ac.itera.ressist

import android.app.Application
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import id.ac.itera.ressist.di.androidModule
import id.ac.itera.ressist.di.sharedModule
import id.ac.itera.ressist.reminders.SyncWorker
import io.ktor.client.engine.okhttp.OkHttp
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin
import java.util.concurrent.TimeUnit

class RessistApp : Application() {
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
        // Rebuild local reminder alarms every 6h (worker no-ops when logged out).
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            SyncWorker.PERIODIC,
            ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<SyncWorker>(6, TimeUnit.HOURS)
                .setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
                .build(),
        )
    }
}
