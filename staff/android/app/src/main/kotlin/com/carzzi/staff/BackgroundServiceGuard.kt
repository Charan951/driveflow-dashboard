package com.carzzi.staff

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

object BackgroundServiceGuard {
    private const val PREFS = "id.flutter.background_service"
    private const val SERVICE =
        "id.flutter.flutter_background_service.BackgroundService"
    private const val WATCHDOG =
        "id.flutter.flutter_background_service.WatchdogReceiver"
    private const val RESPAWN = "id.flutter.background_service.RESPAWN"
    private const val WATCHDOG_ID = 111

    fun forceStop(context: Context) {
        try {
            // is_foreground=false makes any leftover start use startService()
            // instead of startForegroundService(), which avoids the fatal
            // ForegroundServiceDidNotStartInTimeException on cold launch.
            context
                .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean("is_manually_stopped", true)
                .putBoolean("is_foreground", false)
                .putBoolean("auto_start_on_boot", false)
                .apply()

            cancelWatchdog(context)
            context.stopService(Intent().setClassName(context, SERVICE))
            cancelWatchdog(context)

            context
                .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean("is_manually_stopped", true)
                .putBoolean("is_foreground", false)
                .apply()
        } catch (_: Exception) {
        }
    }

    private fun cancelWatchdog(context: Context) {
        try {
            val watchdogIntent =
                Intent().setClassName(context, WATCHDOG).setAction(RESPAWN)
            var flags = PendingIntent.FLAG_UPDATE_CURRENT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags = flags or PendingIntent.FLAG_MUTABLE
            }
            val pending =
                PendingIntent.getBroadcast(context, WATCHDOG_ID, watchdogIntent, flags)
            (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager)
                .cancel(pending)
            pending.cancel()
        } catch (_: Exception) {
        }
    }
}
