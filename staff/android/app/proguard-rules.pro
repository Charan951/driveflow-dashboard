# Flutter / release R8 keep rules for Carzzi Staff
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Deferred components / Play Core are optional; Flutter references them but we
# do not ship dynamic feature modules. Suppress R8 missing-class errors.
-dontwarn com.google.android.play.core.splitcompat.SplitCompatApplication
-dontwarn com.google.android.play.core.splitinstall.**
-dontwarn com.google.android.play.core.tasks.**

# Firebase Messaging
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Geolocator / Play Services location
-keep class com.baseflow.geolocator.** { *; }
-keep class com.google.android.gms.location.** { *; }

# flutter_background_service
-keep class id.flutter.flutter_background_service.** { *; }

# Socket.IO / engine.io
-keep class io.socket.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}
