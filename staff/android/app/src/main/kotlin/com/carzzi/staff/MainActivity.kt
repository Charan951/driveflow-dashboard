package com.carzzi.staff

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        forceStopBackgroundService()
        super.onCreate(savedInstanceState)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL,
        ).setMethodCallHandler { call, result ->
            if (call.method == "forceStop") {
                forceStopBackgroundService()
                result.success(true)
            } else {
                result.notImplemented()
            }
        }
    }

    private fun forceStopBackgroundService() {
        try {
            getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putBoolean("is_manually_stopped", true)
                .apply()

            val watchdogIntent =
                Intent().setClassName(this, WATCHDOG).setAction(RESPAWN)
            var flags = PendingIntent.FLAG_CANCEL_CURRENT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags = flags or PendingIntent.FLAG_MUTABLE
            }
            val pending =
                PendingIntent.getBroadcast(this, WATCHDOG_ID, watchdogIntent, flags)
            (getSystemService(ALARM_SERVICE) as AlarmManager).cancel(pending)

            stopService(Intent().setClassName(this, SERVICE))
        } catch (_: Exception) {
        }
    }

    companion object {
        private const val CHANNEL = "com.carzzi.staff/bg_tracking"
        private const val PREFS = "id.flutter.background_service"
        private const val SERVICE =
            "id.flutter.flutter_background_service.BackgroundService"
        private const val WATCHDOG =
            "id.flutter.flutter_background_service.WatchdogReceiver"
        private const val RESPAWN = "id.flutter.background_service.RESPAWN"
        private const val WATCHDOG_ID = 111
    }
}
