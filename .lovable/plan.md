# Image generation for Vibe Coder

Give the AI the ability to decide which images a generated app actually needs, create them with your Gemini key, and drop them straight into the live preview.

## How it works for the user

1. You describe an app ("a bakery landing page").
2. The AI writes the app as usual, and also declares the images the app needs — hero shot, product photos, avatars — each with its own art-direction prompt and a placeholder slot in the HTML.
3. As soon as the code stream finishes, Vibe Coder generates those images in parallel and swaps them into the preview. Placeholders show a shimmer until each image lands.
4. A new "Assets" panel next to Preview/Code lists every generated image with its prompt, a regenerate button, and download. You can also add your own image by typing a prompt.
5. Iterations keep working: asking "make the hero moodier" re-runs only that image, not the whole app.

Images live only in the current session, matching the existing no-saving choice. Exported HTML has the images inlined so the downloaded file still looks right.

## Technical section

**Model / API.** Images use the native Gemini `generateContent` endpoint with the existing `GEMINI_API_KEY` (the OpenAI-compatible endpoint used for text cannot return images). Model: `gemini-2.5-flash-image`, `responseModalities: ["TEXT","IMAGE"]`, response read from `inlineData` as base64 PNG.

**Prompt contract.** Add an `<<<IMAGES>>>` section to `src/lib/vibe/prompt.ts`, emitted after `<<<CODE>>>`: one line per image as `slot-id | aspect | detailed art-direction prompt`. Code rules updated so the model references images as `<img src="__VIBE_IMG_slot-id__" alt="...">`, always with real alt text and sizing classes. Parser in `src/lib/vibe/parse.ts` gains the new section (streaming-tolerant, same as the others).

**Server route.** New `src/routes/api/image.ts` (`POST`) taking `{ prompt, aspect }`, calling Gemini `generateContent`, returning `{ b64 }`. Non-streaming — image models return one payload — with the same friendly-error mapping (`429`, quota, safety block) as `/api/generate`. Safety/quota rejections return a clear message rather than a silent failure.

**Client wiring.** `src/lib/vibe/useStudio.ts` gains an `assets` map keyed by slot id (`{ prompt, aspect, dataUrl, status }`), stored per version so restoring a version restores its images. After a build completes, pending slots are requested concurrently (capped at 3 in flight). `src/lib/vibe/sandbox.ts` rewrites `__VIBE_IMG_<slot>__` tokens into `data:image/png;base64,...` when building the `srcdoc`, and falls back to a neutral SVG placeholder for slots still generating or failed — so the preview never shows a broken image.

**UI.** New `src/components/vibe/AssetsPane.tsx` (grid of thumbnails, prompt text, regenerate, download) added as a third tab beside Preview and Code in `src/routes/index.tsx`, following the existing pane styling. Failed images show an inline retry.

**Constraints to note.** Base64 images make the preview document large; the app caps generated images at 6 per version and downscales nothing, so very image-heavy prompts may feel slower on first paint. Gemini free-tier image quota is lower than text — quota errors surface per-image without breaking the app build.
