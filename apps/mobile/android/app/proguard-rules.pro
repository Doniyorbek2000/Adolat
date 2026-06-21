# Flutter
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Dio / OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Gson (used by some plugins)
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Flutter Secure Storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Record plugin
-keep class com.llfbandit.record.** { *; }

# Share Plus
-keep class dev.fluttercommunity.plus.share.** { *; }

# General
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
