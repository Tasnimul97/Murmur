# Murmur Proguard Rules for Release Builds

# Keep Room database and entities
-keep class androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao class * { *; }

# Keep OkHttp & Okio
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }

# Keep EncryptedSharedPreferences & Security Crypto
-keep class androidx.security.crypto.** { *; }

# Keep Jetpack Compose & Kotlin Coroutines
-keep class androidx.compose.** { *; }
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# Keep Murmur InputMethodService
-keep class com.murmur.app.ime.MurmurInputMethodService { *; }
-keep class com.murmur.app.companion.MainActivity { *; }
