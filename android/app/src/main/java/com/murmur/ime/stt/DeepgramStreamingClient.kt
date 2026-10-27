package com.murmur.app.ime.stt

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString.Companion.toByteString
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/**
 * Deepgram WebSocket real-time Speech-to-Text streaming client.
 * Connects over secure WebSocket, streams 16kHz PCM chunks, and injects personal dictionary keyword hints.
 */
class DeepgramStreamingClient(
    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .readTimeout(15, TimeUnit.SECONDS)
        .connectTimeout(10, TimeUnit.SECONDS)
        .pingInterval(10, TimeUnit.SECONDS)
        .build()
) : SttProvider {

    override val name: String = "Deepgram Streaming (Nova-3)"

    private var webSocket: WebSocket? = null
    private var isConnected = false
    private var onTranscriptCallback: ((String, Boolean) -> Unit)? = null
    private var onErrorCallback: ((Throwable) -> Unit)? = null

    override fun startSession(
        config: SttConfig,
        onTranscript: (transcript: String, isFinal: Boolean) -> Unit,
        onError: (Throwable) -> Unit
    ) {
        this.onTranscriptCallback = onTranscript
        this.onErrorCallback = onError

        // Build WebSocket endpoint with keyword hints & language
        val baseUrl = if (config.useProxy && !config.proxyBaseUrl.isNullOrBlank()) {
            val host = config.proxyBaseUrl.removeSuffix("/")
            if (host.startsWith("http")) host.replace("http", "ws") else "wss://$host"
        } else {
            "wss://api.deepgram.com"
        }

        val queryParams = mutableListOf(
            "model=nova-3",
            "encoding=linear16",
            "sample_rate=16000",
            "channels=1",
            "punctuate=true",
            "interim_results=true",
            "smart_format=true"
        )

        // Set language (support English, Bengali, Hindi, or multi-language auto-detection)
        val lang = when (config.language.lowercase()) {
            "bn", "bn_in", "bengali" -> "bn"
            "hi", "hi_in", "hindi" -> "hi"
            "auto" -> "multi"
            else -> "en-US"
        }
        queryParams.add("language=$lang")

        // Pass personal dictionary terms as keyword hints with boost factor
        config.keywords.forEach { term ->
            if (term.isNotBlank()) {
                val encodedTerm = URLEncoder.encode(term.trim(), "UTF-8")
                queryParams.add("keywords=$encodedTerm:2")
            }
        }

        val fullUrl = "$baseUrl/v1/listen?${queryParams.joinToString("&")}"

        val requestBuilder = Request.Builder().url(fullUrl)
        if (!config.useProxy && config.apiKey.isNotBlank()) {
            requestBuilder.addHeader("Authorization", "Token ${config.apiKey}")
        }

        val request = requestBuilder.build()

        webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                isConnected = true
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = JSONObject(text)
                    val isFinal = json.optBoolean("is_final", false)
                    val channel = json.optJSONObject("channel")
                    val alternatives = channel?.optJSONArray("alternatives")
                    if (alternatives != null && alternatives.length() > 0) {
                        val firstAlt = alternatives.getJSONObject(0)
                        val transcript = firstAlt.optString("transcript", "").trim()
                        if (transcript.isNotEmpty()) {
                            onTranscriptCallback?.invoke(transcript, isFinal)
                        }
                    }
                } catch (e: Exception) {
                    // Ignore non-transcription metadata frames
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                isConnected = false
                onErrorCallback?.invoke(t)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                isConnected = false
            }
        })
    }

    override fun streamAudio(chunk: ByteArray) {
        if (isConnected && chunk.isNotEmpty()) {
            webSocket?.send(chunk.toByteString())
        }
    }

    override fun finishSession() {
        try {
            // Deepgram close stream frame: send empty byte buffer or JSON CloseStream
            webSocket?.send("""{"type": "CloseStream"}""")
            webSocket?.close(1000, "Speech finished")
        } catch (_: Exception) {
        } finally {
            isConnected = false
            webSocket = null
        }
    }

    override fun cancelSession() {
        try {
            webSocket?.cancel()
        } catch (_: Exception) {
        } finally {
            isConnected = false
            webSocket = null
        }
    }
}
