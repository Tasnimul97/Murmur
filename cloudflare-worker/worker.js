/**
 * Murmur Cloudflare Worker Proxy
 * Keeps API keys (Deepgram, Claude/Anthropic, OpenAI, Gemini) securely server-side.
 * The Android app points its configurable baseUrl to this worker.
 */

export default {
  async fetch(request, env, ctx) {
    // Enable CORS for testing and client requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Murmur-Client-Version",
        },
      });
    }

    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(JSON.stringify({ status: "ok", service: "Murmur Proxy", version: "1.0.0" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Deepgram Streaming WebSocket Token or Proxy
    if (url.pathname.startsWith("/v1/stt/deepgram")) {
      const deepgramKey = env.DEEPGRAM_API_KEY;
      if (!deepgramKey) {
        return new Response(JSON.stringify({ error: "DEEPGRAM_API_KEY secret not configured in Worker" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Ephemeral token generation for direct client websocket connection without exposing master key
      if (url.pathname === "/v1/stt/deepgram/token") {
        const tokenRes = await fetch("https://api.deepgram.com/v1/projects", {
          headers: { Authorization: `Token ${deepgramKey}` },
        });
        const data = await tokenRes.json();
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    // 2. LLM Cleanup Proxy (Claude Haiku / Anthropic or OpenAI / Gemini)
    if (url.pathname === "/v1/llm/clean") {
      const anthropicKey = env.ANTHROPIC_API_KEY;
      const geminiKey = env.GEMINI_API_KEY;

      const body = await request.json();
      const { transcript, tone, dictionary, systemPrompt } = body;

      if (!transcript) {
        return new Response(JSON.stringify({ error: "transcript is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Fast model call: Claude 3.5 Haiku (or Gemini 2.5 Flash fallback)
      if (anthropicKey) {
        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-latest",
            max_tokens: 1000,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: `Raw transcript:\n"${transcript}"\nCleaned output:`,
              },
            ],
          }),
        });

        const anthropicData = await anthropicRes.json();
        const cleanedText = anthropicData?.content?.[0]?.text?.trim() || transcript;

        return new Response(JSON.stringify({ cleanedText }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } else if (geminiKey) {
        // Gemini fallback
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: `Raw transcript:\n"${transcript}"\nCleaned output:` }] }],
            generationConfig: { temperature: 0.2 },
          }),
        });
        const data = await geminiRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || transcript;
        return new Response(JSON.stringify({ cleanedText: text }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      return new Response(JSON.stringify({ error: "No LLM API keys configured on worker" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Endpoint not found", { status: 404 });
  },
};
