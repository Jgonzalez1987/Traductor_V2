// FluentIA — Cloudflare Worker Proxy
// Guarda las API keys como secrets en Cloudflare Dashboard
// Las requests del frontend van a este worker, nunca directo a las APIs

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // --- Claude API proxy ---
      if (path === "/api/chat") {
        const body = await request.json();

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": env.CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: body.model || "claude-haiku-4-5-20251001",
            max_tokens: Math.min(body.max_tokens || 250, 500),
            system: body.system || "",
            messages: body.messages || [],
          }),
        });

        const data = await res.text();
        return new Response(data, {
          status: res.status,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }

      // --- ElevenLabs TTS proxy ---
      if (path === "/api/tts") {
        if (!env.ELEVENLABS_API_KEY) {
          return new Response(JSON.stringify({ error: "TTS not configured" }), {
            status: 503,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }

        const body = await request.json();
        const voiceId = body.voice_id || "pNInz6obpgDQGcFmaJgB";

        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
          {
            method: "POST",
            headers: {
              "xi-api-key": env.ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: body.text,
              model_id: "eleven_turbo_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.3,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (!res.ok) {
          return new Response(JSON.stringify({ error: "TTS failed" }), {
            status: res.status,
            headers: { "Content-Type": "application/json", ...CORS_HEADERS },
          });
        }

        return new Response(res.body, {
          headers: { "Content-Type": "audio/mpeg", ...CORS_HEADERS },
        });
      }

      // --- Health check ---
      if (path === "/api/health") {
        return new Response(JSON.stringify({ status: "ok", tts: !!env.ELEVENLABS_API_KEY }), {
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }

      return new Response("Not found", { status: 404, headers: CORS_HEADERS });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
  },
};
