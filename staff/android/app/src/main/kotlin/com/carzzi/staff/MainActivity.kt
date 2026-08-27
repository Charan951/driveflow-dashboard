package com.carzzi.staff

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        BackgroundServiceGuard.forceStop(this)
        super.onCreate(savedInstanceState)
        // Cover the plugin's default 5s watchdog window if anything was queued.
        handler.postDelayed({ BackgroundServiceGuard.forceStop(this) }, 250)
        handler.postDelayed({ BackgroundServiceGuard.forceStop(this) }, 1_500)
        handler.postDelayed({ BackgroundServiceGuard.forceStop(this) }, 6_000)
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL,
        ).setMethodCallHandler { call, result ->
            if (call.method == "forceStop") {
                BackgroundServiceGuard.forceStop(this)
                handler.postDelayed({ BackgroundServiceGuard.forceStop(this) }, 250)
                result.success(true)
            } else {
                result.notImplemented()
            }
        }
    }

    companion object {
        private const val CHANNEL = "com.carzzi.staff/bg_tracking"
    }
}
