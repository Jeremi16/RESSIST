package id.ac.itera.ressist.reminders

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import id.ac.itera.ressist.data.SyncPrefs
import java.util.concurrent.TimeUnit

/**
 * Penjadwal sinkronisasi otomatis. Interval minimal 1 jam
 * ([SyncPrefs.MIN_INTERVAL_MINUTES]) — selalu-force LMS di bawah itu
 * terlalu berat untuk baterai + backend.
 */
class SyncManager(
    private val context: Context,
    private val prefs: SyncPrefs,
) {
    private fun wm(): WorkManager = WorkManager.getInstance(context.applicationContext)

    private fun periodicConstraints(wifiOnly: Boolean) = Constraints.Builder()
        .setRequiredNetworkType(if (wifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED)
        .build()

    /** Baca prefs lalu (re)schedule periodic; Manual (=0) membatalkan. */
    suspend fun reschedule() {
        val interval = prefs.intervalOnce()
        if (interval == SyncPrefs.MANUAL) {
            wm().cancelUniqueWork(SyncWorker.PERIODIC)
            return
        }
        val wifiOnly = prefs.wifiOnlyOnce()
        val request = PeriodicWorkRequestBuilder<SyncWorker>(interval.toLong(), TimeUnit.MINUTES)
            .setConstraints(periodicConstraints(wifiOnly))
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
            .addTag(SyncWorker.TAG_SYNC)
            .setInputData(workDataOf(SyncWorker.KEY_NOTIFY to true))
            .build()
        wm().enqueueUniquePeriodicWork(
            SyncWorker.PERIODIC,
            ExistingPeriodicWorkPolicy.UPDATE,
            request,
        )
    }

    /**
     * Sync sekali jalan (tombol manual / foreground fast-path).
     * [notify] false untuk aksi eksplisit user (tidak perlu notif tugas baru).
     */
    fun syncNow(notify: Boolean = false) {
        val request = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
            .addTag(SyncWorker.TAG_SYNC)
            .setInputData(workDataOf(SyncWorker.KEY_NOTIFY to notify))
            .build()
        wm().enqueueUniqueWork(SyncWorker.ONE_SHOT, ExistingWorkPolicy.REPLACE, request)
    }

    /** Dipanggil saat logout: hentikan sync berkala + one-shot tertunda. */
    fun cancelAll() {
        wm().cancelUniqueWork(SyncWorker.PERIODIC)
        wm().cancelUniqueWork(SyncWorker.ONE_SHOT)
    }
}
