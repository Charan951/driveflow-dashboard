-keep class com.cashfree.** {
    *;
}

-dontwarn com.cashfree.**

-keepattributes *Annotation*

-keepattributes Signature
-keepattributes Exceptions

-optimizations !method/inlining/*
