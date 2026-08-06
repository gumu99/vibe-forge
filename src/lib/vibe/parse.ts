import { CODE_MARK, IDEAS_MARK, IMAGES_MARK, MAX_IMAGES, NOTES_MARK, TITLE_MARK } from "./prompt";

export type ImageSpec = {
  slot: string;
  aspect: string;
  prompt: string;
};

export type ParsedGeneration = {
  title: string;
  code: string;
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
  let code = section(cleaned, CODE_MARK, [IMAGES_MARK, NOTES_MARK, IDEAS_MARK]);

  if (!code) {
    const docIndex = cleaned.search(/<!DOCTYPE html>/i);
    if (docIndex !== -1) code = cleaned.slice(docIndex).trim();
  }

  const ideas = ideasBlock
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return { title, code, notes, ideas, images: parseImages(imagesBlock) };
}

/** True once the streamed document looks renderable. */
export function isRenderable(code: string): boolean {
  return /<\/html>/i.test(code);
}
