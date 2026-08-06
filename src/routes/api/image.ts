import { createFileRoute } from "@tanstack/react-router";

type Body = { prompt?: string; aspect?: string };

const GEMINI_MODEL = "gemini-3.1-flash-lite-image";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GATEWAY_ENDPOINT = "https://ai.gateway.lovable.dev/v1/images/generations";
const GATEWAY_MODEL = "google/gemini-3.1-flash-lite-image";

type Generated = { b64: string; mimeType: string };

function inlineImage(payload: unknown): Generated | null {
  const parts = (
    payload as {
      candidates?: {
        content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] };
      }[];
    }
  ).candidates?.[0]?.content?.parts;
  const found = parts?.find((part) => part.inlineData?.data);
  if (!found?.inlineData?.data) return null;
  return { b64: found.inlineData.data, mimeType: found.inlineData.mimeType ?? "image/png" };
}

async function viaGemini(key: string, text: string): Promise<Generated> {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  const detail = await response.text();
  if (!response.ok) {
    console.error("[vibe] gemini image failed", response.status, detail.slice(0, 300));
    throw new Error(
      response.status === 429
        ? "Gemini image quota is 0 on the free tier — enable billing on your Google AI Studio key, or add Lovable AI credits."
        : /safety|blocked/i.test(detail)
          ? "That image prompt was blocked by safety filters."
          : `Gemini image error (${response.status}).`,
    );
  }
  const image = inlineImage(JSON.parse(detail));
  if (!image) throw new Error("The model returned no image for that prompt.");
  return image;
}

async function viaGateway(key: string, text: string): Promise<Generated> {
  const response = await fetch(GATEWAY_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GATEWAY_MODEL,
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  const detail = await response.text();
  if (!response.ok) {
    console.error("[vibe] gateway image failed", response.status, detail.slice(0, 300));
    throw new Error(
      response.status === 402
        ? "Lovable AI credits are exhausted, and the Gemini free tier has no image quota."
        : `Image generation failed (${response.status}).`,
    );
  }
  const parsed = JSON.parse(detail) as { data?: { b64_json?: string }[] };
  const b64 = parsed.data?.[0]?.b64_json ?? inlineImage(parsed)?.b64;
  if (!b64) throw new Error("The model returned no image for that prompt.");
  return { b64, mimeType: "image/png" };
}

export const Route = createFileRoute("/api/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        if (!prompt) return Response.json({ error: "Missing image prompt." }, { status: 400 });

        const geminiKey = process.env["GEMINI_API_KEY"];
        const gatewayKey = process.env["LOVABLE_API_KEY"];
        if (!geminiKey && !gatewayKey) {
          return Response.json({ error: "Image AI is not configured." }, { status: 500 });
        }

        const aspect = body.aspect && /^\d+:\d+$/.test(body.aspect) ? body.aspect : "16:9";
        const text = `Generate a single high-quality image with a ${aspect} aspect ratio. ${prompt}. No text, watermarks or logos unless explicitly requested.`;

        let lastError = "Image generation failed.";

        // Prefer the user's own Gemini key, then fall back to the Lovable gateway.
        for (const attempt of [
          geminiKey ? () => viaGemini(geminiKey, text) : null,
          gatewayKey ? () => viaGateway(gatewayKey, text) : null,
        ]) {
          if (!attempt) continue;
          try {
            const image = await attempt();
            return Response.json(image);
          } catch (error) {
            lastError = error instanceof Error ? error.message : lastError;
          }
        }

        return Response.json({ error: lastError }, { status: 502 });
      },
    },
  },
});
