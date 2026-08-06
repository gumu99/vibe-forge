import { createFileRoute } from "@tanstack/react-router";

type Body = { prompt?: string; aspect?: string };

const MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function friendly(status: number, detail: string): string {
  if (status === 429) return "Image quota hit — wait a moment and retry this image.";
  if (status === 403) return "The Gemini key isn't allowed to generate images.";
  if (status === 400 && /safety|blocked/i.test(detail))
    return "That image prompt was blocked by safety filters.";
  return detail.slice(0, 240) || "Image generation failed.";
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

        const key = process.env["GEMINI_API_KEY"];
        if (!key) return Response.json({ error: "AI is not configured." }, { status: 500 });

        const aspect = body.aspect && /^\d+:\d+$/.test(body.aspect) ? body.aspect : "16:9";
        const text = `Generate a single high-quality image with a ${aspect} aspect ratio. ${prompt}. No text, watermarks or logos unless explicitly requested.`;

        try {
          const upstream = await fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text }] }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          });

          const detail = await upstream.text();
          if (!upstream.ok) {
            console.error("[vibe] image generation failed", upstream.status, detail.slice(0, 400));
            return Response.json(
              { error: friendly(upstream.status, detail) },
              { status: upstream.status },
            );
          }

          const payload = JSON.parse(detail) as {
            candidates?: {
              content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] };
            }[];
          };
          const part = payload.candidates?.[0]?.content?.parts?.find(
            (item) => item.inlineData?.data,
          );

          if (!part?.inlineData?.data) {
            return Response.json(
              { error: "The model returned no image for that prompt." },
              { status: 502 },
            );
          }

          return Response.json({
            b64: part.inlineData.data,
            mimeType: part.inlineData.mimeType ?? "image/png",
          });
        } catch (error) {
          console.error("[vibe] image generation error", error);
          return Response.json({ error: "Image generation failed." }, { status: 500 });
        }
      },
    },
  },
});
