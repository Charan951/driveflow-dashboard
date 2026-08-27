package com.carzzi.staff

import android.app.AlarmManager
import android.app.Application
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Stops leftover flutter_background_service state at the earliest possible point.
 *
 * The plugin's WatchdogReceiver can call startForegroundService() after a previous
 * session. If startForeground() then fails (e.g. no location permission yet),
 * Android kills the whole process with ForegroundServiceDidNotStartInTimeException.
 */
class CarzziStaffApp : Application() {
    override fun onCreate() {
        BackgroundServiceGuard.forceStop(this)
        super.onCreate()
    }
}
