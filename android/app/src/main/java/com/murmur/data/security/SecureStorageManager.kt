package com.murmur.app.data.security

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Manages encrypted persistence of sensitive credentials using Android Keystore
 * and EncryptedSharedPreferences (AES-256 GCM).
 */
class SecureStorageManager(context: Context) {

    private val sharedPreferences: SharedPreferences

    init {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        sharedPreferences = EncryptedSharedPreferences.create(
            context,
            "murmur_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    // API Keys
    var deepgramApiKey: String
        get() = sharedPreferences.getString("key_deepgram", "") ?: ""
        set(value) = sharedPreferences.edit().putString("key_deepgram", value).apply()

    var anthropicApiKey: String
        get() = sharedPreferences.getString("key_anthropic", "") ?: ""
        set(value) = sharedPreferences.edit().putString("key_anthropic", value).apply()

    var geminiApiKey: String
        get() = sharedPreferences.getString("key_gemini", "") ?: ""
        set(value) = sharedPreferences.edit().putString("key_gemini", value).apply()

    var openaiApiKey: String
        get() = sharedPreferences.getString("key_openai", "") ?: ""
        set(value) = sharedPreferences.edit().putString("key_openai", value).apply()

    // Proxy Settings
    var useProxy: Boolean
        get() = sharedPreferences.getBoolean("pref_use_proxy", false)
        set(value) = sharedPreferences.edit().putBoolean("pref_use_proxy", value).apply()

    var customProxyUrl: String
        get() = sharedPreferences.getString("pref_proxy_url", "https://murmur-proxy.yourname.workers.dev") ?: ""
        set(value) = sharedPreferences.edit().putString("pref_proxy_url", value).apply()

    // Privacy & History
    var isHistoryEnabled: Boolean
        get() = sharedPreferences.getBoolean("pref_history_enabled", false) // OFF by default
        set(value) = sharedPreferences.edit().putBoolean("pref_history_enabled", value).apply()

    // Mode Settings
    var recordingMode: String
        get() = sharedPreferences.getString("pref_recording_mode", "tap") ?: "tap" // "tap" or "hold"
        set(value) = sharedPreferences.edit().putString("pref_recording_mode", value).apply()

    var isHapticsEnabled: Boolean
        get() = sharedPreferences.getBoolean("pref_haptics_enabled", true)
        set(value) = sharedPreferences.edit().putBoolean("pref_haptics_enabled", value).apply()
}
