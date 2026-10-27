package com.murmur.app.ime.stt

/**
 * Configuration passed to STT provider.
 */
data class SttConfig(
    val apiKey: String,
    val language: String = "en",
    val keywords: List<String> = emptyList(),
    val proxyBaseUrl: String? = null,
    val useProxy: Boolean = false
)

/**
 * Pluggable Speech-to-Text provider adapter interface.
 * Implementations:
 * - DeepgramStreamingClient (default streaming WebSocket)
 * - OpenAiWhisperClient (REST / whisper option)
 * - LocalWhisperClient (on-device whisper.cpp option)
 */
interface SttProvider {
    val name: String

    /**
     * Open real-time connection to speech recognition provider.
     */
    fun startSession(
        config: SttConfig,
        onTranscript: (transcript: String, isFinal: Boolean) -> Unit,
        onError: (Throwable) -> Unit
    )

    /**
     * Stream an audio chunk (16 kHz mono 16-bit linear PCM).
     */
    fun streamAudio(chunk: ByteArray)

    /**
     * Signal end of speech utterance and await final transcript.
     */
    fun finishSession()

    /**
     * Cancel active session and discard connection.
     */
    fun cancelSession()
}
