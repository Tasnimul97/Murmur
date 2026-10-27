package com.murmur.app.ime.llm

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Fast LLM Speech-to-Text Cleanup & Command Mode Engine.
 * Supports:
 * - Ultra-fast latency (< 1.5s target) via Claude 3.5 Haiku or Gemini Flash
 * - Bypass logic for very short utterances (< 4 words) without dictionary/snippet cues
 * - Command Mode (selected text rewrite: "make this shorter", "fix grammar", etc.)
 * - Snippets expansion and Dictionary spellings enforcement
 */
class LlmCleanupEngine(
    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()
) {

    /**
     * Clean up raw transcript.
     * Skips LLM if utterance is < 4 words and contains no dictionary term or snippet cue.
     */
    suspend fun cleanTranscript(
        rawTranscript: String,
        tone: String,
        dictionaryTerms: List<String>,
        snippetCues: List<Pair<String, String>>,
        apiKey: String,
        proxyUrl: String?,
        useProxy: Boolean
    ): String = withContext(Dispatchers.IO) {
        val trimmed = rawTranscript.trim()
        if (trimmed.isEmpty()) return@withContext ""

        // 1. First expand local voice snippets
        var expandedText = trimmed
        snippetCues.forEach { (cue, expansion) ->
            val regex = Regex("\\b${Regex.escape(cue)}\\b", RegexOption.IGNORE_CASE)
            expandedText = expandedText.replace(regex, expansion)
        }

        // 2. Check bypass criteria: skip LLM for utterances under 4 words without dictionary/snippet terms
        val words = expandedText.split("\\s+".toRegex())
        val containsDictTerm = dictionaryTerms.any { term ->
            expandedText.contains(term, ignoreCase = true)
        }
        val containsSnippet = snippetCues.any { (cue, _) ->
            trimmed.contains(cue, ignoreCase = true)
        }

        if (words.size < 4 && !containsDictTerm && !containsSnippet) {
            // Fast punctuation bypass
            return@withContext formatShortUtterance(expandedText)
        }

        // 3. Invoke Fast LLM Cleanup (Claude Haiku or Proxy)
        try {
            val systemPrompt = PromptTemplate.buildSystemPrompt(tone, dictionaryTerms)

            if (useProxy && !proxyUrl.isNullOrBlank()) {
                return@withContext callProxyLlm(proxyUrl, expandedText, tone, dictionaryTerms, systemPrompt)
            } else if (apiKey.isNotBlank()) {
                return@withContext callClaudeHaiku(apiKey, expandedText, systemPrompt)
            }
        } catch (_: Exception) {
            // On network failure or API error, gracefully fall back to local rule-based cleanup
        }

        return@withContext localRuleBasedCleanup(expandedText, tone, dictionaryTerms)
    }

    /**
     * Command Mode: Execute an instruction on currently selected text
     * e.g. "make this shorter", "fix grammar", "translate to Bengali"
     */
    suspend fun rewriteSelectedText(
        selectedText: String,
        instruction: String,
        apiKey: String,
        proxyUrl: String?,
        useProxy: Boolean
    ): String = withContext(Dispatchers.IO) {
        if (selectedText.isBlank() || instruction.isBlank()) return@withContext selectedText

        val systemPrompt = """
You are Murmur's selected-text editing engine.
The user has selected a piece of text and spoken an instruction.
Your sole job is to rewrite the selected text according to their instruction (e.g. make it shorter, fix grammar, translate, change tone).
Output ONLY the rewritten replacement text. Do NOT add commentary, conversational filler, or quotation marks.
""".trimIndent()

        val userMessage = """
Selected Text:
"$selectedText"

Instruction:
"$instruction"

Rewritten Text:
""".trimIndent()

        try {
            if (apiKey.isNotBlank()) {
                return@withContext callClaudeHaiku(apiKey, userMessage, systemPrompt)
            }
        } catch (_: Exception) {
        }

        return@withContext selectedText
    }

    private fun callClaudeHaiku(apiKey: String, userPrompt: String, systemPrompt: String): String {
        val payload = JSONObject().apply {
            put("model", "claude-3-5-haiku-latest")
            put("max_tokens", 800)
            put("system", systemPrompt)
            put("messages", JSONArray().apply {
                put(JSONObject().apply {
                    put("role", "user")
                    put("content", userPrompt)
                })
            })
        }

        val request = Request.Builder()
            .url("https://api.anthropic.com/v1/messages")
            .addHeader("x-api-key", apiKey)
            .addHeader("anthropic-version", "2023-06-01")
            .addHeader("content-type", "application/json")
            .post(payload.toString().toRequestBody("application/json".toMediaTypeOrNull()))
            .build()

        okHttpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Claude API returned ${response.code}")
            val json = JSONObject(response.body?.string() ?: "{}")
            val contentArr = json.optJSONArray("content")
            if (contentArr != null && contentArr.length() > 0) {
                return contentArr.getJSONObject(0).optString("text", userPrompt).trim()
            }
        }
        return userPrompt
    }

    private fun callProxyLlm(
        proxyUrl: String,
        transcript: String,
        tone: String,
        dictionaryTerms: List<String>,
        systemPrompt: String
    ): String {
        val endpoint = "${proxyUrl.removeSuffix("/")}/v1/llm/clean"
        val payload = JSONObject().apply {
            put("transcript", transcript)
            put("tone", tone)
            put("dictionary", JSONArray(dictionaryTerms))
            put("systemPrompt", systemPrompt)
        }

        val request = Request.Builder()
            .url(endpoint)
            .post(payload.toString().toRequestBody("application/json".toMediaTypeOrNull()))
            .build()

        okHttpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("Proxy returned ${response.code}")
            val json = JSONObject(response.body?.string() ?: "{}")
            return json.optString("cleanedText", transcript).trim()
        }
    }

    /**
     * Ultra-fast local fallback if offline
     */
    private fun localRuleBasedCleanup(text: String, tone: String, dictionaryTerms: List<String>): String {
        var cleaned = text
            // Remove filler words
            .replace(Regex("\\b(um|uh|you know|so basically|like|i mean)\\b", RegexOption.IGNORE_CASE), "")
            // Resolve self-corrections like "at 3 no wait 4pm"
            .replace(Regex("\\b([\\w\\d:]+)\\s+(no wait|wait no|actually|scratch that)\\s+([\\w\\d:]+)\\b", RegexOption.IGNORE_CASE), "$3")
            .replace(Regex("\\s+"), " ")
            .trim()

        // Apply dictionary terms exact casing
        dictionaryTerms.forEach { term ->
            val regex = Regex("\\b${Regex.escape(term)}\\b", RegexOption.IGNORE_CASE)
            cleaned = cleaned.replace(regex, term)
        }

        // Punctuation & capitalization
        if (cleaned.isNotEmpty()) {
            cleaned = cleaned.replaceFirstChar { it.uppercase() }
            if (!cleaned.endsWith(".") && !cleaned.endsWith("!") && !cleaned.endsWith("?")) {
                cleaned += if (tone.equals("casual", ignoreCase = true)) "!" else "."
            }
        }
        return cleaned
    }

    private fun formatShortUtterance(text: String): String {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return ""
        return trimmed.replaceFirstChar { it.uppercase() }
    }
}
