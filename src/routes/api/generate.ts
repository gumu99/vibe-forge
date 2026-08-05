import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";

import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { ERROR_MARK, SYSTEM_PROMPT } from "@/lib/vibe/prompt";

function friendlyError(error: unknown): string {
  const status = (error as { statusCode?: number } | null)?.statusCode;
  if (status === 429) return "Too many requests right now — wait a few seconds and try again.";
  if (status === 402)
    return "This workspace is out of AI credits. Add credits to keep generating apps.";
  const message = error instanceof Error ? error.message : "Generation failed.";
  return message.slice(0, 300);
}

type Turn = { role: "user" | "assistant"; content: string };
type Body = { turns?: Turn[] };

const MAX_TURNS = 12;

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const turns = Array.isArray(body.turns) ? body.turns : [];
        const valid = turns.filter(
          (turn) =>
            (turn?.role === "user" || turn?.role === "assistant") &&
            typeof turn.content === "string" &&
            turn.content.trim().length > 0,
        );

        if (valid.length === 0) {
          return new Response("Describe what you want to build.", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response("AI is not configured for this project.", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key, getLovableAiGatewayRunId(request));

        const messages: ModelMessage[] = valid.slice(-MAX_TURNS).map((turn) => ({
          role: turn.role,
          content: turn.content,
        }));

        try {
          let streamFailure: unknown = null;
          const result = streamText({
            model: gateway("google/gemini-3.6-flash"),
            system: SYSTEM_PROMPT,
            messages,
            // The AI SDK routes mid-stream failures here instead of throwing.
            onError: ({ error }) => {
              streamFailure = error;
              console.error("[vibe] generation stream error", error);
            },
          });

          // Errors can surface after headers are sent, so failures travel in-band.
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              const encoder = new TextEncoder();
              try {
                for await (const chunk of result.textStream) {
                  controller.enqueue(encoder.encode(chunk));
                }
              } catch (streamError) {
                streamFailure = streamError;
                console.error("[vibe] generation stream error", streamError);
              }
              if (streamFailure) {
                controller.enqueue(encoder.encode(ERROR_MARK + friendlyError(streamFailure)));
              }
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        } catch (error) {
          console.error("[vibe] generation failed", error);
          return new Response(friendlyError(error), { status: 500 });
        }
      },
    },
  },
});
