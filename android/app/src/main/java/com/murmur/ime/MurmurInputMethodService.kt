package com.murmur.app.ime

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.text.InputType
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.*
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.murmur.app.companion.MainActivity
import com.murmur.app.data.local.MurmurDatabase
import com.murmur.app.data.local.entities.HistoryEntity
import com.murmur.app.data.security.SecureStorageManager
import com.murmur.app.ime.audio.AudioRecordManager
import com.murmur.app.ime.haptics.HapticManager
import com.murmur.app.ime.llm.LlmCleanupEngine
import com.murmur.app.ime.stt.DeepgramStreamingClient
import com.murmur.app.ime.stt.SttConfig
import com.murmur.app.ime.stt.SttProvider
import com.murmur.app.ime.ui.KeyboardScreen
import com.murmur.app.ime.ui.KeyboardUiState
import com.murmur.app.ime.ui.ToneMode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

/**
 * Murmur InputMethodService (IME) - Complete Final Implementation.
 * Full Pipeline:
 * 1. AudioRecord (16 kHz mono 16-bit PCM streaming)
 * 2. Deepgram streaming STT with Room-backed dictionary keyword boosting
 * 3. Fast LLM cleanup (PromptTemplate, self-correction, tone matching, snippet expansion)
 * 4. Command Mode (selected text rewrite)
 * 5. Secure field guard, per-app tone detection, in-memory retry, clipboard fallback
 */
class MurmurInputMethodService : android.inputmethodservice.InputMethodService(),
    LifecycleOwner, SavedStateRegistryOwner {

    private val lifecycleRegistry = LifecycleRegistry(this)
    private val savedStateRegistryController = SavedStateRegistryController.create(this)

    override val lifecycle: Lifecycle get() = lifecycleRegistry
    override val savedStateRegistry: SavedStateRegistry get() = savedStateRegistryController.savedStateRegistry

    val uiState = mutableStateOf(KeyboardUiState())

    private lateinit var audioRecordManager: AudioRecordManager
    private lateinit var secureStorage: SecureStorageManager
    private lateinit var database: MurmurDatabase
    private lateinit var hapticManager: HapticManager
    private val llmCleanupEngine = LlmCleanupEngine()
    private var sttProvider: SttProvider = DeepgramStreamingClient()

    private var timerJob: Job? = null
    private var audioStreamJob: Job? = null
    private val inMemoryAudioBuffer = ByteArrayOutputStream()

    // Command Mode State
    private var capturedSelectedText: String? = null

    // Cache Room Dictionary & Snippets
    private var cachedDictionary = listOf<String>()
    private var cachedSnippets = listOf<Pair<String, String>>()

    override fun onCreate() {
        super.onCreate()
        savedStateRegistryController.performRestore(null)
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)

        audioRecordManager = AudioRecordManager(this)
        secureStorage = SecureStorageManager(this)
        database = MurmurDatabase.getInstance(this)
        hapticManager = HapticManager(this)

        // Observe dictionary terms for STT boosting & LLM prompt
        lifecycleScope.launch {
            database.dictionaryDao().getAllTerms().collect { items ->
                cachedDictionary = items.map { it.term }
            }
        }

        // Observe snippets for voice expansion
        lifecycleScope.launch {
            database.snippetDao().getAllSnippets().collect { items ->
                cachedSnippets = items.map { it.cue to it.expansion }
            }
        }

        // Observe live amplitude for waveform
        lifecycleScope.launch {
            audioRecordManager.amplitude.collect { amp ->
                if (uiState.value.isRecording) {
                    uiState.value = uiState.value.copy(amplitudeLevel = amp)
                }
            }
        }

        // Observe audio focus interruptions (e.g. phone call)
        lifecycleScope.launch {
            audioRecordManager.interruptionEvent.collect { reason ->
                sttProvider.cancelSession()
                uiState.value = uiState.value.copy(
                    isRecording = false,
                    isTranscribing = false,
                    errorMessage = reason,
                    amplitudeLevel = 0f
                )
                stopDurationTimer()
            }
        }
    }

    override fun onCreateInputView(): View {
        val composeView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@MurmurInputMethodService)
            setViewTreeSavedStateRegistryOwner(this@MurmurInputMethodService)
            setContent {
                KeyboardScreen(
                    state = uiState.value,
                    onToggleMic = { handleMicToggle() },
                    onStartHoldMic = { startRecording() },
                    onStopHoldMic = { stopRecording() },
                    onOpenPermissionGrant = { openCompanionForMicPermission() },
                    onRetryStt = { retrySttTranscription() },
                    onSwitchKeyboard = { switchToPreviousOrPicker() },
                    onDelete = { handleDelete() },
                    onSpace = { handleSpace() },
                    onEnter = { handleEnter() },
                    onToneChange = { newTone ->
                        hapticManager.vibrateKeyTap(secureStorage.isHapticsEnabled)
                        uiState.value = uiState.value.copy(tone = newTone, isCustomTonePinned = true)
                    },
                    onToggleQwerty = {
                        hapticManager.vibrateKeyTap(secureStorage.isHapticsEnabled)
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
        val hasMicPermission = audioRecordManager.hasPermission()

        uiState.value = uiState.value.copy(
            isSecureField = isPassword,
            isMicPermissionGranted = hasMicPermission,
            hostPackage = hostPackage,
            isHoldToTalkMode = secureStorage.recordingMode == "hold",
            tone = if (uiState.value.isCustomTonePinned) uiState.value.tone else detectedTone,
            isRecording = false,
            isTranscribing = false,
            interimTranscript = "",
            hasNetworkError = false,
            amplitudeLevel = 0f,
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

    override fun onDestroy() {
        super.onDestroy()
        audioRecordManager.release()
        sttProvider.cancelSession()
        stopDurationTimer()
        audioStreamJob?.cancel()
        lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
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
            lower.contains("messaging") || lower.contains("mms") ||
            lower.contains("discord") || lower.contains("slack") -> ToneMode.CASUAL

            lower.contains("gmail") || lower.contains("outlook") ||
            lower.contains("mail") || lower.contains("linkedin") -> ToneMode.PROFESSIONAL

            lower.contains("chrome") || lower.contains("browser") ||
            lower.contains("terminal") || lower.contains("code") ||
            lower.contains("termux") -> ToneMode.PLAIN

            else -> ToneMode.CASUAL
        }
    }

    private fun handleMicToggle() {
        if (!audioRecordManager.hasPermission()) {
            uiState.value = uiState.value.copy(isMicPermissionGranted = false)
            return
        }
        if (uiState.value.isSecureField) return

        if (uiState.value.isRecording) {
            stopRecording()
        } else {
            startRecording()
        }
    }

    private fun startRecording() {
        if (!audioRecordManager.hasPermission()) {
            uiState.value = uiState.value.copy(isMicPermissionGranted = false)
            return
        }
        if (uiState.value.isSecureField) return

        hapticManager.vibrateRecordingStart(secureStorage.isHapticsEnabled)

        // Check if user selected text in host editor (Command Mode)
        val ic = currentInputConnection
        val selected = ic?.getSelectedText(0)?.toString()
        capturedSelectedText = if (!selected.isNullOrBlank()) selected else null

        // Reset in-memory buffer
        synchronized(inMemoryAudioBuffer) {
            inMemoryAudioBuffer.reset()
        }

        // Initialize STT provider with personal dictionary keyword hints
        val sttConfig = SttConfig(
            apiKey = secureStorage.deepgramApiKey,
            language = "en",
            keywords = cachedDictionary,
            proxyBaseUrl = secureStorage.customProxyUrl,
            useProxy = secureStorage.useProxy
        )

        var accumulatedTranscript = ""

        sttProvider.startSession(
            config = sttConfig,
            onTranscript = { transcript, isFinal ->
                lifecycleScope.launch(Dispatchers.Main) {
                    accumulatedTranscript = transcript
                    if (isFinal) {
                        processAndCommitSpeech(accumulatedTranscript)
                    } else {
                        uiState.value = uiState.value.copy(interimTranscript = transcript)
                    }
                }
            },
            onError = { throwable ->
                lifecycleScope.launch(Dispatchers.Main) {
                    uiState.value = uiState.value.copy(
                        hasNetworkError = true,
                        isRecording = false,
                        isTranscribing = false,
                        errorMessage = "Transcription error: ${throwable.localizedMessage}"
                    )
                }
            }
        )

        val started = audioRecordManager.startRecording()
        if (started) {
            uiState.value = uiState.value.copy(
                isRecording = true,
                isTranscribing = false,
                hasNetworkError = false,
                interimTranscript = "",
                recordingDurationSeconds = 0,
                errorMessage = null
            )
            startDurationTimer()

            // Stream chunks
            audioStreamJob?.cancel()
            audioStreamJob = lifecycleScope.launch {
                audioRecordManager.audioChunks.collect { chunk ->
                    if (uiState.value.isRecording) {
                        synchronized(inMemoryAudioBuffer) {
                            inMemoryAudioBuffer.write(chunk)
                        }
                        sttProvider.streamAudio(chunk)
                    }
                }
            }
        }
    }

    private fun stopRecording() {
        hapticManager.vibrateRecordingStop(secureStorage.isHapticsEnabled)
        audioRecordManager.stopRecording()
        stopDurationTimer()
        audioStreamJob?.cancel()

        uiState.value = uiState.value.copy(
            isRecording = false,
            isTranscribing = true,
            amplitudeLevel = 0f
        )
        sttProvider.finishSession()
    }

    private fun cancelRecording() {
        audioRecordManager.stopRecording(cancelled = true)
        stopDurationTimer()
        audioStreamJob?.cancel()
        sttProvider.cancelSession()

        uiState.value = uiState.value.copy(
            isRecording = false,
            isTranscribing = false,
            interimTranscript = "",
            amplitudeLevel = 0f
        )
    }

    /**
     * Executes the LLM cleanup or Command Mode rewrite, then inserts at cursor.
     */
    private fun processAndCommitSpeech(rawTranscript: String) {
        lifecycleScope.launch {
            val selected = capturedSelectedText
            val toneName = uiState.value.tone.name

            val finalText = if (selected != null) {
                // Command Mode: rewrite selected text based on spoken instruction
                llmCleanupEngine.rewriteSelectedText(
                    selectedText = selected,
                    instruction = rawTranscript,
                    apiKey = secureStorage.anthropicApiKey,
                    proxyUrl = secureStorage.customProxyUrl,
                    useProxy = secureStorage.useProxy
                )
            } else {
                // Standard Dictation Pipeline: LLM cleanup + dictionary + tone
                llmCleanupEngine.cleanTranscript(
                    rawTranscript = rawTranscript,
                    tone = toneName,
                    dictionaryTerms = cachedDictionary,
                    snippetCues = cachedSnippets,
                    apiKey = secureStorage.anthropicApiKey,
                    proxyUrl = secureStorage.customProxyUrl,
                    useProxy = secureStorage.useProxy
                )
            }

            // Commit to editor
            commitTextWithSpacing(finalText)

            // Save history if enabled (OFF by default)
            if (secureStorage.isHistoryEnabled) {
                database.historyDao().insertAndPrune(
                    HistoryEntity(
                        rawText = rawTranscript,
                        cleanedText = finalText,
                        tone = toneName,
                        hostPackage = uiState.value.hostPackage,
                        durationSeconds = uiState.value.recordingDurationSeconds
                    )
                )
            }

            uiState.value = uiState.value.copy(
                isTranscribing = false,
                interimTranscript = ""
            )
            capturedSelectedText = null
        }
    }

    private fun retrySttTranscription() {
        val audioBytes = synchronized(inMemoryAudioBuffer) { inMemoryAudioBuffer.toByteArray() }
        if (audioBytes.isEmpty()) {
            uiState.value = uiState.value.copy(hasNetworkError = false)
            return
        }

        uiState.value = uiState.value.copy(
            hasNetworkError = false,
            isTranscribing = true
        )

        val sttConfig = SttConfig(
            apiKey = secureStorage.deepgramApiKey,
            language = "en",
            keywords = cachedDictionary
        )

        sttProvider.startSession(
            config = sttConfig,
            onTranscript = { transcript, isFinal ->
                lifecycleScope.launch(Dispatchers.Main) {
                    if (isFinal) {
                        processAndCommitSpeech(transcript)
                    }
                }
            },
            onError = {
                lifecycleScope.launch(Dispatchers.Main) {
                    uiState.value = uiState.value.copy(
                        hasNetworkError = true,
                        isTranscribing = false
                    )
                }
            }
        )

        lifecycleScope.launch(Dispatchers.IO) {
            val chunkSize = 3200
            for (i in 0 until audioBytes.size step chunkSize) {
                val end = minOf(i + chunkSize, audioBytes.size)
                sttProvider.streamAudio(audioBytes.copyOfRange(i, end))
                delay(25)
            }
            sttProvider.finishSession()
        }
    }

    private fun startDurationTimer() {
        stopDurationTimer()
        timerJob = lifecycleScope.launch {
            var seconds = 0
            while (isActive && uiState.value.isRecording) {
                delay(1000)
                seconds++
                uiState.value = uiState.value.copy(recordingDurationSeconds = seconds)
            }
        }
    }

    private fun stopDurationTimer() {
        timerJob?.cancel()
        timerJob = null
    }

    private fun openCompanionForMicPermission() {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("deep_link", "request_mic")
        }
        startActivity(intent)
    }

    fun commitTextWithSpacing(text: String) {
        val ic = currentInputConnection
        if (text.isEmpty()) return

        if (ic == null) {
            fallbackCopyToClipboard(text)
            return
        }

        // If command mode replaced selected text, insert directly
        if (capturedSelectedText != null) {
            ic.commitText(text, 1)
            return
        }

        val before = ic.getTextBeforeCursor(2, 0)?.toString() ?: ""
        val formatted = StringBuilder()

        val needsLeadingSpace = before.isNotEmpty() &&
                !before.last().isWhitespace() &&
                !text.startsWith(" ") &&
                !text.startsWith("\n") &&
                !isPunctuation(text.first())

        if (needsLeadingSpace) {
            formatted.append(" ")
        }

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

        val committed = ic.commitText(formatted.toString(), 1)
        if (!committed) {
            fallbackCopyToClipboard(formatted.toString())
        }
    }

    private fun fallbackCopyToClipboard(text: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        val clip = ClipData.newPlainText("Murmur Dictation", text)
        clipboard?.setPrimaryClip(clip)
        Toast.makeText(this, "Murmur: Copied to clipboard", Toast.LENGTH_SHORT).show()
    }

    private fun isPunctuation(c: Char): Boolean = c in listOf('.', ',', '!', '?', ':', ';', ')', ']', '}')

    private fun handleDelete() {
        hapticManager.vibrateKeyTap(secureStorage.isHapticsEnabled)
        val ic = currentInputConnection ?: return
        val selectedText = ic.getSelectedText(0)
        if (!selectedText.isNullOrEmpty()) {
            ic.commitText("", 1)
        } else {
            ic.deleteSurroundingText(1, 0)
        }
    }

    private fun handleSpace() {
        hapticManager.vibrateKeyTap(secureStorage.isHapticsEnabled)
        currentInputConnection?.commitText(" ", 1)
    }

    private fun handleEnter() {
        hapticManager.vibrateKeyTap(secureStorage.isHapticsEnabled)
        sendDownUpKeyEvents(KeyEvent.KEYCODE_ENTER)
    }

    private fun commitDirectChar(char: String) {
        hapticManager.vibrateKeyTap(secureStorage.isHapticsEnabled)
        currentInputConnection?.commitText(char, 1)
    }

    private fun switchToPreviousOrPicker() {
        hapticManager.vibrateKeyTap(secureStorage.isHapticsEnabled)
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val switched = switchToPreviousInputMethod()
            if (!switched) {
                imm.showInputMethodPicker()
            }
        } else {
            imm.showInputMethodPicker()
        }
    }
}
