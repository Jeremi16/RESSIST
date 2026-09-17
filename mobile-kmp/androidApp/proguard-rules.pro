# Ressist KMP release rules (R8 full mode compatible).

# kotlinx.serialization: keep generated serializers.
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, AnnotationDefault
-keep class kotlinx.serialization.** { *; }
-keepclassmembers class **.$$serializer { *; }
-keepclasseswithmembernames class ** {
    @kotlinx.serialization.Serializable *;
}
-keepclasseswithmembers class ** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Ktor client: keep engine service registrations + content negotiation.
-keep class io.ktor.client.engine.okhttp.** { *; }
-keep class io.ktor.serialization.kotlinx.** { *; }
-dontwarn io.ktor.**
-dontwarn kotlinx.io.**

# DataStore / Preferences protobuf-lite.
-keep class androidx.datastore.** { *; }
-dontwarn androidx.datastore.**

# WorkManager: keep WorkerFactory instantiation path.
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.CoroutineWorker
-keep class androidx.work.impl.WorkManagerImpl { *; }

# Play Services auth (Google Sign-In) uses reflection-safe APIs; silence only.
-dontwarn com.google.android.gms.**

# Koin ships its own consumer rules; nothing extra needed.
