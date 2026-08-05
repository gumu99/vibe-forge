import { CODE_MARK, IDEAS_MARK, NOTES_MARK, TITLE_MARK } from "./prompt";

export type ParsedGeneration = {
  title: string;
  code: string;
  notes: string;
  ideas: string[];
};

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

/** Tolerant parser that also works on partially streamed output. */
export function parseGeneration(raw: string): ParsedGeneration {
  const cleaned = raw.replace(/```[a-z]*\n?/gi, "");
  const title = section(cleaned, TITLE_MARK, [CODE_MARK, NOTES_MARK, IDEAS_MARK]);
  const notes = section(cleaned, NOTES_MARK, [IDEAS_MARK]);
  const ideasBlock = section(cleaned, IDEAS_MARK, []);
  let code = section(cleaned, CODE_MARK, [NOTES_MARK, IDEAS_MARK]);

  if (!code) {
    const docIndex = cleaned.search(/<!DOCTYPE html>/i);
    if (docIndex !== -1) code = cleaned.slice(docIndex).trim();
  }

  const ideas = ideasBlock
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return { title, code, notes, ideas };
}

/** True once the streamed document looks renderable. */
export function isRenderable(code: string): boolean {
  return /<\/html>/i.test(code);
}
