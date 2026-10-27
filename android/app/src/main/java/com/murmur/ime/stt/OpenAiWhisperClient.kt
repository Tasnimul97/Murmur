package com.murmur.app.ime.stt

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import java.io.IOException

/**
 * Alternative REST STT adapter (OpenAI Whisper).
 * Accumulates audio chunks in memory and sends a multi-part WAV file to /v1/audio/transcriptions.
 */
class OpenAiWhisperClient(
    private val okHttpClient: OkHttpClient = OkHttpClient()
) : SttProvider {

    override val name: String = "OpenAI Whisper REST"

    private val pcmBuffer = ByteArrayOutputStream()
    private var config: SttConfig? = null
    private var onTranscript: ((String, Boolean) -> Unit)? = null
    private var onError: ((Throwable) -> Unit)? = null
    private val scope = CoroutineScope(Dispatchers.IO)

    override fun startSession(
        config: SttConfig,
        onTranscript: (transcript: String, isFinal: Boolean) -> Unit,
        onError: (Throwable) -> Unit
    ) {
        this.config = config
        this.onTranscript = onTranscript
        this.onError = onError
        pcmBuffer.reset()
    }

    override fun streamAudio(chunk: ByteArray) {
        synchronized(pcmBuffer) {
            pcmBuffer.write(chunk)
        }
    }

    override fun finishSession() {
        val audioBytes = synchronized(pcmBuffer) { pcmBuffer.toByteArray() }
        if (audioBytes.isEmpty()) return

        scope.launch {
            try {
                val wavBytes = createWavHeader(audioBytes, 16000, 1, 16)
                val body = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("model", "whisper-1")
                    .addFormDataPart("language", config?.language ?: "en")
                    .addFormDataPart(
                        "file",
                        "audio.wav",
                        wavBytes.toRequestBody("audio/wav".toMediaTypeOrNull())
                    )

                if (!config?.keywords.isNullOrEmpty()) {
                    body.addFormDataPart("prompt", config!!.keywords.joinToString(", "))
                }

                val req = Request.Builder()
                    .url("https://api.openai.com/v1/audio/transcriptions")
                    .addHeader("Authorization", "Bearer ${config?.apiKey}")
                    .post(body.build())
                    .build()

                okHttpClient.newCall(req).execute().use { resp ->
                    if (!resp.isSuccessful) {
                        onError?.invoke(IOException("Whisper API returned ${resp.code}"))
                        return@use
                    }
                    val json = JSONObject(resp.body?.string() ?: "{}")
                    val text = json.optString("text", "").trim()
                    onTranscript?.invoke(text, true)
                }
            } catch (e: Exception) {
                onError?.invoke(e)
            }
        }
    }

    override fun cancelSession() {
        synchronized(pcmBuffer) {
            pcmBuffer.reset()
        }
    }

    private fun createWavHeader(pcm: ByteArray, sampleRate: Int, channels: Int, bitDepth: Int): ByteArray {
        val totalAudioLen = pcm.size
        val totalDataLen = totalAudioLen + 36
        val byteRate = sampleRate * channels * bitDepth / 8

        val header = ByteArrayOutputStream()
        val dos = DataOutputStream(header)

        dos.writeBytes("RIFF")
        dos.writeInt(Integer.reverseBytes(totalDataLen))
        dos.writeBytes("WAVE")
        dos.writeBytes("fmt ")
        dos.writeInt(Integer.reverseBytes(16))
        dos.writeShort(java.lang.Short.reverseBytes(1))
        dos.writeShort(java.lang.Short.reverseBytes(channels.toShort()))
        dos.writeInt(Integer.reverseBytes(sampleRate))
        dos.writeInt(Integer.reverseBytes(byteRate))
        dos.writeShort(java.lang.Short.reverseBytes((channels * bitDepth / 8).toShort()))
        dos.writeShort(java.lang.Short.reverseBytes(bitDepth.toShort()))
        dos.writeBytes("data")
        dos.writeInt(Integer.reverseBytes(totalAudioLen))
        dos.write(pcm)

        return header.toByteArray()
    }
}
