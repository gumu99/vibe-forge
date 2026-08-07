import { useCallback, useMemo, useRef, useState } from "react";

import { parseGeneration, type ImageSpec, type ProjectFile } from "./parse";
import { ERROR_MARK, MAX_IMAGES } from "./prompt";
import type { ImageAsset } from "./sandbox";

export type Turn = { role: "user" | "assistant"; content: string };

export type Version = {
  id: string;
  label: string;
  title: string;
  prompt: string;
  code: string;
  files: ProjectFile[];
  notes: string;
  ideas: string[];
  assets: ImageAsset[];
  createdAt: number;
};

export type StudioStatus = "idle" | "streaming" | "error";

const CONCURRENCY = 3;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

async function requestImage(spec: { prompt: string; aspect: string }) {
  const response = await fetch("/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: spec.prompt, aspect: spec.aspect }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    b64?: string;
    mimeType?: string;
    error?: string;
  };
  if (!response.ok || !payload.b64) {
    throw new Error(payload.error || "Image generation failed.");
  }
  return `data:${payload.mimeType ?? "image/png"};base64,${payload.b64}`;
}

export function useStudio() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<StudioStatus>("idle");
  const [streamCode, setStreamCode] = useState("");
  const [streamFiles, setStreamFiles] = useState<ProjectFile[]>([]);
  const [streamTitle, setStreamTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const turnsRef = useRef<Turn[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const activeVersion = useMemo(
    () => versions.find((version) => version.id === activeId) ?? null,
    [versions, activeId],
  );

  const patchAsset = useCallback((versionId: string, slot: string, patch: Partial<ImageAsset>) => {
    setVersions((current) =>
      current.map((version) =>
        version.id === versionId
          ? {
              ...version,
              assets: version.assets.map((asset) =>
                asset.slot === slot ? { ...asset, ...patch } : asset,
              ),
            }
          : version,
      ),
    );
  }, []);

  const runImage = useCallback(
    async (versionId: string, asset: { slot: string; prompt: string; aspect: string }) => {
      patchAsset(versionId, asset.slot, { status: "pending", error: undefined });
      try {
        const dataUrl = await requestImage(asset);
        patchAsset(versionId, asset.slot, { status: "ready", dataUrl, error: undefined });
      } catch (caught) {
        patchAsset(versionId, asset.slot, {
          status: "error",
          error: caught instanceof Error ? caught.message : "Image generation failed.",
        });
      }
    },
    [patchAsset],
  );

  /** Generates pending images a few at a time so the preview fills in progressively. */
  const runImageQueue = useCallback(
    async (versionId: string, specs: ImageSpec[]) => {
      const queue = [...specs];
      const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        for (;;) {
          const next = queue.shift();
          if (!next) return;
          await runImage(versionId, next);
        }
      });
      await Promise.all(workers);
    },
    [runImage],
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
    setStreamFiles([]);
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
      setStreamFiles([]);
      setStreamTitle("");

      const turns: Turn[] = [...turnsRef.current, { role: "user", content: trimmed }];
      const previousAssets = activeVersion?.assets ?? [];

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
          if (partial.files.length) setStreamFiles(partial.files);
          if (partial.title) setStreamTitle(partial.title);
        }

        const errorIndex = raw.indexOf(ERROR_MARK);
        if (errorIndex !== -1) {
          throw new Error(raw.slice(errorIndex + ERROR_MARK.length).trim());
        }

        const parsed = parseGeneration(raw);
        if (!parsed.code) {
          throw new Error("The model didn't return a usable app. Try rephrasing your prompt.");
        }

        turnsRef.current = [...turns, { role: "assistant", content: raw }];

        // Reuse images whose slot and prompt are unchanged so iteration stays cheap and fast.
        const specs = parsed.images.slice(0, MAX_IMAGES);
        const assets: ImageAsset[] = specs.map((spec) => {
          const reusable = previousAssets.find(
            (asset) =>
              asset.slot === spec.slot && asset.prompt === spec.prompt && asset.status === "ready",
          );
          return reusable ?? { ...spec, status: "pending" };
        });

        const version: Version = {
          id: newId(),
          label: `v${versions.length + 1}`,
          title: parsed.title || streamTitle || "Untitled app",
          prompt: trimmed,
          code: parsed.code,
          files: parsed.files,
          notes: parsed.notes,
          ideas: parsed.ideas,
          assets,
          createdAt: Date.now(),
        };

        setVersions((current) => [...current, version]);
        setActiveId(version.id);
        setStatus("idle");

        const pending = assets.filter((asset) => asset.status === "pending");
        if (pending.length > 0) void runImageQueue(version.id, pending);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          setStatus("idle");
          return;
        }
        setError(caught instanceof Error ? caught.message : "Something went wrong.");
        setStatus("error");
      } finally {
        setStreamCode("");
        setStreamFiles([]);
        abortRef.current = null;
      }
    },
    [activeVersion, runImageQueue, status, streamTitle, versions.length],
  );

  const regenerateAsset = useCallback(
    (slot: string, prompt?: string) => {
      const version = versions.find((item) => item.id === activeId);
      const asset = version?.assets.find((item) => item.slot === slot);
      if (!version || !asset) return;
      const nextPrompt = prompt?.trim() || asset.prompt;
      patchAsset(version.id, slot, { prompt: nextPrompt, status: "pending", error: undefined });
      void runImage(version.id, { slot, prompt: nextPrompt, aspect: asset.aspect });
    },
    [activeId, patchAsset, runImage, versions],
  );

  const addAsset = useCallback(
    (prompt: string, aspect = "16:9") => {
      const trimmed = prompt.trim();
      const version = versions.find((item) => item.id === activeId);
      if (!trimmed || !version || version.assets.length >= MAX_IMAGES) return;

      let slot = `custom-${version.assets.length + 1}`;
      while (version.assets.some((asset) => asset.slot === slot)) slot = `${slot}-x`;

      setVersions((current) =>
        current.map((item) =>
          item.id === version.id
            ? {
                ...item,
                assets: [...item.assets, { slot, aspect, prompt: trimmed, status: "pending" }],
              }
            : item,
        ),
      );
      void runImage(version.id, { slot, prompt: trimmed, aspect });
    },
    [activeId, runImage, versions],
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
    streamFiles,
    streamTitle,
    error,
    generate,
    stop,
    reset,
    restore,
    regenerateAsset,
    addAsset,
    maxAssets: MAX_IMAGES,
    clearError: () => setError(null),
  };
}
