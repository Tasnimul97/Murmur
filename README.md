# Murmur - Production Android Voice Dictation Keyboard & Companion

Murmur is an Android voice dictation IME (Input Method Editor) and companion app built with Kotlin, Jetpack Compose, Room, DataStore, and OkHttp.

## 🚀 How to Generate the .APK File:

### Option 1: 1-Command Terminal Build (Local)
Ensure JDK 17 and Android SDK are installed, then run in this folder:
```bash
./gradlew assembleDebug
```
Your generated APK will immediately be located at:
`app/build/outputs/apk/debug/app-debug.apk`

To install it straight onto your connected Android phone:
```bash
./gradlew installDebug
# or:
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Option 2: Automated Cloud APK Build (GitHub Actions - 0 local setup!)
1. Push this folder to a GitHub repository (public or private).
2. Go to the **Actions** tab in GitHub.
3. The included `.github/workflows/build-apk.yml` runs automatically and compiles the APK on Ubuntu with JDK 17 & Android SDK.
4. Click on the completed workflow run and download the **`murmur-app-debug`** artifact (contains `app-debug.apk`).

### Option 3: Android Studio (GUI)
1. Open this project in Android Studio (Koala, Ladybug or newer).
2. Go to menu: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Click "locate" when the notification pops up to grab `app-debug.apk`.

---

## Features & Architecture:
- Custom InputMethodService (IME) with center mic, fallback QWERTY, and tone toggle.
- 16 kHz mono PCM AudioRecord capture + live sound waveform.
- Deepgram streaming STT WebSocket with personal dictionary keyword boosting.
- PromptTemplate.kt LLM cleanup (Claude 3.5 Haiku / Gemini Flash).
- Room database: personal dictionary, snippets, and history (off by default).
- Command Mode selected text rewrite.
- API keys in EncryptedSharedPreferences backed by Android Keystore.
- ProGuard rules for optimized release builds.
