package id.ac.itera.ressist.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != ReminderScheduler.ACTION_REMIND) return
        val title = intent.getStringExtra(ReminderScheduler.EXTRA_TITLE) ?: "Pengingat tugas"
        val text = intent.getStringExtra(ReminderScheduler.EXTRA_TEXT) ?: "Ada deadline mendekat"
        val id = intent.getIntExtra(ReminderScheduler.EXTRA_CODE, 0)
        NotificationHelper.notify(context.applicationContext, id, title, text)
    }
}
