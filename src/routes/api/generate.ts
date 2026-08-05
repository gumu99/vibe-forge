import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";

import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import { SYSTEM_PROMPT } from "@/lib/vibe/prompt";

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
          const result = streamText({
            model: gateway("google/gemini-3.6-flash"),
            system: SYSTEM_PROMPT,
            messages,
            onError: ({ error }) => {
              console.error("[vibe] generation stream error", error);
            },
          });

          return result.toTextStreamResponse();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Generation failed.";
          const status = /rate limit|429/i.test(message)
            ? 429
            : /credit|402|payment/i.test(message)
              ? 402
              : 500;
          return new Response(message, { status });
        }
      },
    },
  },
});
