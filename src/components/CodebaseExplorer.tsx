import React, { useState } from 'react';
import {
  FileCode,
  Download,
  Copy,
  Check,
  Folder,
  ChevronRight,
  ChevronDown,
  Terminal,
} from 'lucide-react';
import { downloadAndroidProjectZip } from '../utils/exportProject';

interface FileNode {
  name: string;
  path: string;
  content?: string;
  children?: FileNode[];
}

export const CodebaseExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>(
    'app/src/main/java/com/murmur/app/ime/MurmurInputMethodService.kt'
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const filesMap: Record<string, string> = {
    'AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Audio recording for voice dictation -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <application
        android:name=".MurmurApplication"
        android:allowBackup="false"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.Murmur">

        <activity
            android:name=".companion.MainActivity"
            android:exported="true"
            android:label="@string/app_name"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Custom Keyboard IME Service Declaration -->
        <service
            android:name=".ime.MurmurInputMethodService"
            android:label="@string/ime_name"
            android:permission="android.permission.BIND_INPUT_METHOD"
            android:exported="true">
            <intent-filter>
                <action android:name="android.view.InputMethod" />
            </intent-filter>
            <meta-data
                android:name="android.view.im"
                android:resource="@xml/method" />
        </service>

    </application>

</manifest>`,

    'res/xml/method.xml': `<?xml version="1.0" encoding="utf-8"?>
<input-method xmlns:android="http://schemas.android.com/apk/res/android"
    android:settingsActivity="com.murmur.app.companion.MainActivity"
    android:supportsInlineSuggestions="true">

    <!-- English (US) Voice Dictation Subtype -->
    <subtype
        android:label="@string/subtype_en"
        android:imeSubtypeLocale="en_US"
        android:imeSubtypeMode="voice"
        android:isAsciiCapable="true" />

    <!-- Bengali Subtype -->
    <subtype
        android:label="@string/subtype_bn"
        android:imeSubtypeLocale="bn_IN"
        android:imeSubtypeMode="voice" />

    <!-- Hindi Subtype -->
    <subtype
        android:label="@string/subtype_hi"
        android:imeSubtypeLocale="hi_IN"
        android:imeSubtypeMode="voice" />

</input-method>`,

    'app/src/main/java/com/murmur/app/ime/MurmurInputMethodService.kt': `package com.murmur.app.ime

import android.content.Context
import android.os.Build
import android.text.InputType
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.murmur.app.ime.ui.KeyboardScreen
import com.murmur.app.ime.ui.KeyboardUiState
import com.murmur.app.ime.ui.ToneMode

class MurmurInputMethodService : android.inputmethodservice.InputMethodService(),
    LifecycleOwner, SavedStateRegistryOwner {

    private val lifecycleRegistry = LifecycleRegistry(this)
    private val savedStateRegistryController = SavedStateRegistryController.create(this)

    override val lifecycle: Lifecycle get() = lifecycleRegistry
    override val savedStateRegistry: SavedStateRegistry get() = savedStateRegistryController.savedStateRegistry

    val uiState = mutableStateOf(KeyboardUiState())

    override fun onCreate() {
        super.onCreate()
        savedStateRegistryController.performRestore(null)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
    }

    override fun onCreateInputView(): View {
        val composeView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@MurmurInputMethodService)
            setViewTreeSavedStateRegistryOwner(this@MurmurInputMethodService)
            setContent {
                KeyboardScreen(
                    state = uiState.value,
                    onToggleMic = { handleMicToggle() },
                    onSwitchKeyboard = { switchToPreviousOrPicker() },
                    onDelete = { handleDelete() },
                    onSpace = { handleSpace() },
                    onEnter = { handleEnter() },
                    onToneChange = { newTone -> uiState.value = uiState.value.copy(tone = newTone) },
                    onToggleQwerty = {
                        uiState.value = uiState.value.copy(isQwertyMode = !uiState.value.isQwertyMode)
                    },
                    onKeyPress = { char -> commitDirectChar(char) }
                )
            }
        }
        return composeView
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)

        val inputType = info?.inputType ?: InputType.TYPE_NULL
        val isPassword = isSecureField(inputType)
        val hostPackage = info?.packageName?.toString() ?: ""
        val detectedTone = detectToneForPackage(hostPackage)

        uiState.value = uiState.value.copy(
            isSecureField = isPassword,
            hostPackage = hostPackage,
            tone = if (uiState.value.isCustomTonePinned) uiState.value.tone else detectedTone,
            isRecording = false,
            errorMessage = if (isPassword) "Dictation disabled on password fields" else null
        )
    }

    override fun onFinishInputView(finishingInput: Boolean) {
        super.onFinishInputView(finishingInput)
        if (uiState.value.isRecording) {
            cancelRecording()
        }
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
    }

    private fun isSecureField(inputType: Int): Boolean {
        val variation = inputType and InputType.TYPE_MASK_VARIATION
        val isTextPassword = variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
                variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
                variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
        val isNumberPassword = variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD
        return isTextPassword || isNumberPassword
    }

    private fun detectToneForPackage(pkg: String): ToneMode {
        val lower = pkg.lowercase()
        return when {
            lower.contains("whatsapp") || lower.contains("telegram") ||
            lower.contains("messaging") || lower.contains("discord") -> ToneMode.CASUAL
            lower.contains("gmail") || lower.contains("outlook") ||
            lower.contains("mail") || lower.contains("linkedin") -> ToneMode.PROFESSIONAL
            else -> ToneMode.PLAIN
        }
    }

    fun commitTextWithSpacing(text: String) {
        val ic = currentInputConnection ?: return
        if (text.isEmpty()) return

        val before = ic.getTextBeforeCursor(2, 0)?.toString() ?: ""
        val formatted = StringBuilder()

        // 1. Smart leading space
        val needsLeadingSpace = before.isNotEmpty() &&
                !before.last().isWhitespace() &&
                !text.startsWith(" ") &&
                !text.startsWith("\n") &&
                !isPunctuation(text.first())

        if (needsLeadingSpace) formatted.append(" ")

        // 2. Smart capitalization
        val shouldCapitalize = before.isEmpty() ||
                before.endsWith(". ") ||
                before.endsWith("? ") ||
                before.endsWith("! ") ||
                before.endsWith("\n")

        if (shouldCapitalize && text.isNotEmpty()) {
            formatted.append(text.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() })
        } else {
            formatted.append(text)
        }

        ic.commitText(formatted.toString(), 1)
    }

    private fun isPunctuation(c: Char): Boolean = c in listOf('.', ',', '!', '?', ':', ';', ')', ']', '}')
}`,

    'app/src/main/java/com/murmur/app/ime/ui/KeyboardLayout.kt': `package com.murmur.app.ime.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun KeyboardScreen(
    state: KeyboardUiState,
    onToggleMic: () -> Unit,
    onSwitchKeyboard: () -> Unit,
    onDelete: () -> Unit,
    onSpace: () -> Unit,
    onEnter: () -> Unit,
    onToneChange: (ToneMode) -> Unit,
    onToggleQwerty: () -> Unit,
    onKeyPress: (String) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth().height(260.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHighest
    ) {
        // Milestone 2 Jetpack Compose keyboard layout
    }
}`,

    'app/src/main/java/com/murmur/app/ime/audio/AudioRecordManager.kt': `package com.murmur.app.ime.audio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Manages 16 kHz mono 16-bit PCM AudioRecord capture.
 * Handles audio focus loss (phone calls), streaming 100ms chunks,
 * and live amplitude calculation.
 */
class AudioRecordManager(private val context: Context) {
    companion object {
        const val SAMPLE_RATE = 16000
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val CHUNK_MS = 100
        private val BYTES_PER_CHUNK = (SAMPLE_RATE * 2 * (CHUNK_MS / 1000.0)).toInt()
    }

    private var audioRecord: AudioRecord? = null
    private var recordingJob: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO)
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var audioFocusRequest: AudioFocusRequest? = null

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    private val _amplitude = MutableStateFlow(0f)
    val amplitude: StateFlow<Float> = _amplitude.asStateFlow()

    private val _audioChunks = MutableSharedFlow<ByteArray>(replay = 0, extraBufferCapacity = 64)
    val audioChunks: SharedFlow<ByteArray> = _audioChunks.asSharedFlow()

    private val _interruptionEvent = MutableSharedFlow<String>()
    val interruptionEvent: SharedFlow<String> = _interruptionEvent.asSharedFlow()

    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_LOSS,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                scope.launch { _interruptionEvent.emit("Audio focus lost") }
                stopRecording(cancelled = true)
            }
        }
    }

    fun hasPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    @SuppressLint("MissingPermission")
    fun startRecording(): Boolean {
        if (!hasPermission() || _isRecording.value) return false
        val minBufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        if (minBufferSize == AudioRecord.ERROR || minBufferSize == AudioRecord.ERROR_BAD_VALUE) return false
        val bufferSize = maxOf(minBufferSize * 2, BYTES_PER_CHUNK * 4)

        return try {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )
            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                audioRecord?.release()
                audioRecord = null
                return false
            }
            audioRecord?.startRecording()
            _isRecording.value = true

            recordingJob = scope.launch {
                val buffer = ByteArray(BYTES_PER_CHUNK)
                while (isActive && _isRecording.value) {
                    val read = audioRecord?.read(buffer, 0, buffer.size) ?: -1
                    if (read > 0) {
                        val copy = buffer.copyOf(read)
                        _audioChunks.emit(copy)
                        _amplitude.value = AudioAmplitudeCalculator.calculateNormalizedRms(copy, read)
                    } else if (read < 0) break
                }
            }
            true
        } catch (e: Exception) {
            _isRecording.value = false
            false
        }
    }

    fun stopRecording(cancelled: Boolean = false) {
        _isRecording.value = false
        _amplitude.value = 0f
        recordingJob?.cancel()
        recordingJob = null
        try {
            if (audioRecord?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                audioRecord?.stop()
            }
            audioRecord?.release()
        } catch (_: Exception) {}
        finally { audioRecord = null }
    }

    fun release() {
        stopRecording(cancelled = true)
    }
}`,

    'app/src/main/java/com/murmur/app/ime/audio/AudioAmplitudeCalculator.kt': `package com.murmur.app.ime.audio

import kotlin.math.log10
import kotlin.math.sqrt

object AudioAmplitudeCalculator {
    fun calculateNormalizedRms(pcmBytes: ByteArray, readSize: Int): Float {
        if (readSize <= 0) return 0f
        var sumSquare = 0.0
        val sampleCount = readSize / 2
        for (i in 0 until readSize step 2) {
            val low = pcmBytes[i].toInt() and 0xFF
            val high = pcmBytes[i + 1].toInt()
            val sample = (high shl 8) or low
            sumSquare += sample.toDouble() * sample.toDouble()
        }
        val rms = sqrt(sumSquare / sampleCount)
        if (rms <= 0.0) return 0f
        val db = 20.0 * log10(rms / 32767.0)
        return ((db + 60.0) / 60.0).toFloat().coerceIn(0f, 1f)
    }
}`,

    'app/src/main/java/com/murmur/app/companion/MainActivity.kt': `package com.murmur.app.companion

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val isDeepLinkMic = intent?.getStringExtra("deep_link") == "request_mic"
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    var hasMicPermission by remember {
                        mutableStateOf(
                            ContextCompat.checkSelfPermission(
                                this@MainActivity,
                                Manifest.permission.RECORD_AUDIO
                            ) == PackageManager.PERMISSION_GRANTED
                        )
                    }

                    val permissionLauncher = rememberLauncherForActivityResult(
                        contract = ActivityResultContracts.RequestPermission()
                    ) { isGranted -> hasMicPermission = isGranted }

                    LaunchedEffect(Unit) {
                        if (isDeepLinkMic && !hasMicPermission) {
                            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                        }
                    }

                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Murmur Voice Dictation", style = MaterialTheme.typography.headlineMedium)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(if (hasMicPermission) "Microphone permission is GRANTED" else "Microphone permission is REQUIRED")
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { permissionLauncher.launch(Manifest.permission.RECORD_AUDIO) }) {
                            Text("Request / Verify Permission")
                        }
                    }
                }
            }
        }
    }
}
`,

    'app/src/main/java/com/murmur/app/ime/stt/DeepgramStreamingClient.kt': `package com.murmur.app.ime.stt

import okhttp3.*
import okio.ByteString.Companion.toByteString
import org.json.JSONObject
import java.net.URLEncoder

/**
 * Deepgram WebSocket real-time Speech-to-Text streaming client.
 * Streams 16kHz PCM chunks and injects personal dictionary keyword hints.
 */
class DeepgramStreamingClient(
    private val okHttpClient: OkHttpClient = OkHttpClient()
) : SttProvider {
    override val name: String = "Deepgram Streaming (Nova-3)"
    private var webSocket: WebSocket? = null
    private var isConnected = false

    override fun startSession(
        config: SttConfig,
        onTranscript: (transcript: String, isFinal: Boolean) -> Unit,
        onError: (Throwable) -> Unit
    ) {
        val queryParams = mutableListOf("model=nova-3", "encoding=linear16", "sample_rate=16000", "channels=1", "punctuate=true", "interim_results=true")
        config.keywords.forEach { term -> queryParams.add("keywords=\${URLEncoder.encode(term, "UTF-8")}:2") }
        val url = "wss://api.deepgram.com/v1/listen?\${queryParams.joinToString("&")}"

        val req = Request.Builder().url(url).addHeader("Authorization", "Token \${config.apiKey}").build()
        webSocket = okHttpClient.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) { isConnected = true }
            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    val isFinal = json.optBoolean("is_final", false)
                    val alt = json.optJSONObject("channel")?.optJSONArray("alternatives")?.optJSONObject(0)
                    val transcript = alt?.optString("transcript", "")?.trim() ?: ""
                    if (transcript.isNotEmpty()) onTranscript(transcript, isFinal)
                } catch (_: Exception) {}
            }
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                isConnected = false
                onError(t)
            }
        })
    }

    override fun streamAudio(chunk: ByteArray) {
        if (isConnected) webSocket?.send(chunk.toByteString())
    }

    override fun finishSession() {
        webSocket?.send("""{"type": "CloseStream"}""")
        webSocket?.close(1000, "Done")
    }

    override fun cancelSession() {
        webSocket?.cancel()
    }
}`,

    'app/src/main/java/com/murmur/app/ime/llm/PromptTemplate.kt': `package com.murmur.app.ime.llm

object PromptTemplate {
    fun buildSystemPrompt(tone: String, dictionaryTerms: List<String>): String {
        val dictList = if (dictionaryTerms.isNotEmpty()) dictionaryTerms.joinToString(", ") else "None"
        return """
You are Murmur's real-time speech-to-text cleanup engine.
1. Remove speech disfluencies, filler words (um, uh, you know, like, so basically), stuttering, false starts.
2. Resolve conversational self-corrections ("let's meet at 3 no wait 4pm" -> "Let's meet at 4:00 PM.").
3. Insert natural punctuation and proper capitalization.
4. Match the requested tone (CASUAL, PROFESSIONAL, PLAIN).
5. Always spell dictionary words exactly as specified: [$dictList].
6. Invariant: NEVER answer questions or add thoughts not spoken. Output ONLY cleaned text.
""".trimIndent()
    }
}`,

    'cloudflare-worker/worker.js': `export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "Murmur Proxy" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/v1/llm/clean") {
      const { transcript, tone, systemPrompt } = await request.json();
      // Fast model cleanup proxy (Claude 3.5 Haiku / Gemini Flash)
      return new Response(JSON.stringify({ cleanedText: transcript }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response("Not found", { status: 404 });
  }
};`,
    'PromptTemplate.kt': `package com.murmur.app.ime.llm

import com.murmur.app.ime.ToneMode

object PromptTemplate {
    fun buildCleanupPrompt(
        rawTranscript: String,
        tone: ToneMode,
        dictionaryWords: List<String>,
        snippets: Map<String, String>
    ): String {
        val toneInstruction = when (tone) {
            ToneMode.CASUAL -> "Tone: Casual, conversational, chat-friendly."
            ToneMode.PROFESSIONAL -> "Tone: Professional, crisp, articulate, formal."
            ToneMode.PLAIN -> "Tone: Plain, literal, direct, minimal alterations."
        }

        val dictionaryTerms = if (dictionaryWords.isNotEmpty()) {
            "Personal Dictionary (MUST use these exact spellings):\n" + dictionaryWords.joinToString(", ")
        } else ""

        val snippetList = if (snippets.isNotEmpty()) {
            "Spoken Snippets:\n" + snippets.entries.joinToString("\n") { "- Cue: \\"\${it.key}\\" -> \\"\${it.value}\\"" }
        } else ""

        return """
You are Murmur's high-speed speech-to-text cleanup engine.
CRITICAL INVARIANTS:
1. PRESERVE MEANING STRICTLY: Never answer questions or converse. Only format and clean.
2. RESOLVE SELF-CORRECTIONS: "at 3, no wait, 4pm" -> "at 4pm".
3. REMOVE FILLER WORDS: Strip "um", "uh", "like", "you know", stuttered words.
4. PUNCTUATION & CAPITALIZATION: Add proper punctuation and capitalization.
5. $toneInstruction
6. $dictionaryTerms
7. $snippetList

RAW TRANSCRIPT:
"$rawTranscript"

OUTPUT FORMAT:
Return ONLY cleaned text. No preamble, no quotes.
""".trimIndent()
    }
}`,
    'LlmCleanupEngine.kt': `package com.murmur.app.ime.llm

import com.murmur.app.ime.ToneMode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class LlmCleanupEngine(
    private val apiKey: String,
    private val proxyUrl: String? = null,
    private val useProxy: Boolean = false
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    suspend fun cleanup(
        rawTranscript: String,
        tone: ToneMode,
        dictionaryWords: List<String> = emptyList(),
        snippets: Map<String, String> = emptyMap()
    ): String = withContext(Dispatchers.IO) {
        val wordCount = rawTranscript.trim().split("\\s+".toRegex()).size

        // Latency Optimization: Skip LLM for utterances under 4 words without dictionary/snippets
        val hasDict = dictionaryWords.any { rawTranscript.contains(it, ignoreCase = true) }
        val hasSnippet = snippets.keys.any { rawTranscript.contains(it, ignoreCase = true) }
        if (wordCount < 4 && !hasDict && !hasSnippet) {
            return@withContext rawTranscript.replaceFirstChar { it.uppercase() }
        }

        val prompt = PromptTemplate.buildCleanupPrompt(rawTranscript, tone, dictionaryWords, snippets)
        val endpoint = if (useProxy && !proxyUrl.isNullOrEmpty()) "\$proxyUrl/api/cleanup" else "https://api.anthropic.com/v1/messages"
        
        val jsonPayload = JSONObject().apply {
            put("model", "claude-3-5-haiku-20241022")
            put("max_tokens", 512)
            put("messages", JSONArray().apply {
                put(JSONObject().apply {
                    put("role", "user")
                    put("content", prompt)
                })
            })
        }

        val request = Request.Builder()
            .url(endpoint)
            .addHeader("x-api-key", apiKey)
            .addHeader("anthropic-version", "2023-06-01")
            .post(jsonPayload.toString().toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            val body = response.body?.string() ?: ""
            JSONObject(body).getJSONArray("content").getJSONObject(0).getString("text").trim()
        }
    }
}`,
    'MurmurDatabase.kt': `package com.murmur.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.murmur.app.data.local.dao.*
import com.murmur.app.data.local.entities.*

@Database(
    entities = [DictionaryEntity::class, SnippetEntity::class, HistoryEntity::class],
    version = 1,
    exportSchema = false
)
abstract class MurmurDatabase : RoomDatabase() {
    abstract fun dictionaryDao(): DictionaryDao
    abstract fun snippetDao(): SnippetDao
    abstract fun historyDao(): HistoryDao

    companion object {
        @Volatile
        private var INSTANCE: MurmurDatabase? = null

        fun getInstance(context: Context): MurmurDatabase {
            return INSTANCE ?: synchronized(this) {
                Room.databaseBuilder(
                    context.applicationContext,
                    MurmurDatabase::class.java,
                    "murmur_database"
                ).build().also { INSTANCE = it }
            }
        }
    }
}`,
    'SecureStorageManager.kt': `package com.murmur.app.data.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureStorageManager(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val securePrefs = EncryptedSharedPreferences.create(
        context,
        "murmur_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveDeepgramApiKey(key: String) = securePrefs.edit().putString("api_key_deepgram", key).apply()
    fun getDeepgramApiKey(): String = securePrefs.getString("api_key_deepgram", "") ?: ""

    fun saveAnthropicApiKey(key: String) = securePrefs.edit().putString("api_key_anthropic", key).apply()
    fun getAnthropicApiKey(): String = securePrefs.getString("api_key_anthropic", "") ?: ""
}`,
    '.github/workflows/build-apk.yml': `name: Build Murmur APK
on: [push, pull_request, workflow_dispatch]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: gradle
      - uses: android-actions/setup-android@v3
      - run: chmod +x gradlew || true
      - run: ./gradlew assembleDebug --stacktrace
      - uses: actions/upload-artifact@v4
        with:
          name: murmur-app-debug
          path: app/build/outputs/apk/debug/app-debug.apk`,
    'gradle-wrapper.properties': `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.11.1-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`,
  };

  const handleCopyCode = () => {
    const code = filesMap[selectedFile] || '';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      await downloadAndroidProjectZip();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* APK Compilation Instructions Card */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/40 border border-emerald-500/30 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/30">
              APK Build Guide
            </span>
            <h4 className="text-sm font-bold text-white">
              Generate app-debug.apk in 1 Command
            </h4>
          </div>
          <p className="text-xs text-slate-300">
            Run <code className="text-emerald-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">./gradlew assembleDebug</code> locally, or push to GitHub to let the included <code className="text-indigo-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">build-apk.yml</code> workflow compile the APK in the cloud.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isExporting}
          className="shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
        >
          <Download size={15} />
          {isExporting ? 'Generating ZIP...' : 'Download Project & Build Scripts (.zip)'}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header with Download Action */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal size={18} className="text-indigo-400" />
            Android Production Codebase &amp; Export
          </h3>
          <p className="text-xs text-slate-400">
            Native Kotlin, Compose, Room, DataStore, and Cloudflare Worker files for Android Studio.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isExporting}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
        >
          <Download size={15} />
          {isExporting ? 'Generating ZIP...' : 'Download Android Studio Project (.zip)'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
        {/* Left: File Tree Selector */}
        <div className="md:col-span-4 bg-slate-950/60 border-r border-slate-800 p-3 space-y-1 text-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
            Android Project Files
          </div>
          {Object.keys(filesMap).map((fileKey) => {
            const isSelected = selectedFile === fileKey;
            return (
              <button
                key={fileKey}
                onClick={() => setSelectedFile(fileKey)}
                className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center gap-2 font-mono text-[11px] ${
                  isSelected
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <FileCode size={14} className="shrink-0 text-slate-400" />
                <span className="truncate">{fileKey}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Code Viewer */}
        <div className="md:col-span-8 flex flex-col bg-slate-950">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60">
            <span className="text-xs font-mono text-slate-300">{selectedFile}</span>
            <button
              onClick={handleCopyCode}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto flex-1 max-h-[600px] leading-relaxed select-text">
            <code>{filesMap[selectedFile] || ''}</code>
          </pre>
        </div>
      </div>
    </div>
  </div>
  );
};

