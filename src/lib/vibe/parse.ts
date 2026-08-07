import {
  CODE_MARK,
  FILE_MARK_CLOSE,
  FILE_MARK_OPEN,
  IDEAS_MARK,
  IMAGES_MARK,
  MAX_IMAGES,
  NOTES_MARK,
  TITLE_MARK,
} from "./prompt";

export type ImageSpec = {
  slot: string;
  aspect: string;
  prompt: string;
};

export type ProjectFile = {
  path: string;
  content: string;
};

export type ParsedGeneration = {
  title: string;
  /** Entry HTML document (or the first file) — used for the live preview. */
  code: string;
  files: ProjectFile[];
  notes: string;
  ideas: string[];
  images: ImageSpec[];
};

const ASPECTS = new Set(["1:1", "16:9", "4:3", "3:4", "9:16"]);

function section(raw: string, start: string, ends: string[]): string {
  const startIndex = raw.indexOf(start);
  if (startIndex === -1) return "";
  const from = startIndex + start.length;
  let to = raw.length;
  for (const end of ends) {
    const endIndex = raw.indexOf(end, from);
    if (endIndex !== -1 && endIndex < to) to = endIndex;
  }
  return raw.slice(from, to).trim();
}

function sanitizePath(value: string): string {
  return value
    .trim()
    .replace(/^[./\\]+/, "")
    .replace(/\\/g, "/")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9._/-]+/g, "-")
    .replace(/\/{2,}/g, "/");
}

/** Splits the code section into separate files; tolerant of partially streamed output. */
export function parseFiles(block: string): ProjectFile[] {
  if (!block.trim()) return [];

  const marker = new RegExp(
    `${FILE_MARK_OPEN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\n>]+)${FILE_MARK_CLOSE.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    )}`,
    "g",
  );

  const hits: { path: string; start: number; end: number }[] = [];
  for (let match = marker.exec(block); match; match = marker.exec(block)) {
    hits.push({
      path: sanitizePath(match[1] ?? ""),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  if (hits.length === 0) {
    // Legacy / fallback: a single unnamed document.
    const isHtml = /<html|<!DOCTYPE html/i.test(block);
    return [{ path: isHtml ? "index.html" : "main.txt", content: block.trim() }];
  }

  const files: ProjectFile[] = [];
  const seen = new Set<string>();
  hits.forEach((hit, index) => {
    const next = hits[index + 1];
    const content = block.slice(hit.end, next ? next.start : block.length).replace(/^\n/, "");
    let path = hit.path || `file-${index + 1}.txt`;
    while (seen.has(path)) path = path.replace(/(\.[^.]*)?$/, (ext) => `-copy${ext}`);
    if (!content.trim()) return;
    seen.add(path);
    files.push({ path, content: content.replace(/\s+$/, "") + "\n" });
  });

  return files;
}

/** The file the live preview should render. */
export function entryFile(files: ProjectFile[]): ProjectFile | null {
  return (
    files.find((file) => file.path.toLowerCase() === "index.html") ??
    files.find((file) => file.path.toLowerCase().endsWith(".html")) ??
    null
  );
}

function parseImages(block: string): ImageSpec[] {
  const seen = new Set<string>();
  const images: ImageSpec[] = [];

  for (const line of block.split("\n")) {
    const parts = line
      .replace(/^[-*\d.)\s]+/, "")
      .split("|")
      .map((part) => part.trim());
    if (parts.length < 3) continue;

    const slot = (parts[0] ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const aspect = parts[1] ?? "";
    const prompt = parts.slice(2).join(" | ").trim();
    if (!slot || !prompt || seen.has(slot)) continue;

    seen.add(slot);
    images.push({ slot, aspect: ASPECTS.has(aspect) ? aspect : "16:9", prompt });
    if (images.length >= MAX_IMAGES) break;
  }

  return images;
}

/** Tolerant parser that also works on partially streamed output. */
export function parseGeneration(raw: string): ParsedGeneration {
  const cleaned = raw.replace(/```[a-z]*\n?/gi, "");
  const title = section(cleaned, TITLE_MARK, [CODE_MARK, IMAGES_MARK, NOTES_MARK, IDEAS_MARK]);
  const notes = section(cleaned, NOTES_MARK, [IDEAS_MARK]);
  const ideasBlock = section(cleaned, IDEAS_MARK, []);
  const imagesBlock = section(cleaned, IMAGES_MARK, [NOTES_MARK, IDEAS_MARK]);
  let codeBlock = section(cleaned, CODE_MARK, [IMAGES_MARK, NOTES_MARK, IDEAS_MARK]);

  if (!codeBlock) {
    const docIndex = cleaned.search(/<!DOCTYPE html>/i);
    if (docIndex !== -1) codeBlock = cleaned.slice(docIndex).trim();
  }

  const files = parseFiles(codeBlock);
  const entry = entryFile(files);

  const ideas = ideasBlock
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    title,
    code: entry?.content ?? files[0]?.content ?? "",
    files,
    notes,
    ideas,
    images: parseImages(imagesBlock),
  };
}

/** True once the streamed document looks renderable. */
export function isRenderable(code: string): boolean {
  return /<\/html>/i.test(code);
}
