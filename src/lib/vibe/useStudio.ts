import { useCallback, useMemo, useRef, useState } from "react";

import { parseGeneration } from "./parse";

export type Turn = { role: "user" | "assistant"; content: string };

export type Version = {
  id: string;
  label: string;
  title: string;
  prompt: string;
  code: string;
  notes: string;
  ideas: string[];
  createdAt: number;
};

export type StudioStatus = "idle" | "streaming" | "error";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function useStudio() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<StudioStatus>("idle");
  const [streamCode, setStreamCode] = useState("");
  const [streamTitle, setStreamTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const turnsRef = useRef<Turn[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const activeVersion = useMemo(
    () => versions.find((version) => version.id === activeId) ?? null,
    [versions, activeId],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus((current) => (current === "streaming" ? "idle" : current));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    turnsRef.current = [];
    setVersions([]);
    setActiveId(null);
    setStreamCode("");
    setStreamTitle("");
    setError(null);
    setStatus("idle");
  }, []);

  const generate = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || status === "streaming") return;

      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("streaming");
      setError(null);
      setStreamCode("");
      setStreamTitle("");

      const turns: Turn[] = [...turnsRef.current, { role: "user", content: trimmed }];

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ turns }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const detail = (await response.text().catch(() => "")).slice(0, 300);
          throw new Error(
            response.status === 429
              ? "Too many requests right now — give it a few seconds and try again."
              : response.status === 402
                ? "AI credits are exhausted. Add credits to keep building."
                : detail || "Generation failed. Please try again.",
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          const partial = parseGeneration(raw);
          if (partial.code) setStreamCode(partial.code);
          if (partial.title) setStreamTitle(partial.title);
        }

        const parsed = parseGeneration(raw);
        if (!parsed.code) {
          throw new Error("The model didn't return a usable app. Try rephrasing your prompt.");
        }

        turnsRef.current = [...turns, { role: "assistant", content: raw }];

        const version: Version = {
          id: newId(),
          label: `v${versions.length + 1}`,
          title: parsed.title || streamTitle || "Untitled app",
          prompt: trimmed,
          code: parsed.code,
          notes: parsed.notes,
          ideas: parsed.ideas,
          createdAt: Date.now(),
        };

        setVersions((current) => [...current, version]);
        setActiveId(version.id);
        setStatus("idle");
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          setStatus("idle");
          return;
        }
        setError(caught instanceof Error ? caught.message : "Something went wrong.");
        setStatus("error");
      } finally {
        setStreamCode("");
        abortRef.current = null;
      }
    },
    [status, streamTitle, versions.length],
  );

  const restore = useCallback(
    (id: string) => {
      const version = versions.find((item) => item.id === id);
      if (!version) return;
      setActiveId(id);
      // Rewind the model's working context so the next prompt iterates on this version.
      turnsRef.current = [
        { role: "user", content: version.prompt },
        { role: "assistant", content: version.code },
      ];
    },
    [versions],
  );


  return {
    versions,
    activeVersion,
    activeId,
    status,
    streamCode,
    streamTitle,
    error,
    generate,
    stop,
    reset,
    restore,
    clearError: () => setError(null),
  };
}
