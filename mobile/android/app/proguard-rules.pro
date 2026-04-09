-keepclassmembers class * {
    @com.razorpay.RetainForAllInternalUse *;
}

-keep class com.razorpay.** {
    *;
}

-dontwarn com.razorpay.**

-keepattributes *Annotation*

-keepattributes Signature
-keepattributes Exceptions

-optimizations !method/inlining/*
